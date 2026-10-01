import { redirect } from 'next/navigation';
import { ExecutiveShell } from '@/components/executive-shell';
import { KpiDetailWorkspace } from '@/features/reporting/kpi-detail-workspace';
import {
  createExecutiveApiClient,
  getOrEmpty,
  hasExecutiveSession,
} from '@/lib/api';
import type { ExecutiveOverviewScope, KpiDetailLevel } from '@lms/api-client';

export const metadata = {
  title: 'Detail KPI — Portal Executive LMS PRESISI',
};

const KPI_LEVELS: KpiDetailLevel[] = [
  'PROGRAM',
  'BATCH',
  'CLASS',
  'CLASS_SUBJECT',
  'ENROLLMENT',
];

export default async function KpiDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasExecutiveSession())) redirect('/login');

  const params = await searchParams;
  const scope = scopeFilter(params.scope);
  const scopeId = scope === 'NATIONAL' ? undefined : value(params.scopeId);
  const level = levelFilter(params.level);
  const periodFrom = value(params.periodFrom);
  const periodTo = value(params.periodTo);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createExecutiveApiClient();
  const result = await getOrEmpty(() =>
    api.reporting.executiveKpis({
      scope,
      scopeId,
      level,
      periodFrom,
      periodTo,
      page,
      limit,
    }),
  );

  return (
    <ExecutiveShell>
      <KpiDetailWorkspace
        result={result}
        filters={{ scope, scopeId, level, periodFrom, periodTo, page, limit }}
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

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
