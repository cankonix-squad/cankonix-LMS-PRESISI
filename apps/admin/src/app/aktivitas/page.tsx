import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ActivityWorkspace } from '@/features/learning/activity-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const page = positive(params.page, 1);
  const limit = clamp(positive(params.limit, 25), 10, 50);
  const [result, meetings, types] = await Promise.all([
    getOrEmpty(() =>
      api.learningActivities.list({
        search: value(params.search),
        status: value(params.status),
        page,
        limit,
      }),
    ),
    getOrEmpty(() => api.learningMeetings.list({ limit: 100 })),
    getOrEmpty(() =>
      api.learningActivityTypes.list({ status: 'ACTIVE', limit: 100 }),
    ),
  ]);
  return (
    <AdminShell>
      <ActivityWorkspace
        result={{
          data: result.data?.data ?? null,
          error: result.error,
          total: result.data?.total ?? 0,
        }}
        meetings={meetings.data?.data ?? []}
        types={types.data?.data ?? []}
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
