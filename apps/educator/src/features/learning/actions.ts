'use server';

import type { GradeSubmissionInput } from '@lms/api-client';
import { createEducatorApiClient } from '@/lib/api';

/**
 * Server actions for the educator grading surface.
 *
 * These run on the server, so the API token never enters the browser bundle.
 * They delegate straight to the shared API client — no rule is re-implemented
 * here. The API still decides whether the caller is an authorized educator, and
 * still enforces the score ceiling and the submission lifecycle.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function gradeSubmissionAction(
  submissionId: string,
  input: GradeSubmissionInput,
): Promise<ActionResult> {
  const api = createEducatorApiClient();
  const result = await api.submissions.grade(submissionId, input);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function returnSubmissionAction(
  submissionId: string,
): Promise<ActionResult> {
  const api = createEducatorApiClient();
  const result = await api.submissions.returnToParticipant(submissionId);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}
