import { UserEffectivePermissionsResponseDto } from './dto/role-assignment-response.dto';
import { ScopeTypeDto } from './dto/scope-type.dto';

export const PERMISSION_EVALUATOR = Symbol('PERMISSION_EVALUATOR');

/**
 * The narrow evaluation surface `PermissionGuard` depends on.
 *
 * Production binds this to `RoleAssignmentsService`. It exists as a separate
 * token so the HTTP composition root can substitute a deterministic evaluator
 * (see `createApp({ permissionEvaluator })`) without weakening the guard: an
 * evaluator can only ever answer permission questions, it cannot bypass them.
 */
export interface PermissionEvaluator {
  hasPermission(
    userAccountId: string,
    permissionCode: string,
    targetScopeType?: ScopeTypeDto,
    targetScopeId?: string,
    atTime?: Date,
  ): Promise<boolean>;

  getUserEffectivePermissions(
    userAccountId: string,
    atTime?: Date,
  ): Promise<UserEffectivePermissionsResponseDto>;
}
