import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import {
  ClassSubjectListResponseDto,
  ClassSubjectResponseDto,
} from './dto/class-subject-response.dto';
import { ListClassSubjectsQueryDto } from './dto/list-class-subjects-query.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import {
  CLASS_SUBJECTS_REPOSITORY,
  ClassSubjectsRepository,
} from './class-subjects.repository';
import {
  ClassSubjectRecord,
  ClassSubjectUpdateData,
} from './class-subjects.types';

@Injectable()
export class ClassSubjectsService {
  constructor(
    @Inject(CLASS_SUBJECTS_REPOSITORY)
    private readonly classSubjects: ClassSubjectsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateClassSubjectDto): Promise<ClassSubjectResponseDto> {
    const academicClass = await this.classSubjects.findClassContext(
      dto.academicClassId,
    );
    if (!academicClass) {
      throw new NotFoundException('Academic class not found');
    }

    const curriculumSubject =
      await this.classSubjects.findCurriculumSubjectContext(
        dto.curriculumSubjectId,
      );
    if (!curriculumSubject) {
      throw new NotFoundException('Curriculum subject not found');
    }

    // A delivery instance may only project a curriculum entry that the batch of
    // this classroom actually adopted. Otherwise the class would teach (and
    // later grade) a subject it was never scheduled for.
    if (curriculumSubject.curriculumId !== academicClass.curriculumId) {
      throw new BadRequestException(
        'Curriculum subject does not belong to the curriculum of this class batch',
      );
    }

    if (
      await this.classSubjects.findByClassAndCurriculumSubject(
        dto.academicClassId,
        dto.curriculumSubjectId,
      )
    ) {
      throw new ConflictException(
        'This curriculum subject is already delivered by the class',
      );
    }

    const startDate = normalizeDate(dto.startDate, 'startDate');
    const endDate = normalizeDate(dto.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    const created = await this.classSubjects.create({
      academicClassId: dto.academicClassId,
      curriculumSubjectId: dto.curriculumSubjectId,
      code: dto.code?.trim() || null,
      displayName: dto.displayName?.trim() || null,
      startDate,
      endDate,
      status: dto.status,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CLASS_SUBJECT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.CLASS_SUBJECT,
      resourceId: created.id,
      organizationId: created.academicClassId,
      after: classSubjectSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListClassSubjectsQueryDto,
  ): Promise<ClassSubjectListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.classSubjects.list({
      academicClassId: query.academicClassId,
      curriculumSubjectId: query.curriculumSubjectId,
      educationBatchId: query.educationBatchId,
      educationProgramId: query.educationProgramId,
      organizationId: query.organizationId,
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

  async findOne(id: string): Promise<ClassSubjectResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateClassSubjectDto,
  ): Promise<ClassSubjectResponseDto> {
    const existing = await this.ensureExists(id);
    const data: ClassSubjectUpdateData = {};

    if (dto.code !== undefined) {
      data.code = dto.code.trim() || null;
    }

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim() || null;
    }

    if (dto.startDate !== undefined) {
      data.startDate = normalizeDate(dto.startDate, 'startDate');
    }

    if (dto.endDate !== undefined) {
      data.endDate = normalizeDate(dto.endDate, 'endDate');
    }

    assertDateRange(
      data.startDate === undefined ? existing.startDate : data.startDate,
      data.endDate === undefined ? existing.endDate : data.endDate,
    );

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const updated = await this.classSubjects.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.CLASS_SUBJECT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.CLASS_SUBJECT,
      resourceId: updated.id,
      organizationId: updated.academicClassId,
      before: classSubjectSnapshot(existing),
      after: classSubjectSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<ClassSubjectRecord> {
    const found = await this.classSubjects.findById(id);
    if (!found) {
      throw new NotFoundException('Class subject not found');
    }
    return found;
  }
}

function toResponse(record: ClassSubjectRecord): ClassSubjectResponseDto {
  return {
    id: record.id,
    academicClassId: record.academicClassId,
    curriculumSubjectId: record.curriculumSubjectId,
    code: record.code,
    displayName: record.displayName,
    startDate: record.startDate ? toDateOnly(record.startDate) : null,
    endDate: record.endDate ? toDateOnly(record.endDate) : null,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function classSubjectSnapshot(
  record: ClassSubjectRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    academicClassId: record.academicClassId,
    curriculumSubjectId: record.curriculumSubjectId,
    code: record.code,
    displayName: record.displayName,
    startDate: record.startDate ? toDateOnly(record.startDate) : null,
    endDate: record.endDate ? toDateOnly(record.endDate) : null,
    status: record.status,
  };
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeDate(
  value: string | Date | null | undefined,
  field: 'startDate' | 'endDate',
): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }

  return date;
}

function assertDateRange(startDate: Date | null, endDate: Date | null): void {
  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestException(
      'endDate must be greater than or equal to startDate',
    );
  }
}
