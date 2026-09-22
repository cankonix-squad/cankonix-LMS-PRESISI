import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { OrganizationPanel } from '@/features/foundation/dashboard';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Organisasi — Admin LMS PRESISI',
};

export default async function OrganizationPage() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <OrganizationPanel />
    </AdminShell>
  );
}
