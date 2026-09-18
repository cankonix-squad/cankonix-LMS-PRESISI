import { createEducatorApiClient, currentTimeMs, getOrEmpty } from '@/lib/api';
import { AssignedClassSubjects } from './assigned-class-subjects';
import { AssignmentGradingBoard } from './assignment-grading-board';
import { MeetingActivityEditor } from './meeting-activity-editor';
import { ProgressMonitor } from './progress-monitor';

/**
 * Educator learning dashboard.
 *
 * Composes the learning surfaces for one educator. Assignments and submissions
 * are fetched here so the grading board is a client component over
 * already-authorized data, instead of a second authorization path.
 */
export async function EducatorDashboard() {
  const api = createEducatorApiClient();
  const now = currentTimeMs();
  const [assignments, submissions] = await Promise.all([
    getOrEmpty(() => api.assignments.list({ limit: 20 })),
    getOrEmpty(() => api.submissions.list({ limit: 50 })),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AssignedClassSubjects />

      <div className="grid gap-6 xl:grid-cols-2">
        <MeetingActivityEditor />
        <ProgressMonitor />
      </div>

      {assignments.error ? (
        <AssignmentGradingBoard assignments={[]} submissions={[]} now={now} />
      ) : (
        <AssignmentGradingBoard
          assignments={assignments.data?.data ?? []}
          submissions={submissions.data?.data ?? []}
          now={now}
        />
      )}
    </div>
  );
}
