/**
 * Object storage port (TASK-022).
 *
 * The domain talks to this interface, never to an SDK. That keeps the file
 * service testable with a fake and keeps the storage vendor a configuration
 * detail: swapping MinIO for real S3, or for an in-memory double in tests,
 * changes no business rule.
 */
export type PresignedRequest = {
  url: string;
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
  expiresInSeconds: number;
  objectKey: string;
  /** Headers the caller must send for the signature and policy to match. */
  headers: Record<string, string>;
};

export type PresignUploadInput = {
  objectKey: string;
  mimeType: string;
  expiresInSeconds?: number;
};

export type PresignDownloadInput = {
  objectKey: string;
  expiresInSeconds?: number;
  /** Forces how the browser presents the file (e.g. `attachment`). */
  responseContentDisposition?: string;
};

export type ObjectStorageHeadResult = {
  sizeBytes: number | null;
  contentType: string | null;
  checksum: string | null;
};

export interface ObjectStorage {
  createUploadUrl(input: PresignUploadInput): Promise<PresignedRequest>;
  createDownloadUrl(input: PresignDownloadInput): Promise<PresignedRequest>;
  /**
   * Confirms stored state. Returns `null` when existence cannot be confirmed —
   * the caller must treat that as "not confirmed" instead of "present", so an
   * unverified upload is never marked ready.
   */
  headObject(objectKey: string): Promise<ObjectStorageHeadResult | null>;
  removeObject(objectKey: string): Promise<void>;
}

/**
 * DI token. A separate symbol (rather than the interface) is what lets the
 * module bind a concrete adapter once and the tests bind a fake.
 */
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
