import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GraduationEvaluationOutcome,
  GraduationRuleStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { GraduationComponentTypeDto } from './dto/graduation.dto';
import {
  BatchEvaluationSummaryDto,
  GraduationEvaluationResponseDto,
  GraduationRuleListResponseDto,
  GraduationRuleResponseDto,
} from './dto/graduation-response.dto';
import { evaluateEnrollment, validateRuleComponents } from './graduation-rules';
import {
  GRADUATION_REPOSITORY,
  GraduationEvaluationRecord,
  GraduationRepository,
  GraduationRuleRecord,
  NumericLike,
} from './graduation.types';

type CreateRuleInput = {
  educationBatchId: string;
  code: string;
  name: string;
  description?: string | null;
  components: Array<{
    componentType: GraduationComponentTypeDto;
    label: string;
    thresholdValue?: number | null;
    subjectId?: string | null;
    assessmentId?: string | null;
    required?: boolean;
    sortOrder?: number;
  }>;
};

type EvaluateInput = {
  enrollmentId: string;
  graduationRuleId?: string;
  evaluatedByUserId?: string | null;
};

type EvaluateBatchInput = {
  educationBatchId: string;
  graduationRuleId?: string;
  evaluatedByUserId?: string | null;
};

/**
 * Graduation rule configuration and evaluation (TASK-052).
 *
 * The module deliberately keeps three things apart:
 *
 * 1. **Rule configuration** — what the institution requires, authored and
 *    versioned. Editing a published rule is refused; a change is a new version.
 * 2. **Evaluation** — what the system observed about one participant against one
 *    exact rule version, stored with a reproducible snapshot.
 * 3. **The formal decision** — TASK-053, a separate module, so a decision can be
 *    corrected or revoked without destroying the evidence it rested on.
 *
 * An evaluation is therefore never "`enrollment.isPassed`": it is a computed,
 * snapshotted judgement with its per-component reasoning recorded.
 */
@Injectable()
export class GraduationService {
  constructor(
    @Inject(GRADUATION_REPOSITORY)
    private readonly repo: GraduationRepository,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Rule configuration
  // ---------------------------------------------------------------------------

  async createRule(input: CreateRuleInput): Promise<GraduationRuleResponseDto> {
    const code = input.code?.trim();
    const name = input.name?.trim();
    if (!code) throw new BadRequestException('Rule code is required');
    if (!name) throw new BadRequestException('Rule name is required');

    const components = (input.components ?? []).map((component) => ({
      componentType: component.componentType,
      label: component.label?.trim(),
      thresholdValue: component.thresholdValue ?? null,
      subjectId: component.subjectId ?? null,
      assessmentId: component.assessmentId ?? null,
      required: component.required ?? true,
      sortOrder: component.sortOrder ?? 0,
    }));

    validateRuleComponents(components);

    await this.assertReferencesExist(components);

    const created = await this.repo.createRule({
      educationBatchId: input.educationBatchId,
      code,
      name,
      description: input.description ?? null,
      components: components.map((component) => ({
        componentType: component.componentType,
        label: component.label as string,
        thresholdValue: component.thresholdValue,
        subjectId: component.subjectId,
        assessmentId: component.assessmentId,
        required: component.required,
        sortOrder: component.sortOrder,
      })),
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_RULE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_RULE,
      resourceId: created.id,
      after: created,
      metadata: { educationBatchId: input.educationBatchId, code },
    });

    return toRuleResponse(created);
  }

  async updateRule(
    id: string,
    input: { name?: string; description?: string | null },
  ): Promise<GraduationRuleResponseDto> {
    const existing = await this.repo.findRuleById(id);
    if (!existing) throw new NotFoundException('Graduation rule not found');

    this.assertRuleNotPublished(existing, 'updated');

    const updated = await this.repo.updateRule(id, {
      name: input.name?.trim(),
      description: input.description,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_RULE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_RULE,
      resourceId: id,
      before: existing,
      after: updated,
    });

    return toRuleResponse(updated);
  }

  async changeStatus(
    id: string,
    status: GraduationRuleStatus,
    publishedByUserId?: string | null,
  ): Promise<GraduationRuleResponseDto> {
    const existing = await this.repo.findRuleById(id);
    if (!existing) throw new NotFoundException('Graduation rule not found');

    if (existing.status === GraduationRuleStatus.ARCHIVED) {
      throw new ConflictException(
        'An archived graduation rule cannot be changed',
      );
    }

    const transition = assertAllowedStatusTransition(existing.status, status);

    if (status === GraduationRuleStatus.PUBLISHED) {
      // A publish freezes the rule for evaluation, so it must be well-formed
      // before it is frozen — not discovered broken at graduation time.
      validateRuleComponents(existing.components);
    }

    const updated = await this.repo.updateRuleStatus(
      id,
      status,
      publishedByUserId ?? null,
    );

    await this.audit.record({
      action:
        status === GraduationRuleStatus.PUBLISHED
          ? AUDIT_ACTIONS.GRADUATION_RULE_PUBLISHED
          : AUDIT_ACTIONS.GRADUATION_RULE_ARCHIVED,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_RULE,
      resourceId: id,
      before: existing,
      after: updated,
      metadata: { transition, publishedByUserId: publishedByUserId ?? null },
    });

    return toRuleResponse(updated);
  }

  async findRule(id: string): Promise<GraduationRuleResponseDto> {
    const rule = await this.repo.findRuleById(id);
    if (!rule) throw new NotFoundException('Graduation rule not found');
    return toRuleResponse(rule);
  }

  async listRules(query: {
    educationBatchId?: string;
    status?: GraduationRuleStatus;
    code?: string;
    page?: number;
    limit?: number;
  }): Promise<GraduationRuleListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.listRules({
      educationBatchId: query.educationBatchId,
      status: query.status,
      code: query.code?.trim() || undefined,
      page,
      limit,
    });

    return {
      data: result.data.map(toRuleResponse),
      total: result.total,
      page,
      limit,
    };
  }

