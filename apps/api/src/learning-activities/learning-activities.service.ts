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
import {
  ChangeLearningActivityStatusDto,
  ReorderLearningActivitiesDto,
} from './dto/learning-activity-actions.dto';
import { CreateLearningActivityDto } from './dto/create-learning-activity.dto';
import {
  LearningActivityListResponseDto,
  LearningActivityResponseDto,
  ReorderLearningActivitiesResponseDto,
} from './dto/learning-activity-response.dto';
import {
  LearningActivityStatusDto,
  isAllowedActivityTransition,
} from './dto/learning-activity-status.dto';
import { ListLearningActivitiesQueryDto } from './dto/list-learning-activities-query.dto';
import { UpdateLearningActivityDto } from './dto/update-learning-activity.dto';
import {
  LEARNING_ACTIVITIES_REPOSITORY,
  LearningActivitiesRepository,
} from './learning-activities.repository';
import {
  ActivitySequenceContext,
  LearningActivityRecord,
  LearningActivityUpdateData,
  MeetingContext,
} from './learning-activity.types';

@Injectable()
export class LearningActivitiesService {
  constructor(
    @Inject(LEARNING_ACTIVITIES_REPOSITORY)
    private readonly activities: LearningActivitiesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateLearningActivityDto,
  ): Promise<LearningActivityResponseDto> {
    const meeting = await this.ensureMeeting(dto.meetingId);
    const activityType = await this.ensureActivityType(dto.activityTypeId);

    const status = dto.status ?? LearningActivityStatusDto.DRAFT;
    const availableFrom = parseOptionalInstant(
      dto.availableFrom,
      'availableFrom',
    );
    const availableUntil = parseOptionalInstant(
      dto.availableUntil,
      'availableUntil',
    );
    assertAvailabilityWindow(availableFrom, availableUntil);

    const sequence = dto.sequence ?? (await this.nextSequence(dto.meetingId));
    await this.assertSequenceFree(dto.meetingId, sequence);

    const created = await this.activities.create({
      meetingId: dto.meetingId,
      activityTypeId: dto.activityTypeId,
      sequence,
      title: dto.title.trim(),
      instructions: normalizeOptionalText(dto.instructions),
      required: dto.required ?? false,
      availableFrom,
      availableUntil,
      status,
    });

    // A create may already ask for PUBLISHED, so the same gate as the status
    // endpoint applies here. Validating afterwards would leave an invalid
    // published row behind if the audit write failed.
    if (status === LearningActivityStatusDto.PUBLISHED) {
      await this.assertPublishable(
        created.id,
        activityType.requiresContent,
        activityType.status,
        meeting,
      );
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_ACTIVITY_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_ACTIVITY,
      resourceId: created.id,
      metadata: {
        meetingId: created.meetingId,
        activityTypeId: created.activityTypeId,
        sequence: created.sequence,
      },
      after: activitySnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListLearningActivitiesQueryDto,
  ): Promise<LearningActivityListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const { data, total } = await this.activities.list({
      meetingId: query.meetingId,
      classSubjectId: query.classSubjectId,
      academicClassId: query.academicClassId,
      educationBatchId: query.educationBatchId,
      activityTypeId: query.activityTypeId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return { data: data.map(toResponse), page, limit, total };
  }

  async findOne(id: string): Promise<LearningActivityResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateLearningActivityDto,
  ): Promise<LearningActivityResponseDto> {
    const existing = await this.getOrThrow(id);
    if (existing.status === LearningActivityStatusDto.ARCHIVED) {
      throw new UnprocessableEntityException(
        'Archived activity cannot be edited',
      );
    }

    const meeting = await this.ensureMeeting(existing.meetingId);
    const data: LearningActivityUpdateData = {};

    let requiresContent: boolean | null = null;
    let activityTypeStatus: string | null = null;

    if (
      dto.activityTypeId !== undefined &&
      dto.activityTypeId !== existing.activityTypeId
    ) {
      const activityType = await this.ensureActivityType(dto.activityTypeId);
      requiresContent = activityType.requiresContent;
      activityTypeStatus = activityType.status;

      // Switching the type of a material-carrying activity to a type that
      // requires content would silently invalidate the publish state, so the
      // same gate as publishing is applied before the change is accepted.
      if (activityType.requiresContent) {
        const published = await this.activities.countPublishedContents(id);
        if (published === 0) {
          throw new UnprocessableEntityException(
            `Activity type ${activityType.code} requires at least one published content`,
          );
        }
      }

      data.activityTypeId = dto.activityTypeId;
    }

    if (dto.sequence !== undefined && dto.sequence !== existing.sequence) {
      await this.assertSequenceFree(existing.meetingId, dto.sequence, id);
      data.sequence = dto.sequence;
    }

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    if (dto.instructions !== undefined) {
      data.instructions = normalizeOptionalText(dto.instructions);
    }

    if (dto.required !== undefined) {
      data.required = dto.required;
    }

    const nextFrom =
      dto.availableFrom !== undefined
        ? parseOptionalInstant(dto.availableFrom, 'availableFrom')
        : existing.availableFrom;
    const nextUntil =
      dto.availableUntil !== undefined
        ? parseOptionalInstant(dto.availableUntil, 'availableUntil')
        : existing.availableUntil;

    if (dto.availableFrom !== undefined || dto.availableUntil !== undefined) {
      assertAvailabilityWindow(nextFrom, nextUntil);
      data.availableFrom = nextFrom;
      data.availableUntil = nextUntil;
    }

    let resolvedStatus = existing.status as LearningActivityStatusDto;
    if (dto.status !== undefined && dto.status !== existing.status) {
      resolvedStatus = this.assertTransition(existing.status, dto.status);
      data.status = resolvedStatus;
    }

    if (resolvedStatus === LearningActivityStatusDto.PUBLISHED) {
      const type = await this.resolveTypeContext(
        data.activityTypeId ?? existing.activityTypeId,
        requiresContent,
        activityTypeStatus,
      );
      await this.assertPublishable(
        id,
        type.requiresContent,
        type.status,
        meeting,
      );
    }

    const updated = await this.activities.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_ACTIVITY_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_ACTIVITY,
      resourceId: updated.id,
      before: activitySnapshot(existing),
      after: activitySnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  async changeStatus(
    id: string,
    dto: ChangeLearningActivityStatusDto,
  ): Promise<LearningActivityResponseDto> {
    const existing = await this.getOrThrow(id);

    if (dto.status === existing.status) {
      throw new BadRequestException(
        `Activity is already in status ${existing.status}`,
      );
    }

    const resolved = this.assertTransition(existing.status, dto.status);

    if (resolved === LearningActivityStatusDto.PUBLISHED) {
      const type = await this.resolveTypeContext(
        existing.activityTypeId,
        null,
        null,
      );
      const meeting = await this.ensureMeeting(existing.meetingId);
      await this.assertPublishable(
        id,
        type.requiresContent,
        type.status,
        meeting,
      );
    }

    const updated = await this.activities.update(id, { status: resolved });

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_ACTIVITY_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_ACTIVITY,
      resourceId: updated.id,
      metadata: {
        meetingId: updated.meetingId,
        from: existing.status,
        to: resolved,
        reason: dto.reason?.trim() || undefined,
      },
    });

    return toResponse(updated);
  }

