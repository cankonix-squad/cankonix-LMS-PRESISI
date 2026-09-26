import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { MaterialWorkspace } from '@/features/learning/material-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export default async function MaterialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const page = positive(params.page, 1);
  const limit = clamp(positive(params.limit, 25), 10, 50);
  const [activitiesResult] = await Promise.all([
    getOrEmpty(() =>
      api.learningActivities.list({
        search: value(params.search),
        status: value(params.status),
        page,
        limit: 100,
      }),
    ),
  ]);
  const activities = activitiesResult.data?.data ?? [];
  const contentResults = await Promise.all(
    activities.map(async (activity) => {
      const result = await getOrEmpty(() =>
        api.learningActivityContents.listByActivity(activity.id, {
          status: value(params.status),
          limit: 100,
        }),
      );
      return { activity, result };
    }),
  );
  const flattened = contentResults.flatMap(({ activity, result }) =>
    (result.data?.data ?? []).map((item) => ({ ...item, activity })),
  );
  const search = value(params.search)?.toLowerCase();
  const filtered = search
    ? flattened.filter((item) => item.title.toLowerCase().includes(search))
    : flattened;
  const start = (page - 1) * limit;
  const rows = filtered.slice(start, start + limit);
  const error =
    activitiesResult.error ??
    contentResults.find((item) => item.result.error)?.result.error ??
    null;
  return (
    <AdminShell>
      <MaterialWorkspace
        result={{ data: error ? null : rows, error, total: filtered.length }}
        activities={activities}
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
