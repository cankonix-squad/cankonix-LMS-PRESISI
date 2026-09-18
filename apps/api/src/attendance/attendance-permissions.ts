/**
 * Permission vocabulary for the attendance domain (TASK-030 / TASK-031).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * These codes are declared on routes and resolved from Role + Scope — there is no
 * role-name branching anywhere in the attendance code.
 */
export const ATTENDANCE_PERMISSIONS = {
  /** Read attendance sessions and records. */
  READ: 'attendance.record.read',
  /** Create/update sessions and record attendance. */
  RECORD_MANAGE: 'attendance.record.manage',
  /** Read correction history. */
  CORRECTION_READ: 'attendance.correction.read',
  /** Apply a correction to an existing attendance record. */
  CORRECTION_MANAGE: 'attendance.correction.manage',
  /** Read pre-aggregated attendance summaries. */
  SUMMARY_READ: 'attendance.summary.read',
  /** Trigger recalculation of attendance summaries. */
  SUMMARY_REFRESH: 'attendance.summary.refresh',
} as const;

export type AttendancePermission =
  (typeof ATTENDANCE_PERMISSIONS)[keyof typeof ATTENDANCE_PERMISSIONS];

export const ATTENDANCE_PERMISSION_CODES: readonly AttendancePermission[] =
  Object.values(ATTENDANCE_PERMISSIONS);
