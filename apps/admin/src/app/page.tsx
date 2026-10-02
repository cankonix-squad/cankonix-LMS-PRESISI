import { AdminShell } from '@/components/admin-shell';
import { FoundationDashboard } from '@/features/foundation/dashboard';
import { requireAdminPortalAccess } from '@/lib/api';

export default async function Page() {
  await requireAdminPortalAccess();

  return (
    <AdminShell>
      <FoundationDashboard />
    </AdminShell>
  );
}
