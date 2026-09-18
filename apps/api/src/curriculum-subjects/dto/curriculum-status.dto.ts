export const CurriculumStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type CurriculumStatusDto =
  (typeof CurriculumStatusDto)[keyof typeof CurriculumStatusDto];
