import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  GraduationDecisionResponseDto,
  GraduationDecisionListResponseDto,
} from './dto/graduation-decision-response.dto';
import {
  canCorrect,
  canTransition,
  describeCorrectionBlocker,
  describeEvaluationBlocker,
  describeTransitionBlocker,
  evaluationIsDecidable,
} from './graduation-decision-rules';
import {
  GRADUATION_DECISION_REPOSITORY,
  GraduationDecisionRecord,
  GraduationDecisionRepository,
  GraduationDecisionWithEvaluation,
} from './graduation-decision.types';

type CreateDecisionInput = {
  graduationEvaluationId: string;
  decision: GraduationDecisionOutcome;
  note?: string | null;
  decidedByUserId?: string | null;
};

/**
 * Graduation decision application service (TASK-053).
 *
 * This is where an evaluation (evidence, TASK-052) becomes a formal decision.
 * The rules it enforces are the task's acceptance criteria:
 *
 * - **No decision without an evaluation.** The evaluation is loaded first and
 *   the write is refused when it is missing. A decision is never a standalone
 *   assertion.
 * - **No decision against a superseded or pending evaluation.** Those describe
 *   an outcome that is no longer, or not yet, the one on record.
 * - **One decision per evaluation.** The database enforces it with a unique
 *   constraint; the service reports it as a conflict rather than a raw error.
 * - **Nothing is deleted.** Revocation moves `status`; correction changes the
 *   verdict in place. Every move is written to the audit trail (TASK-006) with
 *   its before and after state, which is what makes the history reconstructible.
 *
 * Approve, correct, and revoke are separate operations because they are separate
 * authorities (`graduation.decision.approve` / `.revoke`) — the controller maps
 * each route to its own code.
 */
@Injectable()
export class GraduationDecisionService {
  constructor(
    @Inject(GRADUATION_DECISION_REPOSITORY)
    private readonly repo: GraduationDecisionRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Records a decision against an evaluation.
   *
   * The decision starts as `DRAFT`: recording a verdict and putting it in force
   * are deliberately two acts, so a mis-keyed verdict can be caught before it
   * reaches a certificate.
   */
  async create(
    input: CreateDecisionInput,
  ): Promise<GraduationDecisionResponseDto> {
    const evaluation = await this.repo.findEvaluationContext(
      input.graduationEvaluationId,
    );
    if (!evaluation) {
      throw new NotFoundException('Graduation evaluation not found');
    }

    if (!evaluationIsDecidable(evaluation.outcome)) {
      throw new ConflictException(
        describeEvaluationBlocker(evaluation.outcome),
      );
    }

    const existing = await this.repo.findByEvaluationId(
      input.graduationEvaluationId,
    );
    if (existing) {
      throw new ConflictException(
        'A decision already exists for this evaluation; correct or revoke it instead',
      );
    }

    const created = await this.repo.create({
      graduationEvaluationId: input.graduationEvaluationId,
      decision: input.decision,
      decidedByUserId: input.decidedByUserId ?? null,
      note: input.note?.trim() || null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_DECISION_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_DECISION,
      resourceId: created.id,
      after: {
        decision: created.decision,
        status: created.status,
      },
      metadata: {
        graduationEvaluationId: created.graduationEvaluationId,
        enrollmentId: created.evaluationEnrollmentId,
        decidedByUserId: created.decidedByUserId,
      },
    });

    return toDecisionResponse(created);
  }

  /**
   * Puts a draft decision in force.
   *
   * Only `DRAFT → APPROVED` is allowed. Approving an already-approved decision is
   * refused rather than treated as a no-op, so the audit trail records one
   * approval act per decision.
   */
  async approve(
    id: string,
    approvedByUserId?: string | null,
  ): Promise<GraduationDecisionResponseDto> {
    const existing = await this.requireDecision(id);

    if (!canTransition(existing.status, GraduationDecisionStatus.APPROVED)) {
      throw new ConflictException(
        describeTransitionBlocker(
          existing.status,
          GraduationDecisionStatus.APPROVED,
        ),
      );
    }

    const updated = await this.repo.approve(id, {
      approvedByUserId: approvedByUserId ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_DECISION_APPROVED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_DECISION,
      resourceId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      metadata: {
        graduationEvaluationId: updated.graduationEvaluationId,
        enrollmentId: updated.evaluationEnrollmentId,
        approvedByUserId: updated.approvedByUserId,
      },
    });

    return toDecisionResponse(updated);
  }

  /**
   * Changes the verdict of a decision that is in force.
   *
   * A correction keeps the same row and the same status: the evidence has not
   * changed, only the institution's reading of it. The previous verdict survives
   * in the audit entry's `before`, so correcting a decision never erases what was
   * decided before.
   */
  async correct(
    id: string,
    input: { decision: GraduationDecisionOutcome; note: string },
  ): Promise<GraduationDecisionResponseDto> {
    const existing = await this.requireDecision(id);

    if (!canCorrect(existing.status)) {
      throw new ConflictException(describeCorrectionBlocker(existing.status));
    }

    const updated = await this.repo.correct(id, {
      decision: input.decision,
      note: input.note.trim(),
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_DECISION_CORRECTED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_DECISION,
      resourceId: id,
      before: { decision: existing.decision, note: existing.note },
      after: { decision: updated.decision, note: updated.note },
      metadata: {
        graduationEvaluationId: updated.graduationEvaluationId,
        enrollmentId: updated.evaluationEnrollmentId,
      },
    });

    return toDecisionResponse(updated);
  }

  /**
   * Withdraws a decision.
   *
   * `REVOKED` is terminal and the row stays readable, so the institution can
   * still prove the decision was once made. A reason is required because a
   * withdrawal without one is indistinguishable from a mistake.
   */
  async revoke(
    id: string,
    input: { revokedReason: string; revokedByUserId?: string | null },
  ): Promise<GraduationDecisionResponseDto> {
    const existing = await this.requireDecision(id);

    if (!canTransition(existing.status, GraduationDecisionStatus.REVOKED)) {
      throw new ConflictException(
        describeTransitionBlocker(
          existing.status,
          GraduationDecisionStatus.REVOKED,
        ),
      );
    }

    const reason = input.revokedReason?.trim();
    if (!reason) {
      throw new BadRequestException(
        'A reason is required to revoke a decision',
      );
    }

    const updated = await this.repo.revoke(id, {
      revokedByUserId: input.revokedByUserId ?? null,
      revokedReason: reason,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_DECISION_REVOKED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_DECISION,
      resourceId: id,
      before: { status: existing.status },
      after: { status: updated.status, revokedReason: updated.revokedReason },
      metadata: {
        graduationEvaluationId: updated.graduationEvaluationId,
        enrollmentId: updated.evaluationEnrollmentId,
        revokedByUserId: updated.revokedByUserId,
      },
    });

    return toDecisionResponse(updated);
  }

  async findOne(id: string): Promise<GraduationDecisionResponseDto> {
    const decision = await this.repo.findById(id);
    if (!decision) throw new NotFoundException('Graduation decision not found');
    return toDecisionResponse(decision, decision.evaluationSnapshot);
  }

  async list(query: {
    status?: GraduationDecisionStatus;
    decision?: GraduationDecisionOutcome;
    page?: number;
    limit?: number;
  }): Promise<GraduationDecisionListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.list({
      status: query.status,
      decision: query.decision,
      page,
      limit,
    });

    return {
      data: result.data.map((decision) => toDecisionResponse(decision)),
      total: result.total,
      page,
      limit,
    };
  }

