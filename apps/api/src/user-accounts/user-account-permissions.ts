/**
 * Permission vocabulary for the `UserAccount` identity lifecycle.
 *
 * These codes are data only: they carry no branching meaning in code. A caller
 * holds one because a Role granted it and the Role was assigned with a matching
 * scope — never because of a role-name check.
 *
 * This is what replaces the foundation allow-list on the user-account and
 * Keycloak-provisioning routes, so the boundary is a real permission instead of
 * "any authenticated caller".
 */
export const USER_ACCOUNT_PERMISSIONS = {
  /** Read user accounts and their provisioning status. */
  READ: 'user_account.read',
  /** Create/update accounts and provision their Keycloak identity. */
  MANAGE: 'user_account.manage',
} as const;

export type UserAccountPermission =
  (typeof USER_ACCOUNT_PERMISSIONS)[keyof typeof USER_ACCOUNT_PERMISSIONS];

export const USER_ACCOUNT_PERMISSION_CODES: readonly UserAccountPermission[] =
  Object.values(USER_ACCOUNT_PERMISSIONS);
