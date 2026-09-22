import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { RolePermissionPanel } from '@/features/foundation/dashboard';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Role & Permission — Admin LMS PRESISI',
};

export default async function RolesPage() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <RolePermissionPanel />
    </AdminShell>
  );
}
