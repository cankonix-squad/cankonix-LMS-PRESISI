export const OrganizationStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type OrganizationStatusDto =
  (typeof OrganizationStatusDto)[keyof typeof OrganizationStatusDto];
