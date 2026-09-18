import { SetMetadata } from '@nestjs/common';
import { ScopeTypeDto } from './dto/scope-type.dto';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';
export const REQUIRE_SCOPE_KEY = 'require_scope';
export const REQUIRE_SELF_OR_PERMISSION_KEY =
  'authorization:self_or_permission';
export const ALLOW_AUTHENTICATED_KEY = 'authorization:allow_authenticated';

export type RequireScopeOptions = {
  scopeType: ScopeTypeDto;
  /**
   * Where to extract the target scope ID from the request.
   * Format: `params.<paramName>` (default `params.id` or `params.<scopeTypeLower>Id`),
   * `query.<queryName>`, or `body.<bodyFieldName>`.
   */
  idSource?: string;
  /** If true, unrestricted permission grants satisfy this requirement without a specific scope check. Default true. */
  allowUnrestricted?: boolean;
};

/**
 * Declares that a route requires one or more permissions.
 * All specified permissions must be possessed by the caller (AND logic).
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);

/**
 * Declares that a route requires authorization in a specific scope context.
 *
 * Combine with `@RequirePermissions` whenever possible: the declared scope then
 * narrows where the permission must hold. A scope requirement without any
 * permission only demands that the caller hold *some* permission in that scope.
 */
export const RequireScope = (options: RequireScopeOptions) =>
  SetMetadata(REQUIRE_SCOPE_KEY, options);

export type RequireSelfOrPermissionOptions = {
  /**
   * Request parameter holding the subject account id. When it equals the
   * caller's own `accountId` the request is a self-service read and needs no
   * permission. Any other value is a cross-user read and requires
   * `permission`.
   */
  subjectParam: string;
  /** Administrative permission required to read/evaluate another account. */
  permission: string;
};

/**
 * Self-service-or-administrative rule for subject-scoped reads.
 *
 * `userAccountId` taken from the path is never trusted on its own: reading your
 * own effective permissions is allowed, reading somebody else's requires the
 * declared administrative permission.
 */
export const RequireSelfOrPermission = (
  options: RequireSelfOrPermissionOptions,
) => SetMetadata(REQUIRE_SELF_OR_PERMISSION_KEY, options);

/**
 * Explicit allow-listed route: authentication is required, no LMS permission is.
 *
 * `PermissionGuard` is fail-closed. A route without `@RequirePermissions`,
 * `@RequireScope`, `@AllowAuthenticated` or `@Public` is rejected with 403 even
 * for an authenticated caller. Use this only for endpoints that genuinely hold
 * no permission boundary (self-service reads, foundation CRUD that predates its
 * permission catalogue) and always with a comment explaining why.
 */
export const AllowAuthenticated = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_AUTHENTICATED_KEY, true);
