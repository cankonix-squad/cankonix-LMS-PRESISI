import { StoredFileStatusDto } from './dto/stored-file-status.dto';

export interface StoredFileRecord {
  id: string;
  objectKey: string;
  namespace: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  ownerUserId: string | null;
  status: string;
  uploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFileCreateData {
  objectKey: string;
  namespace: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  ownerUserId: string | null;
  status: StoredFileStatusDto;
}

export interface StoredFileUpdateData {
  sizeBytes?: number;
  checksum?: string | null;
  status?: StoredFileStatusDto;
  uploadedAt?: Date | null;
}

export interface StoredFileListFilter {
  namespace?: string;
  ownerUserId?: string;
  status?: StoredFileStatusDto;
  search?: string;
  page: number;
  limit: number;
}

export interface StoredFileListResult {
  data: StoredFileRecord[];
  total: number;
}
