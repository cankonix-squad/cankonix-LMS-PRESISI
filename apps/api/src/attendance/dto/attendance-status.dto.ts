export const ATTENDANCE_STATUSES = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  SICK: 'SICK',
  ABSENT: 'ABSENT',
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUSES)[keyof typeof ATTENDANCE_STATUSES];
