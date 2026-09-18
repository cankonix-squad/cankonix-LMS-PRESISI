'use server';

import type { UpdateLearningProgressInput } from '@lms/api-client';
import { createStudentApiClient } from '@/lib/api';

export type ActionResult<T = undefined> =
  { ok: true; data?: T } | { ok: false; message: string };

export async function submitAssignmentAction(input: {
  assignmentId: string;
  enrollmentId: string;
  textAnswer?: string;
}): Promise<ActionResult> {
  const api = createStudentApiClient();
  const result = await api.submissions.submit(input);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function updateSubmissionAction(
  submissionId: string,
  textAnswer: string | null,
): Promise<ActionResult> {
  const api = createStudentApiClient();
  const result = await api.submissions.updateTextAnswer(
    submissionId,
    textAnswer,
  );
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function attachSubmissionFileAction(
  submissionId: string,
  storedFileId: string,
  label?: string,
): Promise<ActionResult> {
  const api = createStudentApiClient();
  const result = await api.submissions.attachFile(
    submissionId,
    storedFileId,
    label,
  );
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function detachSubmissionFileAction(
  submissionId: string,
  storedFileId: string,
): Promise<ActionResult> {
  const api = createStudentApiClient();
  const result = await api.submissions.detachFile(submissionId, storedFileId);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function recordLearningProgressAction(
  input: UpdateLearningProgressInput,
): Promise<ActionResult> {
  const api = createStudentApiClient();
  const result = await api.learningProgress.recordProgress(input);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}
