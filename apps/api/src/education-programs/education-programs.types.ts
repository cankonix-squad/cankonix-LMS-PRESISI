import { EducationProgramStatusDto } from './dto/education-program-status.dto';

export type EducationProgramRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  status: EducationProgramStatusDto;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type EducationProgramCreateData = {
  organizationId: string;
  code: string;
  name: string;
  description?: string | null;
  status?: EducationProgramStatusDto;
  metadata?: unknown;
};

export type EducationProgramUpdateData = Partial<EducationProgramCreateData>;

export type EducationProgramListFilter = {
  organizationId?: string;
  status?: EducationProgramStatusDto;
  search?: string;
  page: number;
  limit: number;
};

export type EducationProgramListResult = {
  data: EducationProgramRecord[];
  total: number;
};
