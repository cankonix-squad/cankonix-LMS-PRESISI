import { EnrollmentStatusDto } from './dto/enrollment-status.dto';

export type EnrollmentRecord = {
  id: string;
  personId: string;
  educationBatchId: string;
  academicClassId: string | null;
  enrollmentNumber: string | null;
  enrolledAt: Date;
  status: EnrollmentStatusDto;
  completedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type EnrollmentCreateData = {
  personId: string;
  educationBatchId: string;
  academicClassId?: string | null;
  enrollmentNumber?: string | null;
  enrolledAt: Date;
  status?: EnrollmentStatusDto;
  completedAt?: Date | null;
  metadata?: unknown;
};

export type EnrollmentUpdateData = Partial<
  Omit<EnrollmentCreateData, 'personId' | 'educationBatchId'>
>;

export type EnrollmentListFilter = {
  personId?: string;
  educationBatchId?: string;
  academicClassId?: string;
  educationProgramId?: string;
  organizationId?: string;
  status?: EnrollmentStatusDto;
  page: number;
  limit: number;
};

export type EnrollmentListResult = {
  data: EnrollmentRecord[];
  total: number;
};

/** Context needed to validate "class, if set, must belong to the batch". */
export type AcademicClassContext = {
  id: string;
  educationBatchId: string;
};

export type PersonContext = {
  id: string;
  fullName: string;
  status: string;
};
