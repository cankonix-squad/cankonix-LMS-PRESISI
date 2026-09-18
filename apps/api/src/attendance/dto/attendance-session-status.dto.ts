export const ATTENDANCE_SESSION_STATUSES = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type AttendanceSessionStatus =
  (typeof ATTENDANCE_SESSION_STATUSES)[keyof typeof ATTENDANCE_SESSION_STATUSES];
