import { EducatorTypeStatusDto } from './dto/educator-type-status.dto';

export type EducatorTypeRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: EducatorTypeStatusDto;
  createdAt: Date;
  updatedAt: Date;
};

export type EducatorTypeCreateData = {
  code: string;
  name: string;
  description?: string | null;
  status?: EducatorTypeStatusDto;
};

export type EducatorTypeUpdateData = Partial<
  Omit<EducatorTypeCreateData, 'code'>
> & { code?: string };

export type EducatorTypeListFilter = {
  search?: string;
  status?: EducatorTypeStatusDto;
  page: number;
  limit: number;
};

export type EducatorTypeListResult = {
  data: EducatorTypeRecord[];
  total: number;
};
