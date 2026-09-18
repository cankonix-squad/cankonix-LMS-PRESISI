import { Injectable } from '@nestjs/common';
import {
  AttendanceSessionStatus,
  AttendanceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AttendanceSummaryCounts,
  AttendanceSummaryFilter,
  AttendanceSummaryRecord,
  AttendanceSummaryRepository,
  AttendanceSummaryScopeType,
  UpsertAttendanceSummaryInput,
} from './attendance-summary.types';

/**
 * The denominator is NOT a free choice: a session only counts once it is
 * CLOSED. DRAFT/OPEN/CANCELLED sessions are excluded, so a summary is stable
 * while the roll is still being taken and corrections never shift the
 * denominator after the fact.
 */
const ELIGIBLE_SESSION_STATUS = AttendanceSessionStatus.CLOSED;

@Injectable()
export class PrismaAttendanceSummaryRepository implements AttendanceSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSummary(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
  ): Promise<AttendanceSummaryRecord | null> {
    const row = await this.prisma.attendanceSummary.findUnique({
      where: { scopeType_scopeId: { scopeType, scopeId } },
    });

    return row ? toRecord(row) : null;
  }

  async upsertSummary(
    input: UpsertAttendanceSummaryInput,
  ): Promise<AttendanceSummaryRecord> {
    const scope = { scopeType: input.scopeType, scopeId: input.scopeId };
    const scalars = {
      enrollmentId: input.enrollmentId ?? null,
      classSubjectId: input.classSubjectId ?? null,
      academicClassId: input.academicClassId ?? null,
      educationBatchId: input.educationBatchId ?? null,
      academicProgramId: input.academicProgramId ?? null,
      participants: input.participants,
      totalSessions: input.totalSessions,
      presentCount: input.presentCount,
      lateCount: input.lateCount,
      excusedCount: input.excusedCount,
      sickCount: input.sickCount,
      absentCount: input.absentCount,
      attendancePercentage: input.attendancePercentage,
      recalculatedAt: new Date(),
    };

    const row = await this.prisma.attendanceSummary.upsert({
      where: { scopeType_scopeId: scope },
      create: { ...scope, ...scalars },
      update: scalars,
    });

    return toRecord(row);
  }

  async listSummaries(
    filter: AttendanceSummaryFilter,
  ): Promise<{ data: AttendanceSummaryRecord[]; total: number }> {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;

    const where: Prisma.AttendanceSummaryWhereInput = {};
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.scopeId) where.scopeId = filter.scopeId;
    if (filter.enrollmentId) where.enrollmentId = filter.enrollmentId;
    if (filter.classSubjectId) where.classSubjectId = filter.classSubjectId;
    if (filter.academicClassId) where.academicClassId = filter.academicClassId;
    if (filter.educationBatchId)
      where.educationBatchId = filter.educationBatchId;
    if (filter.academicProgramId)
      where.academicProgramId = filter.academicProgramId;

    const [rows, total] = await Promise.all([
      this.prisma.attendanceSummary.findMany({
        where,
        orderBy: [{ recalculatedAt: 'desc' }, { scopeId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendanceSummary.count({ where }),
    ]);

    return { data: rows.map(toRecord), total };
  }

  /**
   * Closes the loop for a single enrollment inside one class subject. The
   * unrecorded closed sessions are counted as ABSENT, so
   * `present + late + excused + sick + absent === totalSessions` always holds.
   */
  async calculateEnrollmentSubjectCounts(
    enrollmentId: string,
    classSubjectId: string,
  ): Promise<AttendanceSummaryCounts> {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { classSubjectId, status: ELIGIBLE_SESSION_STATUS },
      select: { id: true },
    });

    if (sessions.length === 0) return emptyCounts();

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        enrollmentId,
        sessionId: { in: sessions.map((session) => session.id) },
      },
      select: { status: true },
    });

    return personalCounts(sessions.length, records);
  }

  /**
   * Every closed session across every class subject of the enrollment's class.
   * `academicClassId` is nullable, so an unplaced enrollment has no eligible
   * session and yields an empty summary rather than a fabricated one.
   */
  async calculateEnrollmentCounts(
    enrollmentId: string,
  ): Promise<AttendanceSummaryCounts> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { academicClassId: true },
    });

    if (!enrollment?.academicClassId) return emptyCounts();

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        classSubject: { academicClassId: enrollment.academicClassId },
        status: ELIGIBLE_SESSION_STATUS,
      },
      select: { id: true },
    });

    if (sessions.length === 0) return emptyCounts();

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        enrollmentId,
        sessionId: { in: sessions.map((session) => session.id) },
      },
      select: { status: true },
    });

    return personalCounts(sessions.length, records);
  }

  async calculateClassSubjectCounts(
    classSubjectId: string,
  ): Promise<AttendanceSummaryCounts> {
    return this.aggregateGroup({ classSubjectId });
  }

  async calculateClassCounts(
    academicClassId: string,
  ): Promise<AttendanceSummaryCounts> {
    return this.aggregateGroup({ classSubject: { academicClassId } });
  }

  async calculateBatchCounts(
    educationBatchId: string,
  ): Promise<AttendanceSummaryCounts> {
    return this.aggregateGroup({
      classSubject: { academicClass: { educationBatchId } },
    });
  }

  async calculateProgramCounts(
    educationProgramId: string,
  ): Promise<AttendanceSummaryCounts> {
    return this.aggregateGroup({
      classSubject: {
        academicClass: { educationBatch: { educationProgramId } },
      },
    });
  }

  /**
   * Group scopes are the exact SUM of the personal summaries they contain.
   *
   * Each participant's denominator is the number of closed sessions in their own
   * class, so `present + late + excused + sick + absent` equals
   * `totalSessions * participants`. Deriving the roll-up this way (instead of
   * dividing by the raw record count) means a class summary and the sum of its
   * students can never disagree, and unrecorded closed sessions stay visible as
   * absences at every level.
   *
   * This runs at REFRESH time, never on the read path: a reporting read is a
   * single lookup on `attendance_summaries`.
   */
  private async aggregateGroup(
    sessionWhere: Prisma.AttendanceSessionWhereInput,
  ): Promise<AttendanceSummaryCounts> {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { ...sessionWhere, status: ELIGIBLE_SESSION_STATUS },
      select: { id: true, classSubjectId: true },
    });

    if (sessions.length === 0) return emptyCounts();

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        id: { in: unique(sessions.map((session) => session.classSubjectId)) },
      },
      select: { id: true, academicClassId: true },
    });

    const classOfSubject = new Map(
      classSubjects.map((subject) => [subject.id, subject.academicClassId]),
    );

    // Closed sessions per class, because a participant's denominator is the
    // number of eligible sessions in their OWN class.
    const sessionsPerClass = new Map<string, number>();
    for (const session of sessions) {
      const classId = classOfSubject.get(session.classSubjectId);
      if (!classId) continue;
      sessionsPerClass.set(classId, (sessionsPerClass.get(classId) ?? 0) + 1);
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { academicClassId: { in: [...sessionsPerClass.keys()] } },
      select: { id: true, academicClassId: true },
    });

    if (enrollments.length === 0) return emptyCounts();

    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      select: { enrollmentId: true, status: true },
    });

    const statusesByEnrollment = new Map<
      string,
      Array<{ status: AttendanceStatus }>
    >();
    for (const record of records) {
      const bucket = statusesByEnrollment.get(record.enrollmentId);
      if (bucket) bucket.push({ status: record.status });
      else
        statusesByEnrollment.set(record.enrollmentId, [
          { status: record.status },
        ]);
    }

    const totals = emptyCounts();
    let opportunities = 0;

    for (const enrollment of enrollments) {
      const expected = enrollment.academicClassId
        ? (sessionsPerClass.get(enrollment.academicClassId) ?? 0)
        : 0;
      const personal = personalCounts(
        expected,
        statusesByEnrollment.get(enrollment.id) ?? [],
      );

      totals.presentCount += personal.presentCount;
      totals.lateCount += personal.lateCount;
      totals.excusedCount += personal.excusedCount;
      totals.sickCount += personal.sickCount;
      totals.absentCount += personal.absentCount;
      opportunities += personal.totalSessions;
    }

    totals.participants = enrollments.length;
    totals.totalSessions = sessions.length;
    totals.attendancePercentage = percentage(
      totals.presentCount + totals.lateCount,
      opportunities,
    );

    return totals;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function emptyCounts(): AttendanceSummaryCounts {
  return {
    totalSessions: 0,
    participants: 0,
    presentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    sickCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  };
}

