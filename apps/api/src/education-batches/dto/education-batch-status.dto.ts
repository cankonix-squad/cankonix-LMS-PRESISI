export const EducationBatchStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type EducationBatchStatusDto =
  (typeof EducationBatchStatusDto)[keyof typeof EducationBatchStatusDto];