  private async requireDecision(id: string): Promise<GraduationDecisionRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Graduation decision not found');
    return existing;
  }
}

/**
 * Maps a stored decision to its response shape.
 *
 * `evaluation` is only attached when the caller supplied the snapshot, which is
 * the single-decision read path. List responses omit it to avoid repeating the
 * same evidence on every row.
 */
function toDecisionResponse(
  decision: GraduationDecisionRecord | GraduationDecisionWithEvaluation,
  evaluationSnapshot?: unknown,
): GraduationDecisionResponseDto {
  const response: GraduationDecisionResponseDto = {
    id: decision.id,
    graduationEvaluationId: decision.graduationEvaluationId,
    decision: decision.decision as never,
    status: decision.status as never,
    decidedByUserId: decision.decidedByUserId,
    decidedAt: decision.decidedAt ? decision.decidedAt.toISOString() : null,
    approvedByUserId: decision.approvedByUserId,
    approvedAt: decision.approvedAt ? decision.approvedAt.toISOString() : null,
    revokedByUserId: decision.revokedByUserId,
    revokedAt: decision.revokedAt ? decision.revokedAt.toISOString() : null,
    revokedReason: decision.revokedReason,
    note: decision.note,
    createdAt: decision.createdAt.toISOString(),
    updatedAt: decision.updatedAt.toISOString(),
  };

  if (evaluationSnapshot !== undefined) {
    response.evaluation = {
      id: decision.graduationEvaluationId,
      enrollmentId: decision.evaluationEnrollmentId,
      graduationRuleId: decision.evaluationGraduationRuleId,
      outcome: decision.evaluationOutcome,
      evaluatedAt: decision.evaluationEvaluatedAt.toISOString(),
      snapshot: evaluationSnapshot as Record<string, unknown>,
    };
  }

  return response;
}
