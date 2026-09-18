/**
 * Lifecycle of an assessment.
 *
 * `DRAFT -> PUBLISHED` makes the assessment visible to participants.
 * `PUBLISHED -> CLOSED` ends entry while keeping the row readable, and
 * `-> ARCHIVED` retires it for good.
 *
 * `PUBLISHED -> DRAFT` is allowed because unpublishing is a normal correction:
 * an assessment published by mistake is taken back before participants reach
 * it, without deleting anything. `CLOSED` is deliberately one-way: once results
 * exist, re-opening would silently change what participants were graded on.
 * `ARCHIVED` is terminal so any score that hangs off the assessment stays
 * reconstructible.
 */
export const AssessmentStatusDto = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AssessmentStatusDto =
  (typeof AssessmentStatusDto)[keyof typeof AssessmentStatusDto];

/**
 * Allowed status edges.
 */
export const ALLOWED_ASSESSMENT_TRANSITIONS: Record<
  AssessmentStatusDto,
  AssessmentStatusDto[]
> = {
  DRAFT: [AssessmentStatusDto.PUBLISHED, AssessmentStatusDto.ARCHIVED],
  PUBLISHED: [
    AssessmentStatusDto.DRAFT,
    AssessmentStatusDto.CLOSED,
    AssessmentStatusDto.ARCHIVED,
  ],
  CLOSED: [AssessmentStatusDto.ARCHIVED],
  ARCHIVED: [],
};

export function isAllowedAssessmentTransition(
  from: AssessmentStatusDto,
  to: AssessmentStatusDto,
): boolean {
  return ALLOWED_ASSESSMENT_TRANSITIONS[from].includes(to);
}
