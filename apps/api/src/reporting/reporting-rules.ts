import { ReportingScopeType } from '@prisma/client';
import type {
  ReportingMetrics,
  ReportingScopeDescriptor,
  ReportingSourceCounts,
} from './reporting.types';

/**
 * Pure reporting aggregation rules (TASK-060).
 *
 * Free of Nest and Prisma so the aggregate definitions live in one testable
 * place instead of being spread across SQL. `docs/03-data-architecture.md`
 * requires aggregate definitions to be documented, and a function with a
 * denominator written next to it is the documentation: a reader can see exactly
 * what was counted and what was divided by what.
 *
 * ## The definitions, stated once
 *
 * - **participants** — enrollments on roll in the scope, regardless of status.
 *   This is the denominator for "how many people are we reporting on", so it
 *   deliberately includes participants who later withdrew: a cohort of 40 that
 *   lost 3 people is still a cohort of 40.
 * - **activeParticipants** — those whose enrollment status is `ACTIVE`. Reported
 *   alongside `participants` rather than instead of it, because "40 enrolled, 37
 *   active" is a different statement from "37 enrolled".
 * - **averageProgressPercent** — the **mean of per-participant progress**, not the
 *   mean over activities. Averaging per participant gives each person equal
 *   weight, which is what "how far has this class got" means; averaging over
 *   activities would let one participant with many activities dominate.
 * - **attendancePercentage** — summed attendance events divided by summed
 *   possible attendances across *closed* sessions only (see the attendance
 *   summary repository for why: an unrecorded closed session counts as ABSENT,
 *   and an open session has no settled denominator). `present + late` count as
 *   attended; `excused`, `sick` and `absent` do not.
 * - **averageFinalScore** — the mean of `final_grades.numeric_score` across
 *   subjects. It is the mean of stored grades, **not** of participants: a
 *   participant graded in four subjects contributes four values, which is what
 *   makes it a statement about coursework rather than about people.
 * - **gradedCount** / **unapprovedGradeCount** — how many grades exist, and how
 *   many are still `CALCULATED` rather than `APPROVED`. The second is the one
 *   that matters operationally: a report built on unapproved grades is provisional.
 *
 * ## Empty scopes
 *
 * A scope with no participants reports **zero**, not `null` or `NaN`. Division
 * by zero is not a meaningful statistic, and a dashboard that renders `NaN%` is
 * worse than one that renders `0%` next to a zero participant count.
 */

/** Rounds to two decimals, matching the precision stored in the database. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Mean of a total over a count, or 0 when there is nothing to average. */
export function safeAverage(total: number, count: number): number {
  if (count <= 0) return 0;
  return round2(total / count);
}

/** Ratio as a percentage, or 0 when the denominator is empty. */
export function safePercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
}

/**
 * Derives the reported metrics from raw counters.
 *
 * The entire aggregation policy is this one function, which is what makes
 * "fixture totals match transactional data" a property that can be asserted
 * directly rather than inferred from a dashboard.
 */
export function deriveMetrics(counts: ReportingSourceCounts): ReportingMetrics {
  const attended = counts.presentCount + counts.lateCount;
  const possibleAttendances = counts.totalSessions;

  return {
    participants: counts.participants,
    activeParticipants: counts.activeParticipants,
    averageProgressPercent: safeAverage(
      counts.progressPercentTotal,
      counts.progressPercentCount,
    ),
    attendancePercentage: safePercentage(attended, possibleAttendances),
    totalSessions: counts.totalSessions,
    averageFinalScore: safeAverage(counts.finalScoreTotal, counts.gradedCount),
    gradedCount: counts.gradedCount,
    unapprovedGradeCount: counts.unapprovedGradeCount,
  };
}

/** An empty counter set, so a scope with no data still produces a valid row. */
export function emptySourceCounts(): ReportingSourceCounts {
  return {
    participants: 0,
    activeParticipants: 0,
    progressPercentTotal: 0,
    progressPercentCount: 0,
    presentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    sickCount: 0,
    absentCount: 0,
    totalSessions: 0,
    finalScoreTotal: 0,
    gradedCount: 0,
    unapprovedGradeCount: 0,
    graduationEvaluationCount: 0,
    graduationEligibleCount: 0,
    graduationApprovedCount: 0,
    graduationPassCount: 0,
    graduationFailCount: 0,
    graduationRemedialCount: 0,
    graduationWithdrawnCount: 0,
    graduatedCount: 0,
    periodStart: null,
    periodEnd: null,
  };
}

