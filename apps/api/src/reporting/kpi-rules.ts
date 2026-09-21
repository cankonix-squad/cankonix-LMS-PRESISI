import { ReportingScopeType } from '@prisma/client';
import {
  emptyExecutiveSums,
  sumMetricRows,
  toExecutiveKpis,
} from './executive-kpis';
import type { ExecutiveKpis } from './executive-kpis';
import type { ExecutiveSums, ReportingMetricRecord } from './reporting.types';

export interface KpiBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  participants: number;
}

export interface KpiAttentionItem {
  row: ReportingMetricRecord;
  severity: number;
  reasons: string[];
}

export interface KpiTrendPoint {
  period: string;
  scopeCount: number;
  kpis: ExecutiveKpis;
}

type MetricName =
  'attendancePercentage' | 'averageProgressPercent' | 'averageFinalScore';

const KPI_BUCKETS: readonly Omit<KpiBucket, 'count' | 'participants'>[] = [
  { label: '0-59.99', min: 0, max: 59.99 },
  { label: '60-69.99', min: 60, max: 69.99 },
  { label: '70-79.99', min: 70, max: 79.99 },
  { label: '80-89.99', min: 80, max: 89.99 },
  { label: '90-100', min: 90, max: 100 },
];

/**
 * TASK-063 KPI thresholds.
 *
 * Attendance, progress and final score use the same 70/80/90 bands so an
 * executive can compare the three columns without learning three scales.
 * Remedial risk is derived from the weakest of the three: one weak dimension is
 * enough to deserve attention even when the other two are healthy.
 */
export function buildKpiDistribution(
  rows: readonly ReportingMetricRecord[],
  metric: MetricName,
): KpiBucket[] {
  return emptyBuckets().map((bucket) => {
    const matching = rows.filter((row) => inBucket(row[metric], bucket));
    return {
      ...bucket,
      count: matching.length,
      participants: matching.reduce(
        (total, row) => total + row.participants,
        0,
      ),
    };
  });
}

export function buildRemedialRiskDistribution(
  rows: readonly ReportingMetricRecord[],
): KpiBucket[] {
  return emptyBuckets().map((bucket) => {
    const matching = rows.filter((row) => inBucket(remedialScore(row), bucket));
    return {
      ...bucket,
      count: matching.length,
      participants: matching.reduce(
        (total, row) => total + row.participants,
        0,
      ),
    };
  });
}

export function buildAttentionList(
  rows: readonly ReportingMetricRecord[],
  limit: number,
): KpiAttentionItem[] {
  return rows
    .map((row) => {
      const reasons: string[] = [];
      let severity = 0;

      if (row.attendancePercentage < 75) {
        reasons.push('attendance_below_75');
        severity += 75 - row.attendancePercentage;
      }
      if (row.averageProgressPercent < 70) {
        reasons.push('progress_below_70');
        severity += 70 - row.averageProgressPercent;
      }
      if (row.averageFinalScore < 70 && row.gradedCount > 0) {
        reasons.push('score_below_70');
        severity += 70 - row.averageFinalScore;
      }
      if (row.unapprovedGradeCount > 0) {
        reasons.push('unapproved_grades');
        severity += Math.min(20, row.unapprovedGradeCount);
      }

      return { row, reasons, severity: round2(severity) };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((left, right) => {
      if (right.severity !== left.severity) {
        return right.severity - left.severity;
      }
      return (left.row.scopeName ?? left.row.scopeId).localeCompare(
        right.row.scopeName ?? right.row.scopeId,
      );
    })
    .slice(0, limit);
}

export function buildKpiTrends(
  rows: readonly ReportingMetricRecord[],
  limit: number,
): KpiTrendPoint[] {
  const byPeriod = new Map<string, ReportingMetricRecord[]>();

  for (const row of rows) {
    const period = periodKey(row);
    byPeriod.set(period, [...(byPeriod.get(period) ?? []), row]);
  }

  return [...byPeriod.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-limit)
    .map(([period, periodRows]) => {
      const sums =
        periodRows.length > 0
          ? sumMetricRows(periodRows)
          : emptyExecutiveSums();
      return {
        period,
        scopeCount: sums.scopeCount,
        kpis: toExecutiveKpis(
          withoutDuplicatedSubjectRosters(sums, periodRows),
        ),
      };
    });
}

function emptyBuckets(): KpiBucket[] {
  return KPI_BUCKETS.map((bucket) => ({
    ...bucket,
    count: 0,
    participants: 0,
  }));
}

function inBucket(value: number, bucket: KpiBucket): boolean {
  return value >= bucket.min && value <= bucket.max;
}

function remedialScore(row: ReportingMetricRecord): number {
  const score =
    row.gradedCount > 0 ? row.averageFinalScore : row.averageProgressPercent;
  return Math.min(row.attendancePercentage, row.averageProgressPercent, score);
}

function periodKey(row: ReportingMetricRecord): string {
  if (!row.periodStart && !row.periodEnd) return 'NO_PERIOD';
  const start = row.periodStart
    ? row.periodStart.toISOString().slice(0, 10)
    : 'OPEN';
  const end = row.periodEnd ? row.periodEnd.toISOString().slice(0, 10) : 'OPEN';
  return `${start}/${end}`;
}

function withoutDuplicatedSubjectRosters(
  sums: ExecutiveSums,
  rows: readonly ReportingMetricRecord[],
): ExecutiveSums {
  if (
    !rows.every((row) => row.scopeType === ReportingScopeType.CLASS_SUBJECT)
  ) {
    return sums;
  }

  return {
    ...sums,
    participants: uniqueParticipantCount(rows),
    activeParticipants: uniqueActiveParticipantCount(rows),
  };
}

function uniqueParticipantCount(
  rows: readonly ReportingMetricRecord[],
): number {
  const byClass = new Map<string, number>();
  for (const row of rows) {
    const key = row.academicClassId ?? row.scopeId;
    byClass.set(key, Math.max(byClass.get(key) ?? 0, row.participants));
  }
  return [...byClass.values()].reduce((total, value) => total + value, 0);
}

function uniqueActiveParticipantCount(
  rows: readonly ReportingMetricRecord[],
): number {
  const byClass = new Map<string, number>();
  for (const row of rows) {
    const key = row.academicClassId ?? row.scopeId;
    byClass.set(key, Math.max(byClass.get(key) ?? 0, row.activeParticipants));
  }
  return [...byClass.values()].reduce((total, value) => total + value, 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
