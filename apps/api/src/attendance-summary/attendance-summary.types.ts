import type { AttendanceSummaryScopeType } from '@prisma/client';

export type { AttendanceSummaryScopeType };

/**
 * `AttendanceSummary` is a reporting read model (TASK-033).
 *
 * The raw `attendance_records` table is the system of record, but reporting and
 * executive paths must never scan it: they read a precalculated row from
 * `attendance_summaries` through the unique `(scopeType, scopeId)` key. Rows are
 * refreshed from the raw tables whenever attendance or a correction changes, and
 * on demand through the refresh endpoint.
 */
export interface AttendanceSummaryRecord {
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
}

export interface AttendanceSummaryCounts {
  totalSessions: number;
  /**
   * How many enrollments contributed to this scope. 1 for a personal summary;
   * the roster size for a group summary. Reporting needs it to turn aggregate
   * counts back into per-participant averages.
   */
  participants: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  sickCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export interface UpsertAttendanceSummaryInput extends AttendanceSummaryCounts {
  scopeType: AttendanceSummaryScopeType;
  scopeId: string;
  enrollmentId?: string | null;
  classSubjectId?: string | null;
  academicClassId?: string | null;
  educationBatchId?: string | null;
  academicProgramId?: string | null;
}

export interface AttendanceSummaryFilter {
  scopeType?: AttendanceSummaryScopeType;
  scopeId?: string;
  enrollmentId?: string;
  classSubjectId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  academicProgramId?: string;
  page?: number;
  limit?: number;
}

/**
 * Repository contract. Calculation methods read the raw tables; the service
 * owns the rule of which scopes get refreshed, so the SQL shape stays here and
 * the business policy stays in the service.
 */
export interface AttendanceSummaryRepository {
  findSummary(
    scopeType: AttendanceSummaryScopeType,
    scopeId: string,
  ): Promise<AttendanceSummaryRecord | null>;

  upsertSummary(
    input: UpsertAttendanceSummaryInput,
  ): Promise<AttendanceSummaryRecord>;

  listSummaries(
    filter: AttendanceSummaryFilter,
  ): Promise<{ data: AttendanceSummaryRecord[]; total: number }>;

  calculateEnrollmentSubjectCounts(
    enrollmentId: string,
    classSubjectId: string,
  ): Promise<AttendanceSummaryCounts>;

  calculateEnrollmentCounts(
    enrollmentId: string,
  ): Promise<AttendanceSummaryCounts>;

  calculateClassSubjectCounts(
    classSubjectId: string,
  ): Promise<AttendanceSummaryCounts>;

  calculateClassCounts(
    academicClassId: string,
  ): Promise<AttendanceSummaryCounts>;

  calculateBatchCounts(
    educationBatchId: string,
  ): Promise<AttendanceSummaryCounts>;

  calculateProgramCounts(
    educationProgramId: string,
  ): Promise<AttendanceSummaryCounts>;
}

export const ATTENDANCE_SUMMARY_REPOSITORY = Symbol(
  'ATTENDANCE_SUMMARY_REPOSITORY',
);
