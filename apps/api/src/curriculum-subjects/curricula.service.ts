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
import { EducationProgramsService } from '../education-programs/education-programs.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import {
  CurriculumListResponseDto,
  CurriculumResponseDto,
} from './dto/curriculum-response.dto';
import { ListCurriculaQueryDto } from './dto/list-curricula-query.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import {
  CURRICULA_REPOSITORY,
  CurriculaRepository,
} from './curricula.repository';
import { CurriculumRecord, CurriculumUpdateData } from './curricula.types';

@Injectable()
export class CurriculaService {
  private readonly educationPrograms?: EducationProgramsService;
  private readonly audit?: AuditService;

  constructor(
    @Inject(CURRICULA_REPOSITORY)
    private readonly curricula: CurriculaRepository,
    @Optional()
    educationProgramsOrAudit?: EducationProgramsService | AuditService,
    @Optional() maybeAudit?: AuditService,
  ) {
    if (educationProgramsOrAudit instanceof EducationProgramsService) {
      this.educationPrograms = educationProgramsOrAudit;
      this.audit = maybeAudit;
      return;
    }

    this.audit = educationProgramsOrAudit as AuditService | undefined;
  }

  async create(dto: CreateCurriculumDto): Promise<CurriculumResponseDto> {
    if (this.educationPrograms) {
      await this.educationPrograms.findOne(dto.educationProgramId);
    }
    const version = normalizeVersion(dto.version);
    if (
      await this.curricula.findByProgramAndVersion(
        dto.educationProgramId,
        version,
      )
    ) {
      throw new ConflictException(
        `Curriculum version ${version} already exists for this program`,
      );
    }

    const created = await this.curricula.create({
      educationProgramId: dto.educationProgramId,
      version,
      name: dto.name.trim(),
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      status: dto.status,
    });

    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.CURRICULUM_CREATED,
        resourceType: AUDIT_RESOURCE_TYPES.CURRICULUM,
        resourceId: created.id,
        organizationId: dto.educationProgramId,
        after: curriculumSnapshot(created),
      });
    }

    return toResponse(created);
  }

  async list(query: ListCurriculaQueryDto): Promise<CurriculumListResponseDto> {
    if (this.educationPrograms && query.educationProgramId) {
      await this.educationPrograms.findOne(query.educationProgramId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.curricula.list({
      educationProgramId: query.educationProgramId,
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

  async findOne(id: string): Promise<CurriculumResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateCurriculumDto,
  ): Promise<CurriculumResponseDto> {
    const existing = await this.ensureExists(id);
    const data: CurriculumUpdateData = {};

    if (dto.educationProgramId !== undefined) {
      if (this.educationPrograms) {
        await this.educationPrograms.findOne(dto.educationProgramId);
      }
      if (dto.educationProgramId !== existing.educationProgramId) {
        const version = dto.version ?? existing.version;
        if (
          await this.curricula.findByProgramAndVersion(
            dto.educationProgramId,
            normalizeVersion(version),
          )
        ) {
          throw new ConflictException(
            `Curriculum version ${normalizeVersion(version)} already exists for this program`,
          );
        }
      }
      data.educationProgramId = dto.educationProgramId;
    }

    if (dto.version !== undefined) {
      const version = normalizeVersion(dto.version);
      const targetProgramId =
        dto.educationProgramId ?? existing.educationProgramId;
      if (version !== existing.version) {
        if (
          await this.curricula.findByProgramAndVersion(targetProgramId, version)
        ) {
          throw new ConflictException(
            `Curriculum version ${version} already exists for this program`,
          );
        }
      }
      data.version = version;
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.effectiveFrom !== undefined) {
      data.effectiveFrom = dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : null;
    }
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.curricula.update(id, data);
    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.CURRICULUM_UPDATED,
        resourceType: AUDIT_RESOURCE_TYPES.CURRICULUM,
        resourceId: updated.id,
        organizationId: updated.educationProgramId,
        before: curriculumSnapshot(existing),
        after: curriculumSnapshot(updated),
        metadata: { changedFields: Object.keys(data).sort() },
      });
    }

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<CurriculumRecord> {
    const curriculum = await this.curricula.findById(id);
    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }
    return curriculum;
  }
}

function normalizeVersion(version: string): string {
  const normalized = version.trim();
  if (!normalized) {
    throw new BadRequestException('Curriculum version is required');
  }
  return normalized.toLowerCase();
}

function toResponse(curriculum: CurriculumRecord): CurriculumResponseDto {
  return {
    id: curriculum.id,
    educationProgramId: curriculum.educationProgramId,
    version: curriculum.version,
    name: curriculum.name,
    effectiveFrom: curriculum.effectiveFrom
      ? curriculum.effectiveFrom.toISOString()
      : null,
    status: curriculum.status,
    createdAt: curriculum.createdAt.toISOString(),
    updatedAt: curriculum.updatedAt.toISOString(),
  };
}

function curriculumSnapshot(
  curriculum: CurriculumRecord,
): Record<string, unknown> {
  return {
    id: curriculum.id,
    educationProgramId: curriculum.educationProgramId,
    version: curriculum.version,
    name: curriculum.name,
    effectiveFrom: curriculum.effectiveFrom
      ? curriculum.effectiveFrom.toISOString()
      : null,
    status: curriculum.status,
  };
}
