import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinalGradeStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';

export const FINAL_GRADES_REPOSITORY = Symbol('FINAL_GRADES_REPOSITORY');

type GradeComponent = {
  assessmentId: string;
  weight: number | string | { toNumber(): number };
  required?: boolean;
};

type GradeScore = {
  assessmentId: string;
  score: number | string;
};

type FinalGradeRow = {
  id: string;
  enrollmentId: string;
  classSubjectId: string;
  gradingSchemeId: string;
  numericScore: number | string | { toNumber(): number };
  gradeCode: string | null;
  status: FinalGradeStatus | string;
  calculatedAt: Date;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type FinalGradeInput = {
  enrollmentId: string;
  classSubjectId: string;
  gradingSchemeId: string;
};

export interface FinalGradesRepository {
  findSchemeById(id: string): Promise<{
    id: string;
    classSubjectId: string;
    components: GradeComponent[];
  } | null>;
  listAssessmentScores(
    enrollmentId: string,
    classSubjectId: string,
  ): Promise<GradeScore[]>;
  findByEnrollmentClassSubject(
    enrollmentId: string,
    classSubjectId: string,
  ): Promise<FinalGradeRow | null>;
  findById(id: string): Promise<FinalGradeRow | null>;
  upsertGrade(data: {
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
  }): Promise<FinalGradeRow>;
  updateStatus(
    id: string,
    data: {
      status: string;
      approvedByUserId?: string | null;
      approvedAt?: Date | null;
    },
  ): Promise<FinalGradeRow>;
}

@Injectable()
export class FinalGradesService {
  constructor(
    @Inject(FINAL_GRADES_REPOSITORY)
    private readonly repo: FinalGradesRepository,
    private readonly audit: AuditService,
  ) {}

  async calculate(input: FinalGradeInput): Promise<FinalGradeRow> {
    if (
      !input.enrollmentId ||
      !input.classSubjectId ||
      !input.gradingSchemeId
    ) {
      throw new BadRequestException(
        'Enrollment, class subject and scheme are required',
      );
    }

    const scheme = await this.repo.findSchemeById(input.gradingSchemeId);
    if (!scheme) {
      throw new NotFoundException('Grading scheme not found');
    }

    if (scheme.classSubjectId !== input.classSubjectId) {
      throw new BadRequestException(
        'Grading scheme does not belong to the requested class subject',
      );
    }

    const scores = await this.repo.listAssessmentScores(
      input.enrollmentId,
      input.classSubjectId,
    );
    const scoreMap = new Map(
      scores.map((row) => [String(row.assessmentId), Number(row.score)]),
    );

    for (const component of scheme.components) {
      if (component.required && !scoreMap.has(String(component.assessmentId))) {
        throw new BadRequestException(
          `Missing required component for assessment ${component.assessmentId}`,
        );
      }
    }

    let weightedScore = 0;
    for (const component of scheme.components) {
      const assessmentId = String(component.assessmentId);
      const score = scoreMap.get(assessmentId);
      if (score === undefined) continue;
      const weight = Number(component.weight);
      weightedScore += (score * weight) / 100;
    }

    const numericScore = Number(weightedScore.toFixed(2));
    const gradeCode = scoreToGradeCode(numericScore);
    const existing = await this.repo.findByEnrollmentClassSubject(
      input.enrollmentId,
      input.classSubjectId,
    );
    const finalGrade = await this.repo.upsertGrade({
      id: existing?.id,
      enrollmentId: input.enrollmentId,
      classSubjectId: input.classSubjectId,
      gradingSchemeId: input.gradingSchemeId,
      numericScore,
      gradeCode,
      status:
        existing?.status === FinalGradeStatus.APPROVED
          ? FinalGradeStatus.APPROVED
          : FinalGradeStatus.CALCULATED,
      approvedByUserId: existing?.approvedByUserId ?? null,
      approvedAt: existing?.approvedAt ?? null,
      calculatedAt: existing?.calculatedAt ?? new Date(),
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.FINAL_GRADE_CALCULATED,
      resourceType: AUDIT_RESOURCE_TYPES.FINAL_GRADE,
      resourceId: finalGrade.id,
      before: existing ?? null,
      after: finalGrade,
      metadata: {
        enrollmentId: input.enrollmentId,
        classSubjectId: input.classSubjectId,
      },
    });

    return finalGrade;
  }

  async findOne(id: string): Promise<FinalGradeRow> {
    const grade = await this.repo.findById(id);
    if (!grade) throw new NotFoundException('Final grade not found');
    return grade;
  }

  async approve(
    id: string,
    dto: { approvedByUserId: string },
  ): Promise<FinalGradeRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Final grade not found');

    const approved = await this.repo.updateStatus(id, {
      status: FinalGradeStatus.APPROVED,
      approvedByUserId: dto.approvedByUserId,
      approvedAt: new Date(),
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.FINAL_GRADE_APPROVED,
      resourceType: AUDIT_RESOURCE_TYPES.FINAL_GRADE,
      resourceId: id,
      before: existing,
      after: approved,
      metadata: { approvedByUserId: dto.approvedByUserId },
    });

    return approved;
  }

  /**
   * Reopens an approved final grade so it can be recalculated.
   *
   * Approving a grade is a formal act, so it is never undone implicitly. A
   * correction is an explicit, separately authorized step that leaves a
   * `FINAL_GRADE_REOPENED` audit entry recording who reopened it and the value
   * that was set aside — the history of the approved number survives the
   * correction.
   */
  async reopen(
    id: string,
    dto: { reopenedByUserId: string; note?: string },
  ): Promise<FinalGradeRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Final grade not found');
    if (existing.status !== FinalGradeStatus.APPROVED) {
      throw new ConflictException(
        'Only an approved final grade can be reopened',
      );
    }

    const reopened = await this.repo.updateStatus(id, {
      status: FinalGradeStatus.REOPENED,
      approvedByUserId: null,
      approvedAt: null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.FINAL_GRADE_REOPENED,
      resourceType: AUDIT_RESOURCE_TYPES.FINAL_GRADE,
      resourceId: id,
      before: existing,
      after: reopened,
      metadata: {
        reopenedByUserId: dto.reopenedByUserId,
        note: dto.note ?? null,
      },
    });

    return reopened;
  }

  async recalculate(input: FinalGradeInput): Promise<FinalGradeRow> {
    const existing = await this.repo.findByEnrollmentClassSubject(
      input.enrollmentId,
      input.classSubjectId,
    );
    if (existing && existing.status === FinalGradeStatus.APPROVED) {
      throw new ConflictException(
        'Approved final grade cannot be recalculated without reopening it first',
      );
    }

    return this.calculate(input);
  }
}

function scoreToGradeCode(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}
