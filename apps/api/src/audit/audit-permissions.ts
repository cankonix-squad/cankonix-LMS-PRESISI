/**
 * Permission vocabulary for the audit domain (TASK-006).
 *
 * Audit history is sensitive in aggregate: it reveals who changed what, when,
 * and from where. Reading it is therefore a permission of its own, and appending
 * to it is not exposed as an HTTP permission at all — entries are written by the
 * application services that perform the audited mutation, never by a client.
 *
 * Shape follows `<domain>.<resource>.<action>` (`docs/04-authorization-model.md`).
 */
export const AUDIT_PERMISSIONS = {
  /** Search and read the audit trail. */
  READ: 'audit.log.read',
} as const;

export type AuditPermission =
  (typeof AUDIT_PERMISSIONS)[keyof typeof AUDIT_PERMISSIONS];

/** All codes above, for seeding/reporting. Order is stable for deterministic output. */
export const AUDIT_PERMISSION_CODES: readonly AuditPermission[] =
  Object.values(AUDIT_PERMISSIONS);
