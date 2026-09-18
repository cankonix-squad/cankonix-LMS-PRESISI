import { LearningActivityTypeStatusDto } from './dto/learning-activity-type-status.dto';

export interface LearningActivityTypeRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requiresContent: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningActivityTypeCreateData {
  code: string;
  name: string;
  description: string | null;
  requiresContent: boolean;
  status: LearningActivityTypeStatusDto;
}

export interface LearningActivityTypeUpdateData {
  code?: string;
  name?: string;
  description?: string | null;
  requiresContent?: boolean;
  status?: LearningActivityTypeStatusDto;
}

export interface LearningActivityTypeListFilter {
  search?: string;
  status?: LearningActivityTypeStatusDto;
  page: number;
  limit: number;
}

export interface LearningActivityTypeListResult {
  data: LearningActivityTypeRecord[];
  total: number;
}
