import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { SystemHealthWorkspace } from '@/features/system/system-health-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Status Sistem — Admin LMS PRESISI',
};

export default async function SystemHealthPage() {
  if (!(await hasAdminSession())) redirect('/login');

  const api = createAdminApiClient();
  const result = await getOrEmpty(() => api.health());

  return (
    <AdminShell>
      <SystemHealthWorkspace result={result} />
    </AdminShell>
  );
}
