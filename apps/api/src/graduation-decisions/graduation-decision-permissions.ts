/**
 * Permission vocabulary for the graduation decision (TASK-053).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * Codes are declared on routes and resolved from Role + Scope; no role name is
 * ever inspected in this module.
 *
 * The spec calls this workflow "authorization sensitif", so the four acts are
 * four codes rather than one `graduation.decision.manage`:
 *
 * - `READ` — see decisions and the evidence behind them.
 * - `RECORD` — enter a decision. This is a drafting act and does not put a
 *   verdict in force.
 * - `APPROVE` — put a decision in force. This is the act that changes a
 *   learner's graduation status, so it is separated from recording it.
 * - `REVOKE` — withdraw a decision that is in force.
 *
 * An institution can therefore require that the person who records a verdict is
 * not the person who approves it, without any change to this code.
 */
export const GRADUATION_DECISION_PERMISSIONS = {
  /** Read graduation decisions and their evidence. */
  READ: 'graduation.decision.read',
  /** Record a decision against an evaluation. */
  RECORD: 'graduation.decision.record',
  /** Approve (put in force) or correct a decision. */
  APPROVE: 'graduation.decision.approve',
  /** Revoke a decision that is in force. */
  REVOKE: 'graduation.decision.revoke',
} as const;

export type GraduationDecisionPermission =
  (typeof GRADUATION_DECISION_PERMISSIONS)[keyof typeof GRADUATION_DECISION_PERMISSIONS];

export const GRADUATION_DECISION_PERMISSION_CODES: readonly GraduationDecisionPermission[] =
  Object.values(GRADUATION_DECISION_PERMISSIONS);
