import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AcademicWorkspace } from '@/features/academic/academic-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
export default async function ClassPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const [result, batches] = await Promise.all([
    getOrEmpty(() =>
      api.academicClasses.list({
        educationBatchId: value(params.educationBatchId),
        search: value(params.search),
        status: enumValue(params.status),
        page: positive(params.page),
        limit: limit(params.limit),
      }),
    ),
    getOrEmpty(() =>
      api.educationBatches.list({ status: 'ACTIVE', limit: 100 }),
    ),
  ]);
  const body = result.data;
  return (
    <AdminShell>
      <AcademicWorkspace
        kind="class"
        result={body ? { data: body.data, total: body.meta.total } : null}
        filters={filters(params)}
        options={{
          educationBatchId: (batches.data?.data ?? []).map((x) => ({
            id: x.id,
            label: `${x.name} (${x.code})`,
          })),
        }}
      />
    </AdminShell>
  );
}
function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}
function enumValue(input: string | string[] | undefined) {
  return input === 'ACTIVE' || input === 'INACTIVE' || input === 'ARCHIVED'
    ? input
    : undefined;
}
function positive(input: string | string[] | undefined) {
  const n = Number(input);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
function limit(input: string | string[] | undefined) {
  return Math.min(50, Math.max(10, positive(input)));
}
function filters(p: Record<string, string | string[] | undefined>) {
  return {
    educationBatchId: value(p.educationBatchId),
    search: value(p.search),
    status: value(p.status),
    page: positive(p.page),
    limit: limit(p.limit),
  };
}
