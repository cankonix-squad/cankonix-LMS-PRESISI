import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/auth.decorators';
import { AuthenticatedHttpRequest } from '../auth/auth.types';
import {
  ALLOW_AUTHENTICATED_KEY,
  REQUIRE_PERMISSIONS_KEY,
  REQUIRE_SCOPE_KEY,
  REQUIRE_SELF_OR_PERMISSION_KEY,
  RequireScopeOptions,
  RequireSelfOrPermissionOptions,
} from './authorization.decorators';
import { ScopeTypeDto } from './dto/scope-type.dto';
import {
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
} from './permission-evaluator';

/**
 * Global guard enforcing LMS Authorization: Permission + Scope.
 *
 * Rules:
 * - `@Public()` routes pass (the bearer guard already decided they are open)
 * - `@AllowAuthenticated()` routes require a principal but no permission
 * - `@RequireSelfOrPermission()` allows self-service reads of one's own
 *   effective permissions and demands an administrative permission otherwise
 * - `@RequirePermissions(...)` / `@RequireScope(...)` place the real boundary
 * - A route with no authorization metadata at all is **denied** (fail closed),
 *   so adding a controller can never silently expose it
 * - Evaluates descendant org scopes and unrestricted national grants
 * - Never branches on role name
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(PERMISSION_EVALUATOR)
    private readonly evaluator: PermissionEvaluator,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedHttpRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required for authorization check',
      );
    }

    const selfOrPermission = this.reflector.getAllAndOverride<
      RequireSelfOrPermissionOptions | undefined
    >(REQUIRE_SELF_OR_PERMISSION_KEY, targets);

    if (selfOrPermission) {
      const subject = request.params?.[selfOrPermission.subjectParam];
      if (subject !== undefined && subject === user.accountId) {
        // Self-service: the caller is reading their own authorization state.
        return true;
      }
      const allowed = await this.evaluator.hasPermission(
        user.accountId,
        selfOrPermission.permission,
      );
      if (!allowed) {
        throw new ForbiddenException(
          `Access denied: reading authorization of another account requires ${selfOrPermission.permission}`,
        );
      }
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<
      string[] | undefined
    >(REQUIRE_PERMISSIONS_KEY, targets);

    const scopeOptions = this.reflector.getAllAndOverride<
      RequireScopeOptions | undefined
    >(REQUIRE_SCOPE_KEY, targets);

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_AUTHENTICATED_KEY,
      targets,
    );

    if (allowAuthenticated && !requiredPermissions && !scopeOptions) {
      return true;
    }

    // Fail closed: authorization metadata is mandatory, and it must actually
    // ask for something. An empty `@RequirePermissions()` is a configuration
    // mistake, not an implicit grant.
    const declaresPolicy =
      (requiredPermissions && requiredPermissions.length > 0) ||
      (scopeOptions !== undefined && scopeOptions !== null);
    if (!declaresPolicy) {
      throw new ForbiddenException(
        'Route has no authorization policy declared; access is denied by default',
      );
    }

    let targetScopeType: ScopeTypeDto | undefined;
    let targetScopeId: string | undefined;

    if (scopeOptions) {
      targetScopeType = scopeOptions.scopeType;
      targetScopeId = this.resolveScopeId(request, scopeOptions);
    }

    // Evaluate each required permission
    if (requiredPermissions && requiredPermissions.length > 0) {
      for (const permission of requiredPermissions) {
        const hasAccess = await this.evaluator.hasPermission(
          user.accountId,
          permission,
          targetScopeType,
          targetScopeId,
        );
        if (!hasAccess) {
          throw new ForbiddenException(
            `Access denied: missing required permission ${permission}${
              targetScopeId
                ? ` for scope ${targetScopeType}:${targetScopeId}`
                : ''
            }`,
          );
        }
      }
    } else if (scopeOptions && targetScopeType && targetScopeId) {
      // Scope requirement without specific permission: caller must have at least one permission in that scope
      const effective = await this.evaluator.getUserEffectivePermissions(
        user.accountId,
      );
      let scopeSatisfied = false;
      for (const perm of effective.permissions) {
        if (perm.isUnrestricted && (scopeOptions.allowUnrestricted ?? true)) {
          scopeSatisfied = true;
          break;
        }
        for (const scope of perm.scopes) {
          if (
            scope.scopeType === targetScopeType &&
            scope.scopeId === targetScopeId
          ) {
            scopeSatisfied = true;
            break;
          }
        }
        if (scopeSatisfied) break;
      }
      if (!scopeSatisfied) {
        throw new ForbiddenException(
          `Access denied for scope ${targetScopeType}:${targetScopeId}`,
        );
      }
    }

    return true;
  }

  private resolveScopeId(
    request: AuthenticatedHttpRequest,
    options: RequireScopeOptions,
  ): string | undefined {
    if (options.idSource) {
      const parts = options.idSource.split('.');
      const source = parts[0];
      const key = parts[1];
      if (source === 'params' && request.params && key)
        return request.params[key];
      if (source === 'query' && request.query && key) return request.query[key];
      if (source === 'body' && request.body && key) {
        const val = request.body[key];
        return typeof val === 'string' ? val : undefined;
      }
    }

    // Default fallback conventions
    if (request.params) {
      if (request.params.scopeId) return request.params.scopeId;
      if (request.params.id) return request.params.id;
      const lower = options.scopeType.toLowerCase();
      if (request.params[`${lower}Id`]) return request.params[`${lower}Id`];
    }
    return undefined;
  }
}
