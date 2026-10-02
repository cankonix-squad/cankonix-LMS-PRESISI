import { AdminShell } from '@/components/admin-shell';
import { SystemHealthWorkspace } from '@/features/system/system-health-workspace';
import {
  createAdminApiClient,
  getOrEmpty,
  requireAdminPortalAccess,
} from '@/lib/api';

export const metadata = {
  title: 'Status Sistem — Admin LMS PRESISI',
};

export default async function SystemHealthPage() {
  await requireAdminPortalAccess();

  const api = createAdminApiClient();
  const result = await getOrEmpty(() => api.health());

  return (
    <AdminShell>
      <SystemHealthWorkspace result={result} />
    </AdminShell>
  );
}
