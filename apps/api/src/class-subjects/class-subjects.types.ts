import { ClassSubjectStatus } from './dto/class-subject-status.dto';

export type ClassSubjectRecord = {
  id: string;
  academicClassId: string;
  curriculumSubjectId: string;
  code: string | null;
  displayName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: ClassSubjectStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassSubjectCreateData = {
  academicClassId: string;
  curriculumSubjectId: string;
  code?: string | null;
  displayName?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: ClassSubjectStatus;
};

export type ClassSubjectUpdateData = Partial<
  Omit<ClassSubjectCreateData, 'academicClassId' | 'curriculumSubjectId'>
>;

export type ClassSubjectListFilter = {
  academicClassId?: string;
  curriculumSubjectId?: string;
  educationBatchId?: string;
  educationProgramId?: string;
  organizationId?: string;
  status?: ClassSubjectStatus;
  page: number;
  limit: number;
};

export type ClassSubjectListResult = {
  data: ClassSubjectRecord[];
  total: number;
};
