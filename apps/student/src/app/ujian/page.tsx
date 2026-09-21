import { ErrorState } from '@/components/data-state';
import { StudentShell, SectionCard } from '@/components/student-shell';
import { ExamStartForm } from '@/features/exam/exam-start-form';
import { ExamRuntime } from '@/features/exam/exam-runtime';
import { startAttemptAction } from '@/features/exam/actions';
import { createStudentApiClient, getOrEmpty } from '@/lib/api';

/**
 * Student exam runtime page (TASK-048).
 *
 * Two entry states, both driven by the URL so this stays a server component and
 * the participant token never reaches the browser:
 *
 * - `?attempt=<id>` renders the runtime for that attempt.
 * - otherwise a start form is shown, which calls the start action and then
 *   navigates to `?attempt=<id>`.
 *
 * Environment variables are accepted as a fallback, mirroring the educator
 * workspace, so a single-attempt deployment keeps working unchanged.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string; participant?: string }>;
}) {
  const params = await searchParams;
  const api = createStudentApiClient();

  const attemptId = params.attempt ?? process.env.STUDENT_ATTEMPT_ID ?? null;
  const participantId =
    params.participant ?? process.env.STUDENT_PARTICIPANT_ID ?? null;

  if (!attemptId) {
    return (
      <StudentShell>
        <ExamStartForm
          defaultParticipantId={participantId ?? ''}
          action={startAttemptAction}
        />
      </StudentShell>
    );
  }

  const attempt = await getOrEmpty(() => api.attempts.get(attemptId));

  return (
    <StudentShell>
      {attempt.error ? (
        <ErrorState message={attempt.error} />
      ) : attempt.data ? (
        <ExamRuntime attempt={attempt.data} />
      ) : (
        <SectionCard
          id="exam-missing"
          title="Ujian tidak ditemukan"
          description="Attempt tidak tersedia atau Anda tidak memiliki akses."
        >
          <p className="text-sm text-slate-400">
            Periksa kembali tautan ujian Anda atau hubungi pengawas.
          </p>
        </SectionCard>
      )}
    </StudentShell>
  );
}
