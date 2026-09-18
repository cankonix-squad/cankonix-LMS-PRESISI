export const PersonStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type PersonStatusDto =
  (typeof PersonStatusDto)[keyof typeof PersonStatusDto];
