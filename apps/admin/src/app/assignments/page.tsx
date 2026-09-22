import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AssignmentScopePanel } from '@/features/foundation/dashboard';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Assignment & Scope — Admin LMS PRESISI',
};

export default async function AssignmentsPage() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <AssignmentScopePanel />
    </AdminShell>
  );
}
