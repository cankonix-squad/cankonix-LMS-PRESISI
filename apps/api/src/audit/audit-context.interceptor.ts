import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedHttpRequest } from '../auth/auth.types';
import { AuditContextService } from './audit-context.service';
import { AuditActor, AuditRequestContext } from './audit.types';

/**
 * Establishes the audit provenance for a request and the actor identity that
 * goes with it.
 *
 * Registered as a global interceptor, so every controller it flanks (and every
 * service those controllers call) can record an audit entry without knowing
 * where the request came from. The interceptor runs *after* the global guards,
 * which is what lets it capture the authenticated principal.
 *
 * Anonymous requests are still bound to a context: a request that passed
 * `@Public()` has a real IP and user agent, and an audit entry written for it
 * should say so while recording a `null` actor. Only the absence of any request
 * at all (background work) yields no context.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly context: AuditContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedHttpRequest>();

    const requestContext: AuditRequestContext = {
      ipAddress: resolveIpAddress(request as unknown as RequestLike),
      userAgent: resolveUserAgent(request as unknown as RequestLike),
    };

    return this.context.run(
      { ...requestContext, actor: resolveActor(request) },
      () => next.handle(),
    );
  }
}

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

/**
 * Resolves the caller's address.
 *
 * `X-Forwarded-For` is only consulted as a *forwarding hint*; the left-most value
 * is taken because the deployment terminates TLS at a proxy. This header is
 * client-controllable when the API is reachable directly, so it is recorded as
 * provenance only — never as a security decision.
 */
function resolveIpAddress(request: RequestLike): string | null {
  const forwarded = request.headers?.['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = forwardedValue?.split(',')[0]?.trim();
  if (first) return first;

  return request.ip ?? request.socket?.remoteAddress ?? null;
}

function resolveUserAgent(request: RequestLike): string | null {
  const header = request.headers?.['user-agent'];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() || null;
}

function resolveActor(request: AuthenticatedHttpRequest): AuditActor {
  return { userAccountId: request.user?.accountId ?? null };
}
