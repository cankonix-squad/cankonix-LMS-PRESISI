import {
  ScopeTypeDto,
  UserRoleAssignmentStatusDto,
} from './dto/scope-type.dto';

export type ScopeInput = {
  scopeType: ScopeTypeDto;
  scopeId: string;
};

export type ScopeRecord = {
  id: string;
  assignmentId: string;
  scopeType: ScopeTypeDto;
  scopeId: string;
  createdAt: Date;
};

export type RoleSummaryRecord = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  status: string;
};

export type UserRoleAssignmentRecord = {
  id: string;
  userAccountId: string;
  roleId: string;
  role?: RoleSummaryRecord;
  validFrom: Date;
  validUntil: Date | null;
  status: UserRoleAssignmentStatusDto;
  scopes?: ScopeRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type AssignmentCreateData = {
  userAccountId: string;
  roleId: string;
  validFrom?: Date;
  validUntil?: Date | null;
  status?: UserRoleAssignmentStatusDto;
};

export type AssignmentListFilter = {
  userAccountId?: string;
  roleId?: string;
  status?: UserRoleAssignmentStatusDto;
  page: number;
  limit: number;
};

export type AssignmentListResult = {
  data: UserRoleAssignmentRecord[];
  total: number;
};

export type EffectivePermissionScope = {
  scopeType: ScopeTypeDto;
  scopeId: string;
};

export type EffectivePermission = {
  code: string;
  isUnrestricted: boolean;
  scopes: EffectivePermissionScope[];
};

export type UserEffectivePermissions = {
  userAccountId: string;
  permissions: EffectivePermission[];
};

export type PermissionEvaluationContext = {
  userAccountId: string;
  permissionCode: string;
  scopeType?: ScopeTypeDto;
  scopeId?: string;
  atTime?: Date;
};
