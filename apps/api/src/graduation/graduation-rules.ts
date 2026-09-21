import { BadRequestException } from '@nestjs/common';
import {
  GraduationComponentOutcome,
  GraduationRuleComponentRecord,
  GraduationRuleRecord,
  GraduationSnapshot,
  NumericLike,
  EnrollmentEvaluationContext,
} from './graduation.types';

/**
 * Coerces any numeric representation Prisma may return into a plain number.
 *
 * `null`, `undefined` and unparseable values all become `null` so callers can
 * distinguish "no observed value" from "observed zero" — a distinction that
 * matters when a missing score must fail a requirement rather than silently
 * satisfy a `>= 0` threshold.
 */
export function toNumber(value: NumericLike | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const numeric = Number(value.toNumber());
    return Number.isFinite(numeric) ? numeric : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Validates the *shape* of a rule's components.
 *
 * This is invariant checking, not evaluation: it answers "is this rule
 * well-formed" so an obviously unusable rule cannot be saved at all. The rules
 * enforced here are:
 *
 * - Every component must carry the threshold that its type depends on.
 *   `ATTENDANCE_PERCENTAGE` and `FINAL_SCORE` are threshold-only; a rule that
 *   omitted the number would be meaningless.
 * - `REQUIRED_SUBJECT` must name a subject, and `FINAL_EXAM` must name an
 *   assessment, because those are the entities the evaluator looks up.
 * - Percentage-like thresholds stay inside 0–100. A threshold of 150 would make
 *   a rule that nobody can ever satisfy — almost certainly a data-entry error,
 *   so it is rejected at the boundary rather than discovered at graduation time.
 */
export function validateRuleComponents(
  components: Array<{
    componentType: string;
    label: string;
    thresholdValue: NumericLike | null;
    subjectId: string | null;
    assessmentId: string | null;
  }>,
): void {
  if (!Array.isArray(components) || components.length === 0) {
    throw new BadRequestException(
      'A graduation rule must declare at least one component',
    );
  }

  const seen = new Set<string>();

  for (const component of components) {
    const label = component.label?.trim();
    if (!label) {
      throw new BadRequestException('Every graduation component needs a label');
    }

    const threshold = toNumber(component.thresholdValue);

    const key = `${component.componentType}:${label}`;
    if (seen.has(key)) {
      throw new BadRequestException(
        `Duplicate graduation component "${label}" of type ${component.componentType}`,
      );
    }
    seen.add(key);

    switch (component.componentType) {
      case 'ATTENDANCE_PERCENTAGE':
      case 'FINAL_SCORE': {
        if (threshold === null) {
          throw new BadRequestException(
            `Component "${label}" of type ${component.componentType} requires a threshold`,
          );
        }
        assertPercentage(label, threshold);
        break;
      }
      case 'REQUIRED_SUBJECT': {
        if (!component.subjectId) {
          throw new BadRequestException(
            `Component "${label}" of type REQUIRED_SUBJECT requires a subjectId`,
          );
        }
        if (threshold !== null) {
          assertPercentage(label, threshold);
        }
        break;
      }
      case 'FINAL_EXAM': {
        if (!component.assessmentId) {
          throw new BadRequestException(
            `Component "${label}" of type FINAL_EXAM requires an assessmentId`,
          );
        }
        if (threshold !== null) {
          assertPercentage(label, threshold);
        }
        break;
      }
      default:
        throw new BadRequestException(
          `Unsupported graduation component type "${component.componentType}"`,
        );
    }
  }
}

function assertPercentage(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new BadRequestException(
      `Component "${label}" threshold must be between 0 and 100`,
    );
  }
}

/**
 * Evaluates one participant against one rule.
 *
 * This is the heart of TASK-052 and is deliberately a **pure function**: given a
 * rule and a context it returns the same outcome every time. That property is
 * what makes a stored snapshot reproducible — the same inputs re-evaluated later
 * still produce the same verdict, which is the whole point of snapshotting.
 *
 * A component is evaluated as follows, and a missing observation always fails:
 * - `ATTENDANCE_PERCENTAGE` — observed attendance vs. the threshold.
 * - `FINAL_SCORE` — the mean of the participant's approved/calculated final
 *   grades across the rule's class subjects at or above the threshold.
 * - `REQUIRED_SUBJECT` — the participant's final score for that curriculum
 *   subject at or above the threshold (default 0, meaning "must be graded").
 * - `FINAL_EXAM` — the best scored attempt for the named assessment at or above
 *   the threshold (default 0, meaning "must have sat it").
 *
 * The overall outcome is ELIGIBLE only when **every `required` component**
 * passes. Optional components are recorded as evidence but do not gate the
 * result, so a rule can carry advisory components without blocking graduation.
 */
