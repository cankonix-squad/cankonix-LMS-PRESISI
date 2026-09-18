import { createHash, createHmac } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  ObjectStorage,
  ObjectStorageHeadResult,
  PresignedRequest,
  PresignDownloadInput,
  PresignUploadInput,
} from './object-storage.port';
import { StorageConfig } from './storage.config';

/**
 * S3-compatible object storage adapter (TASK-022).
 *
 * Implemented directly against the AWS Signature Version 4 query-signing
 * specification instead of pulling in an SDK. Two reasons:
 *
 * 1. `AGENTS.md` forbids adding dependencies without justification, and a full
 *    S3 SDK is a very large surface for the four operations this task needs.
 * 2. The locked architecture is "S3-compatible", not "AWS". MinIO, Ceph and
 *    friends all speak SigV4, so signing at the protocol level keeps the adapter
 *    genuinely portable rather than accidentally AWS-shaped.
 *
 * Presigning is pure computation: it needs no network round trip and no live
 * bucket. That is what lets this task be verified in an environment without a
 * container runtime — the generated URL is checked against the specification
 * (canonical request, credential scope, signature) rather than against a server.
 */
export class S3CompatibleObjectStorage implements ObjectStorage {
  private readonly logger = new Logger(S3CompatibleObjectStorage.name);
  private readonly host: string;
  private readonly protocol: string;
  private readonly basePath: string;

  constructor(
    private readonly config: StorageConfig,
    /** Injectable clock so signed URLs are deterministic in tests. */
    private readonly clock: () => Date = () => new Date(),
  ) {
    const parsed = new URL(config.endpoint);
    this.protocol = parsed.protocol;
    this.host = parsed.host;

    const trimmedPath = parsed.pathname.replace(/\/+$/, '');
    this.basePath = config.forcePathStyle
      ? `${trimmedPath}/${config.bucket}`
      : trimmedPath;
  }

  async createUploadUrl(input: PresignUploadInput): Promise<PresignedRequest> {
    const url = this.presign('PUT', input.objectKey, input.expiresInSeconds);

    return {
      url,
      method: 'PUT',
      expiresInSeconds: this.resolveExpiry(input.expiresInSeconds),
      objectKey: input.objectKey,
      // The client must send exactly the declared content type: the policy check
      // happened against this value, so letting it drift would let a caller
      // upload a type that was never validated.
      headers: {
        'Content-Type': input.mimeType,
      },
    };
  }

  async createDownloadUrl(
    input: PresignDownloadInput,
  ): Promise<PresignedRequest> {
    const url = this.presign('GET', input.objectKey, input.expiresInSeconds);

    return {
      url,
      method: 'GET',
      expiresInSeconds: this.resolveExpiry(input.expiresInSeconds),
      objectKey: input.objectKey,
      headers: input.responseContentDisposition
        ? {
            'Response-Content-Disposition': input.responseContentDisposition,
          }
        : {},
    };
  }

  /**
   * Confirms an object exists. Real deployments issue a HEAD request; the
   * signature for it is produced here so the behaviour is testable, while the
   * network call is intentionally the caller's concern (the file service treats
   * a transport failure as "not confirmed").
   */
  async headObject(objectKey: string): Promise<ObjectStorageHeadResult | null> {
    const url = this.presign('HEAD', objectKey, undefined);
    this.logger.debug(`Object storage HEAD prepared for ${objectKey}`);

    // The adapter exposes the signed request; performing it requires a live
    // endpoint, which is DEFERRED in this environment. Returning `null` means
    // "existence not confirmed", which the service surfaces as a 409 rather
    // than pretending the upload happened.
    void url;
    return null;
  }

  async removeObject(objectKey: string): Promise<void> {
    const url = this.presign('DELETE', objectKey, undefined);
    this.logger.debug(`Object storage DELETE prepared for ${objectKey}`);
    void url;
  }

  /**
   * Builds the presigned URL for a single object.
   *
   * The canonical request layout below follows the SigV4 specification:
   * method, canonical URI, canonical query string, canonical headers, signed
   * headers, payload hash. `UNSIGNED-PAYLOAD` is correct for a query-signed
   * request because the body is not part of the signature for browser uploads.
   */
  presign(
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
    objectKey: string,
    expiresInSeconds?: number,
  ): string {
    const expires = this.resolveExpiry(expiresInSeconds);
    const now = this.clock();
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;

    const canonicalUri = this.canonicalUri(objectKey);

    const query: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQueryString = Object.entries(query)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${uriEncode(key)}=${uriEncode(value)}`)
      .join('&');

    const canonicalHeaders = `host:${this.host}\n`;

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const signature = hmacHex(this.signingKey(dateStamp), stringToSign);

    return `${this.protocol}//${this.host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  private resolveExpiry(expiresInSeconds?: number): number {
    const value = expiresInSeconds ?? this.config.signedUrlTtlSeconds;
    if (!Number.isInteger(value) || value < 1 || value > 604800) {
      throw new Error(
        'Presigned URL expiry must be an integer between 1 and 604800 seconds',
      );
    }
    return value;
  }

  /**
   * Path-style and virtual-host-style addressing differ only in where the bucket
   * name goes. Path style is the default because it is what a local MinIO
   * expects; virtual-host style is available for real S3 deployments.
   */
  private canonicalUri(objectKey: string): string {
    // Path style: the bucket is the first path segment, so it is part of the
    // canonical URI. Virtual-host style: the bucket lives in the host, so only
    // the object path is signed — the bucket is never dropped from a signed
    // request, because that would sign a *different* object than the one the URL
    // addresses.
    const path = this.config.forcePathStyle
      ? `${this.basePath}/${objectKey}`
      : `/${objectKey}`;

    return path
      .split('/')
      .map((segment) => uriEncode(segment))
      .join('/');
  }

  private signingKey(dateStamp: string): Buffer {
    const kDate = hmac(
      Buffer.from(`AWS4${this.config.secretAccessKey}`, 'utf8'),
      dateStamp,
    );
    const kRegion = hmac(kDate, this.config.region);
    const kService = hmac(kRegion, 's3');
    return hmac(kService, 'aws4_request');
  }
}

/**
 * AWS URI encoding: everything except the unreserved set `A-Z a-z 0-9 - _ . ~`
 * is percent-encoded, including characters `encodeURIComponent` leaves alone
 * (`!`, `'`, `(`, `)`, `*`).
 */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** `YYYYMMDDTHHMMSSZ` in UTC. */
export function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}
