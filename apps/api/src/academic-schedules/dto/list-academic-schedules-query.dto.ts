import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import {
  AcademicScheduleModeDto,
  AcademicScheduleStatusDto,
} from './academic-schedule-status.dto';

/**
 * Calendar reads. `from`/`to` select every schedule that *overlaps* the window
 * rather than only those fully inside it, so a month view never hides a session
 * that straddles a month boundary.
 */
export class ListAcademicSchedulesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classSubjectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  educationBatchId?: string;

  @ApiPropertyOptional({ enum: AcademicScheduleModeDto })
  @IsOptional()
  @IsEnum(AcademicScheduleModeDto)
  mode?: AcademicScheduleModeDto;

  @ApiPropertyOptional({ enum: AcademicScheduleStatusDto })
  @IsOptional()
  @IsEnum(AcademicScheduleStatusDto)
  status?: AcademicScheduleStatusDto;

  @ApiPropertyOptional({
    description: 'Window start (inclusive)',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Window end (inclusive)',
    example: '2026-10-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
