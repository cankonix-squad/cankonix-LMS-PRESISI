import { SubjectStatusDto } from './dto/subject-status.dto';

export type SubjectRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: SubjectStatusDto;
  createdAt: Date;
  updatedAt: Date;
};

export type SubjectCreateData = {
  code: string;
  name: string;
  description?: string | null;
  status?: SubjectStatusDto;
};

export type SubjectUpdateData = Partial<SubjectCreateData>;

export type SubjectListFilter = {
  search?: string;
  status?: SubjectStatusDto;
  page: number;
  limit: number;
};

export type SubjectListResult = {
  data: SubjectRecord[];
  total: number;
};
