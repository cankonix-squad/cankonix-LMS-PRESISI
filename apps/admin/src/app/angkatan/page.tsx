import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AcademicWorkspace } from '@/features/academic/academic-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
export default async function BatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const [result, programs, curricula] = await Promise.all([
    getOrEmpty(() =>
      api.educationBatches.list({
        educationProgramId: value(params.educationProgramId),
        status: enumValue(params.status),
        page: positive(params.page),
        limit: limit(params.limit),
      }),
    ),
    getOrEmpty(() =>
      api.educationPrograms.list({ status: 'ACTIVE', limit: 100 }),
    ),
    getOrEmpty(() => api.curricula.list({ status: 'ACTIVE', limit: 100 })),
  ]);
  return (
    <AdminShell>
      <AcademicWorkspace
        kind="batch"
        result={
          result.data
            ? { data: result.data.data, total: result.data.total }
            : null
        }
        filters={filters(params)}
        options={{
          educationProgramId: (programs.data?.data ?? []).map((x) => ({
            id: x.id,
            label: `${x.name} (${x.code})`,
          })),
          curriculumId: (curricula.data?.data ?? []).map((x) => ({
            id: x.id,
            label: `${x.name} (${x.version})`,
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
  return input === 'ACTIVE' || input === 'INACTIVE' ? input : undefined;
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
    educationProgramId: value(p.educationProgramId),
    status: value(p.status),
    page: positive(p.page),
    limit: limit(p.limit),
  };
}
