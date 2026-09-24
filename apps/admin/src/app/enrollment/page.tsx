import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AcademicWorkspace } from '@/features/academic/academic-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const api = createAdminApiClient();
  const [result, persons, batches, classes] = await Promise.all([
    getOrEmpty(() =>
      api.enrollments.list({
        educationBatchId: value(params.educationBatchId),
        academicClassId: value(params.academicClassId),
        status: value(params.status),
        page: positive(params.page),
        limit: limit(params.limit),
      }),
    ),
    getOrEmpty(() => api.persons.list({ status: 'ACTIVE', limit: 100 })),
    getOrEmpty(() =>
      api.educationBatches.list({ status: 'ACTIVE', limit: 100 }),
    ),
    getOrEmpty(() =>
      api.academicClasses.list({ status: 'ACTIVE', limit: 100 }),
    ),
  ]);
  return (
    <AdminShell>
      <AcademicWorkspace
        kind="enrollment"
        result={
          result.data
            ? { data: result.data.data, total: result.data.total }
            : null
        }
        filters={filters(params)}
        options={{
          personId: (persons.data?.data ?? []).map((x) => ({
            id: x.id,
            label: `${x.fullName} (${x.personnelNumber})`,
          })),
          educationBatchId: (batches.data?.data ?? []).map((x) => ({
            id: x.id,
            label: `${x.name} (${x.code})`,
          })),
          academicClassId: (classes.data?.data ?? []).map((x) => ({
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
    academicClassId: value(p.academicClassId),
    status: value(p.status),
    page: positive(p.page),
    limit: limit(p.limit),
  };
}
