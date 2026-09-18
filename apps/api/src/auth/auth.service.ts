import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PersonStatusDto } from '../persons/dto/person-status.dto';
import { UserAccountRecord } from '../user-accounts/user-account.types';
import { UserAccountStatusDto } from '../user-accounts/dto/user-account-status.dto';
import { AUTH_CONFIG, AuthConfig } from './auth.config';
import {
  AUTH_IDENTITY_RESOLVER,
  AuthIdentityResolver,
} from './auth-identity.resolver';
import { AuthClaims, AuthenticatedPrincipal } from './auth.types';
import { JwtVerifier, TokenValidationError } from './jwt-verifier.service';

/**
 * Turns a raw bearer token into an authenticated application principal.
 *
 * The token only proves identity. Whether that identity may act is still an
 * LMS decision, so the account and person must both be active.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig | null,
    private readonly verifier: JwtVerifier,
    @Inject(AUTH_IDENTITY_RESOLVER)
    private readonly identities: AuthIdentityResolver,
  ) {}

  async authenticate(token: string): Promise<AuthenticatedPrincipal> {
    const config = this.config;
    if (!config) {
      // Fail closed: without trusted issuer configuration nothing may be accepted.
      this.logger.error(
        'Rejected a protected request because authentication is not configured',
      );
      throw new UnauthorizedException('Authentication is not configured');
    }

    const claims = await this.verifyToken(token);

    const account = await this.identities.findAccountByExternalAuthId(
      claims.subject,
    );
    if (!account) {
      this.logger.warn(
        `Rejected token whose subject is not linked to an account: ${claims.subject}`,
      );
      throw new UnauthorizedException(
        'Access token is not linked to an application account',
      );
    }

    if (account.status !== UserAccountStatusDto.ACTIVE) {
      throw new ForbiddenException('User account is not active');
    }

    const person = await this.identities.findPersonById(account.personId);
    if (!person) {
      this.logger.error(
        `User account ${account.id} references a missing person ${account.personId}`,
      );
      throw new UnauthorizedException(
        'Access token is not linked to an application account',
      );
    }

    if (person.status !== PersonStatusDto.ACTIVE) {
      throw new ForbiddenException('Person is not active');
    }

    await this.recordActivity(account, config);

    return {
      accountId: account.id,
      personId: person.id,
      personnelNumber: person.personnelNumber,
      fullName: person.fullName,
      username: account.username,
      email: account.email,
      accountStatus: account.status,
    };
  }

  private async verifyToken(token: string): Promise<AuthClaims> {
    try {
      return await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof TokenValidationError) {
        this.logger.debug(`Rejected access token: ${error.message}`);
        throw new UnauthorizedException('Access token is not valid');
      }
      // JWKS retrieval or key import problems are infrastructure faults, but the
      // client-facing answer stays uniform.
      this.logger.error(`Access token verification failed: ${String(error)}`);
      throw new UnauthorizedException('Access token is not valid');
    }
  }

  /**
   * Records the last time a valid token was presented, throttled so that a busy
   * client does not turn every request into a write.
   */
  private async recordActivity(
    account: UserAccountRecord,
    config: AuthConfig,
  ): Promise<void> {
    const now = new Date();
    const lastLoginAt = account.lastLoginAt;
    if (lastLoginAt) {
      const elapsedSeconds = (now.getTime() - lastLoginAt.getTime()) / 1000;
      if (elapsedSeconds < config.lastLoginThrottleSeconds) return;
    }

    try {
      await this.identities.touchLastLoginAt(account.personId, now);
    } catch (error) {
      // Authentication already succeeded; bookkeeping must not break the request.
      this.logger.warn(
        `Could not record last login for account ${account.id}: ${String(error)}`,
      );
    }
  }
}
