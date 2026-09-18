import { LearningProgressStatusDto } from './dto/learning-progress-status.dto';

export interface LearningProgressRecord {
  id: string;
  enrollmentId: string;
  activityId: string;
  status: LearningProgressStatusDto;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastAccessedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningProgressCreateData {
  enrollmentId: string;
  activityId: string;
  status: LearningProgressStatusDto;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastAccessedAt: Date | null;
  metadata?: unknown;
}

export interface LearningProgressUpdateData {
  status?: LearningProgressStatusDto;
  progressPercent?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastAccessedAt?: Date | null;
  metadata?: unknown;
}

export interface LearningProgressListFilter {
  enrollmentId?: string;
  activityId?: string;
  classSubjectId?: string;
  meetingId?: string;
  status?: LearningProgressStatusDto;
  page: number;
  limit: number;
}

export interface LearningProgressListResult {
  data: LearningProgressRecord[];
  total: number;
}

/**
 * Everything the service needs to decide whether a write is legal, resolved in
 * one query rather than a fan-out. An activity's class subject, the participant
 * enrollment and the activity's required flag are all needed on every write.
 */
export interface ActivityEligibilityContext {
  activityId: string;
  activityStatus: string;
  activityRequired: boolean;
  meetingId: string;
  meetingStatus: string;
  classSubjectId: string;
  classSubjectStatus: string;
  academicClassId: string;
}

export interface EnrollmentEligibilityContext {
  enrollmentId: string;
  personId: string;
  status: string;
  educationBatchId: string;
  academicClassId: string | null;
}

/** Activity counts for one class subject, used to recompute the aggregate. */
export interface ClassSubjectActivityCounts {
  classSubjectId: string;
  totalActivities: number;
  requiredActivities: number;
}

export interface ClassSubjectProgressAggregateRecord {
  id: string;
  classSubjectId: string;
  enrollmentId: string;
  totalActivities: number;
  completedActivities: number;
  requiredActivities: number;
  completedRequiredActivities: number;
  progressPercent: number;
  lastActivityAt: Date | null;
  recalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Counts read straight out of `learning_progress` for one participant and class
 * subject. These feed the stored aggregate; they are never computed on a
 * dashboard read path.
 */
export interface EnrollmentProgressCounts {
  completedActivities: number;
  completedRequiredActivities: number;
  lastActivityAt: Date | null;
}
