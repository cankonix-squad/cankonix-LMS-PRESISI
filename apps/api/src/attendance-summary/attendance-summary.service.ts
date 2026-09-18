import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AttendanceSummaryScopeType } from '@prisma/client';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AttendanceSummaryCounts,
  AttendanceSummaryFilter,
  AttendanceSummaryRecord,
  AttendanceSummaryRepository,
} from './attendance-summary.types';
import { ATTENDANCE_SUMMARY_REPOSITORY } from './attendance-summary.types';
import {
  AttendanceSummaryListResponseDto,
  AttendanceSummaryResponseDto,
} from './dto/attendance-summary-response.dto';
import { QueryAttendanceSummaryDto } from './dto/query-attendance-summary.dto';

/**
 * Attendance summary application service (TASK-033).
 *
 * ### Why this exists
 *
 * `attendance_records` is a high-volume table: records multiply by participants
 * and sessions. Answering "what is this class's attendance percentage" by
 * scanning it puts an ever-growing cost on reporting and executive screens that
 * are opened far more often than attendance is taken. This service keeps a
 * precalculated row per reporting scope, so those reads are a single indexed
 * lookup on `attendance_summaries`.
 *
 * ### Read vs refresh
 *
 * `getSummary` is the read path and touches ONLY the summary table. The raw
 * tables are read exclusively inside `refresh*`, which runs when attendance
 * changes, when a correction is applied, or on explicit request — never while a
 * report is being served.
 *
 * ### Consistency rule
 *
 * The denominator is fixed by `PrismaAttendanceSummaryRepository`: only CLOSED
 * sessions are eligible. Applying a correction changes a count or a percentage,
 * but never the denominator, and an unrecorded closed session counts as ABSENT.
 * A summary is therefore always re-derivable from the raw tables, which is what
 * makes a refresh idempotent and safe to repeat.
 */
@Injectable()
export class AttendanceSummaryService {
  private readonly logger = new Logger(AttendanceSummaryService.name);

