import { Injectable } from '@nestjs/common';
import { FinalGradeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinalGradesRepository } from './final-grades.service';

@Injectable()
export class PrismaFinalGradesRepository implements FinalGradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSchemeById(id: string) {
    return this.prisma.gradingScheme.findUnique({
      where: { id },
      include: { components: true },
    });
  }

  /**
   * Observed score per assessment for one participant in one class subject.
   *
   * TASK-051 requires the calculation to consume real assessment scores rather
   * than a placeholder: an assessment can be delivered as an assignment
   * (TASK-024) or as an online exam attempt (TASK-044), and both are normalized
   * to a 0–100 scale against the assessment's `maxScore` so the weights in a
   * grading scheme mean the same thing regardless of which delivery was used.
   *
   * Only graded work counts: an ungraded submission or attempt yields no entry,
   * which the service surfaces as a missing component rather than a silent zero.
   * Where a participant has several submissions or attempts for one assessment,
   * the best normalized result is used — the same "latest/best counts" reading
   * the grading module applies.
   */
  async listAssessmentScores(enrollmentId: string, classSubjectId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { classSubjectId },
      select: {
        id: true,
        maxScore: true,
        assignments: { select: { id: true } },
        exam: { select: { id: true } },
      },
    });

    if (assessments.length === 0) return [];

    const assignmentIds = assessments.flatMap((row) =>
      row.assignments.map((assignment) => assignment.id),
    );
    const examIds = assessments
      .map((row) => row.exam?.id)
      .filter((id): id is string => Boolean(id));

    const submissions =
      assignmentIds.length > 0
        ? await this.prisma.assignmentSubmission.findMany({
            where: {
              enrollmentId,
              assignmentId: { in: assignmentIds },
              grade: { isNot: null },
            },
            select: {
              assignmentId: true,
              grade: { select: { score: true } },
            },
          })
        : [];

    const attempts =
      examIds.length > 0
        ? await this.prisma.examAttempt.findMany({
            where: {
              status: { in: ['SUBMITTED', 'EXPIRED'] },
              score: { not: null },
              participant: {
                enrollmentId,
                session: { examId: { in: examIds } },
              },
            },
            select: {
              score: true,
              participant: {
                select: { session: { select: { examId: true } } },
              },
            },
          })
        : [];

    const bestByAssessment = new Map<string, number>();

    const record = (assessmentId: string, normalized: number) => {
      if (!Number.isFinite(normalized)) return;
      const previous = bestByAssessment.get(assessmentId);
      if (previous === undefined || normalized > previous) {
        bestByAssessment.set(assessmentId, normalized);
      }
    };

    const assignmentToAssessment = new Map<string, string>();
    for (const assessment of assessments) {
      for (const assignment of assessment.assignments) {
        assignmentToAssessment.set(assignment.id, assessment.id);
      }
    }

    const examToAssessment = new Map<string, string>();
    for (const assessment of assessments) {
      if (assessment.exam)
        examToAssessment.set(assessment.exam.id, assessment.id);
    }

    const maxScoreByAssessment = new Map<string, number>();
    for (const assessment of assessments) {
      const raw = Number(assessment.maxScore);
      maxScoreByAssessment.set(
        assessment.id,
        Number.isFinite(raw) && raw > 0 ? raw : 100,
      );
    }

    for (const submission of submissions) {
      const assessmentId = assignmentToAssessment.get(submission.assignmentId);
      const rawScore = submission.grade ? Number(submission.grade.score) : NaN;
      if (!assessmentId) continue;
      const maxScore = maxScoreByAssessment.get(assessmentId) ?? 100;
      record(assessmentId, (rawScore / maxScore) * 100);
    }

    for (const attempt of attempts) {
      const examId = attempt.participant?.session?.examId;
      if (!examId) continue;
      const assessmentId = examToAssessment.get(examId);
      if (!assessmentId) continue;
      const maxScore = maxScoreByAssessment.get(assessmentId) ?? 100;
      record(assessmentId, (Number(attempt.score) / maxScore) * 100);
    }

    return assessments
      .filter((assessment) => bestByAssessment.has(assessment.id))
      .map((assessment) => ({
        assessmentId: assessment.id,
        score: bestByAssessment.get(assessment.id) ?? 0,
      }));
  }

  async findByEnrollmentClassSubject(
    enrollmentId: string,
    classSubjectId: string,
  ) {
    return this.prisma.finalGrade.findUnique({
      where: { enrollmentId_classSubjectId: { enrollmentId, classSubjectId } },
    });
  }

  async findById(id: string) {
    return this.prisma.finalGrade.findUnique({ where: { id } });
  }

  async upsertGrade(data: {
    enrollmentId: string;
    classSubjectId: string;
    gradingSchemeId: string;
    numericScore: number;
    gradeCode: string | null;
    status: string;
    approvedByUserId?: string | null;
    approvedAt?: Date | null;
    calculatedAt?: Date;
    id?: string;
  }) {
    if (data.id) {
      return this.prisma.finalGrade.update({
        where: { id: data.id },
        data: {
          enrollmentId: data.enrollmentId,
          classSubjectId: data.classSubjectId,
          gradingSchemeId: data.gradingSchemeId,
          numericScore: Number(data.numericScore),
          gradeCode: data.gradeCode,
          status: data.status as FinalGradeStatus,
          approvedByUserId: data.approvedByUserId ?? null,
          approvedAt: data.approvedAt ?? null,
          calculatedAt: data.calculatedAt ?? new Date(),
        },
      });
    }

    return this.prisma.finalGrade.create({
      data: {
        enrollmentId: data.enrollmentId,
        classSubjectId: data.classSubjectId,
        gradingSchemeId: data.gradingSchemeId,
        numericScore: Number(data.numericScore),
        gradeCode: data.gradeCode,
        status: data.status as FinalGradeStatus,
        approvedByUserId: data.approvedByUserId ?? null,
        approvedAt: data.approvedAt ?? null,
        calculatedAt: data.calculatedAt ?? new Date(),
      },
    });
  }

  async updateStatus(
    id: string,
    data: {
      status: string;
      approvedByUserId?: string | null;
      approvedAt?: Date | null;
    },
  ) {
    return this.prisma.finalGrade.update({
      where: { id },
      data: {
        status: data.status as FinalGradeStatus,
        approvedByUserId: data.approvedByUserId ?? null,
        approvedAt: data.approvedAt ?? null,
      },
    });
  }
}