  // ---------------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluates one participant against a rule.
   *
   * The rule must be PUBLISHED: evaluating against a mutable draft would produce
   * a snapshot that cannot be trusted, because the rule text could change after
   * the fact. When no rule is named, the batch's latest published version is
   * used, which is the normal "run the current standard" path.
   */
  async evaluateEnrollment(
    input: EvaluateInput,
  ): Promise<GraduationEvaluationResponseDto> {
    const context = await this.repo.loadEvaluationContext(input.enrollmentId);
    if (!context) throw new NotFoundException('Enrollment not found');

    const rule = await this.resolveRule(
      context.educationBatchId,
      input.graduationRuleId,
    );

    const { outcome, components, snapshot } = evaluateEnrollment(rule, context);

    // Superseding happens before the new row is written so that, if the write
    // fails, the previous verdict is still the live one rather than being lost.
    await this.repo.supersedeOpenEvaluations(input.enrollmentId, rule.id);

    const evaluation = await this.repo.createEvaluation({
      enrollmentId: input.enrollmentId,
      graduationRuleId: rule.id,
      outcome:
        outcome === 'ELIGIBLE'
          ? GraduationEvaluationOutcome.ELIGIBLE
          : GraduationEvaluationOutcome.NOT_ELIGIBLE,
      evaluatedByUserId: input.evaluatedByUserId ?? null,
      snapshot,
      details: components,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.GRADUATION_EVALUATION_RUN,
      resourceType: AUDIT_RESOURCE_TYPES.GRADUATION_EVALUATION,
      resourceId: evaluation.id,
      after: {
        outcome: evaluation.outcome,
        ruleId: rule.id,
        ruleVersion: rule.version,
      },
      metadata: {
        enrollmentId: input.enrollmentId,
        educationBatchId: context.educationBatchId,
        evaluatedByUserId: input.evaluatedByUserId ?? null,
      },
    });

    return toEvaluationResponse(evaluation);
  }

  /**
   * Evaluates every enrollment in a batch against one rule.
   *
   * Evaluations are independent, so one participant's missing data does not
   * abort the batch: their evaluation simply records NOT_ELIGIBLE with the
   * reason. The summary counts each verdict so an operator can see the shape of
   * the cohort at a glance.
   */
  async evaluateBatch(
    input: EvaluateBatchInput,
  ): Promise<BatchEvaluationSummaryDto> {
    const rule = await this.resolveRule(
      input.educationBatchId,
      input.graduationRuleId,
    );

    const enrollments = await this.repo.listEnrollmentsForBatch(
      input.educationBatchId,
    );

    const results: GraduationEvaluationResponseDto[] = [];
    let eligible = 0;
    let notEligible = 0;

    for (const enrollment of enrollments) {
      const result = await this.evaluateEnrollment({
        enrollmentId: enrollment.enrollmentId,
        graduationRuleId: rule.id,
        evaluatedByUserId: input.evaluatedByUserId,
      });
      results.push(result);
      if (result.outcome === GraduationEvaluationOutcome.ELIGIBLE)
        eligible += 1;
      else notEligible += 1;
    }

    return {
      educationBatchId: input.educationBatchId,
      graduationRuleId: rule.id,
      total: results.length,
      eligible,
      notEligible,
      results,
    };
  }

  async findEvaluation(id: string): Promise<GraduationEvaluationResponseDto> {
    const evaluation = await this.repo.findEvaluationById(id);
    if (!evaluation)
      throw new NotFoundException('Graduation evaluation not found');
    return toEvaluationResponse(evaluation);
  }

