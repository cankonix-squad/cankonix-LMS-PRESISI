import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ListStoredFilesQueryDto } from './dto/list-stored-files-query.dto';
import {
  DownloadUrlResponseDto,
  InitiateUploadResponseDto,
  PresignedRequestResponseDto,
  StoredFileListResponseDto,
  StoredFileResponseDto,
  UploadPolicyResponseDto,
} from './dto/stored-file-response.dto';
import {
  StoredFileStatusDto,
  isAllowedFileTransition,
} from './dto/stored-file-status.dto';
import { buildObjectKey, sanitizeOriginalName } from './object-key';
import { OBJECT_STORAGE, ObjectStorage } from './object-storage.port';
import {
  STORED_FILES_REPOSITORY,
  StoredFilesRepository,
} from './stored-files.repository';
import { StoredFileRecord, StoredFileUpdateData } from './stored-file.types';
import { DEFAULT_SIGNED_URL_TTL_SECONDS } from './storage.config';
import { maxSizeForMimeType, UploadPolicy } from './upload-policy';

export const UPLOAD_POLICY = Symbol('UPLOAD_POLICY');

export type FileServiceOptions = {
  /** Default presigned URL lifetime for downloads, in seconds. */
  downloadUrlTtlSeconds: number;
};

/**
 * Binding token for the runtime limits above. Kept a symbol so a deployment can
 * rebind limits without touching the service, matching how the policy itself is
 * injected.
 */
export const FILE_SERVICE_OPTIONS = Symbol('FILE_SERVICE_OPTIONS');

