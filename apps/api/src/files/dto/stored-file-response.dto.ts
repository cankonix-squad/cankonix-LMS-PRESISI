import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoredFileStatusDto } from './stored-file-status.dto';

export class PresignedRequestResponseDto {
  @ApiProperty({
    description: 'Presigned URL. The client uploads/downloads directly.',
  })
  url!: string;

  @ApiProperty({ enum: ['GET', 'PUT', 'HEAD', 'DELETE'] })
  method!: 'GET' | 'PUT' | 'HEAD' | 'DELETE';

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'learning-content/…/2026/09/….pdf' })
  objectKey!: string;

  @ApiProperty({
    description: 'Headers the client must send so the signature matches',
    example: { 'Content-Type': 'application/pdf' },
  })
  headers!: Record<string, string>;
}

export class StoredFileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'learning-content/…/2026/09/….pdf' })
  objectKey!: string;

  @ApiProperty({ example: 'learning-content' })
  namespace!: string;

  @ApiProperty({ example: 'Modul 1.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 204800 })
  sizeBytes!: number;

  @ApiPropertyOptional({ nullable: true })
  checksum!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  ownerUserId!: string | null;

  @ApiProperty({ enum: StoredFileStatusDto, example: 'PENDING' })
  status!: StoredFileStatusDto;

  @ApiPropertyOptional({ nullable: true })
  uploadedAt!: string | null;

  @ApiProperty({ example: '2026-09-26T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-26T00:00:00.000Z' })
  updatedAt!: string;
}

export class InitiateUploadResponseDto {
  @ApiProperty({ type: () => StoredFileResponseDto })
  file!: StoredFileResponseDto;

  @ApiProperty({ type: () => PresignedRequestResponseDto })
  upload!: PresignedRequestResponseDto;
}

export class DownloadUrlResponseDto {
  @ApiProperty({ type: () => StoredFileResponseDto })
  file!: StoredFileResponseDto;

  @ApiProperty({ type: () => PresignedRequestResponseDto })
  download!: PresignedRequestResponseDto;
}

export class StoredFileListResponseDto {
  @ApiProperty({ type: () => [StoredFileResponseDto] })
  data!: StoredFileResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class UploadPolicyResponseDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Default ceiling in bytes when a type has no specific entry',
  })
  defaultMaxSizeBytes!: number | null;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        mimeType: { type: 'string' },
        maxSizeBytes: { type: 'integer' },
      },
    },
  })
  entries!: { mimeType: string; maxSizeBytes: number }[];
}
