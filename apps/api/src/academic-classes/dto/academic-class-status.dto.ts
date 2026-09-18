export const AcademicClassStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AcademicClassStatus =
  (typeof AcademicClassStatus)[keyof typeof AcademicClassStatus];
