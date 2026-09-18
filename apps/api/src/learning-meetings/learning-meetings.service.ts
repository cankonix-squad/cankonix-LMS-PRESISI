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
import { ChangeLearningMeetingStatusDto } from './dto/learning-meeting-actions.dto';
import { CreateLearningMeetingDto } from './dto/create-learning-meeting.dto';
import {
  LearningMeetingListResponseDto,
  LearningMeetingResponseDto,
  ReorderLearningMeetingsResponseDto,
} from './dto/learning-meeting-response.dto';
import {
  LearningMeetingStatusDto,
  isAllowedTransition,
} from './dto/learning-meeting-status.dto';
import { ListLearningMeetingsQueryDto } from './dto/list-learning-meetings-query.dto';
import { ReorderLearningMeetingsDto } from './dto/learning-meeting-actions.dto';
import { UpdateLearningMeetingDto } from './dto/update-learning-meeting.dto';
import {
  LEARNING_MEETINGS_REPOSITORY,
  LearningMeetingsRepository,
} from './learning-meetings.repository';
import {
  LearningMeetingRecord,
  LearningMeetingUpdateData,
} from './learning-meeting.types';

@Injectable()
export class LearningMeetingsService {
  constructor(
    @Inject(LEARNING_MEETINGS_REPOSITORY)
    private readonly meetings: LearningMeetingsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateLearningMeetingDto,
  ): Promise<LearningMeetingResponseDto> {
    if (!(await this.meetings.findClassSubjectContext(dto.classSubjectId))) {
      throw new NotFoundException('Class subject not found');
    }

    const plannedStartAt = parseOptionalInstant(
      dto.plannedStartAt,
      'plannedStartAt',
    );
    const plannedEndAt = parseOptionalInstant(dto.plannedEndAt, 'plannedEndAt');
    assertPlannedRange(plannedStartAt, plannedEndAt);

    // Sequence is deterministic: the caller may pin it, otherwise the next free
    // number is appended so a class subject never has a gap at the end.
    const sequence =
      dto.sequence ?? (await this.meetings.maxSequence(dto.classSubjectId)) + 1;
    await this.assertSequenceFree(dto.classSubjectId, sequence);

    const created = await this.meetings.create({
      classSubjectId: dto.classSubjectId,
      sequence,
      title: dto.title.trim(),
      description: normalizeOptionalText(dto.description),
      plannedStartAt,
      plannedEndAt,
      status: dto.status ?? LearningMeetingStatusDto.DRAFT,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_MEETING_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_MEETING,
      resourceId: created.id,
      metadata: {
        classSubjectId: created.classSubjectId,
        sequence: created.sequence,
      },
      after: meetingSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListLearningMeetingsQueryDto,
  ): Promise<LearningMeetingListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const { data, total } = await this.meetings.list({
      classSubjectId: query.classSubjectId,
      academicClassId: query.academicClassId,
      educationBatchId: query.educationBatchId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return { data: data.map(toResponse), page, limit, total };
  }

  async findOne(id: string): Promise<LearningMeetingResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateLearningMeetingDto,
  ): Promise<LearningMeetingResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === LearningMeetingStatusDto.ARCHIVED) {
      throw new UnprocessableEntityException(
        'An archived meeting cannot be edited',
      );
    }

    const data: LearningMeetingUpdateData = {};

    if (dto.sequence !== undefined && dto.sequence !== existing.sequence) {
      await this.assertSequenceFree(existing.classSubjectId, dto.sequence, id);
      data.sequence = dto.sequence;
    }

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      data.description = normalizeOptionalText(dto.description);
    }

    const plannedStartAt =
      dto.plannedStartAt === undefined
        ? existing.plannedStartAt
        : parseOptionalInstant(dto.plannedStartAt, 'plannedStartAt');
    const plannedEndAt =
      dto.plannedEndAt === undefined
        ? existing.plannedEndAt
        : parseOptionalInstant(dto.plannedEndAt, 'plannedEndAt');
    assertPlannedRange(plannedStartAt, plannedEndAt);

    if (dto.plannedStartAt !== undefined) {
      data.plannedStartAt = plannedStartAt;
    }
    if (dto.plannedEndAt !== undefined) {
      data.plannedEndAt = plannedEndAt;
    }

    if (dto.status !== undefined) {
      // A status change is a lifecycle move, so it goes through the same
      // transition rules as the dedicated endpoint.
      assertTransition(existing.status as LearningMeetingStatusDto, dto.status);
      data.status = dto.status;
    }

