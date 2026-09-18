import { RoleStatusDto } from './dto/role-status.dto';

export type RoleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: RoleStatusDto;
  createdAt: Date;
  updatedAt: Date;
};

export type PermissionRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleCreateData = {
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  status: RoleStatusDto;
};

/**
 * `isSystem` is deliberately absent: reassigning system-role protection through
 * the API would defeat the protection itself.
 */
export type RoleUpdateData = Partial<
  Omit<RoleCreateData, 'isSystem' | 'code'>
> & { code?: string };

export type RoleListFilter = {
  search?: string;
  status?: RoleStatusDto;
  page: number;
  limit: number;
};

export type RoleListResult = {
  data: RoleRecord[];
  total: number;
};

export type PermissionCreateData = {
  code: string;
  name: string;
  description?: string | null;
};

export type PermissionListFilter = {
  search?: string;
  page: number;
  limit: number;
};

export type PermissionListResult = {
  data: PermissionRecord[];
  total: number;
};
