import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AssessmentWorkspace } from '@/features/assessment/assessment-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Assessment — Admin LMS PRESISI',
};

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const search = value(params.search);
  const status = statusFilter(params.status);
  const assessmentTypeId = value(params.assessmentTypeId);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);
  const api = createAdminApiClient();
  const [assessments, types, classSubjects] = await Promise.all([
    getOrEmpty(() =>
      api.assessments.list({
        search,
        status,
        assessmentTypeId,
        page,
        limit,
      }),
    ),
    getOrEmpty(() =>
      api.assessmentTypes.list({ status: 'ACTIVE', limit: 100 }),
    ),
    getOrEmpty(() =>
      api.classSubjects.list({ status: 'ACTIVE', limit: 200 }),
    ),
  ]);

  return (
    <AdminShell>
      <AssessmentWorkspace
        result={assessments}
        assessmentTypes={types.data?.data ?? []}
        classSubjects={classSubjects.data?.data ?? []}
        filters={{
          search,
          status,
          assessmentTypeId,
          page,
          limit,
        }}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function statusFilter(
  input: string | string[] | undefined,
): 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED' | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];
  return allowed.includes(input)
    ? (input as 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED')
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