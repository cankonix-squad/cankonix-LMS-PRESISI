import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { FinalGradeWorkspace } from '@/features/graduation/final-grade-workspace';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Nilai Akhir — Admin LMS PRESISI',
};

/**
 * Nilai Akhir (TASK-051).
 *
 * Backend does not expose a list endpoint for final grades, so this page
 * renders the workspace's empty-state explanation. The empty-state UI explains
 * that final grades are computed through the Grading workspace.
 */
export default async function NilaiAkhirPage() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <FinalGradeWorkspace
        result={{ data: null, error: null }}
      />
    </AdminShell>
  );
}