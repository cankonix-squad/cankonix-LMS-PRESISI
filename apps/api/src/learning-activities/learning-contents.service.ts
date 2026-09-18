import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { CreateLearningContentDto } from './dto/create-learning-content.dto';
import {
  LearningContentListResponseDto,
  LearningContentResponseDto,
  LearningContentVersionResponseDto,
} from './dto/learning-content-response.dto';
import {
  LearningContentStatusDto,
  isAllowedContentTransition,
} from './dto/learning-content-status.dto';
import { ListLearningContentsQueryDto } from './dto/list-learning-activities-query.dto';
import {
  CreateLearningContentVersionDto,
  UpdateLearningContentDto,
} from './dto/update-learning-content.dto';
import {
  LEARNING_CONTENTS_REPOSITORY,
  LearningContentsRepository,
} from './learning-contents.repository';
import {
  LearningContentRecord,
  LearningContentUpdateData,
} from './learning-content.types';
import {
  LEARNING_ACTIVITIES_REPOSITORY,
  LearningActivitiesRepository,
} from './learning-activities.repository';
import { LearningActivityStatusDto } from './dto/learning-activity-status.dto';

@Injectable()
export class LearningContentsService {
  constructor(
    @Inject(LEARNING_CONTENTS_REPOSITORY)
    private readonly contents: LearningContentsRepository,
    @Inject(LEARNING_ACTIVITIES_REPOSITORY)
    private readonly activities: LearningActivitiesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    activityId: string,
    dto: CreateLearningContentDto,
  ): Promise<LearningContentResponseDto> {
    const activity = await this.ensureActivity(activityId);
    assertContentTarget(dto.contentType, dto.objectKey, dto.externalUrl);

    const status = dto.status ?? LearningContentStatusDto.DRAFT;
    if (status === LearningContentStatusDto.PUBLISHED) {
      throw new BadRequestException(
        'New content starts as DRAFT; publish it explicitly so the version is recorded',
      );
    }
    if (status === LearningContentStatusDto.SUPERSEDED) {
      throw new BadRequestException(
        'SUPERSEDED is set by creating a new version, not by the caller',
      );
    }

    // A brand-new material starts its own version group at version 1.
    const created = await this.contents.create({
      activityId,
      versionGroupId: randomUUID(),
      contentType: dto.contentType,
      title: dto.title.trim(),
      objectKey: normalizeOptionalText(dto.objectKey),
      externalUrl: normalizeOptionalText(dto.externalUrl),
      mimeType: normalizeOptionalText(dto.mimeType),
      sizeBytes: dto.sizeBytes ?? null,
      version: 1,
      status,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_CONTENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_CONTENT,
      resourceId: created.id,
      metadata: {
        activityId: created.activityId,
        contentType: created.contentType,
        meetingId: activity.meetingId,
      },
      after: contentSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    activityId: string,
    query: ListLearningContentsQueryDto,
  ): Promise<LearningContentListResponseDto> {
    await this.ensureActivity(activityId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const { data, total } = await this.contents.list({
      activityId,
      status: query.status,
      includeSuperseded: query.includeSuperseded ?? false,
      page,
      limit,
    });

    return { data: data.map(toResponse), page, limit, total };
  }

  async findOne(id: string): Promise<LearningContentResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateLearningContentDto,
  ): Promise<LearningContentResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === LearningContentStatusDto.SUPERSEDED) {
      throw new UnprocessableEntityException(
        'Superseded content is historical and cannot be edited',
      );
    }
    if (existing.status === LearningContentStatusDto.ARCHIVED) {
      throw new UnprocessableEntityException(
        'Archived content cannot be edited',
      );
    }

    const data: LearningContentUpdateData = {};

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    const nextObjectKey =
      dto.objectKey !== undefined
        ? normalizeOptionalText(dto.objectKey)
        : existing.objectKey;
    const nextExternalUrl =
      dto.externalUrl !== undefined
        ? normalizeOptionalText(dto.externalUrl)
        : existing.externalUrl;

    if (dto.objectKey !== undefined || dto.externalUrl !== undefined) {
      assertContentTarget(
        existing.contentType as CreateLearningContentDto['contentType'],
        nextObjectKey ?? undefined,
        nextExternalUrl ?? undefined,
      );
      data.objectKey = nextObjectKey;
      data.externalUrl = nextExternalUrl;
    }

    if (dto.mimeType !== undefined) {
      data.mimeType = normalizeOptionalText(dto.mimeType);
    }

    if (dto.sizeBytes !== undefined) {
      data.sizeBytes = dto.sizeBytes;
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      if (dto.status === LearningContentStatusDto.SUPERSEDED) {
        throw new BadRequestException(
          'SUPERSEDED is set by creating a new version, not by the caller',
        );
      }

      if (
        !isAllowedContentTransition(
          existing.status as LearningContentStatusDto,
          dto.status,
        )
      ) {
        throw new UnprocessableEntityException(
          `Content cannot move from ${existing.status} to ${dto.status}`,
        );
      }

      // A material that is being published needs a target the student can
      // actually open, otherwise the activity looks complete but is not.
      if (dto.status === LearningContentStatusDto.PUBLISHED) {
        assertContentTarget(
          existing.contentType as CreateLearningContentDto['contentType'],
          nextObjectKey ?? undefined,
          nextExternalUrl ?? undefined,
        );
        const state = await this.contents.findVersionState(
          existing.versionGroupId,
        );
        if (state.publishedCount > 0) {
          throw new UnprocessableEntityException(
            'This material already has a published version; create a new version instead',
          );
        }
      }

      data.status = dto.status;
    }

    const updated = await this.contents.update(id, data);

    await this.audit.record({
      action:
        data.status !== undefined
          ? AUDIT_ACTIONS.LEARNING_CONTENT_STATUS_CHANGED
          : AUDIT_ACTIONS.LEARNING_CONTENT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_CONTENT,
      resourceId: updated.id,
      before: contentSnapshot(existing),
      after: contentSnapshot(updated),
      metadata: {
        changedFields: Object.keys(data).sort(),
        ...(data.status !== undefined
          ? { from: existing.status, to: updated.status }
          : {}),
      },
    });

    return toResponse(updated);
  }

