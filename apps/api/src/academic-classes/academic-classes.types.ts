import { AcademicClassStatus } from './dto/academic-class-status.dto';

export interface AcademicClassRecord {
  id: string;
  educationBatchId: string;
  code: string;
  name: string;
  capacity: number | null;
  status: AcademicClassStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAcademicClassData {
  educationBatchId: string;
  code: string;
  name: string;
  capacity?: number | null;
  status?: AcademicClassStatus;
}

export interface UpdateAcademicClassData {
  code?: string;
  name?: string;
  capacity?: number | null;
  status?: AcademicClassStatus;
}

export interface FindAcademicClassesFilter {
  educationBatchId?: string;
  educationProgramId?: string;
  organizationId?: string;
  status?: AcademicClassStatus;
  search?: string;
  page?: number;
  limit?: number;
}
