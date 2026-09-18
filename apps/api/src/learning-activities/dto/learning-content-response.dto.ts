import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LearningContentStatusDto,
  LearningContentTypeDto,
} from './learning-content-status.dto';

export class LearningContentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  activityId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Groups all versions of the same material',
  })
  versionGroupId!: string;

  @ApiProperty({ enum: LearningContentTypeDto, example: 'FILE' })
  contentType!: LearningContentTypeDto;

  @ApiProperty({ example: 'Modul 1 — Pengantar' })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  objectKey!: string | null;

  @ApiPropertyOptional({ nullable: true })
  externalUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sizeBytes!: number | null;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ enum: LearningContentStatusDto, example: 'DRAFT' })
  status!: LearningContentStatusDto;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  updatedAt!: string;
}

export class LearningContentListResponseDto {
  @ApiProperty({ type: () => [LearningContentResponseDto] })
  data!: LearningContentResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: 2 })
  total!: number;
}

/**
 * Response for the versioning endpoint: the new row plus the row it replaced,
 * so the caller can confirm which version was superseded.
 */
export class LearningContentVersionResponseDto {
  @ApiProperty({ type: () => LearningContentResponseDto })
  content!: LearningContentResponseDto;

  @ApiPropertyOptional({
    type: () => LearningContentResponseDto,
    nullable: true,
  })
  superseded!: LearningContentResponseDto | null;
}
