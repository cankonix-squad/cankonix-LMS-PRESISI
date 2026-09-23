import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ProgramWorkspace } from '@/features/academic/program-management';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Program Pendidikan — Admin LMS PRESISI',
};

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const search = value(params.search);
  const organizationId = value(params.organizationId);
  const status =
    params.status === 'ACTIVE' || params.status === 'INACTIVE'
      ? params.status
      : undefined;
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);
  const api = createAdminApiClient();
  const [programs, organizations] = await Promise.all([
    getOrEmpty(() =>
      api.educationPrograms.list({
        search,
        organizationId,
        status,
        page,
        limit,
      }),
    ),
    getOrEmpty(() => api.organizations.list({ status: 'ACTIVE', limit: 100 })),
  ]);

  return (
    <AdminShell>
      <ProgramWorkspace
        result={programs}
        organizations={organizations.data?.data ?? []}
        filters={{ search, organizationId, status, page, limit }}
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