/**
 * Personal tally: the denominator is the number of eligible sessions, not the
 * number of records. A closed session with no record is an absence.
 */
function personalCounts(
  totalSessions: number,
  records: Array<{ status: AttendanceStatus }>,
): AttendanceSummaryCounts {
  const tally = tallyByStatus(records);
  const unrecorded = Math.max(0, totalSessions - tally.recorded);

  return {
    totalSessions,
    participants: 1,
    presentCount: tally.present,
    lateCount: tally.late,
    excusedCount: tally.excused,
    sickCount: tally.sick,
    absentCount: tally.absent + unrecorded,
    attendancePercentage: percentage(tally.present + tally.late, totalSessions),
  };
}

function tallyByStatus(records: Array<{ status: AttendanceStatus }>) {
  const tally = {
    present: 0,
    late: 0,
    excused: 0,
    sick: 0,
    absent: 0,
    recorded: records.length,
  };

  for (const { status } of records) {
    switch (status) {
      case AttendanceStatus.PRESENT:
        tally.present += 1;
        break;
      case AttendanceStatus.LATE:
        tally.late += 1;
        break;
      case AttendanceStatus.EXCUSED:
        tally.excused += 1;
        break;
      case AttendanceStatus.SICK:
        tally.sick += 1;
        break;
      default:
        tally.absent += 1;
        break;
    }
  }

  return tally;
}

/** Percentage rounded to 2 decimals so fixtures stay exact and readable. */
function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function toRecord(row: {
  id: string;
  scopeType: AttendanceSummaryScopeType;
  scopeId: string;
  enrollmentId: string | null;
  classSubjectId: string | null;
  academicClassId: string | null;
  educationBatchId: string | null;
  academicProgramId: string | null;
  participants: number;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  sickCount: number;
  absentCount: number;
  attendancePercentage: number;
  recalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): AttendanceSummaryRecord {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    enrollmentId: row.enrollmentId,
    classSubjectId: row.classSubjectId,
    academicClassId: row.academicClassId,
    educationBatchId: row.educationBatchId,
    academicProgramId: row.academicProgramId,
    participants: row.participants,
    totalSessions: row.totalSessions,
    presentCount: row.presentCount,
    lateCount: row.lateCount,
    excusedCount: row.excusedCount,
    sickCount: row.sickCount,
    absentCount: row.absentCount,
    attendancePercentage: row.attendancePercentage,
    recalculatedAt: row.recalculatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
