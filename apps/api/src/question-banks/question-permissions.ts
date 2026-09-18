/**
 * Permission vocabulary for the question bank domain (TASK-041).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * These codes are declared on routes and resolved from Role + Scope — there is no
 * role-name branching anywhere in this code.
 */
export const QUESTION_PERMISSIONS = {
  /** Read the data-driven question type vocabulary. */
  TYPE_READ: 'question.type.read',
  /** Create/update question types. */
  TYPE_MANAGE: 'question.type.manage',
  /** Read question banks. */
  BANK_READ: 'question.bank.read',
  /** Create/update question banks. */
  BANK_MANAGE: 'question.bank.manage',
  /** Read questions and their full versions, including answer keys. */
  READ: 'question.read',
  /** Create/update questions, versions and publish them. */
  MANAGE: 'question.manage',
  /**
   * Read the student-safe projection of a published question version. Separate
   * from `question.read` because it must be grantable to a participant without
   * also granting access to the answer key.
   */
  PARTICIPATE: 'question.participate',
} as const;

export type QuestionPermission =
  (typeof QUESTION_PERMISSIONS)[keyof typeof QUESTION_PERMISSIONS];

export const QUESTION_PERMISSION_CODES: readonly QuestionPermission[] =
  Object.values(QUESTION_PERMISSIONS);
