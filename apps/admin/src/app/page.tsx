import { AdminShell } from '@/components/admin-shell';
import { FoundationDashboard } from '@/features/foundation/dashboard';

export default function Page() {
  return (
    <AdminShell>
      <FoundationDashboard />
    </AdminShell>
  );
}
