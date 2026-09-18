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
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateEducationProgramDto } from './dto/create-education-program.dto';
import {
  EducationProgramListResponseDto,
  EducationProgramResponseDto,
} from './dto/education-program-response.dto';
import { ListEducationProgramsQueryDto } from './dto/list-education-programs-query.dto';
import { UpdateEducationProgramDto } from './dto/update-education-program.dto';
import {
  EDUCATION_PROGRAMS_REPOSITORY,
  EducationProgramsRepository,
} from './education-programs.repository';
import {
  EducationProgramRecord,
  EducationProgramUpdateData,
} from './education-programs.types';

@Injectable()
export class EducationProgramsService {
  constructor(
    @Inject(EDUCATION_PROGRAMS_REPOSITORY)
    private readonly programs: EducationProgramsRepository,
    @Optional() private readonly audit?: AuditService,
    @Optional() private readonly organizations?: OrganizationsService,
  ) {}

  async create(
    dto: CreateEducationProgramDto,
  ): Promise<EducationProgramResponseDto> {
    await this.ensureOrganizationExists(dto.organizationId);
    const code = normalizeCode(dto.code);
    await this.ensureCodeAvailable(dto.organizationId, code);

    const created = await this.programs.create({
      organizationId: dto.organizationId,
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      status: dto.status,
      metadata: dto.metadata ?? null,
    });

    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.EDUCATION_PROGRAM_CREATED,
        resourceType: AUDIT_RESOURCE_TYPES.EDUCATION_PROGRAM,
        resourceId: created.id,
        organizationId: created.organizationId,
        after: programSnapshot(created),
      });
    }

    return toResponse(created);
  }

  async list(
    query: ListEducationProgramsQueryDto,
  ): Promise<EducationProgramListResponseDto> {
    if (query.organizationId) {
      await this.ensureOrganizationExists(query.organizationId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.programs.list({
      organizationId: query.organizationId,
      status: query.status,
      search: query.search?.trim() || undefined,
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

  async findOne(id: string): Promise<EducationProgramResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateEducationProgramDto,
  ): Promise<EducationProgramResponseDto> {
    const existing = await this.ensureExists(id);
    const data: EducationProgramUpdateData = {};

    if (dto.organizationId !== undefined) {
      await this.ensureOrganizationExists(dto.organizationId);
      if (dto.organizationId !== existing.organizationId) {
        await this.ensureCodeAvailable(dto.organizationId, existing.code, id);
      }
      data.organizationId = dto.organizationId;
    }

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      const targetOrganizationId =
        dto.organizationId ?? existing.organizationId;
      await this.ensureCodeAvailable(targetOrganizationId, code, id);
      data.code = code;
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    const updated = await this.programs.update(id, data);

    if (this.audit) {
      await this.audit.record({
        action: AUDIT_ACTIONS.EDUCATION_PROGRAM_UPDATED,
        resourceType: AUDIT_RESOURCE_TYPES.EDUCATION_PROGRAM,
        resourceId: updated.id,
        organizationId: updated.organizationId,
        before: programSnapshot(existing),
        after: programSnapshot(updated),
        metadata: { changedFields: Object.keys(data).sort() },
      });
    }

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<EducationProgramRecord> {
    const program = await this.programs.findById(id);
    if (!program) {
      throw new NotFoundException('Education program not found');
    }
    return program;
  }

  private async ensureOrganizationExists(
    organizationId: string,
  ): Promise<void> {
    if (!this.organizations) {
      return;
    }
    await this.organizations.findOne(organizationId);
  }

  private async ensureCodeAvailable(
    organizationId: string,
    code: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.programs.findByOrganizationAndCode(
      organizationId,
      code,
    );
    if (existing && existing.id !== currentId) {
      throw new ConflictException(
        'Education program code already exists for this organization',
      );
    }
  }
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('Education program code is required');
  }
  return normalized;
}

function toResponse(
  program: EducationProgramRecord,
): EducationProgramResponseDto {
  return {
    id: program.id,
    organizationId: program.organizationId,
    code: program.code,
    name: program.name,
    description: program.description,
    status: program.status,
    metadata: program.metadata,
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

function programSnapshot(
  program: EducationProgramRecord,
): Record<string, unknown> {
  return {
    id: program.id,
    organizationId: program.organizationId,
    code: program.code,
    name: program.name,
    description: program.description,
    status: program.status,
    metadata: program.metadata,
  };
}
