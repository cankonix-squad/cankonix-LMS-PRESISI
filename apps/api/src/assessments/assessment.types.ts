import { AssessmentStatusDto } from './dto/assessment-status.dto';

export interface ClassSubjectContext {
  id: string;
  academicClassId: string;
  curriculumSubjectId: string;
  status: string;
}

export interface AssessmentTypeContext {
  id: string;
  code: string;
  status: string;
}

export interface AssessmentRecord {
  id: string;
  classSubjectId: string;
  assessmentTypeId: string;
  title: string;
  description: string | null;
  /**
   * Prisma returns `Decimal` for these columns, which serializes to a string
   * over the wire. Typed loosely so the repository can hand back the Prisma row
   * unchanged while every consumer normalizes through `Number(...)`.
   */
  maxScore: string | { toString(): string };
  weight: string | { toString(): string } | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentCreateData {
  classSubjectId: string;
  assessmentTypeId: string;
  title: string;
  description: string | null;
  maxScore: string;
  weight: string | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  status: AssessmentStatusDto;
  metadata: unknown;
}

export interface AssessmentUpdateData {
  assessmentTypeId?: string;
  title?: string;
  description?: string | null;
  maxScore?: string;
  weight?: string | null;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  status?: AssessmentStatusDto;
  metadata?: unknown;
}

export interface AssessmentListFilter {
  classSubjectId?: string;
  academicClassId?: string;
  curriculumSubjectId?: string;
  assessmentTypeId?: string;
  status?: AssessmentStatusDto;
  search?: string;
  page: number;
  limit: number;
}

export interface AssessmentListResult {
  data: AssessmentRecord[];
  total: number;
}
