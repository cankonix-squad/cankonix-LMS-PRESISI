import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { OrganizationPanel } from '@/features/foundation/dashboard';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Organisasi — Admin LMS PRESISI',
};

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const search =
    typeof params?.search === 'string' && params.search.trim()
      ? params.search.trim()
      : undefined;
  const status =
    params?.status === 'ACTIVE' || params?.status === 'INACTIVE'
      ? params.status
      : undefined;
  const page = toPositiveInt(params?.page, 1);
  const limit = clamp(toPositiveInt(params?.limit, 25), 10, 50);

  return (
    <AdminShell>
      <OrganizationPanel filters={{ search, status, page, limit }} />
    </AdminShell>
  );
}

function toPositiveInt(value: string | string[] | undefined, fallback: number) {
  if (typeof value !== 'string') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
