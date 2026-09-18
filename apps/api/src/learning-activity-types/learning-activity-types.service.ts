import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { CreateLearningActivityTypeDto } from './dto/create-learning-activity-type.dto';
import {
  LearningActivityTypeListResponseDto,
  LearningActivityTypeResponseDto,
} from './dto/learning-activity-type-response.dto';
import { LearningActivityTypeStatusDto } from './dto/learning-activity-type-status.dto';
import { ListLearningActivityTypesQueryDto } from './dto/list-learning-activity-types-query.dto';
import { UpdateLearningActivityTypeDto } from './dto/update-learning-activity-type.dto';
import {
  LEARNING_ACTIVITY_TYPES_REPOSITORY,
  LearningActivityTypesRepository,
} from './learning-activity-types.repository';
import {
  LearningActivityTypeRecord,
  LearningActivityTypeUpdateData,
} from './learning-activity-type.types';

@Injectable()
export class LearningActivityTypesService {
  constructor(
    @Inject(LEARNING_ACTIVITY_TYPES_REPOSITORY)
    private readonly activityTypes: LearningActivityTypesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateLearningActivityTypeDto,
  ): Promise<LearningActivityTypeResponseDto> {
    const code = normalizeCode(dto.code);
    if (await this.activityTypes.findByCode(code)) {
      throw new ConflictException(
        `Learning activity type code ${code} is already in use`,
      );
    }

    const created = await this.activityTypes.create({
      code,
      name: dto.name.trim(),
      description: normalizeOptionalText(dto.description),
      requiresContent: dto.requiresContent ?? true,
      status: dto.status ?? LearningActivityTypeStatusDto.ACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_ACTIVITY_TYPE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_ACTIVITY_TYPE,
      resourceId: created.id,
      after: activityTypeSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListLearningActivityTypesQueryDto,
  ): Promise<LearningActivityTypeListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.activityTypes.list({
      search: query.search?.trim() || undefined,
      status: query.status,
      page,
      limit,
    });

    return {
      data: result.data.map(toResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findOne(id: string): Promise<LearningActivityTypeResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateLearningActivityTypeDto,
  ): Promise<LearningActivityTypeResponseDto> {
    const existing = await this.ensureExists(id);
    const data: LearningActivityTypeUpdateData = {};

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      if (code !== existing.code) {
        if (await this.activityTypes.findByCode(code)) {
          throw new ConflictException(
            `Learning activity type code ${code} is already in use`,
          );
        }
        data.code = code;
      }
    }

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = normalizeOptionalText(dto.description);
    }

    if (dto.requiresContent !== undefined) {
      data.requiresContent = dto.requiresContent;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (
        dto.status === LearningActivityTypeStatusDto.INACTIVE &&
        existing.status === LearningActivityTypeStatusDto.ACTIVE
      ) {
        // Deactivating is a vocabulary change, not a rollback: existing
        // activities keep their type so historical material and progress stay
        // readable. Only activities that are still live make the change a
        // configuration error the operator has to resolve first.
        await this.assertHasNoLiveActivities(id);
      }
    }

    const updated = await this.activityTypes.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_ACTIVITY_TYPE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_ACTIVITY_TYPE,
      resourceId: updated.id,
      before: activityTypeSnapshot(existing),
      after: activityTypeSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<LearningActivityTypeRecord> {
    const found = await this.activityTypes.findById(id);
    if (!found) {
      throw new NotFoundException('Learning activity type not found');
    }
    return found;
  }

  private async assertHasNoLiveActivities(id: string): Promise<void> {
    const total = await this.activityTypes.countActivities(id);
    if (total > 0) {
      throw new UnprocessableEntityException(
        `Learning activity type is still used by ${total} non-archived activity(ies) and cannot be deactivated`,
      );
    }
  }
}

function toResponse(
  record: LearningActivityTypeRecord,
): LearningActivityTypeResponseDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    requiresContent: record.requiresContent,
    status: record.status as LearningActivityTypeResponseDto['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function activityTypeSnapshot(
  record: LearningActivityTypeRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    requiresContent: record.requiresContent,
    status: record.status,
  };
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (!normalized) {
    throw new BadRequestException('Learning activity type code is required');
  }
  return normalized;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim() || null;
}
