import type {
  AttendanceCorrection,
  AttendanceMethod,
  AttendanceRecord,
  AttendanceSession,
  AttendanceSessionStatus,
  AttendanceStatus,
} from '@lms/api-client';

/**
 * Presentation helpers for the attendance surface.
 *
 * Deliberately free of business rules: they only choose a tone, a label, or a
 * sort order. Whether a session accepts writes, whether a correction is allowed,
 * and what the record's previous status was are all decided by the API.
 */
export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'LATE',
  'EXCUSED',
  'SICK',
  'ABSENT',
];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Hadir',
  LATE: 'Terlambat',
  EXCUSED: 'Izin',
  SICK: 'Sakit',
  ABSENT: 'Alpa',
};

export const ATTENDANCE_METHOD_LABELS: Record<AttendanceMethod, string> = {
  MANUAL: 'Manual',
  QR_CODE: 'QR Code',
  ONLINE: 'Online',
  INTEGRATION: 'Integrasi',
};

type Tone = 'slate' | 'green' | 'red' | 'blue' | 'amber';

export const ATTENDANCE_STATUS_TONES: Record<AttendanceStatus, Tone> = {
  PRESENT: 'green',
  LATE: 'amber',
  EXCUSED: 'blue',
  SICK: 'blue',
  ABSENT: 'red',
};

export const SESSION_STATUS_TONES: Record<AttendanceSessionStatus, Tone> = {
  DRAFT: 'slate',
  OPEN: 'green',
  CLOSED: 'blue',
  CANCELLED: 'red',
};

export const SESSION_STATUS_LABELS: Record<AttendanceSessionStatus, string> = {
  DRAFT: 'Draf',
  OPEN: 'Dibuka',
  CLOSED: 'Ditutup',
  CANCELLED: 'Dibatalkan',
};

export function isSessionEditable(status: AttendanceSessionStatus): boolean {
  return status === 'OPEN';
}

export type RosterRow = {
  record: AttendanceRecord | null;
  enrollmentId: string;
  participantName: string;
  enrollmentNumber: string | null;
  status: AttendanceStatus;
  corrected: boolean;
};

/**
 * Builds the roster rows for a session.
 *
 * A record row (already recorded) and a record-less enrollment both become a row,
 * so the educator can mark everybody — including a participant the API has never
 * seen attendance for.
 */
export function buildRosterRows(
  enrollments: { id: string; label: string; enrollmentNumber: string | null }[],
  records: AttendanceRecord[],
  correctionsByRecord: Record<string, AttendanceCorrection[]>,
): RosterRow[] {
  const byEnrollment = new Map(records.map((r) => [r.enrollmentId, r]));

  return enrollments.map((enrollment) => {
    const record = byEnrollment.get(enrollment.id) ?? null;
    const corrections = record ? (correctionsByRecord[record.id] ?? []) : [];
    return {
      record,
      enrollmentId: enrollment.id,
      participantName:
        record?.participantName ??
        enrollment.label ??
        `Peserta ${enrollment.id.slice(0, 8)}…`,
      enrollmentNumber:
        record?.enrollmentNumber ?? enrollment.enrollmentNumber ?? null,
      status: record?.status ?? 'ABSENT',
      corrected: corrections.length > 0,
    };
  });
}

/** Groups corrections by the attendance record they belong to. */
export function groupCorrections(
  corrections: AttendanceCorrection[],
): Record<string, AttendanceCorrection[]> {
  const grouped: Record<string, AttendanceCorrection[]> = {};
  for (const correction of corrections) {
    const bucket = grouped[correction.attendanceRecordId] ?? [];
    bucket.push(correction);
    grouped[correction.attendanceRecordId] = bucket;
  }
  for (const bucket of Object.values(grouped)) {
    bucket.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return grouped;
}

export function sortSessionsByStart(
  sessions: AttendanceSession[],
): AttendanceSession[] {
  return [...sessions].sort((a, b) => b.startAt.localeCompare(a.startAt));
}
