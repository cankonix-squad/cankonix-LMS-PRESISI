import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { PersonAccountPanel } from '@/features/foundation/dashboard';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Personel — Admin LMS PRESISI',
};

export default async function PersonelPage() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <PersonAccountPanel />
    </AdminShell>
  );
}
