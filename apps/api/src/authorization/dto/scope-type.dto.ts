export const ScopeTypeDto = {
  ORGANIZATION: 'ORGANIZATION',
  PROGRAM: 'PROGRAM',
  BATCH: 'BATCH',
  CLASS: 'CLASS',
  CLASS_SUBJECT: 'CLASS_SUBJECT',
} as const;

export type ScopeTypeDto = (typeof ScopeTypeDto)[keyof typeof ScopeTypeDto];

export const UserRoleAssignmentStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REVOKED: 'REVOKED',
} as const;

export type UserRoleAssignmentStatusDto =
  (typeof UserRoleAssignmentStatusDto)[keyof typeof UserRoleAssignmentStatusDto];
