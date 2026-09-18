import { DynamicModule, Module, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PersonsModule } from '../persons/persons.module';
import { PersonsService } from '../persons/persons.service';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { UserAccountsService } from '../user-accounts/user-accounts.service';
import { AUTH_CONFIG, AuthConfig } from './auth.config';
import { AuthController } from './auth.controller';
import {
  AUTH_IDENTITY_RESOLVER,
  AuthIdentityResolver,
  KeycloakIdentityResolver,
} from './auth-identity.resolver';
import { JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import {
  JWKS_PROVIDER,
  JwksProvider,
  KeycloakJwksProvider,
} from './jwks.provider';
import { JwtVerifier } from './jwt-verifier.service';

export type AuthModuleOptions = {
  /**
   * `null` means authentication is not configured. Protected routes then fail
   * closed with 401 instead of degrading into an anonymous bypass.
   */
  authConfig: AuthConfig | null;
  /** Composition seam for tests and local tooling. Defaults to Keycloak JWKS. */
  jwksProvider?: JwksProvider;
  /** Composition seam for tests and local tooling. Defaults to Keycloak mapping. */
  identityResolver?: AuthIdentityResolver;
};

/**
 * Resource-server authentication.
 *
 * The API validates Keycloak-issued access tokens and maps their subject onto a
 * local `UserAccount`. It never issues tokens and never stores credentials.
 *
 * The guard is registered globally so that protection is default-deny: a new
 * controller is protected unless it explicitly opts out with `@Public()`.
 */
@Module({})
export class AuthModule {
  static register(options: AuthModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: AUTH_CONFIG, useValue: options.authConfig },
      {
        provide: JWKS_PROVIDER,
        useFactory: (): JwksProvider =>
          options.jwksProvider ?? new KeycloakJwksProvider(options.authConfig),
      },
      {
        provide: AUTH_IDENTITY_RESOLVER,
        useFactory: (
          accounts: UserAccountsService,
          persons: PersonsService,
        ): AuthIdentityResolver =>
          options.identityResolver ??
          new KeycloakIdentityResolver(accounts, persons),
        inject: [UserAccountsService, PersonsService],
      },
      JwtVerifier,
      AuthService,
      JwtAuthGuard,
      // Application-wide default-deny. `useExisting` keeps a single guard
      // instance so a request is authenticated exactly once.
      { provide: APP_GUARD, useExisting: JwtAuthGuard },
    ];

    return {
      module: AuthModule,
      imports: [PersonsModule, UserAccountsModule],
      controllers: [AuthController],
      providers,
      exports: [AuthService, JwtAuthGuard],
    };
  }
}
