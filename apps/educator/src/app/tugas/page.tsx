import { EducatorShell } from '@/components/educator-shell';
import { AssignmentGradingBoard } from '@/features/learning/assignment-grading-board';
import { createEducatorApiClient, currentTimeMs, getOrEmpty } from '@/lib/api';

export default async function Page() {
  const api = createEducatorApiClient();
  const now = currentTimeMs();
  const [assignments, submissions] = await Promise.all([
    getOrEmpty(() => api.assignments.list({ limit: 20 })),
    getOrEmpty(() => api.submissions.list({ limit: 50 })),
  ]);

  return (
    <EducatorShell>
      <AssignmentGradingBoard
        assignments={assignments.data?.data ?? []}
        submissions={submissions.data?.data ?? []}
        now={now}
      />
    </EducatorShell>
  );
}
