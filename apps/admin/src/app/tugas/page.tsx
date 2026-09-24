import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AssignmentWorkspace } from '@/features/learning/assignment-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
export default async function AssignmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const page = positive(params.page, 1);
  const limit = clamp(positive(params.limit, 25), 10, 50);
  const [result, activities] = await Promise.all([
    getOrEmpty(() =>
      api.assignments.list({
        search: value(params.search),
        status: value(params.status) as never,
        page,
        limit,
      }),
    ),
    getOrEmpty(() =>
      api.learningActivities.list({ status: 'PUBLISHED', limit: 100 }),
    ),
  ]);
  return (
    <AdminShell>
      <AssignmentWorkspace
        result={{
          data: result.data?.data ?? null,
          error: result.error,
          total: result.data?.total ?? 0,
        }}
        activities={activities.data?.data ?? []}
        filters={{
          search: value(params.search),
          status: value(params.status),
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
function positive(input: string | string[] | undefined, fallback: number) {
  const n = Number(input);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
