import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplyCorrectionData,
  AttendanceCorrectionRecord,
  AttendanceCorrectionsRepository,
  CorrectionTargetRecord,
  ListCorrectionsFilter,
} from './attendance-corrections.types';

const RECORD_CONTEXT_INCLUDE = {
  session: { select: { status: true } },
  enrollment: { select: { personId: true } },
} satisfies Prisma.AttendanceRecordInclude;

type RecordWithContext = Prisma.AttendanceRecordGetPayload<{
  include: typeof RECORD_CONTEXT_INCLUDE;
}>;

@Injectable()
export class PrismaAttendanceCorrectionsRepository implements AttendanceCorrectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toTargetRecord(row: RecordWithContext): CorrectionTargetRecord {
    return {
      id: row.id,
      sessionId: row.sessionId,
      enrollmentId: row.enrollmentId,
      status: row.status,
      checkInAt: row.checkInAt,
      note: row.note,
      recordedByUserId: row.recordedByUserId,
      updatedAt: row.updatedAt,
      sessionStatus: row.session.status,
      enrollmentPersonId: row.enrollment.personId,
    };
  }

  async findTargetRecord(
    recordId: string,
  ): Promise<CorrectionTargetRecord | null> {
    const row = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: RECORD_CONTEXT_INCLUDE,
    });
    return row ? this.toTargetRecord(row) : null;
  }

  /**
   * Applies a correction atomically.
   *
   * The log row and the record update are one transaction: a correction cannot be
   * recorded without the record changing, and the record cannot change without a
   * traceable correction row explaining it.
   */
  async applyCorrection(data: ApplyCorrectionData): Promise<{
    correction: AttendanceCorrectionRecord;
    record: CorrectionTargetRecord;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const correction = await tx.attendanceCorrection.create({
        data: {
          attendanceRecordId: data.attendanceRecordId,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          reason: data.reason,
          requestedByUserId: data.actorUserId,
          approvedByUserId: data.actorUserId,
          approvedAt: new Date(),
          status: 'APPLIED',
        },
      });

      const updated = await tx.attendanceRecord.update({
        where: { id: data.attendanceRecordId },
        data: {
          status: data.newStatus,
          ...(data.checkInAt !== undefined
            ? { checkInAt: data.checkInAt }
            : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
        },
        include: RECORD_CONTEXT_INCLUDE,
      });

      return {
        correction,
        record: this.toTargetRecord(updated),
      };
    });
  }

  async findCorrectionById(
    id: string,
  ): Promise<AttendanceCorrectionRecord | null> {
    return this.prisma.attendanceCorrection.findUnique({ where: { id } });
  }

  async listByRecord(
    recordId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AttendanceCorrectionRecord[]; total: number }> {
    const where: Prisma.AttendanceCorrectionWhereInput = {
      attendanceRecordId: recordId,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceCorrection.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendanceCorrection.count({ where }),
    ]);
    return { data, total };
  }

  async list(
    filter: ListCorrectionsFilter,
  ): Promise<{ data: AttendanceCorrectionRecord[]; total: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const where: Prisma.AttendanceCorrectionWhereInput = {};
    if (filter.recordId) where.attendanceRecordId = filter.recordId;
    if (filter.sessionId) {
      where.attendanceRecord = { sessionId: filter.sessionId };
    }
    if (filter.requestedByUserId) {
      where.requestedByUserId = filter.requestedByUserId;
    }
    if (filter.status) where.status = filter.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceCorrection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendanceCorrection.count({ where }),
    ]);
    return { data, total };
  }
}
