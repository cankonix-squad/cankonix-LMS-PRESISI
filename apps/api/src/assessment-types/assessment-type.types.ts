import { AssessmentTypeStatusDto } from './dto/assessment-type-status.dto';

export interface AssessmentTypeRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentTypeCreateData {
  code: string;
  name: string;
  description: string | null;
  status: AssessmentTypeStatusDto;
}

export interface AssessmentTypeUpdateData {
  code?: string;
  name?: string;
  description?: string | null;
  status?: AssessmentTypeStatusDto;
}

export interface AssessmentTypeListFilter {
  search?: string;
  status?: AssessmentTypeStatusDto;
  page: number;
  limit: number;
}

export interface AssessmentTypeListResult {
  data: AssessmentTypeRecord[];
  total: number;
}
