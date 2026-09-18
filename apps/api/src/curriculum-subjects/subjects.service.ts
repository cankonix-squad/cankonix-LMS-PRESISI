import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import {
  SubjectListResponseDto,
  SubjectResponseDto,
} from './dto/subject-response.dto';
import { ListSubjectsQueryDto } from './dto/list-subjects-query.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SUBJECTS_REPOSITORY, SubjectsRepository } from './subjects.repository';
import { SubjectRecord, SubjectUpdateData } from './subjects.types';

@Injectable()
export class SubjectsService {
  constructor(
    @Inject(SUBJECTS_REPOSITORY)
    private readonly subjects: SubjectsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateSubjectDto): Promise<SubjectResponseDto> {
    const code = normalizeCode(dto.code);
    if (await this.subjects.findByCode(code)) {
      throw new ConflictException(`Subject code ${code} is already in use`);
    }

    const created = await this.subjects.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      status: dto.status,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.SUBJECT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.SUBJECT,
      resourceId: created.id,
      after: subjectSnapshot(created),
    });

    return toResponse(created);
  }

  async list(query: ListSubjectsQueryDto): Promise<SubjectListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.subjects.list({
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

  async findOne(id: string): Promise<SubjectResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<SubjectResponseDto> {
    const existing = await this.ensureExists(id);
    const data: SubjectUpdateData = {};

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      if (code !== existing.code) {
        if (await this.subjects.findByCode(code)) {
          throw new ConflictException(`Subject code ${code} is already in use`);
        }
        data.code = code;
      }
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.subjects.update(id, data);
    await this.audit.record({
      action: AUDIT_ACTIONS.SUBJECT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.SUBJECT,
      resourceId: updated.id,
      before: subjectSnapshot(existing),
      after: subjectSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<SubjectRecord> {
    const subject = await this.subjects.findById(id);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('Subject code is required');
  }
  return normalized;
}

function toResponse(subject: SubjectRecord): SubjectResponseDto {
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description,
    status: subject.status,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  };
}

function subjectSnapshot(subject: SubjectRecord): Record<string, unknown> {
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description,
    status: subject.status,
  };
}
