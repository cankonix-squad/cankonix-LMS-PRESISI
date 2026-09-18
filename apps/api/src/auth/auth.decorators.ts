import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedHttpRequest, AuthenticatedPrincipal } from './auth.types';

/** Marks a route as intentionally reachable without a bearer token. */
export const IS_PUBLIC_KEY = 'auth:public';

export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

/** Injects the authenticated principal that `JwtAuthGuard` attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedHttpRequest>();
    if (!request.user) {
      throw new UnauthorizedException(
        'No authenticated caller on this request',
      );
    }
    return request.user;
  },
);
