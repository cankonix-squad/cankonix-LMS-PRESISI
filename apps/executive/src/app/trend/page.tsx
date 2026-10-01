import { redirect } from 'next/navigation';
import { ExecutiveShell } from '@/components/executive-shell';
import { GraduationTrendWorkspace } from '@/features/reporting/graduation-trend-workspace';
import {
  createExecutiveApiClient,
  getOrEmpty,
  hasExecutiveSession,
} from '@/lib/api';
import type {
  ExecutiveOverviewScope,
  GraduationTrendGranularity,
  KpiDetailLevel,
} from '@lms/api-client';

export const metadata = {
  title: 'Tren Kelulusan — Portal Executive LMS PRESISI',
};

const KPI_LEVELS: KpiDetailLevel[] = [
  'PROGRAM',
  'BATCH',
  'CLASS',
  'CLASS_SUBJECT',
  'ENROLLMENT',
];

const GRANULARITIES: GraduationTrendGranularity[] = [
  'COHORT',
  'YEAR',
  'QUARTER',
  'MONTH',
];

export default async function TrendPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasExecutiveSession())) redirect('/login');

  const params = await searchParams;
  const scope = scopeFilter(params.scope);
  const scopeId = scope === 'NATIONAL' ? undefined : value(params.scopeId);
  const level = levelFilter(params.level);
  const granularity = granularityFilter(params.granularity);
  const periodFrom = value(params.periodFrom);
  const periodTo = value(params.periodTo);

  const api = createExecutiveApiClient();
  const result = await getOrEmpty(() =>
    api.reporting.graduationTrends({
      scope,
      scopeId,
      level,
      granularity,
      periodFrom,
      periodTo,
    }),
  );

  return (
    <ExecutiveShell>
      <GraduationTrendWorkspace
        result={result}
        filters={{
          scope,
          scopeId,
          level,
          granularity,
          periodFrom,
          periodTo,
        }}
      />
    </ExecutiveShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function scopeFilter(
  input: string | string[] | undefined,
): ExecutiveOverviewScope | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed: ExecutiveOverviewScope[] = [
    'NATIONAL',
    'ORGANIZATION',
    'PROGRAM',
    'BATCH',
  ];
  return allowed.includes(input as ExecutiveOverviewScope)
    ? (input as ExecutiveOverviewScope)
    : undefined;
}

function levelFilter(
  input: string | string[] | undefined,
): KpiDetailLevel | undefined {
  if (typeof input !== 'string') return undefined;
  return (KPI_LEVELS as string[]).includes(input)
    ? (input as KpiDetailLevel)
    : undefined;
}

function granularityFilter(
  input: string | string[] | undefined,
): GraduationTrendGranularity | undefined {
  if (typeof input !== 'string') return undefined;
  return (GRANULARITIES as string[]).includes(input)
    ? (input as GraduationTrendGranularity)
    : undefined;
}
