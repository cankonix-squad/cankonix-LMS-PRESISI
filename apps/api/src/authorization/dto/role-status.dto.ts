export const RoleStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type RoleStatusDto = (typeof RoleStatusDto)[keyof typeof RoleStatusDto];