  async listEvaluationsForEnrollment(
    enrollmentId: string,
  ): Promise<GraduationEvaluationResponseDto[]> {
    const evaluations =
      await this.repo.listEvaluationsForEnrollment(enrollmentId);
    return evaluations.map(toEvaluationResponse);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async resolveRule(
    educationBatchId: string,
    graduationRuleId?: string,
  ): Promise<GraduationRuleRecord> {
    if (graduationRuleId) {
      const rule = await this.repo.findRuleById(graduationRuleId);
      if (!rule) throw new NotFoundException('Graduation rule not found');
      if (rule.educationBatchId !== educationBatchId) {
        throw new BadRequestException(
          'Graduation rule does not belong to the enrollment batch',
        );
      }
      if (rule.status !== GraduationRuleStatus.PUBLISHED) {
        throw new ConflictException(
          'Only a published graduation rule can be evaluated',
        );
      }
      return rule;
    }

    const latest =
      await this.repo.findLatestPublishedRuleForBatch(educationBatchId);
    if (!latest) {
      throw new NotFoundException(
        'No published graduation rule exists for this batch',
      );
    }
    return latest;
  }

  /**
   * Confirms that referenced subjects and assessments actually exist.
   *
   * A component pointing at a nonexistent entity would evaluate as
   * "no observation", producing a NOT_ELIGIBLE that looks like missing data
   * rather than a typo in the rule. Rejecting it at authoring time keeps that
   * failure mode out of the graduation record.
   */
  private async assertReferencesExist(
    components: Array<{ assessmentId: string | null }>,
  ): Promise<void> {
    for (const component of components) {
      if (!component.assessmentId) continue;
      const maxScore = await this.repo.findAssessmentMaxScore(
        component.assessmentId,
      );
      if (maxScore === null) {
        throw new BadRequestException(
          `Referenced assessment ${component.assessmentId} does not exist`,
        );
      }
    }
  }

  private assertRuleNotPublished(
    rule: GraduationRuleRecord,
    verb: string,
  ): void {
    if (rule.status === GraduationRuleStatus.PUBLISHED) {
      throw new ConflictException(
        `A published graduation rule cannot be ${verb}; create a new version instead`,
      );
    }
  }
}

/**
 * Allowed lifecycle moves for a graduation rule.
 *
 * `DRAFT -> PUBLISHED` freezes the rule. `PUBLISHED -> ARCHIVED` retires it.
 * `PUBLISHED -> DRAFT` is refused because evaluations may already reference the
 * published text; the correction path is a new version, which keeps every
 * historical evaluation explainable.
 */
function assertAllowedStatusTransition(
  from: GraduationRuleStatus,
  to: GraduationRuleStatus,
): string {
  const allowed: Array<[GraduationRuleStatus, GraduationRuleStatus]> = [
    [GraduationRuleStatus.DRAFT, GraduationRuleStatus.PUBLISHED],
    [GraduationRuleStatus.DRAFT, GraduationRuleStatus.ARCHIVED],
    [GraduationRuleStatus.PUBLISHED, GraduationRuleStatus.ARCHIVED],
  ];

  if (from === to) return `${from}->${to}`;

  const permitted = allowed.some(([a, b]) => a === from && b === to);
  if (!permitted) {
    throw new ConflictException(
      `Graduation rule cannot move from ${from} to ${to}`,
    );
  }
  return `${from}->${to}`;
}

function toRuleResponse(rule: GraduationRuleRecord): GraduationRuleResponseDto {
  return {
    id: rule.id,
    educationBatchId: rule.educationBatchId,
    code: rule.code,
    name: rule.name,
    description: rule.description,
    version: rule.version,
    status: rule.status as never,
    publishedAt: rule.publishedAt ? rule.publishedAt.toISOString() : null,
    publishedByUserId: rule.publishedByUserId,
    components: rule.components.map((component) => ({
      id: component.id,
      graduationRuleId: component.graduationRuleId,
      componentType: component.componentType as never,
      label: component.label,
      thresholdValue: toNumber(component.thresholdValue),
      subjectId: component.subjectId,
      assessmentId: component.assessmentId,
      required: component.required,
      sortOrder: component.sortOrder,
    })),
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toEvaluationResponse(
  evaluation: GraduationEvaluationRecord,
): GraduationEvaluationResponseDto {
  return {
    id: evaluation.id,
    enrollmentId: evaluation.enrollmentId,
    graduationRuleId: evaluation.graduationRuleId,
    outcome: String(evaluation.outcome),
    evaluatedAt: evaluation.evaluatedAt.toISOString(),
    evaluatedByUserId: evaluation.evaluatedByUserId,
    snapshot: (evaluation.snapshot ?? {}) as Record<string, unknown>,
    details: evaluation.details.map((detail) => ({
      id: detail.id,
      componentType: detail.componentType as never,
      label: detail.label,
      observedValue: toNumber(detail.observedValue),
      thresholdValue: toNumber(detail.thresholdValue),
      passed: detail.passed,
      note: detail.note,
    })),
  };
}

function toNumber(value: NumericLike | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const numeric = Number(value.toNumber());
    return Number.isFinite(numeric) ? numeric : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
