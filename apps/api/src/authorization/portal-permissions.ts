/**
 * Portal access permission codes.
 *
 * A portal boundary ("may this account operate the Admin portal at all?") is a
 * Permission + Scope question, exactly like every other boundary in the LMS. The
 * code below is deliberately NOT bound to a role name and is never tested as a
 * branch in business logic: it is data that a Role grants, and an account holds
 * it only because an ACTIVE RoleAssignment (optionally scoped) said so.
 *
 * Shape follows `<domain>.<resource>.<action>` (`docs/04-authorization-model.md`,
 * which names `portal.*.access` as the example of a wildcard portal grant). A
 * role may therefore hold `portal.admin.access` directly, or hold the broader
 * `portal.*.access`, and the authorization engine's wildcard matcher resolves
 * both.
 *
 * The code is seeded by
 * `prisma/migrations/20261009001200_task_009AO_admin_portal_access_permission`
 * and is granted to `SUPER_ADMIN` only. It is deliberately NOT granted to
 * `PENGAJAR`: an educator assignment is not an Admin authorization, and the
 * backend — not a UI preference — is what enforces that.
 */
export const PORTAL_PERMISSIONS = {
  /** Operate the Admin portal (admin.lms-presisi). */
  ADMIN_ACCESS: 'portal.admin.access',
} as const;

export type PortalPermissionCode =
  (typeof PORTAL_PERMISSIONS)[keyof typeof PORTAL_PERMISSIONS];
