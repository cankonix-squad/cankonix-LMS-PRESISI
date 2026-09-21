/**
 * Permission vocabulary for the graduation domain (TASK-052).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * Codes are declared on routes and resolved from Role + Scope — there is no
 * role-name branching anywhere in the graduation code.
 *
 * Note the deliberate split between *configuring* a rule and *evaluating*
 * against it: authoring the graduation requirement is a curriculum act, while
 * running an evaluation reads participant records. An institution may reasonably
 * grant one without the other, so they are separate codes rather than one
 * "graduation.manage" that silently bundles both.
 */
export const GRADUATION_PERMISSIONS = {
  /** Read graduation rules and their components. */
  RULE_READ: 'graduation.rule.read',
  /** Create/update/publish/archive graduation rules. */
  RULE_MANAGE: 'graduation.rule.manage',
  /** Read graduation evaluations and their snapshots. */
  EVALUATION_READ: 'graduation.evaluation.read',
  /** Run an evaluation for an enrollment or a whole batch. */
  EVALUATION_RUN: 'graduation.evaluation.run',
} as const;

export type GraduationPermission =
  (typeof GRADUATION_PERMISSIONS)[keyof typeof GRADUATION_PERMISSIONS];

export const GRADUATION_PERMISSION_CODES: readonly GraduationPermission[] =
  Object.values(GRADUATION_PERMISSIONS);
