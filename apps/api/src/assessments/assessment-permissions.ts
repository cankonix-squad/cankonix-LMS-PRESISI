/**
 * Permission vocabulary for the assessment domain (TASK-040).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * These codes are declared on routes and resolved from Role + Scope — there is no
 * role-name branching anywhere in the assessment code.
 */
export const ASSESSMENT_PERMISSIONS = {
  /** Read the data-driven assessment type vocabulary. */
  TYPE_READ: 'assessment.type.read',
  /** Create/update assessment types. */
  TYPE_MANAGE: 'assessment.type.manage',
  /** Read assessments for a class subject. */
  READ: 'assessment.read',
  /** Create/update assessments and move them through the lifecycle. */
  MANAGE: 'assessment.manage',
} as const;

export type AssessmentPermission =
  (typeof ASSESSMENT_PERMISSIONS)[keyof typeof ASSESSMENT_PERMISSIONS];

export const ASSESSMENT_PERMISSION_CODES: readonly AssessmentPermission[] =
  Object.values(ASSESSMENT_PERMISSIONS);
