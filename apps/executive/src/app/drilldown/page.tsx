import { redirect } from 'next/navigation';
import { ExecutiveShell } from '@/components/executive-shell';
import { DrilldownWorkspace } from '@/features/reporting/drilldown-workspace';
import {
  createExecutiveApiClient,
  getOrEmpty,
  hasExecutiveSession,
} from '@/lib/api';
import type { ReportingScopeType } from '@lms/api-client';

export const metadata = {
  title: 'Drill-down — Portal Executive LMS PRESISI',
};

const DRILLDOWN_LEVELS: ReportingScopeType[] = [
  'ORGANIZATION',
  'PROGRAM',
  'BATCH',
  'CLASS',
  'CLASS_SUBJECT',
  'ENROLLMENT',
];

export default async function DrilldownPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasExecutiveSession())) redirect('/login');

  const params = await searchParams;
  const level = levelFilter(params.level);
  const parentId = value(params.parentId);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createExecutiveApiClient();
  const result = await getOrEmpty(() =>
    api.reporting.executiveDrilldown({ level, parentId, page, limit }),
  );

  return (
    <ExecutiveShell>
      <DrilldownWorkspace
        result={result}
        filters={{ level, parentId, page, limit }}
      />
    </ExecutiveShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function levelFilter(input: string | string[] | undefined): ReportingScopeType {
  if (typeof input === 'string') {
    if ((DRILLDOWN_LEVELS as string[]).includes(input)) {
      return input as ReportingScopeType;
    }
  }
  // Root level: the executive may enter their institutions.
  return 'ORGANIZATION';
}

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
