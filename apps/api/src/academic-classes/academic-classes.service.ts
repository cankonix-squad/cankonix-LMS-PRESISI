import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { EducationBatchesService } from '../education-batches/education-batches.service';
import { AcademicClassStatus } from './dto/academic-class-status.dto';
import {
  AcademicClassListResponseDto,
  AcademicClassResponseDto,
} from './dto/academic-class-response.dto';
import { CreateAcademicClassDto } from './dto/create-academic-class.dto';
import { ListAcademicClassesQueryDto } from './dto/list-academic-classes-query.dto';
import { UpdateAcademicClassDto } from './dto/update-academic-class.dto';
import {
  ACADEMIC_CLASSES_REPOSITORY,
  AcademicClassesRepository,
} from './academic-classes.repository';
import {
  AcademicClassRecord,
  UpdateAcademicClassData,
} from './academic-classes.types';

@Injectable()
export class AcademicClassesService {
  private readonly batches?:
    | EducationBatchesService
    | {
        findOne?: (id: string) => Promise<unknown>;
        findById?: (id: string) => Promise<unknown>;
      };
  private readonly audit?: AuditService;

  constructor(
    @Inject(ACADEMIC_CLASSES_REPOSITORY)
    private readonly academicClasses: AcademicClassesRepository,
    @Optional() batchesOrAudit?: EducationBatchesService | AuditService,
    @Optional() maybeAudit?: AuditService,
  ) {
    if (
      batchesOrAudit &&
      (('findOne' in batchesOrAudit &&
        typeof batchesOrAudit.findOne === 'function') ||
        ('findById' in batchesOrAudit &&
          typeof batchesOrAudit.findById === 'function'))
    ) {
      this.batches = batchesOrAudit as EducationBatchesService;
    }

    if (
      batchesOrAudit &&
      'record' in batchesOrAudit &&
      typeof batchesOrAudit.record === 'function'
    ) {
      this.audit = batchesOrAudit as AuditService;
    } else if (maybeAudit && 'record' in maybeAudit) {
      this.audit = maybeAudit as AuditService;
    }
  }

  async create(dto: CreateAcademicClassDto): Promise<AcademicClassResponseDto> {
    if (this.batches) {
      await this.ensureBatchExists(dto.educationBatchId);
    }

    if (
      dto.capacity !== undefined &&
      dto.capacity !== null &&
      dto.capacity < 0
    ) {
      throw new BadRequestException('capacity must not be negative');
    }

    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.academicClasses.findByBatchAndCode(
      dto.educationBatchId,
      normalizedCode,
    );
    if (existing) {
      throw new ConflictException(
        `AcademicClass with code "${normalizedCode}" already exists in batch "${dto.educationBatchId}"`,
      );
    }

    const created = await this.academicClasses.create({
      educationBatchId: dto.educationBatchId,
      code: normalizedCode,
      name: dto.name.trim(),
      capacity: dto.capacity ?? null,
      status: dto.status ?? AcademicClassStatus.ACTIVE,
    });

    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.ACADEMIC_CLASS_CREATED,
        resourceType: AUDIT_RESOURCE_TYPES.ACADEMIC_CLASS,
        resourceId: created.id,
        after: toAuditSnapshot(created),
      });
    }

    return toResponseDto(created);
  }

  async findOne(id: string): Promise<AcademicClassResponseDto> {
    const record = await this.academicClasses.findById(id);
    if (!record) {
      throw new NotFoundException(`AcademicClass with id "${id}" not found`);
    }
    return toResponseDto(record);
  }

  async list(
    query: ListAcademicClassesQueryDto,
  ): Promise<AcademicClassListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.academicClasses.findMany({
      educationBatchId: query.educationBatchId,
      educationProgramId: query.educationProgramId,
      organizationId: query.organizationId,
      status: query.status,
      search: query.search?.trim(),
      page,
      limit,
    });

    return {
      data: data.map(toResponseDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async update(
    id: string,
    dto: UpdateAcademicClassDto,
  ): Promise<AcademicClassResponseDto> {
    const existing = await this.academicClasses.findById(id);
    if (!existing) {
      throw new NotFoundException(`AcademicClass with id "${id}" not found`);
    }

    const data: UpdateAcademicClassData = {};

    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const conflict = await this.academicClasses.findByBatchAndCode(
          existing.educationBatchId,
          normalizedCode,
        );
        if (conflict && conflict.id !== id) {
          throw new ConflictException(
            `AcademicClass with code "${normalizedCode}" already exists in batch "${existing.educationBatchId}"`,
          );
        }
        data.code = normalizedCode;
      }
    }

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.capacity !== undefined) {
      if (dto.capacity !== null && dto.capacity < 0) {
        throw new BadRequestException('capacity must not be negative');
      }
      data.capacity = dto.capacity;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const updated = await this.academicClasses.update(id, data);

    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.ACADEMIC_CLASS_UPDATED,
        resourceType: AUDIT_RESOURCE_TYPES.ACADEMIC_CLASS,
        resourceId: updated.id,
        before: toAuditSnapshot(existing),
        after: toAuditSnapshot(updated),
      });
    }

    return toResponseDto(updated);
  }

  private async ensureBatchExists(batchId: string): Promise<void> {
    if (!this.batches) return;
    try {
      const batchesObj = this.batches as unknown as Record<
        string,
        (id: string) => Promise<unknown>
      >;
      if (typeof batchesObj.findOne === 'function') {
        const found = await batchesObj.findOne(batchId);
        if (!found) {
          throw new NotFoundException(
            `EducationBatch with id "${batchId}" not found`,
          );
        }
      } else if (typeof batchesObj.findById === 'function') {
        const found = await batchesObj.findById(batchId);
        if (!found) {
          throw new NotFoundException(
            `EducationBatch with id "${batchId}" not found`,
          );
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(
        `EducationBatch with id "${batchId}" not found`,
      );
    }
  }
}

function toResponseDto(record: AcademicClassRecord): AcademicClassResponseDto {
  return {
    id: record.id,
    educationBatchId: record.educationBatchId,
    code: record.code,
    name: record.name,
    capacity: record.capacity,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(record: AcademicClassRecord): Record<string, unknown> {
  return {
    id: record.id,
    educationBatchId: record.educationBatchId,
    code: record.code,
    name: record.name,
    capacity: record.capacity,
    status: record.status,
  };
}