export const DEFAULT_FILE_SERVICE_OPTIONS: FileServiceOptions = {
  downloadUrlTtlSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(STORED_FILES_REPOSITORY)
    private readonly files: StoredFilesRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    @Inject(UPLOAD_POLICY)
    private readonly policy: UploadPolicy,
    private readonly audit: AuditService,
    @Inject(FILE_SERVICE_OPTIONS)
    private readonly options: FileServiceOptions = DEFAULT_FILE_SERVICE_OPTIONS,
  ) {}

  /**
   * Step 1 of an upload: reserve metadata and hand back a presigned PUT.
   *
   * Authorization happens before this method runs (the route is guarded), and
   * the content policy is enforced here, before the URL is issued — an oversized
   * or disallowed file is refused without ever producing a writable URL. The key
   * is generated entirely server-side, so the client cannot steer where bytes
   * land even if it controls `originalName`.
   */
  async initiateUpload(
    ownerUserId: string | null,
    dto: InitiateUploadDto,
  ): Promise<InitiateUploadResponseDto> {
    const mimeType = dto.mimeType.trim().toLowerCase();
    this.assertAllowed(mimeType, dto.sizeBytes);

    const objectKey = buildObjectKey({
      namespace: dto.namespace,
      ownerUserId,
      originalName: dto.originalName,
      mimeType,
    });

    if (await this.files.findByObjectKey(objectKey)) {
      // Collisions are practically impossible with a uuid, but a duplicate key
      // would silently overwrite someone else's object, so refuse instead.
      throw new ConflictException('Object key collision, please retry');
    }

    const created = await this.files.create({
      objectKey,
      namespace: dto.namespace,
      originalName: sanitizeOriginalName(dto.originalName),
      mimeType,
      sizeBytes: dto.sizeBytes,
      checksum: dto.checksum?.trim() || null,
      ownerUserId,
      status: StoredFileStatusDto.PENDING,
    });

    const upload = await this.storage.createUploadUrl({
      objectKey,
      mimeType,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STORED_FILE_UPLOAD_INITIATED,
      resourceType: AUDIT_RESOURCE_TYPES.STORED_FILE,
      resourceId: created.id,
      metadata: {
        namespace: created.namespace,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
        ownerUserId,
      },
      after: fileSnapshot(created),
    });

    return { file: toResponse(created), upload: toPresignedResponse(upload) };
  }

  /**
   * Step 2: confirm the upload.
   *
   * The client's report is not taken on trust. `headObject` is the confirmation
   * step, and it is mandatory: when storage cannot confirm the object exists the
   * file stays PENDING. This is the difference between "the browser said it
   * finished" and "the bytes are actually there", and it is why this method
   * fails closed rather than trusting a PATCH body.
   */
  async completeUpload(
    id: string,
    dto: CompleteUploadDto,
  ): Promise<StoredFileResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status !== StoredFileStatusDto.PENDING) {
      throw new UnprocessableEntityException(
        `File is ${existing.status}; only a PENDING file can be completed`,
      );
    }

    const head = await this.storage.headObject(existing.objectKey);

    if (!head) {
      throw new UnprocessableEntityException(
        'Storage could not confirm the uploaded object; the file remains pending',
      );
    }

    const reportedSize = dto.sizeBytes ?? existing.sizeBytes;
    if (head.sizeBytes !== null && head.sizeBytes !== reportedSize) {
      throw new ConflictException(
        'Stored object size does not match the reported size',
      );
    }
    if (
      head.contentType &&
      head.contentType.toLowerCase() !== existing.mimeType
    ) {
      throw new ConflictException(
        'Stored object content type does not match the declared type',
      );
    }

    const data: StoredFileUpdateData = {
      status: StoredFileStatusDto.UPLOADED,
      uploadedAt: new Date(),
      ...(dto.sizeBytes !== undefined ? { sizeBytes: dto.sizeBytes } : {}),
      ...(dto.checksum !== undefined
        ? { checksum: dto.checksum.trim() || null }
        : {}),
    };

    const updated = await this.files.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.STORED_FILE_UPLOAD_COMPLETED,
      resourceType: AUDIT_RESOURCE_TYPES.STORED_FILE,
      resourceId: updated.id,
      metadata: {
        namespace: updated.namespace,
        sizeBytes: updated.sizeBytes,
        verifiedAgainstStorage: true,
      },
      before: fileSnapshot(existing),
      after: fileSnapshot(updated),
    });

    return toResponse(updated);
  }

  async list(
    query: ListStoredFilesQueryDto,
  ): Promise<StoredFileListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.files.list({
      namespace: query.namespace,
      ownerUserId: query.ownerUserId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return { data: data.map(toResponse), page, limit, total };
  }

  async findOne(id: string): Promise<StoredFileResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  /**
   * Issues a signed download URL.
   *
   * Two rules matter here. First, authorization is the caller's responsibility
   * and must have happened before this method: a URL is a capability, so signing
   * one *is* the authorization decision, not a precursor to it. Second, only a
   * file that has been confirmed (UPLOADED or ACTIVE) can be signed — signing a
   * PENDING file would hand out a URL to an object that may not exist.
   */
  async createDownloadUrl(
    id: string,
    requestedByUserId: string | null,
  ): Promise<DownloadUrlResponseDto> {
    const existing = await this.getOrThrow(id);

    if (
      existing.status === StoredFileStatusDto.PENDING ||
      existing.status === StoredFileStatusDto.ARCHIVED
    ) {
      throw new UnprocessableEntityException(
        `File is ${existing.status} and cannot be downloaded`,
      );
    }

    const download = await this.storage.createDownloadUrl({
      objectKey: existing.objectKey,
      expiresInSeconds: this.options.downloadUrlTtlSeconds,
      responseContentDisposition: `attachment; filename="${sanitizeOriginalName(
        existing.originalName,
      )}"`,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STORED_FILE_DOWNLOAD_URL_ISSUED,
      resourceType: AUDIT_RESOURCE_TYPES.STORED_FILE,
      resourceId: existing.id,
      metadata: {
        namespace: existing.namespace,
        expiresInSeconds: download.expiresInSeconds,
        requestedByUserId,
      },
    });

    return {
      file: toResponse(existing),
      download: toPresignedResponse(download),
    };
  }

  /** Marks a confirmed file usable by domain data. */
  async activate(id: string): Promise<StoredFileResponseDto> {
    const existing = await this.getOrThrow(id);
    this.assertTransition(existing.status, StoredFileStatusDto.ACTIVE);

    const updated = await this.files.update(id, {
      status: StoredFileStatusDto.ACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STORED_FILE_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.STORED_FILE,
      resourceId: updated.id,
      metadata: { from: existing.status, to: updated.status },
      before: fileSnapshot(existing),
      after: fileSnapshot(updated),
    });

    return toResponse(updated);
  }

  /**
   * Logical delete.
   *
   * The row is kept and the bytes are left for the retention policy, because a
   * file may be referenced by an audit entry, a submission or a grade that must
   * stay explainable. Hard deletion of storage objects is deliberately not
   * exposed over the API.
   */
  async archive(id: string): Promise<StoredFileResponseDto> {
    const existing = await this.getOrThrow(id);
    this.assertTransition(existing.status, StoredFileStatusDto.ARCHIVED);

    const updated = await this.files.update(id, {
      status: StoredFileStatusDto.ARCHIVED,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STORED_FILE_ARCHIVED,
      resourceType: AUDIT_RESOURCE_TYPES.STORED_FILE,
      resourceId: updated.id,
      metadata: { from: existing.status, to: updated.status },
      before: fileSnapshot(existing),
      after: fileSnapshot(updated),
    });

    return toResponse(updated);
  }

  /** Exposes the active policy so a client can pre-validate before uploading. */
  getUploadPolicy(): UploadPolicyResponseDto {
    return {
      defaultMaxSizeBytes: this.policy.defaultMaxSizeBytes,
      entries: this.policy.entries.map((entry) => ({ ...entry })),
    };
  }

  private async getOrThrow(id: string): Promise<StoredFileRecord> {
    const found = await this.files.findById(id);
    if (!found) {
      throw new NotFoundException('Stored file not found');
    }
    return found;
  }

  /**
   * Enforces the configurable whitelist. The check is on the MIME type (which
   * the client declares and the storage layer echoes back) plus the declared
   * size, so a caller cannot request a URL for a type or size the deployment
   * has not approved.
   */
  private assertAllowed(mimeType: string, sizeBytes: number): void {
    const limit = maxSizeForMimeType(this.policy, mimeType);

    if (limit === null) {
      // A whitelist is a whitelist: an unlisted type is refused, full stop. The
      // default ceiling never widens it, so the two knobs cannot contradict each
      // other.
      throw new UnprocessableEntityException(
        `MIME type ${mimeType} is not allowed by the upload policy`,
      );
    }

    if (sizeBytes > limit) {
      throw new BadRequestException(
        `File of ${sizeBytes} bytes exceeds the ${limit} byte limit for ${mimeType}`,
      );
    }
  }

  private assertTransition(from: string, to: StoredFileStatusDto): void {
    if (!isAllowedFileTransition(from as StoredFileStatusDto, to)) {
      throw new UnprocessableEntityException(
        `File cannot move from ${from} to ${to}`,
      );
    }
  }
}

export function toResponse(record: StoredFileRecord): StoredFileResponseDto {
  return {
    id: record.id,
    objectKey: record.objectKey,
    namespace: record.namespace,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    checksum: record.checksum,
    ownerUserId: record.ownerUserId,
    status: record.status as StoredFileStatusDto,
    uploadedAt: record.uploadedAt ? record.uploadedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toPresignedResponse(request: {
  url: string;
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
  expiresInSeconds: number;
  objectKey: string;
  headers: Record<string, string>;
}): PresignedRequestResponseDto {
  return {
    url: request.url,
    method: request.method,
    expiresInSeconds: request.expiresInSeconds,
    objectKey: request.objectKey,
    headers: request.headers,
  };
}

function fileSnapshot(record: StoredFileRecord): Record<string, unknown> {
  return {
    id: record.id,
    objectKey: record.objectKey,
    namespace: record.namespace,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    ownerUserId: record.ownerUserId,
    status: record.status,
  };
}
