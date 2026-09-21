import type { Attempt, AttemptQuestion } from '@lms/api-client';

/**
 * Pure helpers for the exam runtime.
 *
 * Kept free of React and of the API client so they can be unit tested directly
 * and so the timer logic has exactly one definition.
 */

export const SAVE_STATUS = {
  IDLE: 'idle',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
} as const;

export type SaveStatus = (typeof SAVE_STATUS)[keyof typeof SAVE_STATUS];

/**
 * Remaining milliseconds until the server deadline.
 *
 * Derived from the server's `expiresAt` and the caller's clock reading, so the
 * display can never run ahead of the authoritative deadline. Never returns a
 * negative value: once the deadline has passed the attempt is over, not
 * "minus three seconds".
 */
export function remainingMs(expiresAt: string, nowMs: number): number {
  const deadline = new Date(expiresAt).getTime();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, deadline - nowMs);
}

/** `mm:ss`, or `hh:mm:ss` once the attempt runs past an hour. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Approaching-the-deadline threshold for the warning tone. */
export const URGENT_THRESHOLD_MS = 5 * 60 * 1000;

export function isUrgent(ms: number): boolean {
  return ms > 0 && ms <= URGENT_THRESHOLD_MS;
}

/**
 * The payload sent to the autosave endpoint for one question.
 *
 * The API stores this opaquely, so the shape has to agree between the read
 * (which restores the form) and the write. `keys` holds every selected option
 * for an option-based question; `answer` holds free text for a written one.
 */
export function buildAnswerPayload(
  keys: string[],
  answer: string,
): Record<string, unknown> {
  const trimmed = answer.trim();
  if (keys.length > 0 && trimmed) return { keys, answer: trimmed };
  if (keys.length > 0) return { keys };
  if (trimmed) return { answer: trimmed };
  return {};
}

/** Reads the saved selection back out of a stored payload. */
export function readSavedKeys(
  payload: Record<string, unknown> | null | undefined,
): string[] {
  if (!payload) return [];
  const keys = payload.keys;
  return Array.isArray(keys) ? keys.map(String) : [];
}

/** Reads the saved free-text answer back out of a stored payload. */
export function readSavedText(
  payload: Record<string, unknown> | null | undefined,
): string {
  if (!payload) return '';
  const answer = payload.answer;
  return typeof answer === 'string' ? answer : '';
}

export function isAnswered(question: AttemptQuestion): boolean {
  const payload = question.answer?.answerPayload;
  if (!payload) return false;
  return Object.keys(payload).length > 0;
}

export function answeredCount(attempt: Attempt): number {
  return attempt.questions.filter(isAnswered).length;
}

/** The revision the client must send with its next write for this question. */
export function revisionOf(question: AttemptQuestion): number {
  return question.answer?.revision ?? 0;
}

/**
 * Merges a saved answer back into the attempt.
 *
 * The autosave response only carries the acknowledgement, so the revision is
 * advanced locally; without this a second edit would be rejected as stale.
 */
export function applySavedAnswer(
  attempt: Attempt,
  questionId: string,
  answer: {
    answerPayload: Record<string, unknown>;
    revision: number;
    savedAt: string;
  },
): Attempt {
  return {
    ...attempt,
    questions: attempt.questions.map((question) =>
      question.id === questionId
        ? { ...question, answer: { ...answer } }
        : question,
    ),
  };
}
