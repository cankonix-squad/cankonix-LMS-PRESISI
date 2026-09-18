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
import { AssignmentStatusDto } from '../educator-assignments/dto/assignment-status.dto';
import {
  ClassStaffAssignmentListResponseDto,
  ClassStaffAssignmentResponseDto,
} from './dto/class-staff-assignment-response.dto';
import { CreateClassStaffAssignmentDto } from './dto/create-class-staff-assignment.dto';
import { EndClassStaffAssignmentDto } from './dto/end-class-staff-assignment.dto';
import { ListClassStaffAssignmentsQueryDto } from './dto/list-class-staff-assignments-query.dto';
import { UpdateClassStaffAssignmentDto } from './dto/update-class-staff-assignment.dto';
import {
  CLASS_STAFF_ASSIGNMENTS_REPOSITORY,
  ClassStaffAssignmentsRepository,
} from './class-staff-assignments.repository';
import {
  ClassStaffAssignmentRecord,
  ClassStaffAssignmentUpdateData,
} from './class-staff-assignment.types';

@Injectable()
export class ClassStaffAssignmentsService {
  constructor(
    @Inject(CLASS_STAFF_ASSIGNMENTS_REPOSITORY)
    private readonly assignments: ClassStaffAssignmentsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateClassStaffAssignmentDto,
  ): Promise<ClassStaffAssignmentResponseDto> {
    const person = await this.assignments.findPersonContext(dto.personId);
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (person.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Inactive person cannot be assigned as class staff',
      );
    }

    const academicClass = await this.assignments.findAcademicClassContext(
      dto.academicClassId,
    );
    if (!academicClass) {
      throw new NotFoundException('Academic class not found');
    }

    const staffType = normalizeStaffType(dto.staffType);
    const validFrom = normalizeDate(dto.validFrom, 'validFrom') as Date;
    const validUntil = normalizeDate(dto.validUntil, 'validUntil');
    assertDateRange(validFrom, validUntil);

    if (
      await this.assignments.findActiveDuplicate(
        dto.personId,
        dto.academicClassId,
        staffType,
      )
    ) {
      throw new ConflictException(
        'This person already has an active class staff assignment with this staff type for this class',
      );
    }

    await this.assertNoOverlap(
      dto.personId,
      dto.academicClassId,
      staffType,
      validFrom,
      validUntil,
    );

    const status = dto.status ?? AssignmentStatusDto.ACTIVE;

    const created = await this.assignments.create({
      personId: dto.personId,
      academicClassId: dto.academicClassId,
      staffType,
      validFrom,
      validUntil,
      status,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CLASS_STAFF_ASSIGNMENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.CLASS_STAFF_ASSIGNMENT,
      resourceId: created.id,
      metadata: {
        personId: created.personId,
        academicClassId: created.academicClassId,
        staffType: created.staffType,
      },
      after: serialize(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListClassStaffAssignmentsQueryDto,
  ): Promise<ClassStaffAssignmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.assignments.list({
      personId: query.personId,
      academicClassId: query.academicClassId,
      staffType: query.staffType
        ? normalizeStaffType(query.staffType)
        : undefined,
      educationBatchId: query.educationBatchId,
      status: query.status,
      page,
      limit,
    });

    return {
      data: data.map(toResponse),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string): Promise<ClassStaffAssignmentResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateClassStaffAssignmentDto,
  ): Promise<ClassStaffAssignmentResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status !== AssignmentStatusDto.ACTIVE) {
      throw new UnprocessableEntityException(
        'Only active assignments can be updated',
      );
    }

    const validFrom =
      dto.validFrom === undefined
        ? existing.validFrom
        : (normalizeDate(dto.validFrom, 'validFrom') as Date);
    const validUntil =
      dto.validUntil === undefined
        ? existing.validUntil
        : normalizeDate(dto.validUntil, 'validUntil');
    assertDateRange(validFrom, validUntil);

    const status = dto.status ?? existing.status;

    // Re-check the class staff conflict whenever the window moves, not only when
    // the status is explicitly resent.
    if (status === AssignmentStatusDto.ACTIVE) {
      await this.assertNoOverlap(
        existing.personId,
        existing.academicClassId,
        existing.staffType,
        validFrom,
        validUntil,
        id,
      );
    }

    const data: ClassStaffAssignmentUpdateData = {
      validFrom,
      validUntil,
      status,
    };

    const updated = await this.assignments.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.CLASS_STAFF_ASSIGNMENT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.CLASS_STAFF_ASSIGNMENT,
      resourceId: id,
      before: serialize(existing),
      after: serialize(updated),
    });

    return toResponse(updated);
  }

  async end(
    id: string,
    dto: EndClassStaffAssignmentDto,
  ): Promise<ClassStaffAssignmentResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status !== AssignmentStatusDto.ACTIVE) {
      throw new UnprocessableEntityException(
        'Only active assignments can be ended',
      );
    }

    const validUntil =
      dto.validUntil === undefined
        ? startOfToday()
        : (normalizeDate(dto.validUntil, 'validUntil') as Date);
    assertDateRange(existing.validFrom, validUntil);

    const updated = await this.assignments.update(id, {
      validUntil,
      status: AssignmentStatusDto.ENDED,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CLASS_STAFF_ASSIGNMENT_ENDED,
      resourceType: AUDIT_RESOURCE_TYPES.CLASS_STAFF_ASSIGNMENT,
      resourceId: id,
      metadata: { validUntil: validUntil.toISOString().slice(0, 10) },
      before: serialize(existing),
      after: serialize(updated),
    });

    return toResponse(updated);
  }

  private async getOrThrow(id: string): Promise<ClassStaffAssignmentRecord> {
    const record = await this.assignments.findById(id);
    if (!record) {
      throw new NotFoundException('Class staff assignment not found');
    }
    return record;
  }

  /**
   * A person may not hold the same class role twice over an overlapping period:
   * the role holder becomes ambiguous for attendance and reporting.
   *
   * The scope is the person, not the class. A role code such as PENGASUH may
   * legitimately have several concurrent holders, so the class itself is not the
   * uniqueness boundary here (contrast educator assignments, where one educator
   * type per class subject is single-holder).
   */
  private async assertNoOverlap(
    personId: string,
    academicClassId: string,
    staffType: string,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.assignments.findOverlapping(
      personId,
      academicClassId,
      staffType,
      validFrom,
      validUntil,
      excludeId,
    );

    if (overlapping.length > 0) {
      throw new ConflictException(
        'An active assignment for this person, class, and staff type already covers the requested period',
      );
    }
  }
}

function normalizeStaffType(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized.length === 0) {
    throw new BadRequestException('staffType must not be empty');
  }
  return normalized;
}

function toResponse(
  record: ClassStaffAssignmentRecord,
): ClassStaffAssignmentResponseDto {
  return {
    id: record.id,
    personId: record.personId,
    academicClassId: record.academicClassId,
    staffType: record.staffType,
    validFrom: toDateOnly(record.validFrom),
    validUntil: record.validUntil ? toDateOnly(record.validUntil) : null,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serialize(
  record: ClassStaffAssignmentRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    personId: record.personId,
    academicClassId: record.academicClassId,
    staffType: record.staffType,
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
