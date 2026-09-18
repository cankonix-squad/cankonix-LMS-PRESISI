import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AttendanceRecordRow,
  AttendanceRepository,
  AttendanceSessionRecord,
  CreateAttendanceSessionData,
  UpdateAttendanceSessionData,
  UpsertAttendanceRecordData,
} from './attendance.types';
import type { AttendanceSessionStatus } from './dto/attendance-session-status.dto';
import type { AttendanceStatus } from './dto/attendance-status.dto';

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    data: CreateAttendanceSessionData,
  ): Promise<AttendanceSessionRecord> {
    return this.prisma.attendanceSession.create({
      data: {
        classSubjectId: data.classSubjectId,
        meetingId: data.meetingId ?? null,
        title: data.title ?? null,
        startAt: data.startAt,
        endAt: data.endAt,
        method: data.method ?? 'MANUAL',
        status: data.status ?? 'OPEN',
      },
    });
  }

  async findSessionById(
    id: string,
  ): Promise<
    (AttendanceSessionRecord & { records?: AttendanceRecordRow[] }) | null
  > {
    return this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        records: {
          include: {
            enrollment: {
              include: {
                person: {
                  select: { fullName: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async findSessions(query: {
    classSubjectId?: string;
    meetingId?: string;
    status?: AttendanceSessionStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: AttendanceSessionRecord[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceSessionWhereInput = {};
    if (query.classSubjectId) where.classSubjectId = query.classSubjectId;
    if (query.meetingId) where.meetingId = query.meetingId;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return { data, total };
  }

  async updateSession(
    id: string,
    data: UpdateAttendanceSessionData,
  ): Promise<AttendanceSessionRecord> {
    const updateData: Prisma.AttendanceSessionUncheckedUpdateInput = {};
    if (data.meetingId !== undefined) updateData.meetingId = data.meetingId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.startAt !== undefined) updateData.startAt = data.startAt;
    if (data.endAt !== undefined) updateData.endAt = data.endAt;
    if (data.method !== undefined) updateData.method = data.method;

    return this.prisma.attendanceSession.update({
      where: { id },
      data: updateData,
    });
  }

  async updateSessionStatus(
    id: string,
    status: AttendanceSessionStatus,
  ): Promise<AttendanceSessionRecord> {
    return this.prisma.attendanceSession.update({
      where: { id },
      data: { status },
    });
  }

  async upsertRecord(
    data: UpsertAttendanceRecordData,
  ): Promise<AttendanceRecordRow> {
    return this.prisma.attendanceRecord.upsert({
      where: {
        sessionId_enrollmentId: {
          sessionId: data.sessionId,
          enrollmentId: data.enrollmentId,
        },
      },
      create: {
        sessionId: data.sessionId,
        enrollmentId: data.enrollmentId,
        status: data.status,
        checkInAt: data.checkInAt ?? null,
        note: data.note ?? null,
        recordedByUserId: data.recordedByUserId ?? null,
      },
      update: {
        status: data.status,
        checkInAt: data.checkInAt !== undefined ? data.checkInAt : undefined,
        note: data.note !== undefined ? data.note : undefined,
        recordedByUserId: data.recordedByUserId ?? undefined,
      },
      include: {
        enrollment: {
          include: {
            person: {
              select: { fullName: true },
            },
          },
        },
      },
    });
  }

  async bulkUpsertRecords(
    records: UpsertAttendanceRecordData[],
  ): Promise<AttendanceRecordRow[]> {
    return this.prisma.$transaction(
      records.map((data) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            sessionId_enrollmentId: {
              sessionId: data.sessionId,
              enrollmentId: data.enrollmentId,
            },
          },
          create: {
            sessionId: data.sessionId,
            enrollmentId: data.enrollmentId,
            status: data.status,
            checkInAt: data.checkInAt ?? null,
            note: data.note ?? null,
            recordedByUserId: data.recordedByUserId ?? null,
          },
          update: {
            status: data.status,
            checkInAt:
              data.checkInAt !== undefined ? data.checkInAt : undefined,
            note: data.note !== undefined ? data.note : undefined,
            recordedByUserId: data.recordedByUserId ?? undefined,
          },
          include: {
            enrollment: {
              include: {
                person: {
                  select: { fullName: true },
                },
              },
            },
          },
        }),
      ),
    );
  }

  async findRecordById(id: string): Promise<AttendanceRecordRow | null> {
    return this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            person: {
              select: { fullName: true },
            },
          },
        },
      },
    });
  }

  async findRecordBySessionAndEnrollment(
    sessionId: string,
    enrollmentId: string,
  ): Promise<AttendanceRecordRow | null> {
    return this.prisma.attendanceRecord.findUnique({
      where: {
        sessionId_enrollmentId: {
          sessionId,
          enrollmentId,
        },
      },
      include: {
        enrollment: {
          include: {
            person: {
              select: { fullName: true },
            },
          },
        },
      },
    });
  }

  async findRecords(query: {
    sessionId?: string;
    enrollmentId?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: AttendanceRecordRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceRecordWhereInput = {};
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.enrollmentId) where.enrollmentId = query.enrollmentId;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enrollment: {
            include: {
              person: {
                select: { fullName: true },
              },
            },
          },
        },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return { data, total };
  }
}
