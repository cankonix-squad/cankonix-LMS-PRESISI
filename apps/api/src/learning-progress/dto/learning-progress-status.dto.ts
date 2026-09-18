export const LearningProgressStatusDto = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type LearningProgressStatusDto =
  (typeof LearningProgressStatusDto)[keyof typeof LearningProgressStatusDto];

/**
 * Allowed progression.
 *
 * Backwards movement is deliberately allowed so a participant who accidentally
 * marks a long video complete can correct it, but `COMPLETED` can only leave via
 * an explicit reset to `IN_PROGRESS` — never silently. Nothing here is
 * write-once: the constraint that actually matters is that `progressPercent`
 * and `status` must agree, which `isAllowedProgressTransition` cannot express on
 * its own and the service enforces.
 */
export const ALLOWED_PROGRESS_TRANSITIONS: Record<
  LearningProgressStatusDto,
  readonly LearningProgressStatusDto[]
> = {
  [LearningProgressStatusDto.NOT_STARTED]: [
    LearningProgressStatusDto.NOT_STARTED,
    LearningProgressStatusDto.IN_PROGRESS,
    LearningProgressStatusDto.COMPLETED,
  ],
  [LearningProgressStatusDto.IN_PROGRESS]: [
    LearningProgressStatusDto.NOT_STARTED,
    LearningProgressStatusDto.IN_PROGRESS,
    LearningProgressStatusDto.COMPLETED,
  ],
  [LearningProgressStatusDto.COMPLETED]: [
    LearningProgressStatusDto.IN_PROGRESS,
    LearningProgressStatusDto.COMPLETED,
  ],
};

export function isAllowedProgressTransition(
  from: LearningProgressStatusDto,
  to: LearningProgressStatusDto,
): boolean {
  return ALLOWED_PROGRESS_TRANSITIONS[from].includes(to);
}

/** Terminal-for-completion statuses; a `COMPLETED` row keeps `completedAt`. */
export const COMPLETED_STATUSES: readonly LearningProgressStatusDto[] = [
  LearningProgressStatusDto.COMPLETED,
];
