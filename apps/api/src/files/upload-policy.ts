/**
 * Upload policy (TASK-022).
 *
 * "Whitelist size/type configurable" is implemented as data pushed into the
 * service, not as constants spread through controllers. The API client is told
 * what the policy is before it uploads, so an oversized or disallowed file is
 * rejected before the bytes leave the browser instead of after.
 */
export type UploadPolicyEntry = {
  /** MIME type that may be uploaded, e.g. `application/pdf`. */
  mimeType: string;
  /** Maximum accepted size in bytes for this type. */
  maxSizeBytes: number;
};

export type UploadPolicy = {
  /**
   * The whitelist is authoritative: a type that is not listed is refused
   * regardless of this value. `defaultMaxSizeBytes` therefore only ever
   * *narrows* the per-entry limit — it can never widen access to a type that
   * was not explicitly approved.
   */
  defaultMaxSizeBytes: number | null;
  entries: UploadPolicyEntry[];
};

export const DEFAULT_UPLOAD_POLICY: UploadPolicy = {
  defaultMaxSizeBytes: 25 * 1024 * 1024,
  entries: [
    { mimeType: 'application/pdf', maxSizeBytes: 25 * 1024 * 1024 },
    { mimeType: 'image/png', maxSizeBytes: 5 * 1024 * 1024 },
    { mimeType: 'image/jpeg', maxSizeBytes: 5 * 1024 * 1024 },
    { mimeType: 'image/webp', maxSizeBytes: 5 * 1024 * 1024 },
    { mimeType: 'text/plain', maxSizeBytes: 10 * 1024 * 1024 },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      maxSizeBytes: 25 * 1024 * 1024,
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      maxSizeBytes: 50 * 1024 * 1024,
    },
    { mimeType: 'application/zip', maxSizeBytes: 50 * 1024 * 1024 },
    { mimeType: 'video/mp4', maxSizeBytes: 200 * 1024 * 1024 },
    { mimeType: 'audio/mpeg', maxSizeBytes: 50 * 1024 * 1024 },
  ],
};

export function findPolicyEntry(
  policy: UploadPolicy,
  mimeType: string,
): UploadPolicyEntry | null {
  return policy.entries.find((entry) => entry.mimeType === mimeType) ?? null;
}

export function maxSizeForMimeType(
  policy: UploadPolicy,
  mimeType: string,
): number | null {
  const entry = findPolicyEntry(policy, mimeType);
  if (!entry) {
    // Unlisted types are never allowed, even when a default ceiling is set.
    return null;
  }
  if (policy.defaultMaxSizeBytes === null) {
    return entry.maxSizeBytes;
  }
  return Math.min(entry.maxSizeBytes, policy.defaultMaxSizeBytes);
}
