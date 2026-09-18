import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LearningMeetingStatusDto } from './learning-meeting-status.dto';

/**
 * `classSubjectId` is intentionally absent: moving a meeting to another class
 * subject would detach the activities and progress that hang off it. Archive it
 * and create a replacement in the other class subject instead.
 *
 * `status` is accepted here for plain edits, but the dedicated status endpoint is
 * the documented way to move a meeting through its lifecycle.
 */
export class UpdateLearningMeetingDto {
  @ApiPropertyOptional({
    description: 'New sequence. Must be free inside the class subject.',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({ example: 'Pertemuan 1 — Pengantar (revisi)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Kontrak belajar dan tujuan pembelajaran' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-10-01T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  plannedStartAt?: string;

  @ApiPropertyOptional({ example: '2026-10-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  plannedEndAt?: string;

  @ApiPropertyOptional({ enum: LearningMeetingStatusDto })
  @IsOptional()
  @IsEnum(LearningMeetingStatusDto)
  status?: LearningMeetingStatusDto;
}
