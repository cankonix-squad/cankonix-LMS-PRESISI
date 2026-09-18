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
  AssignmentListResponseDto,
  AssignmentResponseDto,
} from './dto/assignment-response.dto';
import {
  isAllowedAssignmentTransition,
  AssignmentLifecycleStatusDto,
} from './dto/assignment-status.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ListAssignmentsWithScopeQueryDto } from './dto/update-assignment-status.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import {
  AssignmentsRepository,
  ASSIGNMENTS_REPOSITORY,
} from './assignments.repository';
import { AssignmentRecord } from './assignment.types';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @Inject(ASSIGNMENTS_REPOSITORY)
    private readonly assignments: AssignmentsRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Creates an assignment for a learning activity.
   *
   * `activityId` is unique across assignments, so one activity owns exactly one
   * assignment. That keeps "which assignment does this activity mean" answerable
   * without a tie-breaker, and prevents two educators authoring competing
   * assignments on the same activity.
   */
  async create(dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const activity = await this.assignments.findActivityContext(dto.activityId);
    if (!activity) {
      throw new NotFoundException(
        `Learning activity ${dto.activityId} does not exist`,
      );
    }
    if (activity.activityStatus === 'ARCHIVED') {
      throw new UnprocessableEntityException(
        'Cannot create an assignment on an ARCHIVED activity',
      );
    }

    if (await this.assignments.findByActivityId(dto.activityId)) {
      throw new ConflictException('This activity already has an assignment');
    }

    const created = await this.assignments.create({
      activityId: dto.activityId,
      assessmentId: dto.assessmentId?.trim() || null,
      title: dto.title.trim(),
      instructions: dto.instructions?.trim() || null,
      dueAt: parseDate(dto.dueAt),
      maxScore: dto.maxScore ?? 100,
      attemptsAllowed: dto.attemptsAllowed ?? 1,
      status: AssignmentLifecycleStatusDto.DRAFT,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT,
      resourceId: created.id,
      metadata: {
        activityId: created.activityId,
        classSubjectId: activity.classSubjectId,
        maxScore: created.maxScore,
        attemptsAllowed: created.attemptsAllowed,
      },
      after: assignmentSnapshot(created),
    });

    return toAssignmentResponse(created);
  }

  async findOne(id: string): Promise<AssignmentResponseDto> {
    return toAssignmentResponse(await this.getOrThrow(id));
  }

  async list(
    query: ListAssignmentsWithScopeQueryDto,
  ): Promise<AssignmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.assignments.list({
      activityId: query.activityId,
      meetingId: query.meetingId,
      classSubjectId: query.classSubjectId,
      academicClassId: query.academicClassId,
      educationBatchId: query.educationBatchId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return { data: data.map(toAssignmentResponse), page, limit, total };
  }

  async update(
    id: string,
    dto: UpdateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === AssignmentLifecycleStatusDto.ARCHIVED) {
      throw new UnprocessableEntityException(
        'An ARCHIVED assignment cannot be modified',
      );
    }

    const data: Parameters<AssignmentsRepository['update']>[1] = {};

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.instructions !== undefined) {
      data.instructions = dto.instructions?.trim() || null;
    }
    if (dto.dueAt !== undefined) {
      data.dueAt = parseDate(dto.dueAt);
    }
    if (dto.assessmentId !== undefined) {
      data.assessmentId = dto.assessmentId?.trim() || null;
    }
    if (dto.maxScore !== undefined) {
      await this.assertMaxScoreNotBelowGrades(id, dto.maxScore);
      data.maxScore = dto.maxScore;
    }
    if (dto.attemptsAllowed !== undefined) {
      await this.assertAttemptsNotBelowUsed(id, dto.attemptsAllowed);
      data.attemptsAllowed = dto.attemptsAllowed;
    }

    const updated = await this.assignments.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT,
      resourceId: updated.id,
      metadata: { activityId: updated.activityId },
      before: assignmentSnapshot(existing),
      after: assignmentSnapshot(updated),
    });

    return toAssignmentResponse(updated);
  }

  async changeStatus(
    id: string,
    status: AssignmentLifecycleStatusDto,
  ): Promise<AssignmentResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === status) {
      // Same-status writes are a no-op: a retry must not look like a transition.
      return toAssignmentResponse(existing);
    }

    if (!isAllowedAssignmentTransition(existing.status, status)) {
      throw new UnprocessableEntityException(
        `Assignment cannot move from ${existing.status} to ${status}`,
      );
    }

    const updated = await this.assignments.update(id, { status });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT,
      resourceId: updated.id,
      metadata: { from: existing.status, to: updated.status },
      before: assignmentSnapshot(existing),
      after: assignmentSnapshot(updated),
    });

    return toAssignmentResponse(updated);
  }

  /** Confirms the person is an educator on the assignment's class subject. */
  async assertEducatorAuthority(
    assignmentId: string,
    personId: string,
  ): Promise<AssignmentRecord> {
    const assignment = await this.getOrThrow(assignmentId);
    const activity = await this.assignments.findActivityContext(
      assignment.activityId,
    );
    if (!activity) {
      throw new NotFoundException('Activity for this assignment is missing');
    }

    const authorized = await this.assignments.isEducatorForClassSubject(
      personId,
      activity.classSubjectId,
      new Date(),
    );
    if (!authorized) {
      // 403-equivalent: the caller is not an educator of this class subject.
      throw new UnprocessableEntityException(
        'Only an assigned educator of this class subject may grade or manage this assignment',
      );
    }

    return assignment;
  }

  /** Same as {@link assertEducatorAuthority}, reached from a submission id. */
  async assertEducatorAuthorityBySubmission(
    submissionId: string,
    personId: string,
  ): Promise<AssignmentRecord> {
    const submission = await this.assignments.findSubmissionById(submissionId);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return await this.assertEducatorAuthority(
      submission.assignmentId,
      personId,
    );
  }

  private async getOrThrow(id: string): Promise<AssignmentRecord> {
    const found = await this.assignments.findById(id);
    if (!found) {
      throw new NotFoundException('Assignment not found');
    }
    return found;
  }

  /** A ceiling below the highest existing score would silently invalidate grades. */
  private async assertMaxScoreNotBelowGrades(
    assignmentId: string,
    maxScore: number,
  ): Promise<void> {
    const submissions = await this.assignments.listSubmissions({
      assignmentId,
      page: 1,
      limit: 100,
    });

    for (const submission of submissions.data) {
      const grade = await this.assignments.findGrade(submission.id);
      if (grade && Number(grade.score) > maxScore) {
        throw new ConflictException(
          `maxScore ${maxScore} is below an existing grade of ${grade.score}`,
        );
      }
    }
  }

  private async assertAttemptsNotBelowUsed(
    assignmentId: string,
    attemptsAllowed: number,
  ): Promise<void> {
    const submissions = await this.assignments.listSubmissions({
      assignmentId,
      page: 1,
      limit: 1,
    });
    if (attemptsAllowed < submissions.total) {
      throw new ConflictException(
        `attemptsAllowed ${attemptsAllowed} is below the ${submissions.total} attempt(s) already recorded`,
      );
    }
  }
}

/** Parses an ISO string to a Date, treating empty input as "no deadline". */
export function parseDate(value: string | undefined | null): Date | null {
  if (value === undefined || value === null || value.trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date value: ${value}`);
  }
  return parsed;
}

export function toAssignmentResponse(
  record: AssignmentRecord,
): AssignmentResponseDto {
  return {
    id: record.id,
    activityId: record.activityId,
    assessmentId: record.assessmentId,
    title: record.title,
    instructions: record.instructions,
    dueAt: record.dueAt ? record.dueAt.toISOString() : null,
    maxScore: record.maxScore,
    attemptsAllowed: record.attemptsAllowed,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function assignmentSnapshot(
  record: AssignmentRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    activityId: record.activityId,
    title: record.title,
    dueAt: record.dueAt ? record.dueAt.toISOString() : null,
    maxScore: record.maxScore,
    attemptsAllowed: record.attemptsAllowed,
    status: record.status,
  };
}
