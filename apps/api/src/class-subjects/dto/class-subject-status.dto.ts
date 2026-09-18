export const ClassSubjectStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  COMPLETED: 'COMPLETED',
} as const;

export type ClassSubjectStatus =
  (typeof ClassSubjectStatus)[keyof typeof ClassSubjectStatus];
