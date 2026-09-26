import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ExamPlaceholder } from '@/features/assessment/exam-placeholder';
import { hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Exam — Admin LMS PRESISI',
};

export default async function ExamPage() {
  if (!(await hasAdminSession())) redirect('/login');

  return (
    <AdminShell>
      <ExamPlaceholder />
    </AdminShell>
  );
}