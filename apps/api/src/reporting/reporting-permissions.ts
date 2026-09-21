/**
 * Permission vocabulary for reporting (TASK-060).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * No role name is inspected anywhere in this module.
 *
 * `REFRESH` is separate from `READ` because they are different authorities:
 * reading a report is a routine act, while rebuilding the read model is a
 * maintenance act that writes derived rows across many scopes at once and can
 * put load on the transactional tables.
 */
export const REPORTING_PERMISSIONS = {
  /** Read pre-aggregated reporting metrics. */
  READ: 'reporting.metric.read',
  /** Recompute the reporting read model from transactional data. */
  REFRESH: 'reporting.metric.refresh',
  /**
   * Read the cross-institution executive overview (TASK-061).
   *
   * Separate from `READ` because it answers a different question over a
   * different population. Holding `READ` lets someone see a scope they are
   * assigned to; holding `EXECUTIVE_READ` lets them see a roll-up across
   * institutions — and how far that roll-up reaches is still decided by the
   * scopes attached to the grant, never by the permission alone.
   */
  EXECUTIVE_READ: 'reporting.executive.read',
} as const;

export type ReportingPermission =
  (typeof REPORTING_PERMISSIONS)[keyof typeof REPORTING_PERMISSIONS];

export const REPORTING_PERMISSION_CODES: readonly ReportingPermission[] =
  Object.values(REPORTING_PERMISSIONS);
