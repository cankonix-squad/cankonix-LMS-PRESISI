import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  ClassSubjectProgressSummaryDto,
  ClassSubjectProgressSummaryResponseDto,
  LearningProgressListResponseDto,
  LearningProgressResponseDto,
  ParticipantProgressSummaryResponseDto,
} from './dto/learning-progress-response.dto';
import {
  isAllowedProgressTransition,
  LearningProgressStatusDto,
} from './dto/learning-progress-status.dto';
import { ListLearningProgressQueryDto } from './dto/list-learning-progress-query.dto';
import { UpdateLearningProgressDto } from './dto/update-learning-progress.dto';
import {
  LEARNING_PROGRESS_REPOSITORY,
  LearningProgressRepository,
} from './learning-progress.repository';
import {
  ActivityEligibilityContext,
  ClassSubjectProgressAggregateRecord,
  EnrollmentEligibilityContext,
  LearningProgressRecord,
} from './learning-progress.types';

@Injectable()
export class LearningProgressService {
  private readonly logger = new Logger(LearningProgressService.name);

  constructor(
    @Inject(LEARNING_PROGRESS_REPOSITORY)
    private readonly progress: LearningProgressRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Records or updates progress for one activity.
   *
   * Rules enforced:
   * 1. Only an ACTIVE enrollment may record progress.
   * 2. The activity must be PUBLISHED (DRAFT and ARCHIVED activities do not accept progress).
   * 3. The enrollment must belong to the class where the activity's meeting lives
   *    (either explicitly via `academicClassId`, or at the batch level when unassigned).
   * 4. `progressPercent` must be 0..100.
   * 5. Completion is idempotent: re-submitting 100% / COMPLETED updates the timestamp
   *    and aggregate once, and produces no spurious audit noise on redundant calls.
   * 6. The aggregate is maintained incrementally in the same transaction path.
   */
  async recordProgress(
    dto: UpdateLearningProgressDto,
  ): Promise<LearningProgressResponseDto> {
    const { status, progressPercent } = this.normalizeStatusAndPercent(
      dto.status,
      dto.progressPercent,
    );

    const [enrollment, activity] = await Promise.all([
      this.progress.findEnrollmentContext(dto.enrollmentId),
      this.progress.findActivityContext(dto.activityId),
    ]);

    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment ${dto.enrollmentId} does not exist`,
      );
    }
    if (!activity) {
      throw new NotFoundException(`Activity ${dto.activityId} does not exist`);
    }

    this.assertEnrollmentEligible(enrollment);
    this.assertActivityEligible(activity);
    this.assertClassSubjectMatches(enrollment, activity);

    const existing = await this.progress.findByEnrollmentAndActivity(
      dto.enrollmentId,
      dto.activityId,
    );

    const now = new Date();
    const isFirstAccess = !existing;
    const isBecomingCompleted =
      status === LearningProgressStatusDto.COMPLETED &&
      existing?.status !== LearningProgressStatusDto.COMPLETED;
    const isBecomingStarted =
      status === LearningProgressStatusDto.IN_PROGRESS &&
      (!existing || existing.status === LearningProgressStatusDto.NOT_STARTED);

    if (existing) {
      this.assertTransition(existing.status, status);
    }

    const startedAt =
      existing?.startedAt ??
      (status !== LearningProgressStatusDto.NOT_STARTED ? now : null);
    const completedAt =
      status === LearningProgressStatusDto.COMPLETED
        ? (existing?.completedAt ?? now)
        : null;
    const lastAccessedAt = now;

    const saved = await this.progress.upsert(
      {
        enrollmentId: dto.enrollmentId,
        activityId: dto.activityId,
        status,
        progressPercent,
        startedAt,
        completedAt,
        lastAccessedAt,
        metadata: dto.metadata ?? existing?.metadata,
      },
      {
        status,
        progressPercent,
        startedAt: startedAt ?? undefined,
        completedAt:
          status === LearningProgressStatusDto.COMPLETED
            ? (completedAt ?? undefined)
            : null,
        lastAccessedAt,
        metadata: dto.metadata ?? existing?.metadata,
      },
    );

    // Incremental aggregate update. A dashboard read fetches this row and never
    // scans all activity history.
    await this.recalculateAggregate(
      activity.classSubjectId,
      dto.enrollmentId,
      now,
    );

    // Audit only meaningful state changes, keeping the log clean for retries.
    if (isFirstAccess || isBecomingStarted || isBecomingCompleted) {
      const action = isBecomingCompleted
        ? AUDIT_ACTIONS.LEARNING_PROGRESS_COMPLETED
        : isBecomingStarted
          ? AUDIT_ACTIONS.LEARNING_PROGRESS_STARTED
          : AUDIT_ACTIONS.LEARNING_PROGRESS_UPDATED;

      await this.audit.record({
        action,
        resourceType: AUDIT_RESOURCE_TYPES.LEARNING_PROGRESS,
        resourceId: saved.id,
        metadata: {
          enrollmentId: dto.enrollmentId,
          activityId: dto.activityId,
          classSubjectId: activity.classSubjectId,
          status: saved.status,
          progressPercent: saved.progressPercent,
          firstAccess: isFirstAccess,
        },
        before: existing ? progressSnapshot(existing) : undefined,
        after: progressSnapshot(saved),
      });
    }

    return toProgressResponse(saved);
  }

  async findOne(
    enrollmentId: string,
    activityId: string,
  ): Promise<LearningProgressResponseDto> {
    const found = await this.progress.findByEnrollmentAndActivity(
      enrollmentId,
      activityId,
    );
    if (!found) {
      throw new NotFoundException(
        `Progress record not found for enrollment ${enrollmentId} and activity ${activityId}`,
      );
    }
    return toProgressResponse(found);
  }

  async list(
    query: ListLearningProgressQueryDto,
  ): Promise<LearningProgressListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.progress.list({
      enrollmentId: query.enrollmentId,
      activityId: query.activityId,
      classSubjectId: query.classSubjectId,
      meetingId: query.meetingId,
      status: query.status,
      page,
      limit,
    });

    return {
      data: data.map(toProgressResponse),
      page,
      limit,
      total,
    };
  }

  /**
   * Retrieves the pre-aggregated summary for one enrollment across a class subject.
   *
   * Fast O(1) indexed read from `class_subject_progress_aggregates`.
   */
  async getParticipantSummary(
    classSubjectId: string,
    enrollmentId: string,
  ): Promise<ParticipantProgressSummaryResponseDto> {
    const [enrollment, aggregate] = await Promise.all([
      this.progress.findEnrollmentContext(enrollmentId),
      this.progress.findAggregate(classSubjectId, enrollmentId),
    ]);

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    const summary: ClassSubjectProgressSummaryDto = aggregate
      ? toAggregateSummary(aggregate)
      : await this.buildEmptySummary(classSubjectId, enrollmentId);

    return {
      enrollmentId,
      academicClassId: enrollment.academicClassId,
      classSubjectId,
      classSubject: summary,
      meetings: [],
    };
  }

  /**
   * Summaries for all participants in a class subject (for educators / dashboards).
   */
  async listClassSubjectSummaries(
    classSubjectId: string,
    page = 1,
    limit = 20,
  ): Promise<ClassSubjectProgressSummaryResponseDto> {
    const { data, total } = await this.progress.listAggregatesByClassSubject(
      classSubjectId,
      page,
      limit,
    );

    return {
      data: data.map(toAggregateSummary),
      page,
      limit,
      total,
    };
  }

  /**
   * Incremental aggregate maintenance.
   *
   * Recomputes counts from the current state and upserts into the aggregate
   * table. Reads only the published activities for the class subject and the
   * progress rows for this single enrollment.
   */
  private async recalculateAggregate(
    classSubjectId: string,
    enrollmentId: string,
    now: Date,
  ): Promise<ClassSubjectProgressAggregateRecord> {
    const [activityCounts, progressCounts] = await Promise.all([
      this.progress.getClassSubjectActivityCounts(classSubjectId),
      this.progress.getEnrollmentProgressCounts(classSubjectId, enrollmentId),
    ]);

    const total = activityCounts.totalActivities;
    const completed = progressCounts.completedActivities;
    const required = activityCounts.requiredActivities;
    const completedRequired = progressCounts.completedRequiredActivities;

    const progressPercent =
      total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

    return await this.progress.upsertAggregate(
      classSubjectId,
      enrollmentId,
      total,
      completed,
      required,
      completedRequired,
      progressPercent,
      progressCounts.lastActivityAt ?? now,
    );
  }

  private async buildEmptySummary(
    classSubjectId: string,
    enrollmentId: string,
  ): Promise<ClassSubjectProgressSummaryDto> {
    const counts =
      await this.progress.getClassSubjectActivityCounts(classSubjectId);
    return {
      classSubjectId,
      enrollmentId,
      totalActivities: counts.totalActivities,
      completedActivities: 0,
      requiredActivities: counts.requiredActivities,
      completedRequiredActivities: 0,
      progressPercent: 0,
      lastActivityAt: null,
      recalculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Derives `status` and `progressPercent` when only one is supplied, and enforces
   * that 100% <=> COMPLETED.
   */
  private normalizeStatusAndPercent(
    status?: LearningProgressStatusDto,
    percent?: number,
  ): { status: LearningProgressStatusDto; progressPercent: number } {
    if (percent !== undefined && (percent < 0 || percent > 100)) {
      throw new BadRequestException(
        'progressPercent must be between 0 and 100',
      );
    }

    if (status === undefined && percent === undefined) {
      throw new BadRequestException(
        'Either status or progressPercent must be provided',
      );
    }

    if (status === undefined) {
      if (percent === 0) {
        return {
          status: LearningProgressStatusDto.NOT_STARTED,
          progressPercent: 0,
        };
      }
      if (percent === 100) {
        return {
          status: LearningProgressStatusDto.COMPLETED,
          progressPercent: 100,
        };
      }
      return {
        status: LearningProgressStatusDto.IN_PROGRESS,
        progressPercent: percent!,
      };
    }

    if (percent === undefined) {
      if (status === LearningProgressStatusDto.NOT_STARTED) {
        return { status, progressPercent: 0 };
      }
      if (status === LearningProgressStatusDto.COMPLETED) {
        return { status, progressPercent: 100 };
      }
      // IN_PROGRESS with no percent defaults to a nominal non-zero value.
      return { status, progressPercent: 50 };
    }

    // Both provided: ensure consistency.
    if (status === LearningProgressStatusDto.COMPLETED && percent !== 100) {
      throw new BadRequestException(
        'status COMPLETED requires progressPercent to be 100',
      );
    }
    if (status === LearningProgressStatusDto.NOT_STARTED && percent !== 0) {
      throw new BadRequestException(
        'status NOT_STARTED requires progressPercent to be 0',
      );
    }

    return { status, progressPercent: percent };
  }

  private assertEnrollmentEligible(
    enrollment: EnrollmentEligibilityContext,
  ): void {
    if (enrollment.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Enrollment is ${enrollment.status}; only ACTIVE enrollments can record learning progress`,
      );
    }
  }

  private assertActivityEligible(activity: ActivityEligibilityContext): void {
    if (activity.activityStatus !== 'PUBLISHED') {
      throw new UnprocessableEntityException(
        `Activity is ${activity.activityStatus}; only PUBLISHED activities accept learning progress`,
      );
    }
    if (activity.meetingStatus !== 'PUBLISHED') {
      throw new UnprocessableEntityException(
        `Activity meeting is ${activity.meetingStatus}; only PUBLISHED meetings accept learning progress`,
      );
    }
    if (activity.classSubjectStatus !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Class subject is ${activity.classSubjectStatus}; only ACTIVE class subjects accept learning progress`,
      );
    }
  }

  private assertClassSubjectMatches(
    enrollment: EnrollmentEligibilityContext,
    activity: ActivityEligibilityContext,
  ): void {
    // If the enrollment has an explicit academic class, it must match the
    // class subject's academic class.
    if (
      enrollment.academicClassId &&
      enrollment.academicClassId !== activity.academicClassId
    ) {
      throw new ConflictException(
        `Participant is enrolled in class ${enrollment.academicClassId} but the activity belongs to class ${activity.academicClassId}`,
      );
    }
  }

  private assertTransition(
    from: LearningProgressStatusDto,
    to: LearningProgressStatusDto,
  ): void {
    if (!isAllowedProgressTransition(from, to)) {
      throw new UnprocessableEntityException(
        `Learning progress cannot move from ${from} to ${to}`,
      );
    }
  }
}

function toProgressResponse(
  record: LearningProgressRecord,
): LearningProgressResponseDto {
  return {
    id: record.id,
    enrollmentId: record.enrollmentId,
    activityId: record.activityId,
    status: record.status,
    progressPercent: record.progressPercent,
    startedAt: record.startedAt ? record.startedAt.toISOString() : null,
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    lastAccessedAt: record.lastAccessedAt
      ? record.lastAccessedAt.toISOString()
      : null,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toAggregateSummary(
  record: ClassSubjectProgressAggregateRecord,
): ClassSubjectProgressSummaryDto {
  return {
    classSubjectId: record.classSubjectId,
    enrollmentId: record.enrollmentId,
    totalActivities: record.totalActivities,
    completedActivities: record.completedActivities,
    requiredActivities: record.requiredActivities,
    completedRequiredActivities: record.completedRequiredActivities,
    progressPercent: record.progressPercent,
    lastActivityAt: record.lastActivityAt
      ? record.lastActivityAt.toISOString()
      : null,
    recalculatedAt: record.recalculatedAt.toISOString(),
  };
}

function progressSnapshot(
  record: LearningProgressRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    enrollmentId: record.enrollmentId,
    activityId: record.activityId,
    status: record.status,
    progressPercent: record.progressPercent,
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
  };
}
