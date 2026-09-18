export const EducationProgramStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type EducationProgramStatusDto =
  (typeof EducationProgramStatusDto)[keyof typeof EducationProgramStatusDto];
