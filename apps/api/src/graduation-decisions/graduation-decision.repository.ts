import { Injectable } from '@nestjs/common';
import { GraduationDecisionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GraduationDecisionApproveData,
  GraduationDecisionCorrectData,
  GraduationDecisionCreateData,
  GraduationDecisionListFilter,
  GraduationDecisionListResult,
  GraduationDecisionRecord,
  GraduationDecisionRepository,
  GraduationDecisionRevokeData,
  GraduationDecisionWithEvaluation,
} from './graduation-decision.types';

/**
 * Prisma-backed graduation decision repository (TASK-053).
 *
 * Every query joins the evaluation so that the record carries the evidence
 * fields the domain validates against. The join is done in the same statement as
 * the decision read, so a decision cannot be validated against an evaluation
 * that changed between two reads.
 *
 * There is no `delete` method, by design. A decision is retracted by moving its
 * `status`; the row remains as proof it was once made.
 */
const EVALUATION_SELECT = {
  enrollmentId: true,
  graduationRuleId: true,
  outcome: true,
  evaluatedAt: true,
} satisfies Prisma.GraduationEvaluationSelect;

const WITH_EVALUATION = {
  graduationEvaluation: { select: EVALUATION_SELECT },
} satisfies Prisma.GraduationDecisionInclude;

type DecisionRow = Prisma.GraduationDecisionGetPayload<{
  include: typeof WITH_EVALUATION;
}>;

const WITH_EVALUATION_AND_SNAPSHOT = {
  graduationEvaluation: {
    select: { ...EVALUATION_SELECT, snapshot: true },
  },
} satisfies Prisma.GraduationDecisionInclude;

@Injectable()
export class PrismaGraduationDecisionRepository implements GraduationDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: DecisionRow): GraduationDecisionRecord {
    return {
      id: row.id,
      graduationEvaluationId: row.graduationEvaluationId,
      decision: row.decision,
      status: row.status,
      decidedByUserId: row.decidedByUserId,
      decidedAt: row.decidedAt,
      approvedByUserId: row.approvedByUserId,
      approvedAt: row.approvedAt,
      revokedByUserId: row.revokedByUserId,
      revokedAt: row.revokedAt,
      revokedReason: row.revokedReason,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      evaluationOutcome: row.graduationEvaluation.outcome,
      evaluationEnrollmentId: row.graduationEvaluation.enrollmentId,
      evaluationGraduationRuleId: row.graduationEvaluation.graduationRuleId,
      evaluationEvaluatedAt: row.graduationEvaluation.evaluatedAt,
    };
  }

  async findEvaluationContext(evaluationId: string) {
    const evaluation = await this.prisma.graduationEvaluation.findUnique({
      where: { id: evaluationId },
      select: {
        id: true,
        enrollmentId: true,
        graduationRuleId: true,
        outcome: true,
        evaluatedAt: true,
        snapshot: true,
      },
    });
    return evaluation;
  }

  async findByEvaluationId(
    evaluationId: string,
  ): Promise<GraduationDecisionRecord | null> {
    const row = await this.prisma.graduationDecision.findUnique({
      where: { graduationEvaluationId: evaluationId },
      include: WITH_EVALUATION,
    });
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<GraduationDecisionWithEvaluation | null> {
    const row = await this.prisma.graduationDecision.findUnique({
      where: { id },
      include: WITH_EVALUATION_AND_SNAPSHOT,
    });
    if (!row) return null;
    return {
      ...this.toRecord(row),
      evaluationSnapshot: row.graduationEvaluation.snapshot,
    };
  }

  async list(
    filter: GraduationDecisionListFilter,
  ): Promise<GraduationDecisionListResult> {
    const where: Prisma.GraduationDecisionWhereInput = {
      status: filter.status,
      decision: filter.decision,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.graduationDecision.findMany({
        where,
        include: WITH_EVALUATION,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.graduationDecision.count({ where }),
    ]);

    return { data: rows.map((row) => this.toRecord(row)), total };
  }

  async create(
    data: GraduationDecisionCreateData,
  ): Promise<GraduationDecisionRecord> {
    const row = await this.prisma.graduationDecision.create({
      data: {
        graduationEvaluationId: data.graduationEvaluationId,
        decision: data.decision,
        decidedByUserId: data.decidedByUserId,
        decidedAt: new Date(),
        note: data.note,
      },
      include: WITH_EVALUATION,
    });
    return this.toRecord(row);
  }

  async approve(
    id: string,
    data: GraduationDecisionApproveData,
  ): Promise<GraduationDecisionRecord> {
    const row = await this.prisma.graduationDecision.update({
      where: { id },
      data: {
        status: GraduationDecisionStatus.APPROVED,
        approvedByUserId: data.approvedByUserId,
        approvedAt: new Date(),
      },
      include: WITH_EVALUATION,
    });
    return this.toRecord(row);
  }

  async revoke(
    id: string,
    data: GraduationDecisionRevokeData,
  ): Promise<GraduationDecisionRecord> {
    const row = await this.prisma.graduationDecision.update({
      where: { id },
      data: {
        status: GraduationDecisionStatus.REVOKED,
        revokedByUserId: data.revokedByUserId,
        revokedAt: new Date(),
        revokedReason: data.revokedReason,
      },
      include: WITH_EVALUATION,
    });
    return this.toRecord(row);
  }

  /**
   * Moves the verdict of an in-force decision.
   *
   * Only `decision` and `note` change; the approval and authorship columns are
   * left intact so the record still shows who originally decided and approved
   * it. The correction itself is captured by the audit trail.
   */
  async correct(
    id: string,
    data: GraduationDecisionCorrectData,
  ): Promise<GraduationDecisionRecord> {
    const row = await this.prisma.graduationDecision.update({
      where: { id },
      data: {
        decision: data.decision,
        note: data.note,
      },
      include: WITH_EVALUATION,
    });
    return this.toRecord(row);
  }
}
