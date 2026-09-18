import { AssignmentStatusDto } from '../educator-assignments/dto/assignment-status.dto';

export type ClassStaffAssignmentRecord = {
  id: string;
  personId: string;
  academicClassId: string;
  staffType: string;
  validFrom: Date;
  validUntil: Date | null;
  status: AssignmentStatusDto;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassStaffAssignmentCreateData = {
  personId: string;
  academicClassId: string;
  staffType: string;
  validFrom: Date;
  validUntil?: Date | null;
  status?: AssignmentStatusDto;
};

export type ClassStaffAssignmentUpdateData = {
  validFrom?: Date;
  validUntil?: Date | null;
  status?: AssignmentStatusDto;
};

export type ClassStaffAssignmentListFilter = {
  personId?: string;
  academicClassId?: string;
  staffType?: string;
  educationBatchId?: string;
  status?: AssignmentStatusDto;
  page: number;
  limit: number;
};

export type ClassStaffAssignmentListResult = {
  data: ClassStaffAssignmentRecord[];
  total: number;
};

export type PersonContext = {
  id: string;
  fullName: string;
  status: string;
};

export type AcademicClassContext = {
  id: string;
  code: string;
  educationBatchId: string;
};
