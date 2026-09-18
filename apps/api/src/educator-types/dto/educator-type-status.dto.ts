export const EducatorTypeStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type EducatorTypeStatusDto =
  (typeof EducatorTypeStatusDto)[keyof typeof EducatorTypeStatusDto];
