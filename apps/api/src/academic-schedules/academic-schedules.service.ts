import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  AcademicScheduleListResponseDto,
  AcademicScheduleResponseDto,
} from './dto/academic-schedule-response.dto';
import {
  AcademicScheduleModeDto,
  AcademicScheduleStatusDto,
  isOccupyingStatus,
} from './dto/academic-schedule-status.dto';
import { CreateAcademicScheduleDto } from './dto/create-academic-schedule.dto';
import { ListAcademicSchedulesQueryDto } from './dto/list-academic-schedules-query.dto';
import { UpdateAcademicScheduleDto } from './dto/update-academic-schedule.dto';
import {
  ACADEMIC_SCHEDULES_REPOSITORY,
  AcademicSchedulesRepository,
} from './academic-schedules.repository';
import {
  AcademicScheduleRecord,
  AcademicScheduleUpdateData,
  ScheduleConflictRecord,
} from './academic-schedule.types';

@Injectable()
export class AcademicSchedulesService {
  constructor(
    @Inject(ACADEMIC_SCHEDULES_REPOSITORY)
    private readonly schedules: AcademicSchedulesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateAcademicScheduleDto,
  ): Promise<AcademicScheduleResponseDto> {
    if (!(await this.schedules.findClassSubjectContext(dto.classSubjectId))) {
      throw new NotFoundException('Class subject not found');
    }

    const startAt = parseInstant(dto.startAt, 'startAt');
    const endAt = parseInstant(dto.endAt, 'endAt');
    assertPositiveDuration(startAt, endAt);

    const mode = dto.mode ?? AcademicScheduleModeDto.FACE_TO_FACE;
    const status = dto.status ?? AcademicScheduleStatusDto.SCHEDULED;
    const location = normalizeOptionalText(dto.location);
    const url = normalizeOptionalText(dto.url);
    assertDeliveryTarget(mode, location, url);

    await this.assertNoConflict(dto.classSubjectId, startAt, endAt, status);

    const created = await this.schedules.create({
      classSubjectId: dto.classSubjectId,
      title: dto.title.trim(),
      description: normalizeOptionalText(dto.description),
      startAt,
      endAt,
      mode,
      location,
      url,
      status,
      metadata: dto.metadata ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ACADEMIC_SCHEDULE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ACADEMIC_SCHEDULE,
      resourceId: created.id,
      metadata: {
        classSubjectId: created.classSubjectId,
        mode: created.mode,
        startAt: created.startAt.toISOString(),
        endAt: created.endAt.toISOString(),
      },
      after: scheduleSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListAcademicSchedulesQueryDto,
  ): Promise<AcademicScheduleListResponseDto> {
    const from = parseOptionalInstant(query.from, 'from');
    const to = parseOptionalInstant(query.to, 'to');
    if (from && to && to < from) {
      throw new BadRequestException('to must be greater than or equal to from');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.schedules.list({
      classSubjectId: query.classSubjectId,
      academicClassId: query.academicClassId,
      educationBatchId: query.educationBatchId,
      mode: query.mode,
      status: query.status,
      from,
      to,
      page,
      limit,
    });

    return { data: data.map(toResponse), page, limit, total };
  }

  async findOne(id: string): Promise<AcademicScheduleResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateAcademicScheduleDto,
  ): Promise<AcademicScheduleResponseDto> {
    const existing = await this.getOrThrow(id);

    const startAt =
      dto.startAt === undefined
        ? existing.startAt
        : parseInstant(dto.startAt, 'startAt');
    const endAt =
      dto.endAt === undefined
        ? existing.endAt
        : parseInstant(dto.endAt, 'endAt');
    assertPositiveDuration(startAt, endAt);

    const mode = (dto.mode ?? existing.mode) as AcademicScheduleModeDto;
    const status = (dto.status ?? existing.status) as AcademicScheduleStatusDto;
    const location =
      dto.location === undefined
        ? existing.location
        : normalizeOptionalText(dto.location);
    const url =
      dto.url === undefined ? existing.url : normalizeOptionalText(dto.url);
    assertDeliveryTarget(mode, location, url);

    // Only re-check the calendar when the period or status actually changes.
    const periodChanged =
      startAt.getTime() !== existing.startAt.getTime() ||
      endAt.getTime() !== existing.endAt.getTime();
    const statusChanged = status !== existing.status;
    if (periodChanged || statusChanged) {
      await this.assertNoConflict(
        existing.classSubjectId,
        startAt,
        endAt,
        status,
        id,
      );
    }

    const data: AcademicScheduleUpdateData = {
      startAt,
      endAt,
      mode,
      status,
      location,
      url,
    };

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      data.description = normalizeOptionalText(dto.description);
    }
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata;
    }

    const updated = await this.schedules.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.ACADEMIC_SCHEDULE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.ACADEMIC_SCHEDULE,
      resourceId: updated.id,
      metadata: { changedFields: Object.keys(data).sort() },
      before: scheduleSnapshot(existing),
      after: scheduleSnapshot(updated),
    });

    return toResponse(updated);
  }

  /**
   * Cancelling keeps the entry so the calendar history stays readable; it only
   * frees the slot for a replacement session.
   */
  async cancel(id: string): Promise<AcademicScheduleResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === AcademicScheduleStatusDto.CANCELLED) {
      throw new BadRequestException('Schedule is already cancelled');
    }

    const updated = await this.schedules.update(id, {
      status: AcademicScheduleStatusDto.CANCELLED,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ACADEMIC_SCHEDULE_CANCELLED,
      resourceType: AUDIT_RESOURCE_TYPES.ACADEMIC_SCHEDULE,
      resourceId: updated.id,
      before: scheduleSnapshot(existing),
      after: scheduleSnapshot(updated),
    });

    return toResponse(updated);
  }

  private async getOrThrow(id: string): Promise<AcademicScheduleRecord> {
    const found = await this.schedules.findById(id);
    if (!found) {
      throw new NotFoundException('Academic schedule not found');
    }
    return found;
  }

  private async assertNoConflict(
    classSubjectId: string,
    startAt: Date,
    endAt: Date,
    status: AcademicScheduleStatusDto,
    excludeId?: string,
  ): Promise<void> {
    // A cancelled entry never occupies the slot, so it cannot conflict.
    if (!isOccupyingStatus(status)) {
      return;
    }

    const conflicts = await this.schedules.findConflicts(
      classSubjectId,
      startAt,
      endAt,
      excludeId,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message:
          'The requested period overlaps an existing schedule for this class subject',
        conflicts: conflicts.map(conflictSnapshot),
      });
    }
  }
}