  /**
   * Publishes a new version of an existing material. The previous published row
   * becomes SUPERSEDED instead of being edited, so what a student already saw
   * stays reconstructible and reports do not silently change meaning.
   */
  async createVersion(
    id: string,
    dto: CreateLearningContentVersionDto,
  ): Promise<LearningContentVersionResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === LearningContentStatusDto.ARCHIVED) {
      throw new UnprocessableEntityException(
        'Archived content cannot be versioned; create a new content instead',
      );
    }

    const objectKey =
      dto.objectKey !== undefined
        ? normalizeOptionalText(dto.objectKey)
        : existing.objectKey;
    const externalUrl =
      dto.externalUrl !== undefined
        ? normalizeOptionalText(dto.externalUrl)
        : existing.externalUrl;

    // A new version must actually point somewhere: reusing the old target
    // silently would make the version number meaningless.
    if (dto.objectKey === undefined && dto.externalUrl === undefined) {
      throw new BadRequestException(
        'A new version must provide a new objectKey or externalUrl',
      );
    }
    assertContentTarget(
      existing.contentType as CreateLearningContentDto['contentType'],
      objectKey ?? undefined,
      externalUrl ?? undefined,
    );

    const state = await this.contents.findVersionState(existing.versionGroupId);
    const published = await this.contents.findPublishedInGroup(
      existing.versionGroupId,
    );

    const data = {
      activityId: existing.activityId,
      versionGroupId: existing.versionGroupId,
      contentType: existing.contentType,
      title: dto.title?.trim() || existing.title,
      objectKey,
      externalUrl,
      mimeType:
        dto.mimeType !== undefined
          ? normalizeOptionalText(dto.mimeType)
          : existing.mimeType,
      sizeBytes:
        dto.sizeBytes !== undefined ? dto.sizeBytes : existing.sizeBytes,
      version: state.maxVersion + 1,
      status: LearningContentStatusDto.PUBLISHED,
    };

    const result = published
      ? await this.contents.supersedeAndCreate(published.id, data)
      : { content: await this.contents.create(data), superseded: null };

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_CONTENT_VERSION_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_CONTENT,
      resourceId: result.content.id,
      metadata: {
        activityId: result.content.activityId,
        versionGroupId: result.content.versionGroupId,
        version: result.content.version,
        supersededId: result.superseded?.id ?? null,
      },
      before: result.superseded ? contentSnapshot(result.superseded) : null,
      after: contentSnapshot(result.content),
    });

    return {
      content: toResponse(result.content),
      superseded: result.superseded ? toResponse(result.superseded) : null,
    };
  }

  private async getOrThrow(id: string): Promise<LearningContentRecord> {
    const found = await this.contents.findById(id);
    if (!found) {
      throw new NotFoundException('Learning content not found');
    }
    return found;
  }

  private async ensureActivity(activityId: string) {
    const activity = await this.activities.findById(activityId);
    if (!activity) {
      throw new NotFoundException('Learning activity not found');
    }
    if (activity.status === LearningActivityStatusDto.ARCHIVED) {
      throw new UnprocessableEntityException(
        'Archived activity cannot receive new content',
      );
    }
    return activity;
  }
}

export function toResponse(
  record: LearningContentRecord,
): LearningContentResponseDto {
  return {
    id: record.id,
    activityId: record.activityId,
    versionGroupId: record.versionGroupId,
    contentType:
      record.contentType as LearningContentResponseDto['contentType'],
    title: record.title,
    objectKey: record.objectKey,
    externalUrl: record.externalUrl,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    version: record.version,
    status: record.status as LearningContentStatusDto,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function contentSnapshot(
  record: LearningContentRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    activityId: record.activityId,
    versionGroupId: record.versionGroupId,
    contentType: record.contentType,
    title: record.title,
    objectKey: record.objectKey,
    externalUrl: record.externalUrl,
    version: record.version,
    status: record.status,
  };
}

/**
 * Guards the two content kinds apart. A FILE row without `objectKey` would
 * render as an empty player, and a LINK row without `externalUrl` as a dead
 * button; both are data errors that are cheaper to reject at the boundary.
 * Nothing here validates a client filename: the key is produced server-side by
 * the file service (TASK-022), so this layer only checks presence and shape.
 */
function assertContentTarget(
  contentType: string,
  objectKey?: string,
  externalUrl?: string,
): void {
  if (contentType === 'FILE') {
    if (!normalizeOptionalText(objectKey)) {
      throw new BadRequestException(
        'FILE content requires an objectKey produced by the file service',
      );
    }
    if (normalizeOptionalText(externalUrl)) {
      throw new BadRequestException(
        'FILE content must not carry an externalUrl',
      );
    }
    return;
  }

  if (contentType === 'LINK') {
    const url = normalizeOptionalText(externalUrl);
    if (!url) {
      throw new BadRequestException('LINK content requires an externalUrl');
    }
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException(
        'externalUrl must use the http or https scheme',
      );
    }
    if (normalizeOptionalText(objectKey)) {
      throw new BadRequestException('LINK content must not carry an objectKey');
    }
    return;
  }

  throw new BadRequestException(`Unsupported content type ${contentType}`);
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim() || null;
}
