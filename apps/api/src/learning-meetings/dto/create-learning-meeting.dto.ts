import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { LearningMeetingStatusDto } from './learning-meeting-status.dto';

export class CreateLearningMeetingDto {
  @ApiProperty({
    description: 'Class subject the meeting belongs to',
    example: '55555555-5555-5555-5555-555555555555',
  })
  @IsUUID()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiPropertyOptional({
    description:
      'Pedagogical order (Pertemuan 1, 2, ...). Unique per class subject. When omitted the next free sequence is assigned.',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiProperty({ example: 'Pertemuan 1 — Pengantar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

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

  @ApiPropertyOptional({
    description:
      'Initial status. A meeting normally starts as DRAFT and is published once its activities are ready.',
    enum: LearningMeetingStatusDto,
    default: LearningMeetingStatusDto.DRAFT,
  })
  @IsOptional()
  @IsEnum(LearningMeetingStatusDto)
  status?: LearningMeetingStatusDto;
}
