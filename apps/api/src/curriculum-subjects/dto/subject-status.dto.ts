export const SubjectStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type SubjectStatusDto =
  (typeof SubjectStatusDto)[keyof typeof SubjectStatusDto];
