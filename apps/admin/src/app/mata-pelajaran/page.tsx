import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AcademicWorkspace } from '@/features/academic/academic-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export default async function SubjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.subjects.list({
      search: value(params.search),
      status: enumValue(params.status),
      page: positive(params.page),
      limit: limit(params.limit),
    }),
  );
  return (
    <AdminShell>
      <AcademicWorkspace
        kind="subject"
        result={
          result.data
            ? { data: result.data.data, total: result.data.total }
            : null
        }
        filters={filters(params)}
      />
    </AdminShell>
  );
}
function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}
function enumValue(input: string | string[] | undefined) {
  return input === 'ACTIVE' || input === 'INACTIVE' ? input : undefined;
}
function positive(input: string | string[] | undefined) {
  const n = Number(input);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
function limit(input: string | string[] | undefined) {
  return Math.min(50, Math.max(10, positive(input) || 25));
}
function filters(params: Record<string, string | string[] | undefined>) {
  return {
    search: value(params.search),
    status: value(params.status),
    page: positive(params.page),
    limit: limit(params.limit),
  };
}