  /**
   * The contract requires the complete set rather than a partial move list. A
   * partial move needs a displacement rule that is easy to get wrong and
   * produces duplicate sequences when two operators reorder concurrently;
   * stating the full final order makes the outcome unambiguous and lets the
   * service validate the request against stored state before writing anything.
   *
   * Archived activities participate like any other: they still hold a sequence,
   * so excluding them would leave the plan incomplete.
   */
  async reorder(
    dto: ReorderLearningActivitiesDto,
  ): Promise<ReorderLearningActivitiesResponseDto> {
    await this.ensureMeeting(dto.meetingId);

    const existing = await this.activities.listSequenceContexts(dto.meetingId);
    if (existing.length === 0) {
      throw new NotFoundException('Meeting has no activities to reorder');
    }

    const requested = new Set(dto.orderedActivityIds);
    if (requested.size !== dto.orderedActivityIds.length) {
      throw new BadRequestException(
        'orderedActivityIds must not contain duplicates',
      );
    }

    const stored = new Set(existing.map((activity) => activity.id));
    const unknown = dto.orderedActivityIds.filter((id) => !stored.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException(
        'orderedActivityIds contains an activity that does not belong to this meeting',
      );
    }

    if (dto.orderedActivityIds.length !== existing.length) {
      throw new BadRequestException(
        `orderedActivityIds must list all ${existing.length} activities of this meeting`,
      );
    }

    const before = existing
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((activity) => ({ id: activity.id, sequence: activity.sequence }));

    const reordered = await this.activities.applySequencePlan(
      dto.meetingId,
      dto.orderedActivityIds,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.LEARNING_ACTIVITY_REORDERED,
      resourceType: AUDIT_RESOURCE_TYPES.LEARNING_ACTIVITY,
      resourceId: dto.meetingId,
      metadata: {
        meetingId: dto.meetingId,
        before,
        after: dto.orderedActivityIds.map((id, index) => ({
          id,
          sequence: index + 1,
        })),
      },
    });

