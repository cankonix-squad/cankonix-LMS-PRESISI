import { PersonStatusDto } from './dto/person-status.dto';

export type PersonRecord = {
  id: string;
  personnelNumber: string;
  fullName: string;
  rank: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: PersonStatusDto;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonCreateData = {
  personnelNumber: string;
  fullName: string;
  rank?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  status: PersonStatusDto;
  metadata?: unknown;
};

export type PersonUpdateData = Partial<PersonCreateData>;

export type PersonListFilter = {
  search?: string;
  status?: PersonStatusDto;
  page: number;
  limit: number;
};

export type PersonListResult = {
  data: PersonRecord[];
  total: number;
};

export type PersonOrganizationRecord = {
  id: string;
  personId: string;
  organizationId: string;
  positionName: string | null;
  startDate: Date;
  endDate: Date | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonOrganizationCreateData = {
  personId: string;
  organizationId: string;
  positionName?: string | null;
  startDate: Date;
  endDate?: Date | null;
  isPrimary: boolean;
};
