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
import { CurriculaService } from '../curriculum-subjects/curricula.service';
import { EducationProgramsService } from '../education-programs/education-programs.service';
import { CreateEducationBatchDto } from './dto/create-education-batch.dto';
import {
  EducationBatchListResponseDto,
  EducationBatchResponseDto,
} from './dto/education-batch-response.dto';
import { ListEducationBatchesQueryDto } from './dto/list-education-batches-query.dto';
import { UpdateEducationBatchDto } from './dto/update-education-batch.dto';
import {
  EDUCATION_BATCHES_REPOSITORY,
  EducationBatchesRepository,
} from './education-batches.repository';
import {
  EducationBatchRecord,
  EducationBatchUpdateData,
} from './education-batches.types';

@Injectable()
export class EducationBatchesService {
  private readonly programs?: EducationProgramsService;
  private readonly curricula?:
    | CurriculaService
    | {
        findById?: (
          id: string,
        ) => Promise<{ educationProgramId: string } | null>;
        findOne?: (
          id: string,
        ) => Promise<{ educationProgramId: string } | null>;
      };
  private readonly audit?: AuditService;

  constructor(
    @Inject(EDUCATION_BATCHES_REPOSITORY)
    private readonly batches: EducationBatchesRepository,
    @Optional() programsOrAudit?: EducationProgramsService | AuditService,
    @Optional() curriculaOrAudit?: CurriculaService | AuditService,
    @Optional() maybeAudit?: AuditService,
  ) {
    if (
      programsOrAudit &&
      (('findOne' in programsOrAudit &&
        typeof programsOrAudit.findOne === 'function') ||
        ('findById' in programsOrAudit &&
          typeof programsOrAudit.findById === 'function'))
    ) {
      this.programs = programsOrAudit as EducationProgramsService;
    }

    if (
      curriculaOrAudit &&
      ('findById' in curriculaOrAudit || 'findOne' in curriculaOrAudit)
    ) {
      this.curricula = curriculaOrAudit as
        | CurriculaService
        | {
            findById?: (
              id: string,
            ) => Promise<{ educationProgramId: string } | null>;
            findOne?: (
              id: string,
            ) => Promise<{ educationProgramId: string } | null>;
          };
    }

    if (
      programsOrAudit &&
      'record' in programsOrAudit &&
      typeof programsOrAudit.record === 'function'
    ) {
      this.audit = programsOrAudit as AuditService;
    } else if (maybeAudit && 'record' in maybeAudit) {
      this.audit = maybeAudit as AuditService;
    }
  }

