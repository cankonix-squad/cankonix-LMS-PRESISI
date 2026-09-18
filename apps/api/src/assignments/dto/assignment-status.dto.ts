export const AssignmentLifecycleStatusDto = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AssignmentLifecycleStatusDto =
  (typeof AssignmentLifecycleStatusDto)[keyof typeof AssignmentLifecycleStatusDto];

/**
 * Assignment lifecycle.
 *
 * `ARCHIVED` is terminal: an archived assignment is history and must never
 * re-open, or a participant could submit against work that was retired.
 * `CLOSED` is reversible so an educator can re-open a deadline they closed too
 * early, but it never accepts new submissions until it is PUBLISHED again.
 */
export const ALLOWED_ASSIGNMENT_TRANSITIONS: Record<
  AssignmentLifecycleStatusDto,
  readonly AssignmentLifecycleStatusDto[]
> = {
  [AssignmentLifecycleStatusDto.DRAFT]: [
    AssignmentLifecycleStatusDto.DRAFT,
    AssignmentLifecycleStatusDto.PUBLISHED,
    AssignmentLifecycleStatusDto.ARCHIVED,
  ],
  [AssignmentLifecycleStatusDto.PUBLISHED]: [
    AssignmentLifecycleStatusDto.PUBLISHED,
    AssignmentLifecycleStatusDto.CLOSED,
    AssignmentLifecycleStatusDto.ARCHIVED,
  ],
  [AssignmentLifecycleStatusDto.CLOSED]: [
    AssignmentLifecycleStatusDto.PUBLISHED,
    AssignmentLifecycleStatusDto.CLOSED,
    AssignmentLifecycleStatusDto.ARCHIVED,
  ],
  [AssignmentLifecycleStatusDto.ARCHIVED]: [
    AssignmentLifecycleStatusDto.ARCHIVED,
  ],
};

export function isAllowedAssignmentTransition(
  from: AssignmentLifecycleStatusDto,
  to: AssignmentLifecycleStatusDto,
): boolean {
  return ALLOWED_ASSIGNMENT_TRANSITIONS[from].includes(to);
}

/** Only a PUBLISHED assignment accepts participant work. */
export const SUBMITTABLE_ASSIGNMENT_STATUSES: readonly AssignmentLifecycleStatusDto[] =
  [AssignmentLifecycleStatusDto.PUBLISHED];