function conflictSnapshot(
  conflict: ScheduleConflictRecord,
): Record<string, unknown> {
  return {
    id: conflict.id,
    title: conflict.title,
    startAt: conflict.startAt.toISOString(),
    endAt: conflict.endAt.toISOString(),
    status: conflict.status,
  };
}

function toResponse(
  record: AcademicScheduleRecord,
): AcademicScheduleResponseDto {
  return {
    id: record.id,
    classSubjectId: record.classSubjectId,
    title: record.title,
    description: record.description,
    startAt: record.startAt.toISOString(),
    endAt: record.endAt.toISOString(),
    mode: record.mode as AcademicScheduleModeDto,
    location: record.location,
    url: record.url,
    status: record.status as AcademicScheduleStatusDto,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function scheduleSnapshot(
  record: AcademicScheduleRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    classSubjectId: record.classSubjectId,
    title: record.title,
    startAt: record.startAt.toISOString(),
    endAt: record.endAt.toISOString(),
    mode: record.mode,
    status: record.status,
  };
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseInstant(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO 8601 instant`);
  }
  return date;
}

function parseOptionalInstant(
  value: string | undefined,
  field: string,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parseInstant(value, field);
}

/**
 * An activity must have a positive duration. A zero-length or inverted period is
 * not a scheduling mistake to tolerate, it is an unrepresentable activity.
 */
function assertPositiveDuration(startAt: Date, endAt: Date): void {
  if (endAt.getTime() <= startAt.getTime()) {
    throw new BadRequestException('endAt must be after startAt');
  }
}

/**
 * Minimal delivery-target rule: an online session without a link, or an in-person
 * session without a place, cannot actually be attended. BLENDED accepts either
 * because it may run in both forms.
 */
function assertDeliveryTarget(
  mode: AcademicScheduleModeDto,
  location: string | null,
  url: string | null,
): void {
  if (mode === AcademicScheduleModeDto.FACE_TO_FACE && !location) {
    throw new BadRequestException(
      'location is required for a FACE_TO_FACE schedule',
    );
  }

  if (mode === AcademicScheduleModeDto.ONLINE && !url) {
    throw new BadRequestException('url is required for an ONLINE schedule');
  }

  if (mode === AcademicScheduleModeDto.BLENDED && !location && !url) {
    throw new BadRequestException(
      'a BLENDED schedule requires a location or a url',
    );
  }
}
