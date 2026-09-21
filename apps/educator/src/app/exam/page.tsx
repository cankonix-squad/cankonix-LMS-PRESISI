import { EducatorShell } from '@/components/educator-shell';
import { ExamAuthoringPanel } from '@/features/exam/exam-authoring-panel';
import { BlueprintEditor } from '@/features/exam/blueprint-editor';
import { GradingPanel } from '@/features/exam/grading-panel';
import { QuestionBankPanel } from '@/features/exam/question-bank-panel';
import { SessionPanel } from '@/features/exam/session-panel';
import { ExamTabs } from '@/features/exam/exam-tabs';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

/**
 * Educator exam workspace (TASK-047).
 *
 * Exam, bank and session identifiers come from the URL so this stays a server
 * component: the token and every read stay on the server and the browser only
 * renders the result. Environment variables are accepted as a fallback so an
 * existing single-exam deployment keeps working unchanged.
 *
 * The API exposes no exam *list* endpoint, so there is no discovery screen to
 * build here; a caller arrives with an id. Each read degrades independently, so
 * one failing dependency cannot blank the workspace.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; session?: string; bank?: string }>;
}) {
  const params = await searchParams;
  const api = createEducatorApiClient();

  const examId = params.exam ?? process.env.EDUCATOR_EXAM_ID ?? null;
  const sessionId =
    params.session ?? process.env.EDUCATOR_EXAM_SESSION_ID ?? null;
  const bankId = params.bank ?? process.env.EDUCATOR_QUESTION_BANK_ID ?? null;

  const [exam, session, banks, questionTypes, questions] = await Promise.all([
    examId ? getOrEmpty(() => api.exams.get(examId)) : nullResult(),
    sessionId
      ? getOrEmpty(() => api.examSessions.get(sessionId))
      : nullResult(),
    getOrEmpty(() => api.questionBanks.list({ limit: 50 })),
    getOrEmpty(() => api.questionTypes.list({ limit: 50 })),
    bankId
      ? getOrEmpty(() => api.questionBanks.listQuestions(bankId, { limit: 50 }))
      : nullResult(),
  ]);

  const panels = {
    authoring: <ExamAuthoringPanel exam={exam.data} />,
    banks: (
      <QuestionBankPanel
        banks={banks}
        questions={questions}
        questionTypes={questionTypes}
        selectedBankId={bankId}
      />
    ),
    blueprint: exam.data ? (
      <BlueprintEditor exam={exam.data} banks={banks} />
    ) : undefined,
    session: session.data ? (
      <SessionPanel session={session.data} managedMode />
    ) : undefined,
    grading: <GradingPanel />,
  };

  return (
    <EducatorShell>
      {!examId ? (
        <p className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100">
          Buka halaman ini dengan <code>?exam=&lt;id&gt;</code> untuk memuat
          satu exam. Tambahkan <code>&amp;bank=&lt;id&gt;</code> untuk mengelola
          soal dan <code>&amp;session=&lt;id&gt;</code> untuk sesi &amp;
          peserta.
        </p>
      ) : null}
      <ExamTabs panels={panels} />
    </EducatorShell>
  );
}

/** Explicit "nothing requested" state, distinct from "request failed". */
function nullResult() {
  return Promise.resolve({ data: null, error: null });
}