/**
 * The stored shape of a metric row, before it reaches Prisma (TASK-061).
 *
 * Separated from `deriveMetrics` because it is not a *statistic*: it is the same
 * numbers plus the denominators and offsets that make a later roll-up exact and a
 * later period filter possible. Keeping it a distinct function means the rounding
 * policy and the storage policy can be read and tested independently.
 */
export interface DerivedMetricFields {
  participants: number;
  activeParticipants: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
  gradedCount: number;
  unapprovedGradeCount: number;
  attendedCount: number;
  progressPercentTotal: number;
  progressSampleCount: number;
  finalScoreTotal: number;
  graduationEvaluationCount: number;
  graduationEligibleCount: number;
  graduationApprovedCount: number;
  graduationPassCount: number;
  graduationFailCount: number;
  graduationRemedialCount: number;
  graduationWithdrawnCount: number;
  graduatedCount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}

/**
 * Everything a refresh stores for one scope.
 *
 * The totals (`attendedCount`, `progressPercentTotal`, `finalScoreTotal`) and
 * their denominators are stored alongside the rounded averages on purpose. They
 * are not redundant: an executive roll-up (TASK-061) must combine child scopes,
 * and combining rounded averages would let a class of 8 outweigh a class of 400.
 * Storing the sums is what makes the parent figure `sum(total) / sum(count)`
 * instead of an approximation.
 */
export function deriveMetricFields(
  counts: ReportingSourceCounts,
): DerivedMetricFields {
  return {
    ...deriveMetrics(counts),
    attendedCount: counts.presentCount + counts.lateCount,
    progressPercentTotal: counts.progressPercentTotal,
    progressSampleCount: counts.progressPercentCount,
    finalScoreTotal: counts.finalScoreTotal,
    graduationEvaluationCount: counts.graduationEvaluationCount,
    graduationEligibleCount: counts.graduationEligibleCount,
    graduationApprovedCount: counts.graduationApprovedCount,
    graduationPassCount: counts.graduationPassCount,
    graduationFailCount: counts.graduationFailCount,
    graduationRemedialCount: counts.graduationRemedialCount,
    graduationWithdrawnCount: counts.graduationWithdrawnCount,
    graduatedCount: counts.graduatedCount,
    periodStart: counts.periodStart,
    periodEnd: counts.periodEnd,
  };
}

/**
 * Reporting scope nesting, outermost first.
 *
 * Used by the drill-down (TASK-062) to insist that a child scope must name its
 * parent. Declaring the order here means "Organization → Program → Batch → Class
 * → ClassSubject" is stated once rather than re-derived at each call site.
 */
export const REPORTING_SCOPE_ORDER: readonly ReportingScopeType[] = [
  ReportingScopeType.ORGANIZATION,
  ReportingScopeType.PROGRAM,
  ReportingScopeType.BATCH,
  ReportingScopeType.CLASS,
  ReportingScopeType.CLASS_SUBJECT,
];

/** The parent scope type of a scope, or null for the top level. */
export function parentScopeType(
  scopeType: ReportingScopeType,
): ReportingScopeType | null {
  const index = REPORTING_SCOPE_ORDER.indexOf(scopeType);
  if (index <= 0) return null;
  return REPORTING_SCOPE_ORDER[index - 1] ?? null;
}

/**
 * Whether a scope descriptor carries the id of the parent it claims.
 *
 * A drill-down must never be able to jump from one branch of the hierarchy into
 * another by passing an unrelated id, so the child is required to name its
 * parent rather than trusting an id the caller supplied.
 */
export function scopeNamesItsParent(scope: ReportingScopeDescriptor): boolean {
  const parent = parentScopeType(scope.scopeType);
  if (parent === null) return true;

  switch (parent) {
    case ReportingScopeType.ORGANIZATION:
      return scope.organizationId !== null;
    case ReportingScopeType.PROGRAM:
      return scope.educationProgramId !== null;
    case ReportingScopeType.BATCH:
      return scope.educationBatchId !== null;
    case ReportingScopeType.CLASS:
      return scope.academicClassId !== null;
    case ReportingScopeType.CLASS_SUBJECT:
      return scope.classSubjectId !== null;
    default:
      return false;
  }
}

/**
 * Stable identity of a scope, matching the `(scopeType, scopeId)` unique key.
 *
 * Used as the refresh report's key so two refreshes of the same scope are
 * visibly the same scope.
 */
export function scopeKey(
  scopeType: ReportingScopeType,
  scopeId: string,
): string {
  return `${scopeType}:${scopeId}`;
}
