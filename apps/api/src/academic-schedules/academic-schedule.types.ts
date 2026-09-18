export type AcademicScheduleRecord = {
  id: string;
  classSubjectId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  mode: string;
  location: string | null;
  url: string | null;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type AcademicScheduleCreateData = {
  classSubjectId: string;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  mode?: string;
  location?: string | null;
  url?: string | null;
  status?: string;
  metadata?: unknown;
};

export type AcademicScheduleUpdateData = {
  title?: string;
  description?: string | null;
  startAt?: Date;
  endAt?: Date;
  mode?: string;
  location?: string | null;
  url?: string | null;
  status?: string;
  metadata?: unknown;
};

export type AcademicScheduleListFilter = {
  classSubjectId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  mode?: string;
  status?: string;
  /** Calendar window: entries overlapping [from, to]. */
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
};

export type AcademicScheduleListResult = {
  data: AcademicScheduleRecord[];
  total: number;
};

export type ClassSubjectContext = {
  id: string;
  academicClassId: string;
  academicClass: {
    id: string;
    educationBatchId: string;
  };
};

/** A slot conflict candidate: another schedule covering an overlapping period. */
export type ScheduleConflictRecord = {
  id: string;
  classSubjectId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  status: string;
};
