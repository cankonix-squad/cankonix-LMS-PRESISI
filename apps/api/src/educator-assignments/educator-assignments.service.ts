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
import { AssignmentStatusDto } from './dto/assignment-status.dto';
import { CreateEducatorAssignmentDto } from './dto/create-educator-assignment.dto';
import { EndEducatorAssignmentDto } from './dto/end-educator-assignment.dto';
import {
  EducatorAssignmentListResponseDto,
  EducatorAssignmentResponseDto,
} from './dto/educator-assignment-response.dto';
import { ListEducatorAssignmentsQueryDto } from './dto/list-educator-assignments-query.dto';
import { UpdateEducatorAssignmentDto } from './dto/update-educator-assignment.dto';
import {
  EDUCATOR_ASSIGNMENTS_REPOSITORY,
  EducatorAssignmentsRepository,
} from './educator-assignments.repository';
import {
  EducatorAssignmentRecord,
  EducatorAssignmentUpdateData,
} from './educator-assignment.types';

@Injectable()
export class EducatorAssignmentsService {
  constructor(
    @Inject(EDUCATOR_ASSIGNMENTS_REPOSITORY)
    private readonly assignments: EducatorAssignmentsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateEducatorAssignmentDto,
  ): Promise<EducatorAssignmentResponseDto> {
    const person = await this.assignments.findPersonContext(dto.personId);
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (person.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Inactive person cannot be assigned as educator',
      );
    }

    if (!(await this.assignments.findClassSubjectContext(dto.classSubjectId))) {
      throw new NotFoundException('Class subject not found');
    }

