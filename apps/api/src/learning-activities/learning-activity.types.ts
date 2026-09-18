import { LearningActivityStatusDto } from './dto/learning-activity-status.dto';

export interface MeetingContext {
  id: string;
  classSubjectId: string;
  sequence: number;
  status: string;
}

export interface ActivityTypeContext {
  id: string;
  code: string;
  requiresContent: boolean;
  status: string;
}

export interface LearningActivityRecord {
  id: string;
  meetingId: string;
  activityTypeId: string;
  sequence: number;
  title: string;
  instructions: string | null;
  required: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningActivityCreateData {
  meetingId: string;
  activityTypeId: string;
  sequence: number;
  title: string;
  instructions: string | null;
  required: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  status: LearningActivityStatusDto;
}

export interface LearningActivityUpdateData {
  activityTypeId?: string;
  sequence?: number;
  title?: string;
  instructions?: string | null;
  required?: boolean;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  status?: LearningActivityStatusDto;
}

export interface LearningActivityListFilter {
  meetingId?: string;
  classSubjectId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  activityTypeId?: string;
  status?: LearningActivityStatusDto;
  search?: string;
  page: number;
  limit: number;
}

export interface LearningActivityListResult {
  data: LearningActivityRecord[];
  total: number;
}

/** Sequence holder lookup, used to reject a duplicate sequence with 409. */
export interface ActivitySequenceContext {
  id: string;
  meetingId: string;
  sequence: number;
  status: string;
}

/** Minimum shape needed to run publish validation and content counting. */
export interface ActivityValidationContext {
  id: string;
  meetingId: string;
  status: string;
  activityTypeCode: string;
  activityTypeStatus: string;
  requiresContent: boolean;
}
