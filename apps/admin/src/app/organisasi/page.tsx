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

  return (
    <AdminShell>
      <OrganizationPanel filters={{ search, status }} />
    </AdminShell>
  );
}
