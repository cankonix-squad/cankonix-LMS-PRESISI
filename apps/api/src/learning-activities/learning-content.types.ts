export interface LearningContentRecord {
  id: string;
  activityId: string;
  versionGroupId: string;
  contentType: string;
  title: string;
  objectKey: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningContentCreateData {
  activityId: string;
  versionGroupId: string;
  contentType: string;
  title: string;
  objectKey: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  status: string;
}

export interface LearningContentUpdateData {
  title?: string;
  objectKey?: string | null;
  externalUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  status?: string;
}

export interface LearningContentListFilter {
  activityId: string;
  status?: string;
  includeSuperseded?: boolean;
  page: number;
  limit: number;
}

export interface LearningContentListResult {
  data: LearningContentRecord[];
  total: number;
}

/** Highest version inside a version group, or 0 when the group is empty. */
export interface ContentVersionState {
  versionGroupId: string;
  maxVersion: number;
  publishedCount: number;
}
