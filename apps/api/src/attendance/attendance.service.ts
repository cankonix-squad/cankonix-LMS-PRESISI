import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { AttendanceSummaryService } from '../attendance-summary/attendance-summary.service';
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepository,
  AttendanceRecordRow,
  AttendanceSessionRecord,
} from './attendance.types';
import {
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  UpdateAttendanceSessionStatusDto,
} from './dto/create-attendance-session.dto';
import {
  ListAttendanceRecordsQueryDto,
  ListAttendanceSessionsQueryDto,
} from './dto/list-attendance-query.dto';
import {
  AttendanceRecordListResponseDto,
  AttendanceRecordResponseDto,
  AttendanceSessionDetailResponseDto,
  AttendanceSessionListResponseDto,
  AttendanceSessionResponseDto,
} from './dto/attendance-response.dto';
import {
  BulkRecordAttendanceDto,
  RecordAttendanceDto,
} from './dto/record-attendance.dto';
import { ATTENDANCE_SESSION_STATUSES } from './dto/attendance-session-status.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repo: AttendanceRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly summaries: AttendanceSummaryService,
  ) {}

  /**
   * Creates an attendance session.
   * Enforces:
   * 1. ClassSubject must exist and be ACTIVE.
   * 2. If meetingId is supplied, it must exist, belong to the same ClassSubject, and not be ARCHIVED.
   * 3. endAt must be strictly greater than startAt.
   */
  async createSession(
    dto: CreateAttendanceSessionDto,
  ): Promise<AttendanceSessionResponseDto> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid date format for startAt or endAt');
    }

    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be strictly after startAt');
    }

    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: dto.classSubjectId },
    });
    if (!classSubject) {
      throw new NotFoundException(
        `ClassSubject ${dto.classSubjectId} not found`,
      );
    }
    if (classSubject.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `ClassSubject ${dto.classSubjectId} is not ACTIVE (status: ${classSubject.status})`,
      );
    }

    if (dto.meetingId) {
      const meeting = await this.prisma.learningMeeting.findUnique({
        where: { id: dto.meetingId },
      });
      if (!meeting) {
        throw new NotFoundException(
          `LearningMeeting ${dto.meetingId} not found`,
        );
      }
      if (meeting.classSubjectId !== dto.classSubjectId) {
        throw new ConflictException(
          `Meeting ${dto.meetingId} belongs to class subject ${meeting.classSubjectId}, not ${dto.classSubjectId}`,
        );
      }
      if (meeting.status === 'ARCHIVED') {
        throw new UnprocessableEntityException(
          'Cannot create attendance session for ARCHIVED meeting',
        );
      }
    }

    const session = await this.repo.createSession({
      classSubjectId: dto.classSubjectId,
      meetingId: dto.meetingId,
      title: dto.title,
      startAt,
      endAt,
      method: dto.method,
      status: dto.status,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ATTENDANCE_SESSION_CREATED,
      resourceType: 'attendance_session',
      resourceId: session.id,
      after: session,
    });

    return this.toSessionResponse(session);
  }

  async getSessionById(
    id: string,
  ): Promise<AttendanceSessionDetailResponseDto> {
    const session = await this.repo.findSessionById(id);
    if (!session) {
      throw new NotFoundException(`AttendanceSession ${id} not found`);
    }
    return {
      ...this.toSessionResponse(session),
      records: (session.records || []).map((r) => this.toRecordResponse(r)),
    };
  }

  async listSessions(
    query: ListAttendanceSessionsQueryDto,
  ): Promise<AttendanceSessionListResponseDto> {
    const { data, total } = await this.repo.findSessions(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      data: data.map((s) => this.toSessionResponse(s)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateSession(
    id: string,
    dto: UpdateAttendanceSessionDto,
  ): Promise<AttendanceSessionResponseDto> {
    const session = await this.repo.findSessionById(id);
    if (!session) {
      throw new NotFoundException(`AttendanceSession ${id} not found`);
    }

    if (
      session.status === ATTENDANCE_SESSION_STATUSES.CLOSED ||
      session.status === ATTENDANCE_SESSION_STATUSES.CANCELLED
    ) {
      throw new UnprocessableEntityException(
        `Cannot update an attendance session with status ${session.status}`,
      );
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : session.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : session.endAt;

    if (dto.startAt || dto.endAt) {
      if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      if (endAt <= startAt) {
        throw new BadRequestException('endAt must be strictly after startAt');
      }
    }

    if (dto.meetingId !== undefined && dto.meetingId !== null) {
      const meeting = await this.prisma.learningMeeting.findUnique({
        where: { id: dto.meetingId },
      });
      if (!meeting) {
        throw new NotFoundException(
          `LearningMeeting ${dto.meetingId} not found`,
        );
      }
      if (meeting.classSubjectId !== session.classSubjectId) {
        throw new ConflictException(
          `Meeting ${dto.meetingId} belongs to class subject ${meeting.classSubjectId}, not ${session.classSubjectId}`,
        );
      }
    }

    const updated = await this.repo.updateSession(id, {
      meetingId: dto.meetingId,
      title: dto.title,
      startAt: dto.startAt ? startAt : undefined,
      endAt: dto.endAt ? endAt : undefined,
      method: dto.method,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ATTENDANCE_SESSION_UPDATED,
      resourceType: 'attendance_session',
      resourceId: id,
      before: session,
      after: updated,
    });

    return this.toSessionResponse(updated);
  }

  async updateSessionStatus(
    id: string,
    dto: UpdateAttendanceSessionStatusDto,
  ): Promise<AttendanceSessionResponseDto> {
    const session = await this.repo.findSessionById(id);
    if (!session) {
      throw new NotFoundException(`AttendanceSession ${id} not found`);
    }

    if (session.status === dto.status) {
      return this.toSessionResponse(session);
    }

    const updated = await this.repo.updateSessionStatus(id, dto.status);

    await this.audit.record({
      action: AUDIT_ACTIONS.ATTENDANCE_SESSION_STATUS_CHANGED,
      resourceType: 'attendance_session',
      resourceId: id,
      before: { status: session.status },
      after: { status: updated.status },
    });

    // CLOSED is the eligibility boundary for summaries: a session entering or
    // leaving it changes every denominator that covers this class subject.
    if (
      session.status === ATTENDANCE_SESSION_STATUSES.CLOSED ||
      updated.status === ATTENDANCE_SESSION_STATUSES.CLOSED
    ) {
      await this.summaries.refreshForClassSubject(session.classSubjectId);
    }

    return this.toSessionResponse(updated);
  }

  /**
   * Records attendance for a single participant.
   * Enforces:
   * 1. Session must exist and be OPEN (cannot directly edit CLOSED/CANCELLED session records).
   * 2. Enrollment must exist and be ACTIVE.
   * 3. Enrollment's academicClassId must match the session's classSubject.academicClassId.
   */
  async recordAttendance(
    dto: RecordAttendanceDto,
    actorUserId?: string,
  ): Promise<AttendanceRecordResponseDto> {
    const session = await this.repo.findSessionById(dto.sessionId);
    if (!session) {
      throw new NotFoundException(
        `AttendanceSession ${dto.sessionId} not found`,
      );
    }

    if (session.status !== ATTENDANCE_SESSION_STATUSES.OPEN) {
      throw new UnprocessableEntityException(
        `Cannot record attendance for session with status ${session.status}. Closed or cancelled sessions cannot be edited directly.`,
      );
    }

    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: session.classSubjectId },
    });
    if (!classSubject) {
      throw new NotFoundException(
        `ClassSubject ${session.classSubjectId} not found`,
      );
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${dto.enrollmentId} not found`);
    }
    if (enrollment.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Enrollment ${dto.enrollmentId} is not ACTIVE (status: ${enrollment.status})`,
      );
    }
    if (
      enrollment.academicClassId &&
      enrollment.academicClassId !== classSubject.academicClassId
    ) {
      throw new ConflictException(
        `Enrollment class (${enrollment.academicClassId}) does not match session class (${classSubject.academicClassId})`,
      );
    }

    const checkInAt = dto.checkInAt ? new Date(dto.checkInAt) : undefined;
    if (checkInAt && isNaN(checkInAt.getTime())) {
      throw new BadRequestException('Invalid date format for checkInAt');
    }

    const before = await this.repo.findRecordBySessionAndEnrollment(
      dto.sessionId,
      dto.enrollmentId,
    );

    const record = await this.repo.upsertRecord({
      sessionId: dto.sessionId,
      enrollmentId: dto.enrollmentId,
      status: dto.status,
      checkInAt,
      note: dto.note,
      recordedByUserId: actorUserId,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ATTENDANCE_RECORDED,
      resourceType: 'attendance_record',
      resourceId: record.id,
      before: before ?? undefined,
      after: record,
    });

    await this.summaries.refreshForClassSubject(session.classSubjectId);

    return this.toRecordResponse(record);
  }

  /**
   * Bulk records attendance for multiple participants in a session.
   */
  async bulkRecordAttendance(
    sessionId: string,
    dto: BulkRecordAttendanceDto,
    actorUserId?: string,
  ): Promise<AttendanceRecordResponseDto[]> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException(`AttendanceSession ${sessionId} not found`);
    }

    if (session.status !== ATTENDANCE_SESSION_STATUSES.OPEN) {
      throw new UnprocessableEntityException(
        `Cannot record attendance for session with status ${session.status}. Closed or cancelled sessions cannot be edited directly.`,
      );
    }

    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: session.classSubjectId },
    });
    if (!classSubject) {
      throw new NotFoundException(
        `ClassSubject ${session.classSubjectId} not found`,
      );
    }

    const enrollmentIds = [...new Set(dto.records.map((r) => r.enrollmentId))];
    const enrollments = await this.prisma.enrollment.findMany({
      where: { id: { in: enrollmentIds } },
    });

    const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));

    for (const rec of dto.records) {
      const enr = enrollmentMap.get(rec.enrollmentId);
      if (!enr) {
        throw new NotFoundException(`Enrollment ${rec.enrollmentId} not found`);
      }
      if (enr.status !== 'ACTIVE') {
        throw new UnprocessableEntityException(
          `Enrollment ${rec.enrollmentId} is not ACTIVE (status: ${enr.status})`,
        );
      }
      if (
        enr.academicClassId &&
        enr.academicClassId !== classSubject.academicClassId
      ) {
        throw new ConflictException(
          `Enrollment class (${enr.academicClassId}) does not match session class (${classSubject.academicClassId})`,
        );
      }
    }

    const upsertData = dto.records.map((rec) => ({
      sessionId,
      enrollmentId: rec.enrollmentId,
      status: rec.status,
      checkInAt: rec.checkInAt ? new Date(rec.checkInAt) : undefined,
      note: rec.note,
      recordedByUserId: actorUserId,
    }));

    const records = await this.repo.bulkUpsertRecords(upsertData);

    await this.audit.record({
      action: AUDIT_ACTIONS.ATTENDANCE_BULK_RECORDED,
      resourceType: 'attendance_session',
      resourceId: sessionId,
      metadata: { count: records.length },
    });

    await this.summaries.refreshForClassSubject(session.classSubjectId);

    return records.map((r) => this.toRecordResponse(r));
  }

  async listRecords(
    query: ListAttendanceRecordsQueryDto,
  ): Promise<AttendanceRecordListResponseDto> {
    const { data, total } = await this.repo.findRecords(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    return {
      data: data.map((r) => this.toRecordResponse(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getRecordById(id: string): Promise<AttendanceRecordResponseDto> {
    const record = await this.repo.findRecordById(id);
    if (!record) {
      throw new NotFoundException(`AttendanceRecord ${id} not found`);
    }
    return this.toRecordResponse(record);
  }

  private toSessionResponse(
    s: AttendanceSessionRecord,
  ): AttendanceSessionResponseDto {
    return {
      id: s.id,
      classSubjectId: s.classSubjectId,
      meetingId: s.meetingId,
      title: s.title,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      method: s.method,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private toRecordResponse(
    r: AttendanceRecordRow,
  ): AttendanceRecordResponseDto {
    return {
      id: r.id,
      sessionId: r.sessionId,
      enrollmentId: r.enrollmentId,
      status: r.status,
      checkInAt: r.checkInAt ? r.checkInAt.toISOString() : null,
      note: r.note,
      recordedByUserId: r.recordedByUserId,
      participantName: r.enrollment?.person?.fullName ?? null,
      enrollmentNumber: r.enrollment?.enrollmentNumber ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
