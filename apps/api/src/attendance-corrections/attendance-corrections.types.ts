import type { AttendanceStatus } from '../attendance/dto/attendance-status.dto';
import type { AttendanceCorrectionStatus } from './dto/attendance-correction-status.dto';

/** The attendance record as far as a correction needs to see it. */
export interface CorrectionTargetRecord {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  checkInAt: Date | null;
  note: string | null;
  recordedByUserId: string | null;
  updatedAt: Date;
  /** Status of the owning session (a CANCELLED session is not correctable). */
  sessionStatus: string;
  /** Person behind the enrollment — used for the self-correction denial. */
  enrollmentPersonId: string;
}

export interface AttendanceCorrectionRecord {
  id: string;
  attendanceRecordId: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  requestedByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  status: AttendanceCorrectionStatus;
  createdAt: Date;
}

export interface ApplyCorrectionData {
  attendanceRecordId: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  actorUserId: string;
  checkInAt?: Date | null;
  note?: string | null;
}

export interface ListCorrectionsFilter {
  recordId?: string;
  sessionId?: string;
  requestedByUserId?: string;
  status?: AttendanceCorrectionStatus;
  page?: number;
  limit?: number;
}

export interface AttendanceCorrectionsRepository {
  findTargetRecord(recordId: string): Promise<CorrectionTargetRecord | null>;
  /** Creates the immutable log row and updates the record in ONE transaction. */
  applyCorrection(data: ApplyCorrectionData): Promise<{
    correction: AttendanceCorrectionRecord;
    record: CorrectionTargetRecord;
  }>;
  findCorrectionById(id: string): Promise<AttendanceCorrectionRecord | null>;
  listByRecord(
    recordId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AttendanceCorrectionRecord[]; total: number }>;
  list(
    filter: ListCorrectionsFilter,
  ): Promise<{ data: AttendanceCorrectionRecord[]; total: number }>;
}

export const ATTENDANCE_CORRECTIONS_REPOSITORY = Symbol(
  'ATTENDANCE_CORRECTIONS_REPOSITORY',
);
