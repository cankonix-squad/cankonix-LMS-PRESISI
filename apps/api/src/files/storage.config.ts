import { Logger } from '@nestjs/common';

/**
 * Object storage configuration (TASK-022).
 *
 * The storage backend is addressed through a port (`ObjectStorage`) rather than
 * an SDK call, so this module can be built, typechecked and tested with no
 * MinIO/S3 container running. That matters twice over: the environment has no
 * container runtime, and a presigned-URL flow is exactly the kind of code that
 * should be provable without a live bucket.
 *
 * The configuration is optional by design. Missing configuration is a warning,
 * not a boot failure, because the API has non-file features that must keep
 * working; the resulting state is a fail-closed one where any upload request is
 * refused rather than silently accepted.
 */
export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Presigned URL lifetime in seconds. */
  signedUrlTtlSeconds: number;
  forcePathStyle: boolean;
};

export type StorageConfigLoadResult = {
  config: StorageConfig | null;
  errors: string[];
};

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;
export const MIN_SIGNED_URL_TTL_SECONDS = 60;
export const MAX_SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Reads object storage configuration from the environment.
 *
 * `STORAGE_REQUIRED=true` turns a partial configuration into a boot error, which
 * is what a deployment with file features enabled wants: better to fail at boot
 * than to serve an API whose uploads mysteriously 503.
 */
export function loadStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): StorageConfigLoadResult {
  const endpoint = env.STORAGE_ENDPOINT?.trim();
  const bucket = env.STORAGE_BUCKET?.trim();
  const accessKeyId = env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.STORAGE_SECRET_ACCESS_KEY?.trim();
  const region = env.STORAGE_REGION?.trim() || 'us-east-1';

  const missing: string[] = [];
  if (!endpoint) missing.push('STORAGE_ENDPOINT');
  if (!bucket) missing.push('STORAGE_BUCKET');
  if (!accessKeyId) missing.push('STORAGE_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('STORAGE_SECRET_ACCESS_KEY');

  const ttlRaw = env.STORAGE_SIGNED_URL_TTL_SECONDS?.trim();
  const ttl = ttlRaw ? Number(ttlRaw) : DEFAULT_SIGNED_URL_TTL_SECONDS;

  const errors: string[] = [];
  if (!Number.isInteger(ttl)) {
    errors.push('STORAGE_SIGNED_URL_TTL_SECONDS must be an integer');
  } else if (
    ttl < MIN_SIGNED_URL_TTL_SECONDS ||
    ttl > MAX_SIGNED_URL_TTL_SECONDS
  ) {
    errors.push(
      `STORAGE_SIGNED_URL_TTL_SECONDS must be between ${MIN_SIGNED_URL_TTL_SECONDS} and ${MAX_SIGNED_URL_TTL_SECONDS}`,
    );
  }

  if (endpoint && !/^https?:\/\//i.test(endpoint)) {
    errors.push('STORAGE_ENDPOINT must be an http(s) URL');
  }

  if (missing.length > 0) {
    if (env.STORAGE_REQUIRED === 'true') {
      return {
        config: null,
        errors: [
          ...errors,
          `Object storage is required but not configured: ${missing.join(', ')}`,
        ],
      };
    }
    return {
      config: null,
      errors: [...errors, ...missing.map((name) => `${name} is not set`)],
    };
  }

  if (errors.length > 0) {
    return { config: null, errors };
  }

  return {
    config: {
      endpoint: endpoint!,
      region,
      bucket: bucket!,
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      signedUrlTtlSeconds: ttl,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE !== 'false',
    },
    errors: [],
  };
}

export function warnUnconfiguredStorage(errors: string[]): void {
  const detail =
    errors.length > 0 ? errors.join('; ') : 'configuration is incomplete';
  new Logger('Bootstrap').warn(
    `Object storage is not configured (${detail}). File upload endpoints will refuse requests.`,
  );
}
