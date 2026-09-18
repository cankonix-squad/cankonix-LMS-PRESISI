import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { AttendanceSummaryService } from '../attendance-summary/attendance-summary.service';
import {
  ATTENDANCE_CORRECTIONS_REPOSITORY,
  AttendanceCorrectionRecord,
  AttendanceCorrectionsRepository,
  CorrectionTargetRecord,
} from './attendance-corrections.types';
import { ApplyAttendanceCorrectionDto } from './dto/apply-attendance-correction.dto';
import { ListAttendanceCorrectionsQueryDto } from './dto/list-attendance-corrections-query.dto';
import {
  ApplyAttendanceCorrectionResponseDto,
  AttendanceCorrectionListResponseDto,
  AttendanceCorrectionResponseDto,
  AttendanceRecordAfterCorrectionDto,
} from './dto/attendance-correction-response.dto';

/**
 * The minimum identity a correction needs. Deliberately explicit rather than a
 * loose string: the self-correction rule compares the actor's *person* identity
 * with the participant behind the enrollment.
 */
export type CorrectionActor = {
  accountId: string;
  personId: string;
};

@Injectable()
export class AttendanceCorrectionsService {
  constructor(
    @Inject(ATTENDANCE_CORRECTIONS_REPOSITORY)
    private readonly repo: AttendanceCorrectionsRepository,
    private readonly audit: AuditService,
    private readonly summaries: AttendanceSummaryService,
  ) {}

  /**
   * Applies a correction to an existing attendance record.
   *
   * The original record is never deleted and the previous status is never lost:
   * an immutable `AttendanceCorrection` row is appended and the record's current
   * status is moved in the same transaction. This is the ONLY way a CLOSED
   * session's attendance may change — TASK-030 deliberately rejects direct edits
   * on closed sessions so that every change is explained by a correction.
   *
   * Denials are fail-closed and ordered so the cheapest, most security-relevant
   * check happens first:
   * 1. Missing actor identity -> 403 (an unattributed correction is not allowed).
   * 2. Participant correcting their own record -> 403 (segregation of duties).
   * 3. Record not found -> 404.
   * 4. Reason blank after trimming -> 400 (a correction without a reason is not auditable).
   * 5. Cancelled session -> 422.
   * 6. Same-status "correction" -> 409 (it would add noise, not history).
   */
  async applyCorrection(
    recordId: string,
    dto: ApplyAttendanceCorrectionDto,
    actor?: CorrectionActor,
  ): Promise<ApplyAttendanceCorrectionResponseDto> {
    if (!actor?.accountId || !actor?.personId) {
      throw new ForbiddenException(
        'Attendance correction requires an authenticated actor identity',
      );
    }

    const reason = (dto.reason ?? '').trim();
    if (reason.length === 0) {
      throw new BadRequestException('Correction reason is mandatory');
    }

    const record = await this.repo.findTargetRecord(recordId);
    if (!record) {
      throw new NotFoundException(`AttendanceRecord ${recordId} not found`);
    }

    if (record.enrollmentPersonId === actor.personId) {
      throw new ForbiddenException(
        'A participant may not correct their own attendance record',
      );
    }

    if (record.sessionStatus === 'CANCELLED') {
      throw new UnprocessableEntityException(
        'Attendance of a CANCELLED session cannot be corrected',
      );
    }

    if (record.status === dto.newStatus) {
      throw new ConflictException(
        `Attendance record already has status ${dto.newStatus}; a correction must change it`,
      );
    }

    let checkInAt: Date | undefined;
    if (dto.checkInAt) {
      checkInAt = new Date(dto.checkInAt);
      if (isNaN(checkInAt.getTime())) {
        throw new BadRequestException('Invalid date format for checkInAt');
      }
    }

    const { correction, record: updated } = await this.repo.applyCorrection({
      attendanceRecordId: recordId,
      previousStatus: record.status,
      newStatus: dto.newStatus,
      reason,
      actorUserId: actor.accountId,
      checkInAt,
      note: dto.note,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ATTENDANCE_CORRECTION_APPLIED,
      resourceType: 'attendance_correction',
      resourceId: correction.id,
      before: {
        status: record.status,
        checkInAt: record.checkInAt,
        note: record.note,
      },
      after: {
        status: updated.status,
        checkInAt: updated.checkInAt,
        note: updated.note,
      },
      metadata: {
        attendanceRecordId: recordId,
        sessionId: record.sessionId,
        reason,
      },
    });

    // A correction is exactly the case the summary exists for: the current
    // status changed while the session history did not, so the affected scopes
    // are recalculated from the raw records the moment the correction lands.
    await this.summaries.refreshForSession(record.sessionId);

    return {
      correction: this.toCorrectionResponse(correction),
      record: this.toRecordResponse(updated),
    };
  }

  /** Full correction history of one record, oldest first. */
  async listByRecord(
    recordId: string,
    query: ListAttendanceCorrectionsQueryDto,
  ): Promise<AttendanceCorrectionListResponseDto> {
    const record = await this.repo.findTargetRecord(recordId);
    if (!record) {
      throw new NotFoundException(`AttendanceRecord ${recordId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.repo.listByRecord(recordId, page, limit);

    return {
      data: data.map((row) => this.toCorrectionResponse(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async list(
    query: ListAttendanceCorrectionsQueryDto,
  ): Promise<AttendanceCorrectionListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.repo.list({
      recordId: query.recordId,
      sessionId: query.sessionId,
      requestedByUserId: query.requestedByUserId,
      status: query.status,
      page,
      limit,
    });

    return {
      data: data.map((row) => this.toCorrectionResponse(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getById(id: string): Promise<AttendanceCorrectionResponseDto> {
    const correction = await this.repo.findCorrectionById(id);
    if (!correction) {
      throw new NotFoundException(`AttendanceCorrection ${id} not found`);
    }
    return this.toCorrectionResponse(correction);
  }

  private toCorrectionResponse(
    c: AttendanceCorrectionRecord,
  ): AttendanceCorrectionResponseDto {
    return {
      id: c.id,
      attendanceRecordId: c.attendanceRecordId,
      previousStatus: c.previousStatus,
      newStatus: c.newStatus,
      reason: c.reason,
      requestedByUserId: c.requestedByUserId,
      approvedByUserId: c.approvedByUserId,
      approvedAt: c.approvedAt ? c.approvedAt.toISOString() : null,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    };
  }

  private toRecordResponse(
    r: CorrectionTargetRecord,
  ): AttendanceRecordAfterCorrectionDto {
    return {
      id: r.id,
      sessionId: r.sessionId,
      enrollmentId: r.enrollmentId,
      status: r.status,
      checkInAt: r.checkInAt ? r.checkInAt.toISOString() : null,
      note: r.note,
      recordedByUserId: r.recordedByUserId,
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
