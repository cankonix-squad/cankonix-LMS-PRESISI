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
import { CreateAssessmentTypeDto } from './dto/create-assessment-type.dto';
import {
  AssessmentTypeListResponseDto,
  AssessmentTypeResponseDto,
} from './dto/assessment-type-response.dto';
import { AssessmentTypeStatusDto } from './dto/assessment-type-status.dto';
import { ListAssessmentTypesQueryDto } from './dto/list-assessment-types-query.dto';
import { UpdateAssessmentTypeDto } from './dto/update-assessment-type.dto';
import {
  ASSESSMENT_TYPES_REPOSITORY,
  AssessmentTypesRepository,
} from './assessment-types.repository';
import {
  AssessmentTypeRecord,
  AssessmentTypeUpdateData,
} from './assessment-type.types';

/**
 * Assessment types are the data-driven vocabulary behind `Assessment.typeId`.
 *
 * Nothing here branches on a type code: QUIZ/EXAM/ASSIGNMENT/PRACTICAL/
 * OBSERVATION/COMPETENCY are seeded rows, and an institution can add its own
 * method without a schema change or a code change.
 */
@Injectable()
export class AssessmentTypesService {
  constructor(
    @Inject(ASSESSMENT_TYPES_REPOSITORY)
    private readonly assessmentTypes: AssessmentTypesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateAssessmentTypeDto,
  ): Promise<AssessmentTypeResponseDto> {
    const code = normalizeCode(dto.code);
    if (await this.assessmentTypes.findByCode(code)) {
      throw new ConflictException(
        `Assessment type code ${code} is already in use`,
      );
    }

    const created = await this.assessmentTypes.create({
      code,
      name: dto.name.trim(),
      description: normalizeOptionalText(dto.description),
      status: dto.status ?? AssessmentTypeStatusDto.ACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSESSMENT_TYPE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSESSMENT_TYPE,
      resourceId: created.id,
      after: assessmentTypeSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListAssessmentTypesQueryDto,
  ): Promise<AssessmentTypeListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.assessmentTypes.list({
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

  async findOne(id: string): Promise<AssessmentTypeResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateAssessmentTypeDto,
  ): Promise<AssessmentTypeResponseDto> {
    const existing = await this.ensureExists(id);
    const data: AssessmentTypeUpdateData = {};

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      if (code !== existing.code) {
        if (await this.assessmentTypes.findByCode(code)) {
          throw new ConflictException(
            `Assessment type code ${code} is already in use`,
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

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (
        dto.status === AssessmentTypeStatusDto.INACTIVE &&
        existing.status === AssessmentTypeStatusDto.ACTIVE
      ) {
        // Deactivating is a vocabulary change, not a rollback: existing
        // assessments keep their type so historical scores stay readable. Only
        // assessments that are still live make the change a configuration
        // error the operator has to resolve first.
        await this.assertHasNoLiveAssessments(id);
      }
    }

    const updated = await this.assessmentTypes.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSESSMENT_TYPE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSESSMENT_TYPE,
      resourceId: updated.id,
      before: assessmentTypeSnapshot(existing),
      after: assessmentTypeSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<AssessmentTypeRecord> {
    const found = await this.assessmentTypes.findById(id);
    if (!found) {
      throw new NotFoundException('Assessment type not found');
    }
    return found;
  }

  private async assertHasNoLiveAssessments(id: string): Promise<void> {
    const total = await this.assessmentTypes.countLiveAssessments(id);
    if (total > 0) {
      throw new UnprocessableEntityException(
        `Assessment type is still used by ${total} non-archived assessment(s) and cannot be deactivated`,
      );
    }
  }
}

function toResponse(record: AssessmentTypeRecord): AssessmentTypeResponseDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status as AssessmentTypeResponseDto['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function assessmentTypeSnapshot(
  record: AssessmentTypeRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    status: record.status,
  };
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (!normalized) {
    throw new BadRequestException('Assessment type code is required');
  }
  return normalized;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim() || null;
}
