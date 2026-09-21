'use server';

import type {
  AddExamParticipantInput,
  CreateExamInput,
  CreateExamSessionInput,
  CreateQuestionInput,
  ExamBlueprintRuleInput,
  ManualExamGradeInput,
  SessionStatus,
  UpdateExamInput,
} from '@lms/api-client';
import { createEducatorApiClient } from '@/lib/api';

/**
 * Server actions for the educator exam surface.
 *
 * They run on the server, so the API token never reaches the browser bundle, and
 * they add no rules of their own: every lifecycle, pool and score rule stays in
 * the API. Each returns a discriminated result rather than throwing so a client
 * component can render the API's message instead of a generic error.
 */
export type ActionResult = { ok: true } | { ok: false; message: string };

function toResult(
  value: { ok: true } | { ok: false; message: string },
): ActionResult {
  return value.ok ? { ok: true } : { ok: false, message: value.message };
}

export async function createExamAction(
  input: CreateExamInput,
): Promise<ActionResult> {
  return toResult(await createEducatorApiClient().exams.create(input));
}

export async function updateExamAction(
  examId: string,
  input: UpdateExamInput,
): Promise<ActionResult> {
  return toResult(await createEducatorApiClient().exams.update(examId, input));
}

/** Upserts the entire blueprint, so the API validates a consistent rule set. */
export async function saveBlueprintAction(
  examId: string,
  input: {
    title?: string;
    description?: string;
    rules: ExamBlueprintRuleInput[];
  },
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().exams.saveBlueprint(examId, input),
  );
}

export async function changeExamStatusAction(
  examId: string,
  status: string,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().exams.changeStatus(examId, status),
  );
}

export async function createExamSessionAction(
  input: CreateExamSessionInput,
): Promise<ActionResult> {
  return toResult(await createEducatorApiClient().examSessions.create(input));
}

export async function changeSessionStatusAction(
  sessionId: string,
  status: SessionStatus,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().examSessions.changeStatus(
      sessionId,
      status,
    ),
  );
}

export async function addParticipantAction(
  sessionId: string,
  input: AddExamParticipantInput,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().examSessions.addParticipant(
      sessionId,
      input,
    ),
  );
}

export async function createQuestionBankAction(input: {
  curriculumSubjectId: string;
  code: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  return toResult(await createEducatorApiClient().questionBanks.create(input));
}

export async function createQuestionAction(
  bankId: string,
  input: CreateQuestionInput,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().questionBanks.createQuestion(bankId, input),
  );
}

/**
 * Publishing freezes the version and supersedes the previous one in a single
 * server transaction; the UI must treat it as irreversible.
 */
export async function publishQuestionVersionAction(
  questionId: string,
  versionId: string,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().questions.publishVersion(
      questionId,
      versionId,
    ),
  );
}

export async function autoGradeAction(
  attemptId: string,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().examGrading.autoGrade(attemptId),
  );
}

export async function manualGradeAction(
  answerId: string,
  input: ManualExamGradeInput,
): Promise<ActionResult> {
  return toResult(
    await createEducatorApiClient().examGrading.manualGrade(answerId, input),
  );
}
