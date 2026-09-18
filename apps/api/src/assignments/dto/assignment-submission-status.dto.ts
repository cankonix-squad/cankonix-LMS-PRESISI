export const AssignmentSubmissionStatusDto = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
  RETURNED: 'RETURNED',
} as const;

export type AssignmentSubmissionStatusDto =
  (typeof AssignmentSubmissionStatusDto)[keyof typeof AssignmentSubmissionStatusDto];

/**
 * Submission lifecycle.
 *
 * A DRAFT attempt may be edited freely; once SUBMITTED it is frozen except for
 * grading. `RETURNED` means the grade and feedback were released to the
 * participant — that is a one-way door in normal operation, but an educator may
 * still re-grade before returning, so GRADED -> GRADED is allowed.
 */
export const ALLOWED_SUBMISSION_TRANSITIONS: Record<
  AssignmentSubmissionStatusDto,
  readonly AssignmentSubmissionStatusDto[]
> = {
  [AssignmentSubmissionStatusDto.DRAFT]: [
    AssignmentSubmissionStatusDto.DRAFT,
    AssignmentSubmissionStatusDto.SUBMITTED,
  ],
  [AssignmentSubmissionStatusDto.SUBMITTED]: [
    AssignmentSubmissionStatusDto.SUBMITTED,
    AssignmentSubmissionStatusDto.GRADED,
  ],
  [AssignmentSubmissionStatusDto.GRADED]: [
    AssignmentSubmissionStatusDto.GRADED,
    AssignmentSubmissionStatusDto.RETURNED,
  ],
  [AssignmentSubmissionStatusDto.RETURNED]: [
    AssignmentSubmissionStatusDto.RETURNED,
  ],
};

export function isAllowedSubmissionTransition(
  from: AssignmentSubmissionStatusDto,
  to: AssignmentSubmissionStatusDto,
): boolean {
  return ALLOWED_SUBMISSION_TRANSITIONS[from].includes(to);
}

/** Statuses in which the participant's work counts as handed in. */
export const SUBMITTED_STATUSES: readonly AssignmentSubmissionStatusDto[] = [
  AssignmentSubmissionStatusDto.SUBMITTED,
  AssignmentSubmissionStatusDto.GRADED,
  AssignmentSubmissionStatusDto.RETURNED,
];
