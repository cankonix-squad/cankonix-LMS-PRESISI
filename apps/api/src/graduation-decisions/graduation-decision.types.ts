import type {
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
} from '@prisma/client';

export type {
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
};

/**
 * A decision row as stored, with the evaluation it rests on loaded enough to
 * validate it.
 *
 * The evaluation fields are flattened onto the decision because every rule the
 * domain enforces ("the evaluation must exist", "a superseded evaluation cannot
 * be decided") needs them, and reading them lazily from a second query would let
 * the two reads straddle a concurrent re-evaluation.
 */
export interface GraduationDecisionRecord {
  id: string;
  graduationEvaluationId: string;
  decision: GraduationDecisionOutcome;
  status: GraduationDecisionStatus;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  revokedByUserId: string | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** The evaluation's own id — equals `graduationEvaluationId`. */
  evaluationOutcome: GraduationEvaluationOutcome;
  evaluationEnrollmentId: string;
  evaluationGraduationRuleId: string;
  evaluationEvaluatedAt: Date;
}

/** Nested view of a decision plus the evaluation snapshot it was taken against. */
export interface GraduationDecisionWithEvaluation extends GraduationDecisionRecord {
  /** The evaluation snapshot at decision time, returned so callers can explain it. */
  evaluationSnapshot: unknown;
}

export interface GraduationDecisionListFilter {
  status?: GraduationDecisionStatus;
  decision?: GraduationDecisionOutcome;
  page: number;
  limit: number;
}

export interface GraduationDecisionListResult {
  data: GraduationDecisionRecord[];
  total: number;
}

export interface GraduationDecisionCreateData {
  graduationEvaluationId: string;
  decision: GraduationDecisionOutcome;
  decidedByUserId: string | null;
  note: string | null;
}

export interface GraduationDecisionApproveData {
  approvedByUserId: string | null;
}

export interface GraduationDecisionRevokeData {
  revokedByUserId: string | null;
  revokedReason: string | null;
}

export interface GraduationDecisionCorrectData {
  decision: GraduationDecisionOutcome;
  note: string | null;
}

/**
 * The persistence contract for graduated decisions (TASK-053).
 *
 * Deliberately narrow. There is no `delete` — a decision is retracted by moving
 * its `status`, never by removing the row, which is what keeps the formal record
 * reconstructible after the fact.
 */
export interface GraduationDecisionRepository {
  /** Reads the evaluation a decision would attach to; null when it does not exist. */
  findEvaluationContext(evaluationId: string): Promise<{
    id: string;
    enrollmentId: string;
    graduationRuleId: string;
    outcome: GraduationEvaluationOutcome;
    evaluatedAt: Date;
    snapshot: unknown;
  } | null>;

  findByEvaluationId(
    evaluationId: string,
  ): Promise<GraduationDecisionRecord | null>;

  findById(id: string): Promise<GraduationDecisionWithEvaluation | null>;

  list(
    filter: GraduationDecisionListFilter,
  ): Promise<GraduationDecisionListResult>;

  create(data: GraduationDecisionCreateData): Promise<GraduationDecisionRecord>;

  approve(
    id: string,
    data: GraduationDecisionApproveData,
  ): Promise<GraduationDecisionRecord>;

  revoke(
    id: string,
    data: GraduationDecisionRevokeData,
  ): Promise<GraduationDecisionRecord>;

  correct(
    id: string,
    data: GraduationDecisionCorrectData,
  ): Promise<GraduationDecisionRecord>;
}

export const GRADUATION_DECISION_REPOSITORY = Symbol(
  'GRADUATION_DECISION_REPOSITORY',
);
