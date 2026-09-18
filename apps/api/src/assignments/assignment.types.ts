import { AssignmentLifecycleStatusDto } from './dto/assignment-status.dto';
import { AssignmentSubmissionStatusDto } from './dto/assignment-submission-status.dto';

export interface AssignmentRecord {
  id: string;
  activityId: string;
  assessmentId: string | null;
  title: string;
  instructions: string | null;
  dueAt: Date | null;
  maxScore: number;
  attemptsAllowed: number;
  status: AssignmentLifecycleStatusDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentCreateData {
  activityId: string;
  assessmentId: string | null;
  title: string;
  instructions: string | null;
  dueAt: Date | null;
  maxScore: number;
  attemptsAllowed: number;
  status: AssignmentLifecycleStatusDto;
}

export interface AssignmentUpdateData {
  assessmentId?: string | null;
  title?: string;
  instructions?: string | null;
  dueAt?: Date | null;
  maxScore?: number;
  attemptsAllowed?: number;
  status?: AssignmentLifecycleStatusDto;
}

export interface AssignmentListFilter {
  activityId?: string;
  meetingId?: string;
  classSubjectId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  status?: AssignmentLifecycleStatusDto;
  search?: string;
  page: number;
  limit: number;
}

export interface AssignmentListResult {
  data: AssignmentRecord[];
  total: number;
}

/**
 * A submission with its attachments and grade, in the shape the service needs
 * to render a response and to decide which lifecycle moves are legal.
 */
export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  enrollmentId: string;
  attemptNo: number;
  submittedAt: Date | null;
  textAnswer: string | null;
  isLate: boolean;
  status: AssignmentSubmissionStatusDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionCreateData {
  assignmentId: string;
  enrollmentId: string;
  attemptNo: number;
  submittedAt: Date | null;
  textAnswer: string | null;
  isLate: boolean;
  status: AssignmentSubmissionStatusDto;
}

export interface SubmissionUpdateData {
  submittedAt?: Date | null;
  textAnswer?: string | null;
  isLate?: boolean;
  status?: AssignmentSubmissionStatusDto;
}

export interface SubmissionListFilter {
  assignmentId?: string;
  enrollmentId?: string;
  status?: AssignmentSubmissionStatusDto;
  /** Scopes the list to one participant's own work. */
  personId?: string;
  page: number;
  limit: number;
}

export interface SubmissionListResult {
  data: SubmissionRecord[];
  total: number;
}

export interface SubmissionFileRecord {
  id: string;
  submissionId: string;
  storedFileId: string;
  label: string | null;
  createdAt: Date;
}

export interface SubmissionFileDetail extends SubmissionFileRecord {
  /** Metadata of the underlying stored file, for the response payload. */
  objectKey: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  storedFileStatus: string | null;
}

export interface AssignmentGradeRecord {
  id: string;
  submissionId: string;
  /**
   * Prisma returns `Decimal` here, which serializes to a string over the wire.
   * Typed as both so the repository can hand back the Prisma row unchanged
   * while every consumer still goes through `Number(score)`.
   */
  score: string | { toString(): string };
  graderPersonId: string;
  feedback: string | null;
  gradedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentGradeUpsertData {
  score: string;
  graderPersonId: string;
  feedback: string | null;
  gradedAt: Date;
}

/** Context needed to validate an activity and reach its class subject. */
export interface ActivityContext {
  activityId: string;
  activityStatus: string;
  meetingId: string;
  meetingStatus: string;
  classSubjectId: string;
  classSubjectStatus: string;
  academicClassId: string;
  educationBatchId: string;
}

export interface EnrollmentContext {
  enrollmentId: string;
  personId: string;
  status: string;
  educationBatchId: string;
  academicClassId: string | null;
}

/** Minimum stored-file shape used to validate an attachment before linking. */
export interface StoredFileContext {
  id: string;
  namespace: string;
  status: string;
  ownerUserId: string | null;
  mimeType: string;
}

/** Confirms the grader is actually assigned to the assignment's class subject. */
export interface EducatorAuthorityContext {
  personId: string;
  classSubjectId: string;
  educatorTypeCode: string;
  status: string;
  validFrom: Date;
  validUntil: Date | null;
}
