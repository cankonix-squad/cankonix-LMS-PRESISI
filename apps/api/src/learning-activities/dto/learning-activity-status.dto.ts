/**
 * Lifecycle of a learning activity.
 *
 * `ARCHIVED` is terminal for the same reason as `LearningMeeting`: progress and
 * submissions hang off an activity, so removing it destructively would orphan
 * student work. Retiring it keeps the record readable in reports.
 */
export const LearningActivityStatusDto = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type LearningActivityStatusDto =
  (typeof LearningActivityStatusDto)[keyof typeof LearningActivityStatusDto];

/**
 * Allowed status edges.
 *
 * `PUBLISHED -> DRAFT` is allowed because unpublishing is a normal correction:
 * material is taken back before students reach it, without deleting anything.
 * `DRAFT -> ARCHIVED` lets a never-used activity be retired directly.
 */
export const ALLOWED_ACTIVITY_TRANSITIONS: Record<
  LearningActivityStatusDto,
  LearningActivityStatusDto[]
> = {
  DRAFT: [
    LearningActivityStatusDto.PUBLISHED,
    LearningActivityStatusDto.ARCHIVED,
  ],
  PUBLISHED: [
    LearningActivityStatusDto.DRAFT,
    LearningActivityStatusDto.ARCHIVED,
  ],
  ARCHIVED: [],
};

export function isAllowedActivityTransition(
  from: LearningActivityStatusDto,
  to: LearningActivityStatusDto,
): boolean {
  return ALLOWED_ACTIVITY_TRANSITIONS[from].includes(to);
}
