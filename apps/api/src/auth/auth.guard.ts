import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { AuthService } from './auth.service';
import { AuthenticatedHttpRequest } from './auth.types';

/**
 * Bearer-token guard for protected API routes.
 *
 * Registered globally so protection is default-deny: a controller is protected
 * unless it opts out explicitly with `@Public()`. Swagger UI and the OpenAPI
 * document are served by middleware rather than controllers and are gated by
 * `DOCS_ENABLED` instead.
 *
 * The guard establishes *who* the caller is. What the caller may do remains an
 * LMS authorization decision made by later modules.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedHttpRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Bearer access token is required');
    }

    request.user = await this.auth.authenticate(token);
    return true;
  }
}

function extractBearerToken(
  header: string | string[] | undefined,
): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const [scheme, ...rest] = value.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  const token = rest.join('');
  return token.length > 0 ? token : null;
}
