import { OrganizationStatusDto } from './dto/organization-status.dto';

export type OrganizationRecord = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  organizationType: string | null;
  status: OrganizationStatusDto;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationCreateData = {
  code: string;
  name: string;
  parentId?: string | null;
  organizationType?: string | null;
  status: OrganizationStatusDto;
  metadata?: unknown;
};

export type OrganizationUpdateData = Partial<OrganizationCreateData>;

export type OrganizationListFilter = {
  search?: string;
  status?: OrganizationStatusDto;
  parentId?: string;
  page: number;
  limit: number;
};

export type OrganizationListResult = {
  data: OrganizationRecord[];
  total: number;
};

export type OrganizationTreeNode = OrganizationRecord & {
  children: OrganizationTreeNode[];
};