    const educatorType = await this.assignments.findEducatorTypeContext(
      dto.educatorTypeId,
    );
    if (!educatorType) {
      throw new NotFoundException('Educator type not found');
    }
    if (educatorType.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Inactive educator type cannot be assigned',
      );
    }

    const validFrom = normalizeDate(dto.validFrom, 'validFrom') as Date;
    const validUntil = normalizeDate(dto.validUntil, 'validUntil');
    assertDateRange(validFrom, validUntil);

    if (
      await this.assignments.findActiveDuplicate(
        dto.personId,
        dto.classSubjectId,
        dto.educatorTypeId,
      )
    ) {
      throw new ConflictException(
        'This person already has an active assignment for this class subject and educator type',
      );
    }

    await this.assertNoOverlap(
      dto.classSubjectId,
      dto.educatorTypeId,
      validFrom,
      validUntil,
    );

    const created = await this.assignments.create({
      personId: dto.personId,
      classSubjectId: dto.classSubjectId,
      educatorTypeId: dto.educatorTypeId,
      validFrom,
      validUntil,
      status: dto.status ?? AssignmentStatusDto.ACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.EDUCATOR_ASSIGNMENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.EDUCATOR_ASSIGNMENT,
      resourceId: created.id,
      after: assignmentSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListEducatorAssignmentsQueryDto,
  ): Promise<EducatorAssignmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.assignments.list({
      personId: query.personId,
      classSubjectId: query.classSubjectId,
      educatorTypeId: query.educatorTypeId,
      academicClassId: query.academicClassId,
      educationBatchId: query.educationBatchId,
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

  async findOne(id: string): Promise<EducatorAssignmentResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateEducatorAssignmentDto,
  ): Promise<EducatorAssignmentResponseDto> {
    const existing = await this.ensureExists(id);

    if (existing.status !== AssignmentStatusDto.ACTIVE) {
      throw new UnprocessableEntityException(
        `Only an active assignment can be updated (current status: ${existing.status})`,
      );
    }

    const data: EducatorAssignmentUpdateData = {};

    if (dto.validFrom !== undefined) {
      data.validFrom = normalizeDate(dto.validFrom, 'validFrom') as Date;
    }

    if (dto.validUntil !== undefined) {
      data.validUntil = normalizeDate(dto.validUntil, 'validUntil');
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const validFrom = data.validFrom ?? existing.validFrom;
    const validUntil =
      data.validUntil === undefined ? existing.validUntil : data.validUntil;
    assertDateRange(validFrom, validUntil);

    // Re-check the teaching load conflict whenever the window moves, not only
    // when the status is explicitly resent.
    const resolvedStatus = data.status ?? existing.status;
    if (resolvedStatus === AssignmentStatusDto.ACTIVE) {
      await this.assertNoOverlap(
        existing.classSubjectId,
        existing.educatorTypeId,
        validFrom,
        validUntil,
        id,
      );
    }

    const updated = await this.assignments.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.EDUCATOR_ASSIGNMENT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.EDUCATOR_ASSIGNMENT,
      resourceId: updated.id,
      before: assignmentSnapshot(existing),
      after: assignmentSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  /**
   * Ending an assignment closes the validity window instead of deleting it, so
   * teaching load history stays auditable.
   */
  async end(
    id: string,
    dto: EndEducatorAssignmentDto,
  ): Promise<EducatorAssignmentResponseDto> {
    const existing = await this.ensureExists(id);

    if (existing.status !== AssignmentStatusDto.ACTIVE) {
      throw new UnprocessableEntityException(
        `Only an active assignment can be ended (current status: ${existing.status})`,
      );
    }

    const validUntil = dto.validUntil
      ? (normalizeDate(dto.validUntil, 'validUntil') as Date)
      : startOfToday();

    if (validUntil < existing.validFrom) {
      throw new BadRequestException(
        'validUntil must be greater than or equal to validFrom',
      );
    }

    const updated = await this.assignments.update(id, {
      status: AssignmentStatusDto.ENDED,
      validUntil,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.EDUCATOR_ASSIGNMENT_ENDED,
      resourceType: AUDIT_RESOURCE_TYPES.EDUCATOR_ASSIGNMENT,
      resourceId: updated.id,
      before: assignmentSnapshot(existing),
      after: assignmentSnapshot(updated),
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<EducatorAssignmentRecord> {
    const found = await this.assignments.findById(id);
    if (!found) {
      throw new NotFoundException('Educator assignment not found');
    }
    return found;
  }

  /**
   * A class subject may have several educators of the same type over time, but
   * not two active holders covering the same dates: the teaching load is then
   * ambiguous for scheduling and reporting.
   */
  private async assertNoOverlap(
    classSubjectId: string,
    educatorTypeId: string,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.assignments.findOverlapping(
      classSubjectId,
      educatorTypeId,
      validFrom,
      validUntil,
      excludeId,
    );

    if (overlapping.length > 0) {
      throw new ConflictException(
        'Another active assignment of this educator type already covers the requested period for this class subject',
      );
    }
  }
}

function toResponse(
  record: EducatorAssignmentRecord,
): EducatorAssignmentResponseDto {
  return {
    id: record.id,
    personId: record.personId,
    classSubjectId: record.classSubjectId,
    educatorTypeId: record.educatorTypeId,
    validFrom: toDateOnly(record.validFrom),
    validUntil: record.validUntil ? toDateOnly(record.validUntil) : null,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function assignmentSnapshot(
  record: EducatorAssignmentRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    personId: record.personId,
    classSubjectId: record.classSubjectId,
    educatorTypeId: record.educatorTypeId,
    validFrom: toDateOnly(record.validFrom),
    validUntil: record.validUntil ? toDateOnly(record.validUntil) : null,
    status: record.status,
  };
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function normalizeDate(
  value: string | Date | null | undefined,
  field: 'validFrom' | 'validUntil',
): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function assertDateRange(
  validFrom: Date | null,
  validUntil: Date | null,
): void {
  if (validFrom && validUntil && validUntil < validFrom) {
    throw new BadRequestException(
      'validUntil must be greater than or equal to validFrom',
    );
  }
}
