import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { GradingWorkspace } from '@/features/assessment/grading-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Grading — Admin LMS PRESISI',
};

export default async function GradingPage() {
  if (!(await hasAdminSession())) redirect('/login');

  const api = createAdminApiClient();
  const [schemesResult, classSubjectsResult] = await Promise.all([
    getOrEmpty(() => api.gradingSchemes.list()),
    getOrEmpty(() =>
      api.classSubjects.list({ status: 'ACTIVE', limit: 200 }),
    ),
  ]);

  const classSubjectMap = new Map(
    (classSubjectsResult.data?.data ?? []).map((cs) => [
      cs.id,
      cs.displayName ?? cs.code ?? cs.curriculumSubjectId ?? cs.id,
    ]),
  );

  return (
    <AdminShell>
      <GradingWorkspace
        result={{
          data: schemesResult.data ?? null,
          error: schemesResult.error,
        }}
        subjectsMap={classSubjectMap}
      />
    </AdminShell>
  );
}