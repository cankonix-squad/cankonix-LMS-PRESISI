/**
 * Permission vocabulary for the authorization (RBAC) domain itself.
 *
 * These codes carry no branching meaning in code: they are only referenced when
 * declaring a route policy and when resolving a caller's effective permissions.
 * A caller holds one of them only because a Role granted it and the Role was
 * assigned with a matching scope — never because of a role-name check.
 *
 * Shape follows `<domain>.<resource>.<action>` (`docs/04-authorization-model.md`).
 * They are registered through `POST /api/v1/authorization/permissions` and
 * granted to roles through the role-permission endpoints, like any other domain.
 */
export const AUTHORIZATION_PERMISSIONS = {
  /** Read the role catalogue (roles, their permissions, role details). */
  ROLE_READ: 'authorization.role.read',
  /** Create, update, delete roles and (re)assign role permissions. */
  ROLE_MANAGE: 'authorization.role.manage',
  /** Read the permission catalogue. */
  PERMISSION_READ: 'authorization.permission.read',
  /** Create or seed permission codes. */
  PERMISSION_MANAGE: 'authorization.permission.manage',
  /** Read role assignments and scope bindings. */
  ASSIGNMENT_READ: 'authorization.assignment.read',
  /** Assign/revoke roles, change assignment status and mutate scopes. */
  ASSIGNMENT_MANAGE: 'authorization.assignment.manage',
  /**
   * Read or evaluate the effective permissions of *another* account.
   * Self-service reads use the token identity and need no permission.
   */
  EFFECTIVE_PERMISSION_READ: 'authorization.effective_permission.read',
} as const;

export type AuthorizationPermission =
  (typeof AUTHORIZATION_PERMISSIONS)[keyof typeof AUTHORIZATION_PERMISSIONS];

/** All codes above, for seeding/reporting. Order is stable for deterministic output. */
export const AUTHORIZATION_PERMISSION_CODES: readonly AuthorizationPermission[] =
  Object.values(AUTHORIZATION_PERMISSIONS);
