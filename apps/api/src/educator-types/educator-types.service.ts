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
import { CreateEducatorTypeDto } from './dto/create-educator-type.dto';
import {
  EducatorTypeListResponseDto,
  EducatorTypeResponseDto,
} from './dto/educator-type-response.dto';
import { EducatorTypeStatusDto } from './dto/educator-type-status.dto';
import { ListEducatorTypesQueryDto } from './dto/list-educator-types-query.dto';
import { UpdateEducatorTypeDto } from './dto/update-educator-type.dto';
import {
  EDUCATOR_TYPES_REPOSITORY,
  EducatorTypesRepository,
} from './educator-types.repository';
import {
  EducatorTypeRecord,
  EducatorTypeUpdateData,
} from './educator-type.types';

@Injectable()
export class EducatorTypesService {
  constructor(
    @Inject(EDUCATOR_TYPES_REPOSITORY)
    private readonly educatorTypes: EducatorTypesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateEducatorTypeDto): Promise<EducatorTypeResponseDto> {
    const code = normalizeCode(dto.code);
    if (await this.educatorTypes.findByCode(code)) {
      throw new ConflictException(
        `Educator type code ${code} is already in use`,
      );
    }

    const created = await this.educatorTypes.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      status: dto.status ?? EducatorTypeStatusDto.ACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.EDUCATOR_TYPE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.EDUCATOR_TYPE,
      resourceId: created.id,
      after: educatorTypeSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListEducatorTypesQueryDto,
  ): Promise<EducatorTypeListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.educatorTypes.list({
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

  async findOne(id: string): Promise<EducatorTypeResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateEducatorTypeDto,
  ): Promise<EducatorTypeResponseDto> {
    const existing = await this.ensureExists(id);
    const data: EducatorTypeUpdateData = {};

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      if (code !== existing.code) {
        if (await this.educatorTypes.findByCode(code)) {
          throw new ConflictException(
            `Educator type code ${code} is already in use`,
          );
        }
        data.code = code;
      }
    }

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (
        dto.status === EducatorTypeStatusDto.INACTIVE &&
        existing.status === EducatorTypeStatusDto.ACTIVE
      ) {
        // Deactivating is a vocabulary change, not a rollback. Existing
        // assignments keep their historical type so past teaching load stays
        // readable; the guards below only prevent silent data loss.
        await this.assertHasNoActiveAssignments(id);
      }
    }

    const updated = await this.educatorTypes.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.EDUCATOR_TYPE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.EDUCATOR_TYPE,
      resourceId: updated.id,
      before: educatorTypeSnapshot(existing),
      after: educatorTypeSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<EducatorTypeRecord> {
    const found = await this.educatorTypes.findById(id);
    if (!found) {
      throw new NotFoundException('Educator type not found');
    }
    return found;
  }

  /**
   * Deactivation is allowed but must not silently break active teaching load:
   * an educator type still in active use is a configuration error the operator
   * has to resolve first by ending those assignments. Ended assignments keep
   * their historical type and never block the change.
   */
  private async assertHasNoActiveAssignments(id: string): Promise<void> {
    const total = await this.educatorTypes.countActiveAssignments(id);
    if (total > 0) {
      throw new UnprocessableEntityException(
        `Educator type is still used by ${total} active assignment(s) and cannot be deactivated`,
      );
    }
  }
}

function toResponse(record: EducatorTypeRecord): EducatorTypeResponseDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function educatorTypeSnapshot(
  record: EducatorTypeRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status,
  };
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('Educator type code is required');
  }
  return normalized;
}
