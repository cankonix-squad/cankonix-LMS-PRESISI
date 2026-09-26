import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ReportingTrendWorkspace } from '@/features/reporting/reporting-trend-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type {
  ExecutiveOverviewScope,
  GraduationTrendGranularity,
  KpiDetailLevel,
} from '@lms/api-client';

export const metadata = {
  title: 'Tren Kelulusan — Admin LMS PRESISI',
};

export default async function TrendKelulusanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const scope = scopeFilter(params.scope);
  const scopeId = value(params.scopeId);
  const level = levelFilter(params.level);
  const granularity = granularityFilter(params.granularity);
  const periodFrom = value(params.periodFrom);
  const periodTo = value(params.periodTo);

  const api = createAdminApiClient();
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
    <AdminShell>
      <ReportingTrendWorkspace
        result={result}
        filters={{ scope, scopeId, granularity, periodFrom, periodTo }}
      />
    </AdminShell>
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
  const allowed: KpiDetailLevel[] = [
    'PROGRAM',
    'BATCH',
    'CLASS',
    'CLASS_SUBJECT',
    'ENROLLMENT',
  ];
  return allowed.includes(input as KpiDetailLevel)
    ? (input as KpiDetailLevel)
    : undefined;
}

function granularityFilter(
  input: string | string[] | undefined,
): GraduationTrendGranularity | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed: GraduationTrendGranularity[] = [
    'COHORT',
    'YEAR',
    'QUARTER',
    'MONTH',
  ];
  return allowed.includes(input as GraduationTrendGranularity)
    ? (input as GraduationTrendGranularity)
    : undefined;
}
