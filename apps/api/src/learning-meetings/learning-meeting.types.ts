export type LearningMeetingRecord = {
  id: string;
  classSubjectId: string;
  sequence: number;
  title: string;
  description: string | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LearningMeetingCreateData = {
  classSubjectId: string;
  sequence: number;
  title: string;
  description?: string | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  status?: string;
};

export type LearningMeetingUpdateData = {
  sequence?: number;
  title?: string;
  description?: string | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  status?: string;
};

export type LearningMeetingListFilter = {
  classSubjectId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
};

export type LearningMeetingListResult = {
  data: LearningMeetingRecord[];
  total: number;
};

export type ClassSubjectContext = {
  id: string;
  academicClassId: string;
};

export type MeetingSequenceContext = {
  id: string;
  classSubjectId: string;
  sequence: number;
  status: string;
};
