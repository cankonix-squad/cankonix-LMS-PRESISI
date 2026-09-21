import { Prisma } from '@prisma/client';

/**
 * Participant-safe attempt projection.
 *
 * The attempt read used to hand back the whole `QuestionVersion` row through a
 * Prisma `include`, which silently carried `scoringRule` (the answer key) and
 * `explanation` to the examinee. A participant holding only
 * `exam.attempt.read` could therefore read the correct answers for their own
 * attempt — and the same shape was returned by `start` and `submit`.
 *
 * The fix is the same one TASK-041 applied to questions, applied at the data
 * access layer as well as the response layer:
 *
 * 1. `ATTEMPT_SELECT` never *fetches* the answer key, so it cannot be leaked by
 *    a future careless `return` — the data is not in memory at all.
 * 2. `toStudentAttempt` builds the response from an explicit allow-list. It
 *    never spreads a row and never deletes keys, so a new column added to
 *    `QuestionVersion` cannot become part of the participant contract by
 *    accident.
 */
export const ATTEMPT_SELECT = {
  id: true,
  participantId: true,
  attemptNo: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  status: true,
  score: true,
  questions: {
    select: {
      id: true,
      sequence: true,
      points: true,
      optionOrder: true,
      questionVersion: {
        select: {
          id: true,
          stem: true,
          topic: true,
          difficulty: true,
          question: {
            select: {
              questionType: {
                select: {
                  code: true,
                  name: true,
                  hasOptions: true,
                  multiSelect: true,
                },
              },
            },
          },
          options: {
            select: { key: true, label: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' as const },
          },
        },
      },
      answer: {
        select: { answerPayload: true, revision: true, savedAt: true },
      },
    },
    orderBy: { sequence: 'asc' as const },
  },
} satisfies Prisma.ExamAttemptSelect;

export type AttemptRecord = Prisma.ExamAttemptGetPayload<{
  select: typeof ATTEMPT_SELECT;
}>;

export type StudentAttemptAnswer = {
  answerPayload: Record<string, unknown>;
  revision: number;
  savedAt: string;
};

export type StudentAttemptOption = {
  key: string;
  label: string;
  sortOrder: number;
};

export type StudentAttemptQuestion = {
  id: string;
  sequence: number;
  points: number;
  optionOrder: unknown;
  questionVersionId: string;
  stem: string;
  topic: string | null;
  difficulty: string | null;
  /**
   * Data-driven answering modality.
   *
   * The participant UI decides whether to render radios, checkboxes or a free
   * text box from these flags rather than by comparing the type code against a
   * known string, so a newly seeded question type works with no UI change.
   * `hasOptions`/`multiSelect` are presentation metadata; neither reveals the
   * answer key.
   */
  questionType: {
    code: string;
    name: string;
    hasOptions: boolean;
    multiSelect: boolean;
  };
  options: StudentAttemptOption[];
  answer: StudentAttemptAnswer | null;
};

export type StudentAttempt = {
  id: string;
  participantId: string;
  attemptNo: number;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  status: string;
  score: number | null;
  questions: StudentAttemptQuestion[];
};

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

/** Projects one attempt onto the participant-visible contract. */
export function toStudentAttempt(
  record: AttemptRecord | null,
): StudentAttempt | null {
  if (!record) return null;
  return {
    id: record.id,
    participantId: record.participantId,
    attemptNo: record.attemptNo,
    startedAt: toIso(record.startedAt) ?? '',
    expiresAt: toIso(record.expiresAt) ?? '',
    submittedAt: toIso(record.submittedAt),
    status: String(record.status),
    score: record.score === null ? null : toNumber(record.score),
    questions: (record.questions ?? []).map((question) => ({
      id: question.id,
      sequence: question.sequence,
      points: toNumber(question.points),
      optionOrder: question.optionOrder ?? null,
      questionVersionId: question.questionVersion.id,
      stem: question.questionVersion.stem,
      topic: question.questionVersion.topic ?? null,
      difficulty: question.questionVersion.difficulty ?? null,
      questionType: {
        code: question.questionVersion.question.questionType.code,
        name: question.questionVersion.question.questionType.name,
        hasOptions: question.questionVersion.question.questionType.hasOptions,
        multiSelect: question.questionVersion.question.questionType.multiSelect,
      },
      options: (question.questionVersion.options ?? []).map((option) => ({
        key: option.key,
        label: option.label,
        sortOrder: option.sortOrder,
      })),
      answer: question.answer
        ? {
            answerPayload:
              (question.answer.answerPayload as Record<string, unknown>) ?? {},
            revision: question.answer.revision,
            savedAt: toIso(question.answer.savedAt) ?? '',
          }
        : null,
    })),
  };
}

/**
 * The autosave acknowledgement.
 *
 * Returns only what the client needs to advance its revision counter, so the
 * save path cannot become a second way to read attempt internals.
 */
export function toSavedAnswer(record: {
  answerPayload: unknown;
  revision: number;
  savedAt: Date;
}): StudentAttemptAnswer {
  return {
    answerPayload: (record.answerPayload as Record<string, unknown>) ?? {},
    revision: record.revision,
    savedAt: toIso(record.savedAt) ?? '',
  };
}
