import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { ManualGradeDto } from './dto/manual-grade.dto';

export const GRADING_REPOSITORY = Symbol('GRADING_REPOSITORY');

type GradeInput = {
  answerId: string;
  score: number;
  feedback?: string | null;
  graderPersonId?: string;
};

type GradingSchemeInput = {
  classSubjectId: string;
  name: string;
  status?: string;
  components?: Array<{
    assessmentId: string;
    name: string;
    weight: number;
    required?: boolean;
  }>;
};

type GradingComponentInput = {
  assessmentId: string;
  name: string;
  weight: number;
  required?: boolean;
};

type SchemeRecord = {
  id: string;
  classSubjectId: string;
  status?: string;
};

type AssessmentRecord = {
  id: string;
  classSubjectId: string;
};

type NumericLike = number | string | { toNumber(): number };

type ComponentRecord = {
  schemeId: string;
  assessmentId: string;
  weight: NumericLike;
  name?: string;
  required?: boolean;
};

export interface GradingRepository {
  autoGradeAttempt(attemptId: string): Promise<unknown>;
  manualGrade(input: GradeInput): Promise<unknown>;
  listSchemes(): Promise<unknown[]>;
  createScheme(data: Record<string, unknown>): Promise<unknown>;
  createComponent(data: Record<string, unknown>): Promise<unknown>;
  getScheme(id: string): Promise<unknown | null>;
  getAssessment(id: string): Promise<AssessmentRecord | null>;
  findComponentByAssessment(
    schemeId: string,
    assessmentId: string,
  ): Promise<ComponentRecord | null>;
  getSchemeComponents(schemeId: string): Promise<ComponentRecord[]>;
}

@Injectable()
export class GradingService {
  constructor(
    @Inject(GRADING_REPOSITORY) private readonly repo: GradingRepository,
    private readonly audit: AuditService,
  ) {}

  async autoGrade(attemptId: string) {
    const result = await this.repo.autoGradeAttempt(attemptId);
    await this.audit.record({
      action: AUDIT_ACTIONS.EXAM_AUTO_GRADED,
      resourceType: AUDIT_RESOURCE_TYPES.ANSWER_GRADE,
      resourceId: attemptId,
      after: { attemptId },
    });
    return result;
  }

  async manualGrade(answerId: string, dto: ManualGradeDto) {
    if (!Number.isFinite(dto.score) || dto.score < 0)
      throw new BadRequestException('Score must be non-negative');
    const result = await this.repo.manualGrade({
      answerId,
      score: dto.score,
      feedback: dto.feedback,
      graderPersonId: dto.graderPersonId,
    });
    await this.audit.record({
      action: AUDIT_ACTIONS.EXAM_MANUAL_GRADED,
      resourceType: AUDIT_RESOURCE_TYPES.ANSWER_GRADE,
      resourceId: answerId,
      after: { answerId, score: dto.score, graderPersonId: dto.graderPersonId },
    });
    return result;
  }

  async listSchemes() {
    return this.repo.listSchemes();
  }

  async getScheme(id: string) {
    const scheme = await this.repo.getScheme(id);
    if (!scheme) throw new NotFoundException('Grading scheme not found');
    return scheme;
  }

  async createScheme(dto: GradingSchemeInput) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Scheme name is required');

    const components = Array.isArray(dto.components) ? dto.components : [];
    this.assertSchemeTotal(components);

    const scheme = await this.repo.createScheme({
      classSubjectId: dto.classSubjectId,
      name,
      status: dto.status ?? 'DRAFT',
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADING_SCHEME_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADING_SCHEME,
      resourceId: (scheme as { id?: string }).id ?? null,
      after: scheme,
      metadata: { classSubjectId: dto.classSubjectId, name },
    });

    return scheme;
  }

  async createComponent(
    schemeId: string,
    dto: GradingComponentInput,
    schemeOverride?: SchemeRecord,
  ) {
    const scheme =
      schemeOverride ??
      ((await this.repo.getScheme(schemeId)) as SchemeRecord | null);
    if (!scheme) throw new BadRequestException('Grading scheme not found');

    const assessment = await this.repo.getAssessment(dto.assessmentId);
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.classSubjectId !== scheme.classSubjectId) {
      throw new BadRequestException(
        'Assessment must belong to the same class subject as the grading scheme',
      );
    }

    const weight = Number(dto.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new BadRequestException('Component weight must be greater than 0');
    }

    const existing = await this.repo.getSchemeComponents(schemeId);
    const duplicate = await this.repo.findComponentByAssessment(
      schemeId,
      dto.assessmentId,
    );
    if (duplicate) {
      throw new BadRequestException(
        'Each assessment can only be used once in a grading scheme',
      );
    }

    const total = existing.reduce(
      (sum, row) => sum + this.toWeight(row.weight),
      0,
    );
    if (total + weight > 100 + 1e-9) {
      throw new BadRequestException('Grading scheme weights must total 100');
    }

    const component = await this.repo.createComponent({
      schemeId,
      assessmentId: dto.assessmentId,
      name: dto.name,
      weight,
      required: dto.required ?? false,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADING_COMPONENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADING_COMPONENT,
      resourceId: (component as { id?: string }).id ?? null,
      after: component,
      metadata: { schemeId, assessmentId: dto.assessmentId, weight },
    });

    return component;
  }

  private assertSchemeTotal(components: Array<{ weight: number }>) {
    const total = components.reduce(
      (sum, row) => sum + this.toWeight(row.weight),
      0,
    );
    if (!Number.isFinite(total) || Math.abs(total - 100) > 1e-9) {
      throw new BadRequestException('Grading scheme weights must total 100');
    }
  }

  private toWeight(value: number | string | { toNumber(): number }): number {
    if (typeof value === 'object' && value && 'toNumber' in value) {
      return Number(value.toNumber());
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return numeric;
  }
}

export function scoreObjective(
  scoringRule: unknown,
  answerPayload: unknown,
  points: number,
): number {
  if (
    !scoringRule ||
    typeof scoringRule !== 'object' ||
    !answerPayload ||
    typeof answerPayload !== 'object'
  )
    return 0;
  const rule = scoringRule as { correctKeys?: unknown; answers?: unknown };
  const payload = answerPayload as { keys?: unknown; answer?: unknown };
  const expected = Array.isArray(rule.correctKeys)
    ? rule.correctKeys.map(String).sort()
    : [];
  const actual = Array.isArray(payload.keys)
    ? payload.keys.map(String).sort()
    : payload.answer === undefined
      ? []
      : [String(payload.answer)];
  if (
    expected.length !== actual.length ||
    expected.some((key, i) => key !== actual[i])
  )
    return 0;
  return points;
}

export function boundedScore(score: number, points: number): number {
  if (!Number.isFinite(score) || score < 0 || score > points)
    throw new BadRequestException(`Score must be between 0 and ${points}`);
  return Number(score.toFixed(2));
}
