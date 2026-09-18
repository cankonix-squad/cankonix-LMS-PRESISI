import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { LearningContentStatusDto } from './learning-content-status.dto';

/**
 * `contentType` and `version` are immutable: changing the kind of a material or
 * rewriting a version in place would make the stored history a lie. Create a new
 * version (or a new content row) instead.
 */
export class UpdateLearningContentDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  objectKey?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  externalUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number | null;

  @ApiPropertyOptional({ enum: LearningContentStatusDto })
  @IsOptional()
  @IsEnum(LearningContentStatusDto)
  status?: LearningContentStatusDto;
}

/**
 * Publishes a new version of an existing content group. The previous published
 * row is marked SUPERSEDED rather than edited, so material a student already saw
 * stays reconstructible.
 */
export class CreateLearningContentVersionDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  objectKey?: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  externalUrl?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
