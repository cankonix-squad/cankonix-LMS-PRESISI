import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { CurriculumWorkspace } from '@/features/academic/curriculum-management';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = { title: 'Kurikulum — Admin LMS PRESISI' };

export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const educationProgramId = value(params.educationProgramId);
  const status =
    params.status === 'ACTIVE' || params.status === 'INACTIVE'
      ? params.status
      : undefined;
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);
  const api = createAdminApiClient();
  const [curricula, programs] = await Promise.all([
    getOrEmpty(() =>
      api.curricula.list({ educationProgramId, status, page, limit }),
    ),
    getOrEmpty(() =>
      api.educationPrograms.list({ status: 'ACTIVE', limit: 100 }),
    ),
  ]);

  return (
    <AdminShell>
      <CurriculumWorkspace
        result={curricula}
        programs={programs.data?.data ?? []}
        filters={{ educationProgramId, status, page, limit }}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}
function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}
