export const LearningMeetingStatusDto = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type LearningMeetingStatusDto =
  (typeof LearningMeetingStatusDto)[keyof typeof LearningMeetingStatusDto];

/**
 * Meeting lifecycle.
 *
 * `DRAFT -> PUBLISHED -> COMPLETED -> ARCHIVED` is the intended path, but the
 * edges below are what the system actually enforces. Two design decisions are
 * worth stating because they are not obvious:
 *
 * - `PUBLISHED -> DRAFT` is allowed. Unpublishing a meeting is a normal
 *   correction (wrong date, wrong topic) and is not destructive: no learner data
 *   is lost, because progress is keyed to the meeting, not to its status.
 * - `ARCHIVED` is terminal. Archiving is how a meeting is retired *without*
 *   deleting it, so an archived meeting must stay archived: reactivating one
 *   would resurrect content that learners and reports already treat as retired.
 *   A replacement meeting is created instead, and the sequence ordering keeps
 *   the history readable.
 */
export const ALLOWED_MEETING_TRANSITIONS: Record<
  LearningMeetingStatusDto,
  LearningMeetingStatusDto[]
> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['DRAFT', 'COMPLETED', 'ARCHIVED'],
  COMPLETED: ['PUBLISHED', 'ARCHIVED'],
  ARCHIVED: [],
};

export function isAllowedTransition(
  from: LearningMeetingStatusDto,
  to: LearningMeetingStatusDto,
): boolean {
  return ALLOWED_MEETING_TRANSITIONS[from].includes(to);
}

/**
 * Statuses that learners can already see. A meeting that has been published at
 * least once is treated as having a visible identity, which is why the sequence
 * of such a meeting is not silently reassigned by a reorder — see
 * `LearningMeetingsService.reorder`.
 */
export const VISIBLE_MEETING_STATUSES: LearningMeetingStatusDto[] = [
  LearningMeetingStatusDto.PUBLISHED,
  LearningMeetingStatusDto.COMPLETED,
  LearningMeetingStatusDto.ARCHIVED,
];
