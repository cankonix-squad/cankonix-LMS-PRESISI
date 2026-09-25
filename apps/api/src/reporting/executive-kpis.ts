import { ReportingScopeType } from '@prisma/client';
import type { ExecutiveSums, ReportingMetricRecord } from './reporting.types';

/**
 * Executive KPI rules (TASK-061).
 *
 * ## The rule this file exists to enforce
 *
 * **Averages are never averaged.**
 *
 * Every figure below is `sum(total) / sum(denominator)` across the scopes in the
 * roll-up. The tempting shortcut — averaging the `averageProgressPercent` already
 * stored on each row — is wrong in a way that is invisible on a dashboard: a
 * class of 8 and a class of 400 would carry the same weight, so a single small
 * class could move a national figure. The stored totals and denominators exist
 * precisely so this file does not have to choose between being fast and being
 * right.
 *
 * Attendance is the same shape: `sum(attended) / sum(sessions)`, not the mean of
 * per-scope percentages, because a scope with three sessions should not outweigh
 * one with three hundred.
 *
 * Empty denominators report `0`, never `NaN` and never `null`. A KPI that renders
 * as `NaN%` is worse than one that renders `0%` next to a zero participant count.
 *
 * ## Why this is pure
 *
 * "Consistent KPI definitions" is a property that has to hold across TASK-061,
 * TASK-063 and TASK-064. Putting the definitions in one pure module means the
 * consistency is a single implementation rather than a convention that three
 * tasks agree to follow, and it makes the "KPI fixture" criterion something that
 * can be asserted directly.
 */

/** A zeroed sum set, so a scope with no rows still produces a valid KPI block. */
export function emptyExecutiveSums(): ExecutiveSums {
  return {
    scopeCount: 0,
    participants: 0,
    activeParticipants: 0,
    attendedCount: 0,
    totalSessions: 0,
    progressPercentTotal: 0,
    progressSampleCount: 0,
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
  };
}

/** The KPI block an executive overview returns. */
export interface ExecutiveKpis {
  participants: number;
  activeParticipants: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
  gradedCount: number;
  unapprovedGradeCount: number;
  graduationEvaluationCount: number;
  graduationEligibleCount: number;
  graduationApprovedCount: number;
  graduationPassCount: number;
  graduationFailCount: number;
  graduationRemedialCount: number;
  graduationWithdrawnCount: number;
  graduatedCount: number;
  /** Share of in-force decisions that produced a certificate, 0-100. */
  certificationRate: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Turns summed totals into the reported KPI block.
 *
 * The graduation figures are reported as three separate counts rather than one
 * "graduated" number, because they are three different facts: how many
 * participants the rule engine evaluated, how many decisions are in force, and
 * how many documents were actually issued. Collapsing them would hide the case
 * that matters operationally — a decision approved but never certified.
 */
export function toExecutiveKpis(sums: ExecutiveSums): ExecutiveKpis {
  return {
    participants: sums.participants,
    activeParticipants: sums.activeParticipants,
    averageProgressPercent:
      sums.progressSampleCount > 0
        ? round2(sums.progressPercentTotal / sums.progressSampleCount)
        : 0,
    attendancePercentage:
      sums.totalSessions > 0
        ? round2((sums.attendedCount / sums.totalSessions) * 100)
        : 0,
    totalSessions: sums.totalSessions,
    averageFinalScore:
      sums.gradedCount > 0
        ? round2(sums.finalScoreTotal / sums.gradedCount)
        : 0,
    gradedCount: sums.gradedCount,
    unapprovedGradeCount: sums.unapprovedGradeCount,
    graduationEvaluationCount: sums.graduationEvaluationCount,
    graduationEligibleCount: sums.graduationEligibleCount,
    graduationApprovedCount: sums.graduationApprovedCount,
    graduationPassCount: sums.graduationPassCount,
    graduationFailCount: sums.graduationFailCount,
    graduationRemedialCount: sums.graduationRemedialCount,
    graduationWithdrawnCount: sums.graduationWithdrawnCount,
    graduatedCount: sums.graduatedCount,
    certificationRate:
      sums.graduationApprovedCount > 0
        ? round2((sums.graduatedCount / sums.graduationApprovedCount) * 100)
        : 0,
  };
}

/**
 * Adds one stored metric row into a running sum.
 *
 * Accumulating rows is the only arithmetic this module does; the division happens
 * once at the end in `toExecutiveKpis`. That ordering is what keeps a roll-up
 * exact rather than a mean of rounded means.
 */
export function addMetricToSums(
  sums: ExecutiveSums,
  row: ReportingMetricRecord,
): ExecutiveSums {
  return {
    scopeCount: sums.scopeCount + 1,
    participants: sums.participants + row.participants,
    activeParticipants: sums.activeParticipants + row.activeParticipants,
    attendedCount: sums.attendedCount + row.attendedCount,
    totalSessions: sums.totalSessions + row.totalSessions,
    progressPercentTotal: sums.progressPercentTotal + row.progressPercentTotal,
    progressSampleCount: sums.progressSampleCount + row.progressSampleCount,
    finalScoreTotal: sums.finalScoreTotal + row.finalScoreTotal,
    gradedCount: sums.gradedCount + row.gradedCount,
    unapprovedGradeCount: sums.unapprovedGradeCount + row.unapprovedGradeCount,
    graduationEvaluationCount:
      sums.graduationEvaluationCount + row.graduationEvaluationCount,
    graduationEligibleCount:
      sums.graduationEligibleCount + row.graduationEligibleCount,
    graduationApprovedCount:
      sums.graduationApprovedCount + row.graduationApprovedCount,
    graduationPassCount:
      sums.graduationPassCount + (row.graduationPassCount ?? 0),
    graduationFailCount:
      sums.graduationFailCount + (row.graduationFailCount ?? 0),
    graduationRemedialCount:
      sums.graduationRemedialCount + (row.graduationRemedialCount ?? 0),
    graduationWithdrawnCount:
      sums.graduationWithdrawnCount + (row.graduationWithdrawnCount ?? 0),
    graduatedCount: sums.graduatedCount + row.graduatedCount,
  };
}

/** Sums a set of stored rows. Equivalent to what the database aggregation does. */
export function sumMetricRows(
  rows: readonly ReportingMetricRecord[],
): ExecutiveSums {
  return rows.reduce(addMetricToSums, emptyExecutiveSums());
}

/**
 * The levels the executive overview may aggregate at.
 *
 * Deliberately excludes `CLASS_SUBJECT` and `ENROLLMENT`. Rows at a level must be
 * **disjoint** for summing to be meaningful, and a class subject's roster repeats
 * the class roster once per subject — summing participants across subjects would
 * count the same person several times. Organization, program, batch and class are
 * nested rosters, so each is disjoint within itself.
 *
 * This is also why the overview's headline KPI list names institutions, programs,
 * batches and classes and not subjects.
 */
export const EXECUTIVE_AGGREGATE_LEVELS: readonly ReportingScopeType[] = [
  ReportingScopeType.ORGANIZATION,
  ReportingScopeType.PROGRAM,
  ReportingScopeType.BATCH,
  ReportingScopeType.CLASS,
];

export function isExecutiveAggregateLevel(level: ReportingScopeType): boolean {
  return EXECUTIVE_AGGREGATE_LEVELS.includes(level);
}

/** Whether a metric row may be summed into an executive roll-up. */
export function isExecutiveRollupRow(row: ReportingMetricRecord): boolean {
  return isExecutiveAggregateLevel(row.scopeType);
}