export function evaluateEnrollment(
  rule: GraduationRuleRecord,
  context: EnrollmentEvaluationContext,
  evaluatedAt: Date = new Date(),
): {
  outcome: 'ELIGIBLE' | 'NOT_ELIGIBLE';
  components: GraduationComponentOutcome[];
  snapshot: GraduationSnapshot;
} {
  const ordered = [...rule.components].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );

  const components = ordered.map((component) =>
    evaluateComponent(component, context),
  );

  const eligible = components.every(
    (component) => !isRequired(ordered, component) || component.passed,
  );

  const snapshot: GraduationSnapshot = {
    ruleId: rule.id,
    ruleCode: rule.code,
    ruleVersion: rule.version,
    ruleStatus: rule.status,
    enrollmentId: context.enrollmentId,
    educationBatchId: context.educationBatchId,
    evaluatedAt: evaluatedAt.toISOString(),
    components,
    eligible,
  };

  return {
    outcome: eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    components,
    snapshot,
  };
}

function isRequired(
  components: GraduationRuleComponentRecord[],
  outcome: GraduationComponentOutcome,
): boolean {
  const match = components.find(
    (component) =>
      component.componentType === outcome.componentType &&
      component.label === outcome.label,
  );
  return match?.required ?? true;
}

/**
 * Observes a single component.
 *
 * Kept separate from the overall verdict so each requirement's reasoning is
 * local and testable on its own, and so the persisted detail row can carry the
 * exact note explaining why it passed or failed.
 */
export function evaluateComponent(
  component: GraduationRuleComponentRecord,
  context: EnrollmentEvaluationContext,
): GraduationComponentOutcome {
  switch (component.componentType) {
    case 'ATTENDANCE_PERCENTAGE': {
      const threshold = toNumber(component.thresholdValue);
      const observed = context.attendancePercentage;
      return outcome(
        component,
        observed,
        threshold,
        observed !== null && threshold !== null && observed >= threshold,
        observed === null ? 'No attendance record for this enrollment' : null,
      );
    }

    case 'FINAL_SCORE': {
      const threshold = toNumber(component.thresholdValue);
      const scores = [...context.finalScoresByClassSubject.values()];
      const observed =
        scores.length === 0
          ? null
          : Number(
              (
                scores.reduce((sum, score) => sum + score, 0) / scores.length
              ).toFixed(2),
            );
      return outcome(
        component,
        observed,
        threshold,
        observed !== null && threshold !== null && observed >= threshold,
        observed === null
          ? 'No final grade recorded for any class subject'
          : null,
      );
    }

    case 'REQUIRED_SUBJECT': {
      const threshold = toNumber(component.thresholdValue) ?? 0;
      const observed = component.subjectId
        ? (context.finalScoresByCurriculumSubject.get(component.subjectId) ??
          null)
        : null;
      return outcome(
        component,
        observed,
        threshold,
        observed !== null && observed >= threshold,
        observed === null
          ? `No final grade recorded for required subject ${component.subjectId ?? '(none)'}`
          : null,
      );
    }

    case 'FINAL_EXAM': {
      const threshold = toNumber(component.thresholdValue) ?? 0;
      const observed = component.assessmentId
        ? (context.finalExamScoresByAssessment.get(component.assessmentId) ??
          null)
        : null;
      return outcome(
        component,
        observed,
        threshold,
        observed !== null && observed >= threshold,
        observed === null
          ? `No graded attempt for final exam ${component.assessmentId ?? '(none)'}`
          : null,
      );
    }

    default:
      return {
        componentType: component.componentType,
        label: component.label,
        observedValue: null,
        thresholdValue: toNumber(component.thresholdValue),
        passed: false,
        note: `Unsupported component type ${component.componentType}`,
      };
  }
}

function outcome(
  component: GraduationRuleComponentRecord,
  observed: number | null,
  threshold: number | null,
  passed: boolean,
  note: string | null,
): GraduationComponentOutcome {
  return {
    componentType: component.componentType,
    label: component.label,
    observedValue: observed,
    thresholdValue: threshold,
    passed,
    note,
  };
}
