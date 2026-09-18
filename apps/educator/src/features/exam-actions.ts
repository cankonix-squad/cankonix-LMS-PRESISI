'use server';

import type {
  AddExamParticipantInput,
  CreateExamInput,
  CreateExamSessionInput,
} from '@lms/api-client';
import { createEducatorApiClient } from '@/lib/api';

type ActionResult = { ok: true } | { ok: false; message: string };
function result(
  value: { ok: true } | { ok: false; message: string },
): ActionResult {
  return value.ok ? { ok: true } : { ok: false, message: value.message };
}
export async function createExamAction(
  input: CreateExamInput,
): Promise<ActionResult> {
  return result(await createEducatorApiClient().exams.create(input));
}
export async function saveBlueprintAction(
  examId: string,
  input: { title?: string; description?: string; rules: unknown[] },
): Promise<ActionResult> {
  return result(
    await createEducatorApiClient().exams.saveBlueprint(examId, input as never),
  );
}
export async function changeExamStatusAction(
  examId: string,
  status: string,
): Promise<ActionResult> {
  return result(
    await createEducatorApiClient().exams.changeStatus(examId, status),
  );
}
export async function createExamSessionAction(
  input: CreateExamSessionInput,
): Promise<ActionResult> {
  return result(await createEducatorApiClient().examSessions.create(input));
}
export async function changeSessionStatusAction(
  sessionId: string,
  status: string,
): Promise<ActionResult> {
  return result(
    await createEducatorApiClient().examSessions.changeStatus(
      sessionId,
      status as never,
    ),
  );
}
export async function addParticipantAction(
  sessionId: string,
  input: AddExamParticipantInput,
): Promise<ActionResult> {
  return result(
    await createEducatorApiClient().examSessions.addParticipant(
      sessionId,
      input,
    ),
  );
}
