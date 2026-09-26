import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ReportingWorkspace } from '@/features/reporting/reporting-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type { ExecutiveOverviewScope } from '@lms/api-client';

export const metadata = {
  title: 'Report Center — Admin LMS PRESISI',
};

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const scope = scopeFilter(params.scope);
  const scopeId = value(params.scopeId);
  const periodFrom = value(params.periodFrom);
  const periodTo = value(params.periodTo);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.reporting.executiveOverview({
      scope,
      scopeId,
      periodFrom,
      periodTo,
      page,
      limit,
    }),
  );

  return (
    <AdminShell>
      <ReportingWorkspace
        result={result}
        filters={{ scope, scopeId, periodFrom, periodTo, page, limit }}
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

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