    return { data: reordered.map(toResponse), total: reordered.length };
  }

  private async getOrThrow(id: string): Promise<LearningActivityRecord> {
    const found = await this.activities.findById(id);
    if (!found) {
      throw new NotFoundException('Learning activity not found');
    }
    return found;
  }

  private async ensureMeeting(meetingId: string): Promise<MeetingContext> {
    const meeting = await this.activities.findMeetingContext(meetingId);
    if (!meeting) {
      throw new NotFoundException('Learning meeting not found');
    }
    return meeting;
  }

  private async ensureActivityType(activityTypeId: string) {
    const activityType =
      await this.activities.findActivityTypeContext(activityTypeId);
    if (!activityType) {
      throw new NotFoundException('Learning activity type not found');
    }
    if (activityType.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Learning activity type ${activityType.code} is not active`,
      );
    }
    return activityType;
  }

  private async resolveTypeContext(
    activityTypeId: string,
    requiresContent: boolean | null,
    status: string | null,
  ): Promise<{ requiresContent: boolean; status: string }> {
    if (requiresContent !== null && status !== null) {
      return { requiresContent, status };
    }
    const found = await this.activities.findActivityTypeContext(activityTypeId);
    if (!found) {
      throw new NotFoundException('Learning activity type not found');
    }
    return { requiresContent: found.requiresContent, status: found.status };
  }

  private async nextSequence(meetingId: string): Promise<number> {
    return (await this.activities.maxSequence(meetingId)) + 1;
  }

  /**
   * The `[meetingId, sequence]` index is the real guarantee; this check turns a
   * constraint violation into a readable 409.
   */
  private async assertSequenceFree(
    meetingId: string,
    sequence: number,
    excludeId?: string,
  ): Promise<void> {
    const holder = await this.activities.findBySequence(
      meetingId,
      sequence,
      excludeId,
    );
    if (holder) {
      throw new ConflictException(
        `Activity sequence ${sequence} is already used in this meeting`,
      );
    }
  }

  private assertTransition(
    from: string,
    to: LearningActivityStatusDto,
  ): LearningActivityStatusDto {
    if (!isAllowedActivityTransition(from as LearningActivityStatusDto, to)) {
      throw new UnprocessableEntityException(
        `Activity cannot move from ${from} to ${to}`,
      );
    }
    return to;
  }

  /**
   * Publish validation is deliberately data-driven: the rule comes from the
   * activity type row, not from a hardcoded list of codes. A meeting that is
   * still DRAFT cannot host published activities, because publishing content
   * inside an unpublished meeting would expose material the class cannot see.
   */
  private async assertPublishable(
    activityId: string,
    requiresContent: boolean,
    activityTypeStatus: string,
    meeting: MeetingContext,
  ): Promise<void> {
    if (activityTypeStatus !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Activity type is not active and cannot be published',
      );
    }

    if (meeting.status === 'ARCHIVED') {
      throw new UnprocessableEntityException(
        'Activity cannot be published inside an archived meeting',
      );
    }

    if (!requiresContent) {
      return;
    }

    const published = await this.activities.countPublishedContents(activityId);
    if (published === 0) {
      throw new UnprocessableEntityException(
        'Activity type requires at least one published content before publishing',
      );
    }
  }
}

export function toResponse(
  record: LearningActivityRecord,
): LearningActivityResponseDto {
  return {
    id: record.id,
    meetingId: record.meetingId,
    activityTypeId: record.activityTypeId,
    sequence: record.sequence,
    title: record.title,
    instructions: record.instructions,
    required: record.required,
    availableFrom: record.availableFrom
      ? record.availableFrom.toISOString()
      : null,
    availableUntil: record.availableUntil
      ? record.availableUntil.toISOString()
      : null,
    status: record.status as LearningActivityStatusDto,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function activitySnapshot(
  record: LearningActivityRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    meetingId: record.meetingId,
    activityTypeId: record.activityTypeId,
    sequence: record.sequence,
    title: record.title,
    required: record.required,
    status: record.status,
  };
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim() || null;
}

function parseOptionalInstant(
  value: string | null | undefined,
  field: string,
): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO-8601 instant`);
  }
  return parsed;
}

function assertAvailabilityWindow(from: Date | null, until: Date | null): void {
  if (from && until && until < from) {
    throw new BadRequestException(
      'availableUntil must be greater than or equal to availableFrom',
    );
  }
}

export type { ActivitySequenceContext };
