import { EducatorShell } from '@/components/educator-shell';
import { ExamManagementBoard } from '@/features/exam-board';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

export default async function Page() {
  const api = createEducatorApiClient();
  const examId = process.env.EDUCATOR_EXAM_ID;
  const sessionId = process.env.EDUCATOR_EXAM_SESSION_ID;
  const [exam, session] = await Promise.all([
    examId
      ? getOrEmpty(() => api.exams.get(examId))
      : Promise.resolve({ data: null, error: null }),
    sessionId
      ? getOrEmpty(() => api.examSessions.get(sessionId))
      : Promise.resolve({ data: null, error: null }),
  ]);
  return (
    <EducatorShell>
      <ExamManagementBoard
        exam={exam.data}
        session={session.data}
        error={exam.error ?? session.error}
      />
    </EducatorShell>
  );
}
