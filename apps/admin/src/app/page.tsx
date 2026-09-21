import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { FoundationDashboard } from '@/features/foundation/dashboard';
import { hasAdminSession } from '@/lib/api';

export default async function Page() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <FoundationDashboard />
    </AdminShell>
  );
}
