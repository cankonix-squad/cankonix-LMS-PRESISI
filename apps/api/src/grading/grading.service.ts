import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
export interface GradingRepository {
  autoGradeAttempt(attemptId: string): Promise<unknown>;
  manualGrade(input: GradeInput): Promise<unknown>;
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
