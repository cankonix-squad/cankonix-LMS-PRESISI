'use server';

import type { SaveAttemptAnswerInput } from '@lms/api-client';
import { createStudentApiClient } from '@/lib/api';

/**
 * Server actions for the exam runtime.
 *
 * The participant token stays on the server. These actions add no rule of their
 * own: eligibility, the frozen deadline, revision conflicts and submission are
 * all decided by the API, and the resulting message is passed back verbatim so
 * the participant sees the real reason rather than a generic failure.
 */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; message: string };

export async function startAttemptAction(
  participantId: string,
): Promise<ActionResult<{ attemptId: string }>> {
  const result = await createStudentApiClient().attempts.start({
    participantId,
  });
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, data: { attemptId: result.data.id } };
}

export async function saveAnswerAction(
  attemptId: string,
  attemptQuestionId: string,
  input: SaveAttemptAnswerInput,
): Promise<
  ActionResult<{
    answerPayload: Record<string, unknown>;
    revision: number;
    savedAt: string;
  }>
> {
  const result = await createStudentApiClient().attempts.saveAnswer(
    attemptId,
    attemptQuestionId,
    input,
  );
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, data: result.data };
}

export async function submitAttemptAction(
  attemptId: string,
): Promise<ActionResult<{ status: string; score: number | null }>> {
  const result = await createStudentApiClient().attempts.submit(attemptId);
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    data: { status: result.data.status, score: result.data.score },
  };
}
