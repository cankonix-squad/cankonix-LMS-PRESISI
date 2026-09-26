import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ReportingMetricsWorkspace } from '@/features/reporting/reporting-metrics-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type { ReportingScopeType } from '@lms/api-client';

export const metadata = {
  title: 'Metrics — Admin LMS PRESISI',
};

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const scopeType = scopeTypeFilter(params.scopeType);
  const organizationId = value(params.organizationId);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 50), 10, 100);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.reporting.listMetrics({ scopeType, organizationId, page, limit }),
  );

  return (
    <AdminShell>
      <ReportingMetricsWorkspace
        result={result}
        filters={{ scopeType, organizationId, page, limit }}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function scopeTypeFilter(
  input: string | string[] | undefined,
): ReportingScopeType | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed: ReportingScopeType[] = [
    'ORGANIZATION',
    'PROGRAM',
    'BATCH',
    'CLASS',
    'CLASS_SUBJECT',
    'ENROLLMENT',
  ];
  return allowed.includes(input as ReportingScopeType)
    ? (input as ReportingScopeType)
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