  async create(
    dto: CreateEducationBatchDto,
  ): Promise<EducationBatchResponseDto> {
    if (this.programs) {
      await this.ensureProgramExists(dto.educationProgramId);
    }

    const startDate = normalizeDate(dto.startDate, 'startDate');
    const endDate = normalizeDate(dto.endDate, 'endDate');
    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    if (this.programs) {
      await this.assertCurriculumBelongsToProgram(
        dto.educationProgramId,
        dto.curriculumId,
      );
    }

    const code = normalizeCode(dto.code);
    if (await this.batches.findByProgramAndCode(dto.educationProgramId, code)) {
      throw new ConflictException(
        `Batch code ${code} already exists for this program`,
      );
    }

    const created = await this.batches.create({
      educationProgramId: dto.educationProgramId,
      curriculumId: dto.curriculumId,
      code,
      name: dto.name.trim(),
      startDate,
      endDate,
      status: dto.status,
      capacity: dto.capacity ?? null,
    });

    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.EDUCATION_BATCH_CREATED,
        resourceType: AUDIT_RESOURCE_TYPES.EDUCATION_BATCH,
        resourceId: created.id,
        organizationId: created.educationProgramId,
        after: batchSnapshot(created),
      });
    }

    return toResponse(created);
  }

  async list(
    query: ListEducationBatchesQueryDto,
  ): Promise<EducationBatchListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.batches.list({
      educationProgramId: query.educationProgramId,
      curriculumId: query.curriculumId,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
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

  async findOne(id: string): Promise<EducationBatchResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateEducationBatchDto,
  ): Promise<EducationBatchResponseDto> {
    const existing = await this.ensureExists(id);
    const data: EducationBatchUpdateData = {};

    if (dto.educationProgramId !== undefined) {
      if (this.programs) {
        await this.ensureProgramExists(dto.educationProgramId);
      }
      data.educationProgramId = dto.educationProgramId;
    }

    if (dto.curriculumId !== undefined) {
      const targetProgramId =
        dto.educationProgramId ?? existing.educationProgramId;
      if (this.programs) {
        await this.assertCurriculumBelongsToProgram(
          targetProgramId,
          dto.curriculumId,
        );
      }
      data.curriculumId = dto.curriculumId;
    }

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      const targetProgramId =
        dto.educationProgramId ?? existing.educationProgramId;
      if (code !== existing.code) {
        if (await this.batches.findByProgramAndCode(targetProgramId, code)) {
          throw new ConflictException(
            `Batch code ${code} already exists for this program`,
          );
        }
      }
      data.code = code;
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.startDate !== undefined) {
      data.startDate = normalizeDate(dto.startDate, 'startDate');
    }
    if (dto.endDate !== undefined) {
      data.endDate = normalizeDate(dto.endDate, 'endDate');
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.capacity !== undefined) data.capacity = dto.capacity ?? null;

    if (
      data.startDate !== undefined &&
      data.endDate !== undefined &&
      data.endDate < data.startDate
    ) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    const updated = await this.batches.update(id, data);
    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.EDUCATION_BATCH_UPDATED,
        resourceType: AUDIT_RESOURCE_TYPES.EDUCATION_BATCH,
        resourceId: updated.id,
        organizationId: updated.educationProgramId,
        before: batchSnapshot(existing),
        after: batchSnapshot(updated),
        metadata: { changedFields: Object.keys(data).sort() },
      });
    }

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<EducationBatchRecord> {
    const batch = await this.batches.findById(id);
    if (!batch) {
      throw new NotFoundException('Education batch not found');
    }
    return batch;
  }

  private async ensureProgramExists(id: string): Promise<void> {
    if (!this.programs) {
      return;
    }

    if (
      'findOne' in this.programs &&
      typeof this.programs.findOne === 'function'
    ) {
      await this.programs.findOne(id);
      return;
    }

    if (
      'findById' in this.programs &&
      typeof this.programs.findById === 'function'
    ) {
      const program = await this.programs.findById(id);
      if (!program) {
        throw new NotFoundException('Education program not found');
      }
    }
  }

  private async assertCurriculumBelongsToProgram(
    educationProgramId: string,
    curriculumId: string,
  ): Promise<void> {
    if (!this.curricula) {
      return;
    }

    let curriculum: { educationProgramId: string } | null = null;

    if (
      'findById' in this.curricula &&
      typeof this.curricula.findById === 'function'
    ) {
      curriculum = await this.curricula.findById(curriculumId);
    } else if (
      'findOne' in this.curricula &&
      typeof this.curricula.findOne === 'function'
    ) {
      curriculum = await this.curricula.findOne(curriculumId);
    }

    if (!curriculum) {
      throw new ConflictException(
        'Curriculum does not belong to this education program',
      );
    }

    if (curriculum.educationProgramId !== educationProgramId) {
      throw new ConflictException(
        'Curriculum does not belong to this education program',
      );
    }
  }
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('Batch code is required');
  }
  return normalized;
}

function normalizeDate(
  value: Date | string,
  field: 'startDate' | 'endDate',
): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toResponse(batch: EducationBatchRecord): EducationBatchResponseDto {
  return {
    id: batch.id,
    educationProgramId: batch.educationProgramId,
    curriculumId: batch.curriculumId,
    code: batch.code,
    name: batch.name,
    startDate: batch.startDate.toISOString(),
    endDate: batch.endDate.toISOString(),
    status: batch.status,
    capacity: batch.capacity,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function batchSnapshot(batch: EducationBatchRecord): Record<string, unknown> {
  return {
    id: batch.id,
    educationProgramId: batch.educationProgramId,
    curriculumId: batch.curriculumId,
    code: batch.code,
    name: batch.name,
    startDate: batch.startDate.toISOString(),
    endDate: batch.endDate.toISOString(),
    status: batch.status,
    capacity: batch.capacity,
  };
}
