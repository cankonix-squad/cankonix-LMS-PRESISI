import { EducationBatchStatusDto } from './dto/education-batch-status.dto';

export type EducationBatchRecord = {
  id: string;
  educationProgramId: string;
  curriculumId: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: EducationBatchStatusDto;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EducationBatchCreateData = {
  educationProgramId: string;
  curriculumId: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status?: EducationBatchStatusDto;
  capacity?: number | null;
};

export type EducationBatchUpdateData = Partial<EducationBatchCreateData>;

export type EducationBatchListFilter = {
  educationProgramId?: string;
  curriculumId?: string;
  status?: EducationBatchStatusDto;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
};

export type EducationBatchListResult = {
  data: EducationBatchRecord[];
  total: number;
};
