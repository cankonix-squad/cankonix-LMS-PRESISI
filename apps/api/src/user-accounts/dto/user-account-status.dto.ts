export const UserAccountStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type UserAccountStatusDto =
  (typeof UserAccountStatusDto)[keyof typeof UserAccountStatusDto];
