/**
 * Lifecycle of a learning content row.
 *
 * `SUPERSEDED` is not an operator action — it is set by the service when a new
 * version of a published material replaces it. Keeping the state explicit means
 * a report can tell "the student saw this" apart from "this is the current one"
 * without comparing timestamps.
 */
export const LearningContentStatusDto = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SUPERSEDED: 'SUPERSEDED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type LearningContentStatusDto =
  (typeof LearningContentStatusDto)[keyof typeof LearningContentStatusDto];

/**
 * Content kinds. `FILE` addresses object storage through `objectKey`; `LINK`
 * addresses an external resource through `externalUrl`. Nothing else is allowed,
 * because a third kind would need a new storage backend and that is an
 * architecture decision, not a task decision.
 */
export const LearningContentTypeDto = {
  FILE: 'FILE',
  LINK: 'LINK',
} as const;

export type LearningContentTypeDto =
  (typeof LearningContentTypeDto)[keyof typeof LearningContentTypeDto];

/**
 * Allowed status edges for content.
 *
 * `PUBLISHED -> DRAFT` is allowed so material can be pulled back before it is
 * used. `SUPERSEDED` is reachable only from `PUBLISHED` and only through the
 * versioning path, so it cannot be set by hand and desynchronise the history.
 */
export const ALLOWED_CONTENT_TRANSITIONS: Record<
  LearningContentStatusDto,
  LearningContentStatusDto[]
> = {
  DRAFT: [
    LearningContentStatusDto.PUBLISHED,
    LearningContentStatusDto.ARCHIVED,
  ],
  PUBLISHED: [
    LearningContentStatusDto.DRAFT,
    LearningContentStatusDto.ARCHIVED,
  ],
  SUPERSEDED: [LearningContentStatusDto.ARCHIVED],
  ARCHIVED: [],
};

export function isAllowedContentTransition(
  from: LearningContentStatusDto,
  to: LearningContentStatusDto,
): boolean {
  return ALLOWED_CONTENT_TRANSITIONS[from].includes(to);
}
