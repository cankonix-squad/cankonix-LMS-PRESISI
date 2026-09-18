export const EnrollmentStatusDto = {
  ACTIVE: 'ACTIVE',
  WITHDRAWN: 'WITHDRAWN',
  COMPLETED: 'COMPLETED',
} as const;

export type EnrollmentStatusDto =
  (typeof EnrollmentStatusDto)[keyof typeof EnrollmentStatusDto];
