import { AssignmentStatusDto } from './dto/assignment-status.dto';

export type EducatorAssignmentRecord = {
  id: string;
  personId: string;
  classSubjectId: string;
  educatorTypeId: string;
  validFrom: Date;
  validUntil: Date | null;
  status: AssignmentStatusDto;
  createdAt: Date;
  updatedAt: Date;
};

export type EducatorAssignmentCreateData = {
  personId: string;
  classSubjectId: string;
  educatorTypeId: string;
  validFrom: Date;
  validUntil?: Date | null;
  status?: AssignmentStatusDto;
};

export type EducatorAssignmentUpdateData = {
  validFrom?: Date;
  validUntil?: Date | null;
  status?: AssignmentStatusDto;
};

export type EducatorAssignmentListFilter = {
  personId?: string;
  classSubjectId?: string;
  educatorTypeId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  status?: AssignmentStatusDto;
  page: number;
  limit: number;
};

export type EducatorAssignmentListResult = {
  data: EducatorAssignmentRecord[];
  total: number;
};

export type PersonContext = {
  id: string;
  fullName: string;
  status: string;
};

export type ClassSubjectContext = {
  id: string;
  academicClassId: string;
};

export type EducatorTypeContext = {
  id: string;
  code: string;
  status: string;
};
