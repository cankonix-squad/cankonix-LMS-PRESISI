import type { ReportingMetricRecord } from './reporting.types';

export type GraduationTrendGranularity =
  'COHORT' | 'YEAR' | 'QUARTER' | 'MONTH';

export interface GraduationTrendPoint {
  period: string;
  scopeCount: number;
  evaluationCount: number;
  eligibleCount: number;
  approvedCount: number;
  passCount: number;
  failCount: number;
  remedialCount: number;
  withdrawnCount: number;
  certificateIssuedCount: number;
  passRate: number;
  failRate: number;
  remedialRate: number;
  certificationRate: number;
}

/**
 * TASK-064 graduation trend rules.
 *
 * The endpoint reports only values already preserved in `reporting_metrics`.
 * `PASS`, `FAIL`, `REMEDIAL` and `WITHDRAWN` are counts of APPROVED graduation
 * decisions by verdict. The rates use `approvedCount` as the decision
 * denominator, while `certificationRate` tells whether approved PASS decisions
 * have become issued certificates. Empty denominators are zero, never NaN.
 */
export function buildGraduationTrends(
  rows: readonly ReportingMetricRecord[],
  limit: number,
  granularity: GraduationTrendGranularity,
): GraduationTrendPoint[] {
  const byPeriod = new Map<string, ReportingMetricRecord[]>();

  for (const row of rows) {
    const period = graduationPeriodKey(row, granularity);
    byPeriod.set(period, [...(byPeriod.get(period) ?? []), row]);
  }

  return [...byPeriod.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-limit)
    .map(([period, periodRows]) => toGraduationTrendPoint(period, periodRows));
}

export function graduationPeriodKey(
  row: Pick<ReportingMetricRecord, 'periodStart' | 'periodEnd'>,
  granularity: GraduationTrendGranularity,
): string {
  if (granularity === 'COHORT') {
    if (!row.periodStart && !row.periodEnd) return 'NO_PERIOD';
    const start = row.periodStart
      ? row.periodStart.toISOString().slice(0, 10)
      : 'OPEN';
    const end = row.periodEnd
      ? row.periodEnd.toISOString().slice(0, 10)
      : 'OPEN';
    return `${start}/${end}`;
  }

  const anchor = row.periodStart ?? row.periodEnd;
  if (!anchor) return 'NO_PERIOD';

  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + 1;
  if (granularity === 'YEAR') return String(year);
  if (granularity === 'QUARTER') {
    return `${year}-Q${Math.ceil(month / 3)}`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function toGraduationTrendPoint(
  period: string,
  rows: readonly ReportingMetricRecord[],
): GraduationTrendPoint {
  const totals = rows.reduce(
    (sum, row) => ({
      evaluationCount: sum.evaluationCount + row.graduationEvaluationCount,
      eligibleCount: sum.eligibleCount + row.graduationEligibleCount,
      approvedCount: sum.approvedCount + row.graduationApprovedCount,
      passCount: sum.passCount + row.graduationPassCount,
      failCount: sum.failCount + row.graduationFailCount,
      remedialCount: sum.remedialCount + row.graduationRemedialCount,
      withdrawnCount: sum.withdrawnCount + row.graduationWithdrawnCount,
      certificateIssuedCount: sum.certificateIssuedCount + row.graduatedCount,
    }),
    {
      evaluationCount: 0,
      eligibleCount: 0,
      approvedCount: 0,
      passCount: 0,
      failCount: 0,
      remedialCount: 0,
      withdrawnCount: 0,
      certificateIssuedCount: 0,
    },
  );

  return {
    period,
    scopeCount: rows.length,
    ...totals,
    passRate: safePercentage(totals.passCount, totals.approvedCount),
    failRate: safePercentage(totals.failCount, totals.approvedCount),
    remedialRate: safePercentage(totals.remedialCount, totals.approvedCount),
    certificationRate: safePercentage(
      totals.certificateIssuedCount,
      totals.passCount,
    ),
  };
}

function safePercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}
