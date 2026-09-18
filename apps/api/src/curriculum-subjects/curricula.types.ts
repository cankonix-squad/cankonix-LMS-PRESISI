import { CurriculumStatusDto } from './dto/curriculum-status.dto';

export type CurriculumRecord = {
  id: string;
  educationProgramId: string;
  version: string;
  name: string;
  effectiveFrom: Date | null;
  status: CurriculumStatusDto;
  createdAt: Date;
  updatedAt: Date;
};

export type CurriculumCreateData = {
  educationProgramId: string;
  version: string;
  name: string;
  effectiveFrom?: Date | null;
  status?: CurriculumStatusDto;
};

export type CurriculumUpdateData = Partial<CurriculumCreateData>;

export type CurriculumListFilter = {
  educationProgramId?: string;
  status?: CurriculumStatusDto;
  page: number;
  limit: number;
};

export type CurriculumListResult = {
  data: CurriculumRecord[];
  total: number;
};
