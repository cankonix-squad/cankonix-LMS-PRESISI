/**
 * Permission vocabulary for the grading domain (TASK-046, TASK-050, TASK-051).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * Codes are declared on routes and resolved from Role + Scope — there is no
 * role-name branching anywhere in the grading code.
 */
export const GRADING_PERMISSIONS = {
  /** Grade answers automatically or manually, and read grading output. */
  MANAGE: 'exam.grade.manage',
  /** Read grading schemes and their components. */
  SCHEME_READ: 'grading.scheme.read',
  /** Create/update grading schemes and components. */
  SCHEME_MANAGE: 'grading.scheme.manage',
  /** Calculate, read and approve final grades. */
  FINAL_GRADE_MANAGE: 'grading.final_grade.manage',
} as const;

export type GradingPermission =
  (typeof GRADING_PERMISSIONS)[keyof typeof GRADING_PERMISSIONS];

export const GRADING_PERMISSION_CODES: readonly GradingPermission[] =
  Object.values(GRADING_PERMISSIONS);
