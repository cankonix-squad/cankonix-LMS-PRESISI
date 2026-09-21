import {
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
} from '@prisma/client';

/**
 * Pure decision-lifecycle rules (TASK-053).
 *
 * Kept free of Nest and Prisma so the transitions can be unit-tested directly
 * and so the same predicates guard the service and can be reused by reporting.
 * Throwing is left to the service: these functions answer questions, the service
 * decides which question maps to which HTTP status.
 */

/**
 * A decision may only rest on an evaluation that is still the live verdict.
 *
 * A `SUPERSEDED` evaluation was replaced by a newer run of the rule engine, so a
 * decision attached to it would formalise an outcome that is no longer the one
 * on record — the acceptance criterion "no decision without (a valid)
 * evaluation". `PENDING` is likewise refused: there is nothing to decide yet.
 */
export function evaluationIsDecidable(
  outcome: GraduationEvaluationOutcome,
): boolean {
  if (outcome === GraduationEvaluationOutcome.SUPERSEDED) return false;
  if (outcome === GraduationEvaluationOutcome.PENDING) return false;
  return true;
}

export function describeEvaluationBlocker(
  outcome: GraduationEvaluationOutcome,
): string {
  switch (outcome) {
    case GraduationEvaluationOutcome.SUPERSEDED:
      return 'The evaluation has been superseded; decide against the current evaluation instead';
    case GraduationEvaluationOutcome.PENDING:
      return 'The evaluation has not produced an outcome yet';
    default:
      return 'The evaluation cannot be decided';
  }
}

/**
 * Whether a status move is permitted.
 *
 * The lifecycle is a straight line, never a loop:
 *
 *   DRAFT ──► APPROVED ──► REVOKED
 *
 * `REVOKED` is terminal. Re-opening a revoked decision would erase the fact that
 * it was once withdrawn, which is exactly what a formal record must not do; a
 * later change of mind is a fresh evaluation and a fresh decision.
 *
 * A correction is not a status move at all — it changes the verdict while the
 * status stays `APPROVED` — so it does not appear here.
 */
export function canTransition(
  from: GraduationDecisionStatus,
  to: GraduationDecisionStatus,
): boolean {
  if (from === GraduationDecisionStatus.DRAFT) {
    return to === GraduationDecisionStatus.APPROVED;
  }
  if (from === GraduationDecisionStatus.APPROVED) {
    return to === GraduationDecisionStatus.REVOKED;
  }
  return false;
}

export function describeTransitionBlocker(
  from: GraduationDecisionStatus,
  to: GraduationDecisionStatus,
): string {
  if (from === GraduationDecisionStatus.REVOKED) {
    return 'A revoked graduation decision is final and cannot be changed; record a new decision against a fresh evaluation instead';
  }
  return `A graduation decision in status ${from} cannot move to ${to}`;
}

/** A correction only makes sense once the decision is in force. */
export function canCorrect(status: GraduationDecisionStatus): boolean {
  return status === GraduationDecisionStatus.APPROVED;
}

export function describeCorrectionBlocker(
  status: GraduationDecisionStatus,
): string {
  // A correction is a lifecycle move like any other, so a revoked decision is
  // reported as final rather than merely "not approved" — the operator needs to
  // know the decision is closed, not that they picked the wrong verb.
  if (status === GraduationDecisionStatus.REVOKED) {
    return describeTransitionBlocker(status, GraduationDecisionStatus.APPROVED);
  }
  return 'Only an approved graduation decision can be corrected';
}