    const updated = await this.meetings.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_MEETING_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_MEETING,
      resourceId: updated.id,
      metadata: { changedFields: Object.keys(data).sort() },
      before: meetingSnapshot(existing),
      after: meetingSnapshot(updated),
    });

    return toResponse(updated);
  }

  async changeStatus(
    id: string,
    dto: ChangeLearningMeetingStatusDto,
  ): Promise<LearningMeetingResponseDto> {
    const existing = await this.getOrThrow(id);
    const from = existing.status as LearningMeetingStatusDto;

    if (from === dto.status) {
      throw new BadRequestException(
        `Meeting is already in status ${dto.status}`,
      );
    }

    assertTransition(from, dto.status);

    const updated = await this.meetings.update(id, { status: dto.status });

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_MEETING_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_MEETING,
      resourceId: updated.id,
      metadata: { from, to: dto.status, reason: dto.reason ?? null },
      before: meetingSnapshot(existing),
      after: meetingSnapshot(updated),
    });

    return toResponse(updated);
  }

  /**
   * Reorders every meeting of a class subject.
   *
   * The contract requires the complete set rather than a partial move list. A
   * partial move (\"put meeting X at position 3\") needs a displacement rule that
   * is easy to get wrong and produces duplicate sequences when two operators
   * reorder concurrently. Stating the full final order makes the outcome
   * unambiguous, and it lets the service validate that the request and the
   * stored state agree before writing anything.
   *
   * Archived meetings participate in the plan like any other: they still hold a
   * sequence, so excluding them would leave the plan incomplete.
   */
  async reorder(
    dto: ReorderLearningMeetingsDto,
  ): Promise<ReorderLearningMeetingsResponseDto> {
    if (!(await this.meetings.findClassSubjectContext(dto.classSubjectId))) {
      throw new NotFoundException('Class subject not found');
    }

    const existing = await this.meetings.listSequenceContexts(
      dto.classSubjectId,
    );

    if (existing.length === 0) {
      throw new NotFoundException('Class subject has no meetings to reorder');
    }

    const requested = new Set(dto.orderedMeetingIds);
    if (requested.size !== dto.orderedMeetingIds.length) {
      throw new BadRequestException(
        'orderedMeetingIds must not contain duplicates',
      );
    }

    const stored = new Set(existing.map((meeting) => meeting.id));
    const unknown = dto.orderedMeetingIds.filter((id) => !stored.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException(
        'orderedMeetingIds contains a meeting that does not belong to this class subject',
      );
    }

    if (dto.orderedMeetingIds.length !== existing.length) {
      throw new BadRequestException(
        `orderedMeetingIds must list all ${existing.length} meetings of this class subject`,
      );
    }

    const before = existing
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((meeting) => ({ id: meeting.id, sequence: meeting.sequence }));

    const reordered = await this.meetings.applySequencePlan(
      dto.classSubjectId,
      dto.orderedMeetingIds,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_MEETING_REORDERED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_MEETING,
      resourceId: dto.classSubjectId,
      metadata: {
        classSubjectId: dto.classSubjectId,
        before,
        after: dto.orderedMeetingIds.map((id, index) => ({
          id,
          sequence: index + 1,
        })),
      },
    });

    return { data: reordered.map(toResponse), total: reordered.length };
  }

  private async getOrThrow(id: string): Promise<LearningMeetingRecord> {
    const found = await this.meetings.findById(id);
    if (!found) {
      throw new NotFoundException('Learning meeting not found');
    }
    return found;
  }

  /**
   * The `[classSubjectId, sequence]` index is the real guarantee; this check
   * exists to turn a constraint violation into a readable 409 instead of a
   * database error.
   */
  private async assertSequenceFree(
    classSubjectId: string,
    sequence: number,
    excludeId?: string,
  ): Promise<void> {
    if (
      await this.meetings.findBySequence(classSubjectId, sequence, excludeId)
    ) {
      throw new ConflictException(
        `Sequence ${sequence} is already used by another meeting in this class subject`,
      );
    }
  }
}

function assertTransition(
  from: LearningMeetingStatusDto,
  to: LearningMeetingStatusDto,
): void {
  if (!isAllowedTransition(from, to)) {
    throw new UnprocessableEntityException(
      `Meeting status cannot change from ${from} to ${to}`,
    );
  }
}

function toResponse(record: LearningMeetingRecord): LearningMeetingResponseDto {
  return {
    id: record.id,
    classSubjectId: record.classSubjectId,
    sequence: record.sequence,
    title: record.title,
    description: record.description,
    plannedStartAt: record.plannedStartAt
      ? record.plannedStartAt.toISOString()
      : null,
    plannedEndAt: record.plannedEndAt
      ? record.plannedEndAt.toISOString()
      : null,
    status: record.status as LearningMeetingStatusDto,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function meetingSnapshot(
  record: LearningMeetingRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    classSubjectId: record.classSubjectId,
    sequence: record.sequence,
    title: record.title,
    status: record.status,
    plannedStartAt: record.plannedStartAt
      ? record.plannedStartAt.toISOString()
      : null,
    plannedEndAt: record.plannedEndAt
      ? record.plannedEndAt.toISOString()
      : null,
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

function parseOptionalInstant(
  value: string | undefined,
  field: string,
): Date | null {
  if (value === undefined) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO 8601 instant`);
  }
  return date;
}

function assertPlannedRange(
  plannedStartAt: Date | null,
  plannedEndAt: Date | null,
): void {
  if (plannedStartAt && plannedEndAt && plannedEndAt < plannedStartAt) {
    throw new BadRequestException(
      'plannedEndAt must be greater than or equal to plannedStartAt',
    );
  }
}
