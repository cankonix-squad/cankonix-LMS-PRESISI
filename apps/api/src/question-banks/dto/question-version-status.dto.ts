/**
 * Lifecycle of a question version.
 *
 * A version is the immutable snapshot an attempt is scored against, so its
 * states describe that snapshot rather than an approval workflow:
 *
 * - `DRAFT` is the only mutable state. The author may still correct the stem or
 *   the option set, because nothing outside the editor has seen it.
 * - `PUBLISHED` freezes the row. From this moment an exam blueprint may include
 *   the version and an attempt may reference it, so editing it in place would
 *   silently rewrite history. Corrections happen by creating the next version.
 * - `SUPERSEDED` is not an operator action: it is set by the service when a
 *   newer version of the same question is published. The row stays readable.
 */
export const QuestionVersionStatusDto = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type QuestionVersionStatusDto =
  (typeof QuestionVersionStatusDto)[keyof typeof QuestionVersionStatusDto];
