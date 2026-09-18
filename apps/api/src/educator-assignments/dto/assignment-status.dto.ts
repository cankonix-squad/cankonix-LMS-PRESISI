export const AssignmentStatusDto = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED',
} as const;

export type AssignmentStatusDto =
  (typeof AssignmentStatusDto)[keyof typeof AssignmentStatusDto];
