import { AdminShell } from '@/components/admin-shell';
import { ExamPlaceholder } from '@/features/assessment/exam-placeholder';
import { requireAdminPortalAccess } from '@/lib/api';

export const metadata = {
  title: 'Exam — Admin LMS PRESISI',
};

export default async function ExamPage() {
  await requireAdminPortalAccess();

  return (
    <AdminShell>
      <ExamPlaceholder />
    </AdminShell>
  );
}