  constructor(
    @Inject(ATTENDANCE_SUMMARY_REPOSITORY)
    private readonly repo: AttendanceSummaryRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Fast read path for reporting.
   *
   * `recalculateIfMissing` defaults to true so a scope that has never been
   * refreshed still answers correctly instead of returning a hollow zero. That
   * fallback runs at most once per scope: the computed row is persisted, so the
   * next read is again a plain lookup.
   */
  async getSummary(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
    recalculateIfMissing = true,
  ): Promise<AttendanceSummaryResponseDto> {
    const existing = await this.repo.findSummary(scopeType, scopeId);
    if (existing) return toResponse(existing);
    if (!recalculateIfMissing) {
      throw new NotFoundException(
        `No ${scopeType} attendance summary for ${scopeId}`,
      );
    }

    return this.refresh(scopeType, scopeId, { audit: false });
  }

  /**
   * Convenience read for a participant. `classSubjectId` narrows the summary to
   * one subject; omit it for the enrollment-wide figure.
   */
  async getEnrollmentSummary(
    enrollmentId: string,
    classSubjectId?: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.getSummary(
      classSubjectId
        ? AttendanceSummaryScopeType.ENROLLMENT_SUBJECT
        : AttendanceSummaryScopeType.ENROLLMENT,
      classSubjectId ? scopeKeyOf(enrollmentId, classSubjectId) : enrollmentId,
    );
  }

  /**
   * Explicit refresh for the two-id personal scope. The API takes the ids
   * separately so callers never have to know how the composite key is encoded.
   */
  async refreshEnrollmentSubject(
    enrollmentId: string,
    classSubjectId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.refresh(
      AttendanceSummaryScopeType.ENROLLMENT_SUBJECT,
      scopeKeyOf(enrollmentId, classSubjectId),
    );
  }

  /**
   * Refreshes every summary a change to one class subject can affect.
   *
   * A single attendance write moves several reports at once: the participant's
   * personal row, the class subject's row, and the class, batch and program
   * roll-ups above it. Refreshing them together keeps a drill-down consistent
   * with the level it was opened from — a batch total can never disagree with
   * the classes inside it.
   *
   * Every step is non-fatal (`refreshQuietly`): the attendance record is the
   * system of record and these rows are derived, so a refresh failure must not
   * fail the attendance write. The refresh endpoint can always rebuild them.
   */
  async refreshForClassSubject(classSubjectId: string): Promise<void> {
    const chain = await this.resolveClassSubjectChain(classSubjectId);
    if (!chain) return;

    await this.refreshPersonalRows(chain.academicClassId, classSubjectId);

    await this.refreshQuietly(
      AttendanceSummaryScopeType.CLASS_SUBJECT,
      classSubjectId,
    );
    await this.refreshQuietly(
      AttendanceSummaryScopeType.CLASS,
      chain.academicClassId,
    );
    await this.refreshQuietly(
      AttendanceSummaryScopeType.BATCH,
      chain.educationBatchId,
    );
    await this.refreshQuietly(
      AttendanceSummaryScopeType.PROGRAM,
      chain.academicProgramId,
    );
  }

  /**
   * Resolves the class subject a session belongs to and refreshes from there.
   * Correction and attendance services only know the session, so this keeps the
   * class-subject lookup on the summary side instead of leaking it to callers.
   */
  async refreshForSession(sessionId: string): Promise<void> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: { classSubjectId: true },
    });

    if (!session) return;

    await this.refreshForClassSubject(session.classSubjectId);
  }

  private async refreshPersonalRows(
    academicClassId: string,
    classSubjectId: string,
  ): Promise<void> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { academicClassId },
      select: { id: true },
    });

    for (const enrollment of enrollments) {
      await this.refreshQuietly(
        AttendanceSummaryScopeType.ENROLLMENT_SUBJECT,
        scopeKeyOf(enrollment.id, classSubjectId),
      );
      await this.refreshQuietly(
        AttendanceSummaryScopeType.ENROLLMENT,
        enrollment.id,
      );
    }
  }

  private async resolveClassSubjectChain(classSubjectId: string): Promise<{
    academicClassId: string;
    educationBatchId: string;
    academicProgramId: string;
  } | null> {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      select: { academicClassId: true },
    });
    if (!classSubject) return null;

    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id: classSubject.academicClassId },
      select: { educationBatchId: true },
    });
    if (!academicClass) return null;

    const batch = await this.prisma.educationBatch.findUnique({
      where: { id: academicClass.educationBatchId },
      select: { educationProgramId: true },
    });
    if (!batch) return null;

    return {
      academicClassId: classSubject.academicClassId,
      educationBatchId: academicClass.educationBatchId,
      academicProgramId: batch.educationProgramId,
    };
  }

  async listSummaries(
    query: QueryAttendanceSummaryDto,
  ): Promise<AttendanceSummaryListResponseDto> {
    const filter: AttendanceSummaryFilter = {
      scopeType: query.scopeType,
      scopeId: query.scopeId,
      enrollmentId: query.enrollmentId,
      classSubjectId: query.classSubjectId,
      academicClassId: query.academicClassId,
      educationBatchId: query.educationBatchId,
      academicProgramId: query.academicProgramId,
      page: query.page,
      limit: query.limit,
    };

    const { data, total } = await this.repo.listSummaries(filter);

    return {
      data: data.map(toResponse),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    };
  }

  /**
   * Explicit refresh. This is the only path a caller can trigger a raw
   * recalculation through, and it re-derives the row from the raw tables before
   * writing — so calling it twice yields the same numbers.
   */
  async refresh(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
    options: { audit?: boolean } = { audit: true },
  ): Promise<AttendanceSummaryResponseDto> {
    const [counts, scope] = await Promise.all([
      this.calculate(scopeType, scopeId),
      this.resolveScope(scopeType, scopeId),
    ]);

    const saved = await this.repo.upsertSummary({
      scopeType,
      scopeId,
      ...scope,
      ...counts,
    });

    if (options.audit !== false) {
      await this.audit.record({
        action: AUDIT_ACTIONS.ATTENDANCE_SUMMARY_REFRESHED,
        resourceType: 'attendance_summary',
        resourceId: saved.id,
        after: {
          scopeType,
          scopeId,
          totalSessions: saved.totalSessions,
          participants: saved.participants,
          attendancePercentage: saved.attendancePercentage,
        },
      });
    }

    return toResponse(saved);
  }

  /**
   * Bound to attendance mutations and corrections so a report never shows a
   * stale figure after the data underneath it changed.
   *
   * A failure here must not fail the attendance write that triggered it: the
   * attendance record is the system of record and the summary is a derived
   * cache, so the error is logged and the caller can always re-run the refresh
   * endpoint. `refresh` itself stays fail-fast for explicit callers.
   */
  async refreshQuietly(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
  ): Promise<void> {
    try {
      await this.refresh(scopeType, scopeId, { audit: false });
    } catch (error) {
      this.logger.warn(
        `Attendance summary refresh failed for ${scopeType}:${scopeId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async calculate(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
  ): Promise<AttendanceSummaryCounts> {
    switch (scopeType) {
      case AttendanceSummaryScopeType.ENROLLMENT:
        return this.repo.calculateEnrollmentCounts(scopeId);

      case AttendanceSummaryScopeType.ENROLLMENT_SUBJECT: {
        const { enrollmentId, classSubjectId } = parseScopeKey(scopeId);
        return this.repo.calculateEnrollmentSubjectCounts(
          enrollmentId,
          classSubjectId,
        );
      }

      case AttendanceSummaryScopeType.CLASS_SUBJECT:
        return this.repo.calculateClassSubjectCounts(scopeId);

      case AttendanceSummaryScopeType.CLASS:
        return this.repo.calculateClassCounts(scopeId);

      case AttendanceSummaryScopeType.BATCH:
        return this.repo.calculateBatchCounts(scopeId);

      case AttendanceSummaryScopeType.PROGRAM:
        return this.repo.calculateProgramCounts(scopeId);

      default:
        // Exhaustive by construction: adding a scope type without a case here
        // is a compile error, not a silently missing report.
        return assertNever(scopeType);
    }
  }

  /**
   * Fills the denormalized parent columns. They exist so a report can filter by
   * class, batch or program without joining back through the class-subject
   * tables on every query.
   */
  private async resolveScope(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
  ): Promise<{
    enrollmentId: string | null;
    classSubjectId: string | null;
    academicClassId: string | null;
    educationBatchId: string | null;
    academicProgramId: string | null;
  }> {
    const empty = {
      enrollmentId: null,
      classSubjectId: null,
      academicClassId: null,
      educationBatchId: null,
      academicProgramId: null,
    };

    switch (scopeType) {
      case AttendanceSummaryScopeType.ENROLLMENT: {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: { id: scopeId },
          select: { id: true, academicClassId: true },
        });
        if (!enrollment) {
          throw new NotFoundException(`Enrollment ${scopeId} not found`);
        }

        const classChain = enrollment.academicClassId
          ? await this.resolveClassChain(enrollment.academicClassId)
          : empty;

        return { ...empty, enrollmentId: enrollment.id, ...classChain };
      }

      case AttendanceSummaryScopeType.ENROLLMENT_SUBJECT: {
        const { enrollmentId, classSubjectId } = parseScopeKey(scopeId);
        const [enrollment, classSubject] = await Promise.all([
          this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            select: { id: true },
          }),
          this.prisma.classSubject.findUnique({
            where: { id: classSubjectId },
            select: { id: true, academicClassId: true },
          }),
        ]);

        if (!enrollment) {
          throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
        }
        if (!classSubject) {
          throw new NotFoundException(
            `Class subject ${classSubjectId} not found`,
          );
        }

        return {
          ...empty,
          enrollmentId: enrollment.id,
          classSubjectId: classSubject.id,
          ...(await this.resolveClassChain(classSubject.academicClassId)),
        };
      }

      case AttendanceSummaryScopeType.CLASS_SUBJECT: {
        const classSubject = await this.prisma.classSubject.findUnique({
          where: { id: scopeId },
          select: { id: true, academicClassId: true },
        });
        if (!classSubject) {
          throw new NotFoundException(`Class subject ${scopeId} not found`);
        }

        return {
          ...empty,
          classSubjectId: classSubject.id,
          ...(await this.resolveClassChain(classSubject.academicClassId)),
        };
      }

      case AttendanceSummaryScopeType.CLASS:
        await this.requireAcademicClass(scopeId);
        return {
          ...empty,
          ...(await this.resolveClassChain(scopeId)),
        };

      case AttendanceSummaryScopeType.BATCH: {
        const batch = await this.prisma.educationBatch.findUnique({
          where: { id: scopeId },
          select: { id: true, educationProgramId: true },
        });
        if (!batch) {
          throw new NotFoundException(`Education batch ${scopeId} not found`);
        }

        return {
          ...empty,
          educationBatchId: batch.id,
          academicProgramId: batch.educationProgramId,
        };
      }

      case AttendanceSummaryScopeType.PROGRAM:
        await this.requireEducationProgram(scopeId);
        return { ...empty, academicProgramId: scopeId };

      default:
        return assertNever(scopeType);
    }
  }

  private async resolveClassChain(academicClassId: string): Promise<{
    academicClassId: string | null;
    educationBatchId: string | null;
    academicProgramId: string | null;
  }> {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id: academicClassId },
      select: { id: true, educationBatchId: true },
    });

    if (!academicClass) {
      return {
        academicClassId: null,
        educationBatchId: null,
        academicProgramId: null,
      };
    }

    const batch = await this.prisma.educationBatch.findUnique({
      where: { id: academicClass.educationBatchId },
      select: { id: true, educationProgramId: true },
    });

    return {
      academicClassId: academicClass.id,
      educationBatchId: batch?.id ?? null,
      academicProgramId: batch?.educationProgramId ?? null,
    };
  }

  private async requireAcademicClass(id: string): Promise<void> {
    const found = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException(`Academic class ${id} not found`);
    }
  }

  private async requireEducationProgram(id: string): Promise<void> {
    const found = await this.prisma.educationProgram.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException(`Education program ${id} not found`);
    }
  }
}

/**
 * Personal scopes are keyed by two ids, but the summary table has a single
 * `scopeId` column. The composite key is a storage detail of this one scope
 * type, so the encoding lives next to its only writers and readers instead of
 * leaking a format into the controller.
 */
export function scopeKeyOf(
  enrollmentId: string,
  classSubjectId: string,
): string {
  return `${enrollmentId}:${classSubjectId}`;
}

function parseScopeKey(scopeId: string): {
  enrollmentId: string;
  classSubjectId: string;
} {
  const separator = scopeId.indexOf(':');
  if (separator <= 0 || separator === scopeId.length - 1) {
    throw new NotFoundException(
      `Invalid ENROLLMENT_SUBJECT scope id: ${scopeId}`,
    );
  }

  return {
    enrollmentId: scopeId.slice(0, separator),
    classSubjectId: scopeId.slice(separator + 1),
  };
}

function assertNever(value: never): never {
  throw new NotFoundException(`Unsupported attendance summary scope: ${value}`);
}

function toResponse(
  record: AttendanceSummaryRecord,
): AttendanceSummaryResponseDto {
  return {
    id: record.id,
    scopeType: record.scopeType,
    scopeId: record.scopeId,
    enrollmentId: record.enrollmentId,
    classSubjectId: record.classSubjectId,
    academicClassId: record.academicClassId,
    educationBatchId: record.educationBatchId,
    academicProgramId: record.academicProgramId,
    totalSessions: record.totalSessions,
    participants: record.participants,
    presentCount: record.presentCount,
    lateCount: record.lateCount,
    excusedCount: record.excusedCount,
    sickCount: record.sickCount,
    absentCount: record.absentCount,
    attendancePercentage: record.attendancePercentage,
    recalculatedAt: record.recalculatedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
