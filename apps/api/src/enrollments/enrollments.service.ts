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
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import {
  EnrollmentListResponseDto,
  EnrollmentResponseDto,
} from './dto/enrollment-response.dto';
import { EnrollmentStatusDto } from './dto/enrollment-status.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto';
import { TransferEnrollmentClassDto } from './dto/transfer-enrollment-class.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import {
  ENROLLMENTS_REPOSITORY,
  EnrollmentsRepository,
} from './enrollments.repository';
import { EnrollmentRecord, EnrollmentUpdateData } from './enrollment.types';

/**
 * Allowed lifecycle transitions. Withdrawal and completion are terminal from the
 * application's point of view, but an operator may reactivate a withdrawn
 * participant; completion is only reversible through an explicit reactivation so
 * downstream grading never silently re-opens.
 */
const ALLOWED_TRANSITIONS: Record<
  EnrollmentStatusDto,
  readonly EnrollmentStatusDto[]
> = {
  [EnrollmentStatusDto.ACTIVE]: [
    EnrollmentStatusDto.WITHDRAWN,
    EnrollmentStatusDto.COMPLETED,
  ],
  [EnrollmentStatusDto.WITHDRAWN]: [EnrollmentStatusDto.ACTIVE],
  [EnrollmentStatusDto.COMPLETED]: [EnrollmentStatusDto.ACTIVE],
};

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(ENROLLMENTS_REPOSITORY)
    private readonly enrollments: EnrollmentsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateEnrollmentDto): Promise<EnrollmentResponseDto> {
    await this.ensurePersonIsActive(dto.personId);

    if (dto.academicClassId) {
      await this.ensureClassBelongsToBatch(
        dto.academicClassId,
        dto.educationBatchId,
      );
    }

    if (
      await this.enrollments.findByPersonAndBatch(
        dto.personId,
        dto.educationBatchId,
      )
    ) {
      throw new ConflictException(
        'Person is already enrolled in this education batch',
      );
    }

    const enrollmentNumber = dto.enrollmentNumber?.trim() || null;
    if (
      enrollmentNumber &&
      (await this.enrollments.findByEnrollmentNumber(enrollmentNumber))
    ) {
      throw new ConflictException(
        `Enrollment number ${enrollmentNumber} is already in use`,
      );
    }

    const enrolledAt = dto.enrolledAt
      ? normalizeDate(dto.enrolledAt, 'enrolledAt')
      : startOfToday();

    const created = await this.enrollments.create({
      personId: dto.personId,
      educationBatchId: dto.educationBatchId,
      academicClassId: dto.academicClassId ?? null,
      enrollmentNumber,
      enrolledAt,
      status: dto.status ?? EnrollmentStatusDto.ACTIVE,
      completedAt:
        dto.status === EnrollmentStatusDto.COMPLETED ? startOfToday() : null,
      metadata: dto.metadata ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ENROLLMENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ENROLLMENT,
      resourceId: created.id,
      organizationId: created.educationBatchId,
      after: enrollmentSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListEnrollmentsQueryDto,
  ): Promise<EnrollmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.enrollments.list({
      personId: query.personId,
      educationBatchId: query.educationBatchId,
      academicClassId: query.academicClassId,
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

  async findOne(id: string): Promise<EnrollmentResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  /**
   * Person-level education history. Withdrawn and completed records stay in the
   * result set: the history of a person is part of the institutional record.
   */
  async listByPerson(personId: string): Promise<EnrollmentResponseDto[]> {
    const result = await this.enrollments.list({
      personId,
      page: 1,
      limit: 100,
    });
    return result.data.map(toResponse);
  }

  async changeStatus(
    id: string,
    dto: UpdateEnrollmentStatusDto,
  ): Promise<EnrollmentResponseDto> {
    const existing = await this.ensureExists(id);

    if (existing.status === dto.status) {
      throw new BadRequestException(
        `Enrollment is already in status ${dto.status}`,
      );
    }

    if (!ALLOWED_TRANSITIONS[existing.status].includes(dto.status)) {
      throw new UnprocessableEntityException(
        `Enrollment status cannot move from ${existing.status} to ${dto.status}`,
      );
    }

    const data: EnrollmentUpdateData = {
      status: dto.status,
      completedAt:
        dto.status === EnrollmentStatusDto.COMPLETED
          ? startOfToday()
          : existing.completedAt,
    };

    // Reopening a completed enrollment clears the completion date so the record
    // does not claim to be finished while it is active again.
    if (
      dto.status === EnrollmentStatusDto.ACTIVE &&
      existing.status === EnrollmentStatusDto.COMPLETED
    ) {
      data.completedAt = null;
    }

    const updated = await this.enrollments.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.ENROLLMENT_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.ENROLLMENT,
      resourceId: updated.id,
      organizationId: updated.educationBatchId,
      before: enrollmentSnapshot(existing),
      after: enrollmentSnapshot(updated),
      metadata: dto.reason ? { reason: dto.reason } : undefined,
    });

    return toResponse(updated);
  }

  /**
   * Moves a participant between classes of the same batch. Class identity is part
   * of the education history, so the move is audited with both endpoints.
   */
  async transferClass(
    id: string,
    dto: TransferEnrollmentClassDto,
  ): Promise<EnrollmentResponseDto> {
    const existing = await this.ensureExists(id);

    if (existing.status !== EnrollmentStatusDto.ACTIVE) {
      throw new UnprocessableEntityException(
        'Only an active enrollment can be moved to another class',
      );
    }

    if (existing.academicClassId === dto.academicClassId) {
      throw new BadRequestException(
        'Enrollment is already assigned to this class',
      );
    }

    await this.ensureClassBelongsToBatch(
      dto.academicClassId,
      existing.educationBatchId,
    );

    const updated = await this.enrollments.update(id, {
      academicClassId: dto.academicClassId,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ENROLLMENT_CLASS_TRANSFERRED,
      resourceType: AUDIT_RESOURCE_TYPES.ENROLLMENT,
      resourceId: updated.id,
      organizationId: updated.educationBatchId,
      before: enrollmentSnapshot(existing),
      after: enrollmentSnapshot(updated),
      metadata: dto.reason ? { reason: dto.reason } : undefined,
    });

    return toResponse(updated);
  }

  private async ensureExists(id: string): Promise<EnrollmentRecord> {
    const found = await this.enrollments.findById(id);
    if (!found) {
      throw new NotFoundException('Enrollment not found');
    }
    return found;
  }

  private async ensurePersonIsActive(personId: string): Promise<void> {
    const person = await this.enrollments.findPersonContext(personId);
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (person.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Inactive person cannot be enrolled in a batch',
      );
    }
  }

  private async ensureClassBelongsToBatch(
    academicClassId: string,
    educationBatchId: string,
  ): Promise<void> {
    const academicClass =
      await this.enrollments.findClassContext(academicClassId);
    if (!academicClass) {
      throw new NotFoundException('Academic class not found');
    }
    if (academicClass.educationBatchId !== educationBatchId) {
      throw new BadRequestException(
        'Academic class does not belong to the enrollment batch',
      );
    }
  }
}

function toResponse(record: EnrollmentRecord): EnrollmentResponseDto {
  return {
    id: record.id,
    personId: record.personId,
    educationBatchId: record.educationBatchId,
    academicClassId: record.academicClassId,
    enrollmentNumber: record.enrollmentNumber,
    enrolledAt: toDateOnly(record.enrolledAt),
    status: record.status,
    completedAt: record.completedAt ? toDateOnly(record.completedAt) : null,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function enrollmentSnapshot(record: EnrollmentRecord): Record<string, unknown> {
  return {
    id: record.id,
    personId: record.personId,
    educationBatchId: record.educationBatchId,
    academicClassId: record.academicClassId,
    enrollmentNumber: record.enrollmentNumber,
    enrolledAt: toDateOnly(record.enrolledAt),
    status: record.status,
    completedAt: record.completedAt ? toDateOnly(record.completedAt) : null,
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

function normalizeDate(value: string, field: 'enrolledAt'): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
