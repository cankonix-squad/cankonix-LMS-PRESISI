/**
 * Lifecycle of a stored file.
 *
 * `PENDING` exists because an upload is two steps: the API issues a presigned
 * URL, and the client then uploads directly to object storage. Between those two
 * moments the metadata row must exist (so the key is reserved and attributable)
 * but must not be treated as usable. `UPLOADED` records that completion was
 * reported and existence was confirmed against storage; `ACTIVE` is the state a
 * domain may reference. `ARCHIVED` is the logical delete: the row survives for
 * audit and the bytes remain for the retention policy to reclaim.
 */
export const StoredFileStatusDto = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type StoredFileStatusDto =
  (typeof StoredFileStatusDto)[keyof typeof StoredFileStatusDto];

/**
 * Allowed edges.
 *
 * `PENDING -> UPLOADED` is the normal path. `UPLOADED -> ACTIVE` marks the file
 * as referenced by domain data. `ACTIVE -> ARCHIVED` and `UPLOADED -> ARCHIVED`
 * are the logical delete. `ARCHIVED` is terminal for the API: restoring a
 * retired file silently would resurrect a reference a report has already
 * excluded, so a replacement file is created instead.
 */
export const ALLOWED_FILE_TRANSITIONS: Record<
  StoredFileStatusDto,
  StoredFileStatusDto[]
> = {
  PENDING: [StoredFileStatusDto.UPLOADED, StoredFileStatusDto.ARCHIVED],
  UPLOADED: [StoredFileStatusDto.ACTIVE, StoredFileStatusDto.ARCHIVED],
  ACTIVE: [StoredFileStatusDto.ARCHIVED],
  ARCHIVED: [],
};

export function isAllowedFileTransition(
  from: StoredFileStatusDto,
  to: StoredFileStatusDto,
): boolean {
  return ALLOWED_FILE_TRANSITIONS[from].includes(to);
}

/** Statuses that may be handed to a domain as a usable reference. */
export const USABLE_FILE_STATUSES: StoredFileStatusDto[] = [
  StoredFileStatusDto.ACTIVE,
];
