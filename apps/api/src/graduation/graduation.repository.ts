import { Injectable } from '@nestjs/common';
import {
  GraduationComponentType,
  GraduationEvaluationOutcome,
  GraduationRuleStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EnrollmentEvaluationContext,
  GraduationComponentOutcome,
  GraduationEvaluationRecord,
  GraduationRepository,
  GraduationRuleCreateData,
  GraduationRuleListFilter,
  GraduationRuleListResult,
  GraduationRuleRecord,
  GraduationRuleUpdateData,
  GraduationSnapshot,
  NumericLike,
} from './graduation.types';

/**
 * Prisma-backed graduation repository (TASK-052).
 *
 * All persistence lives here so the service and the pure evaluator never touch
 * Prisma directly — the layering rule from `docs/09-backend-architecture.md`.
 *
 * ### Snapshot integrity
 *
 * `createEvaluation` writes the evaluation and its detail rows inside one
 * transaction. An evaluation whose detail rows failed to persist would be an
 * audit record that cannot be explained, so the two are only ever written
 * together.
 */
@Injectable()
export class PrismaGraduationRepository implements GraduationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(
    data: GraduationRuleCreateData,
  ): Promise<GraduationRuleRecord> {
    return this.prisma.graduationRule.create({
      data: {
        educationBatchId: data.educationBatchId,
        code: data.code,
        name: data.name,
        description: data.description,
        components: {
          create: data.components.map((component) => ({
            componentType: component.componentType,
            label: component.label,
            thresholdValue: component.thresholdValue,
            subjectId: component.subjectId,
            assessmentId: component.assessmentId,
            required: component.required,
            sortOrder: component.sortOrder,
          })),
        },
      },
      include: { components: true },
    });
  }

  async updateRule(
    id: string,
    data: GraduationRuleUpdateData,
  ): Promise<GraduationRuleRecord> {
    return this.prisma.graduationRule.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
      include: { components: true },
    });
  }

  async findRuleById(id: string): Promise<GraduationRuleRecord | null> {
    return this.prisma.graduationRule.findUnique({
      where: { id },
      include: { components: true },
    });
  }

  async listRules(
    filter: GraduationRuleListFilter,
  ): Promise<GraduationRuleListResult> {
    const where: Prisma.GraduationRuleWhereInput = {
      educationBatchId: filter.educationBatchId,
      status: filter.status,
      code: filter.code
        ? { contains: filter.code, mode: 'insensitive' }
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.graduationRule.findMany({
        where,
        include: { components: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.graduationRule.count({ where }),
    ]);

    return { data, total };
  }

  async updateRuleStatus(
    id: string,
    status: GraduationRuleStatus,
    publishedByUserId: string | null,
  ): Promise<GraduationRuleRecord> {
    return this.prisma.graduationRule.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === GraduationRuleStatus.PUBLISHED ? new Date() : null,
        publishedByUserId:
          status === GraduationRuleStatus.PUBLISHED ? publishedByUserId : null,
      },
      include: { components: true },
    });
  }

  /**
   * The newest published rule for a batch.
   *
   * "Newest" is by version then creation time, so republishing after a threshold
   * change selects the highest version rather than an arbitrary row.
   */
  async findLatestPublishedRuleForBatch(
    educationBatchId: string,
  ): Promise<GraduationRuleRecord | null> {
    return this.prisma.graduationRule.findFirst({
      where: {
        educationBatchId,
        status: GraduationRuleStatus.PUBLISHED,
      },
      include: { components: true },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async listEnrollmentsForBatch(
    educationBatchId: string,
  ): Promise<Array<{ enrollmentId: string }>> {
    const rows = await this.prisma.enrollment.findMany({
      where: { educationBatchId },
      select: { id: true },
      orderBy: { enrolledAt: 'asc' },
    });
    return rows.map((row) => ({ enrollmentId: row.id }));
  }

  /**
   * Gathers every observation the evaluator needs for one enrollment.
   *
   * Reading the inputs here (rather than inside the evaluator) keeps the
   * evaluator a pure function of its arguments, which is what makes a snapshot
   * reproducible: the same context always yields the same verdict.
   *
   * Final scores are indexed two ways because two component types ask different
   * questions of the same data: `FINAL_SCORE` averages across class subjects,
   * while `REQUIRED_SUBJECT` looks up one curriculum subject. Indexing by
   * classSubjectId *and* curriculumSubjectId lets both be answered from one pass.
   */
  async loadEvaluationContext(
    enrollmentId: string,
  ): Promise<EnrollmentEvaluationContext | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, educationBatchId: true, status: true },
    });
    if (!enrollment) return null;

    const attendance = await this.prisma.attendanceSummary.findFirst({
      where: { enrollmentId },
      orderBy: { recalculatedAt: 'desc' },
    });

    const finalGrades = await this.prisma.finalGrade.findMany({
      where: { enrollmentId },
      select: {
        numericScore: true,
        classSubjectId: true,
        classSubject: { select: { curriculumSubjectId: true } },
      },
    });

    const finalScoresByClassSubject = new Map<string, number>();
    const finalScoresByCurriculumSubject = new Map<string, number>();

    for (const grade of finalGrades) {
      const score = toNumber(grade.numericScore);
      if (score === null) continue;

      finalScoresByClassSubject.set(grade.classSubjectId, score);

      const curriculumSubjectId = grade.classSubject?.curriculumSubjectId;
      if (curriculumSubjectId) {
        const previous =
          finalScoresByCurriculumSubject.get(curriculumSubjectId);
        if (previous === undefined || score > previous) {
          finalScoresByCurriculumSubject.set(curriculumSubjectId, score);
        }
      }
    }

    const finalExamScoresByAssessment = await this.loadExamScores(enrollmentId);

    return {
      enrollmentId: enrollment.id,
      educationBatchId: enrollment.educationBatchId,
      status: enrollment.status,
      attendancePercentage: attendance
        ? toNumber(attendance.attendancePercentage)
        : null,
      finalScoresByClassSubject,
      finalScoresByCurriculumSubject,
      finalExamScoresByAssessment,
    };
  }

  /**
   * Best scored exam attempt per assessment for one enrollment.
   *
   * Only attempts that actually carry a score count: an in-progress attempt is
   * not evidence of a result, and a null score is "not yet graded", not zero.
   */
  private async loadExamScores(
    enrollmentId: string,
  ): Promise<Map<string, number>> {
    const attempts = await this.prisma.examAttempt.findMany({
      where: {
        participant: { enrollmentId },
        score: { not: null },
        status: { in: ['SUBMITTED', 'EXPIRED'] },
      },
      select: {
        score: true,
        participant: {
          select: {
            session: { select: { exam: { select: { assessmentId: true } } } },
          },
        },
      },
    });

    const byAssessment = new Map<string, number>();
    for (const attempt of attempts) {
      const assessmentId =
        attempt.participant?.session?.exam?.assessmentId ?? null;
      if (!assessmentId) continue;
      const score = toNumber(attempt.score);
      if (score === null) continue;
      const previous = byAssessment.get(assessmentId);
      if (previous === undefined || score > previous) {
        byAssessment.set(assessmentId, score);
      }
    }
    return byAssessment;
  }

  /**
   * Marks earlier open evaluations of the same enrollment and rule as
   * SUPERSEDED.
   *
   * A re-run must not silently overwrite history: the previous verdict stays
   * readable, flagged as replaced, and the new evaluation is a new row. This is
   * what lets a reviewer see that a participant was once NOT_ELIGIBLE and later
   * became ELIGIBLE, and when.
   */
  async supersedeOpenEvaluations(
    enrollmentId: string,
    ruleId: string,
  ): Promise<void> {
    await this.prisma.graduationEvaluation.updateMany({
      where: {
        enrollmentId,
        graduationRuleId: ruleId,
        outcome: {
          in: [
            GraduationEvaluationOutcome.ELIGIBLE,
            GraduationEvaluationOutcome.NOT_ELIGIBLE,
            GraduationEvaluationOutcome.PENDING,
          ],
        },
      },
      data: { outcome: GraduationEvaluationOutcome.SUPERSEDED },
    });
  }

  async createEvaluation(data: {
    enrollmentId: string;
    graduationRuleId: string;
    outcome: GraduationEvaluationOutcome;
    evaluatedByUserId: string | null;
    snapshot: GraduationSnapshot;
    details: GraduationComponentOutcome[];
  }): Promise<GraduationEvaluationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const evaluation = await tx.graduationEvaluation.create({
        data: {
          enrollmentId: data.enrollmentId,
          graduationRuleId: data.graduationRuleId,
          outcome: data.outcome,
          evaluatedByUserId: data.evaluatedByUserId,
          snapshot: toJsonInput(data.snapshot),
        },
      });

      if (data.details.length > 0) {
        await tx.graduationEvaluationDetail.createMany({
          data: data.details.map((detail) => ({
            graduationEvaluationId: evaluation.id,
            componentType: detail.componentType,
            label: detail.label,
            observedValue: detail.observedValue,
            thresholdValue: detail.thresholdValue,
            passed: detail.passed,
            note: detail.note,
          })),
        });
      }

      const withDetails = await tx.graduationEvaluation.findUniqueOrThrow({
        where: { id: evaluation.id },
        include: { details: true },
      });
      return withDetails;
    });
  }

  async findEvaluationById(
    id: string,
  ): Promise<GraduationEvaluationRecord | null> {
    return this.prisma.graduationEvaluation.findUnique({
      where: { id },
      include: { details: true },
    });
  }

  async listEvaluationsForEnrollment(
    enrollmentId: string,
  ): Promise<GraduationEvaluationRecord[]> {
    return this.prisma.graduationEvaluation.findMany({
      where: { enrollmentId },
      include: { details: true },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  async findAssessmentMaxScore(assessmentId: string): Promise<number | null> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { maxScore: true },
    });
    return assessment ? toNumber(assessment.maxScore) : null;
  }
}

/**
 * Coerces a Decimal-like value into a number, or `null` when it is not a finite
 * number. Used for every Decimal column this repository reads.
 */
function toNumber(value: NumericLike | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const numeric = Number(value.toNumber());
    return Number.isFinite(numeric) ? numeric : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Re-exported so callers can refer to the enum without a second import. */
export { GraduationComponentType };
