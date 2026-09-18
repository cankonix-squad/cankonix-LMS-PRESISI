export const ATTENDANCE_METHODS = {
  MANUAL: 'MANUAL',
  QR_CODE: 'QR_CODE',
  ONLINE: 'ONLINE',
  INTEGRATION: 'INTEGRATION',
} as const;

export type AttendanceMethod =
  (typeof ATTENDANCE_METHODS)[keyof typeof ATTENDANCE_METHODS];
