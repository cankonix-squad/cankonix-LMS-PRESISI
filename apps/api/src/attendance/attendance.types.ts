import type { AttendanceMethod } from './dto/attendance-method.dto';
import type { AttendanceSessionStatus } from './dto/attendance-session-status.dto';
import type { AttendanceStatus } from './dto/attendance-status.dto';

export interface AttendanceSessionRecord {
  id: string;
  classSubjectId: string;
  meetingId: string | null;
  title: string | null;
  startAt: Date;
  endAt: Date;
  method: AttendanceMethod;
  status: AttendanceSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecordRow {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  checkInAt: Date | null;
  note: string | null;
  recordedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  enrollment?: {
    person?: {
      fullName: string;
    };
    enrollmentNumber?: string | null;
  };
}

export interface CreateAttendanceSessionData {
  classSubjectId: string;
  meetingId?: string | null;
  title?: string | null;
  startAt: Date;
  endAt: Date;
  method?: AttendanceMethod;
  status?: AttendanceSessionStatus;
}

export interface UpdateAttendanceSessionData {
  meetingId?: string | null;
  title?: string | null;
  startAt?: Date;
  endAt?: Date;
  method?: AttendanceMethod;
}

export interface UpsertAttendanceRecordData {
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  checkInAt?: Date | null;
  note?: string | null;
  recordedByUserId?: string | null;
}

export interface AttendanceRepository {
  createSession(
    data: CreateAttendanceSessionData,
  ): Promise<AttendanceSessionRecord>;
  findSessionById(
    id: string,
  ): Promise<
    (AttendanceSessionRecord & { records?: AttendanceRecordRow[] }) | null
  >;
  findSessions(query: {
    classSubjectId?: string;
    meetingId?: string;
    status?: AttendanceSessionStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: AttendanceSessionRecord[]; total: number }>;
  updateSession(
    id: string,
    data: UpdateAttendanceSessionData,
  ): Promise<AttendanceSessionRecord>;
  updateSessionStatus(
    id: string,
    status: AttendanceSessionStatus,
  ): Promise<AttendanceSessionRecord>;

  upsertRecord(data: UpsertAttendanceRecordData): Promise<AttendanceRecordRow>;
  bulkUpsertRecords(
    records: UpsertAttendanceRecordData[],
  ): Promise<AttendanceRecordRow[]>;
  findRecordById(id: string): Promise<AttendanceRecordRow | null>;
  findRecordBySessionAndEnrollment(
    sessionId: string,
    enrollmentId: string,
  ): Promise<AttendanceRecordRow | null>;
  findRecords(query: {
    sessionId?: string;
    enrollmentId?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: AttendanceRecordRow[]; total: number }>;
}

export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');
