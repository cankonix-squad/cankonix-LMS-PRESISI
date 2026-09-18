import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { LearningActivityStatusDto } from './learning-activity-status.dto';

/**
 * `meetingId` is intentionally absent: moving an activity between meetings
 * would relocate its content and any student progress recorded against it.
 * Retire the activity and create a replacement instead.
 */
export class UpdateLearningActivityDto {
  @ApiPropertyOptional({
    description: 'Data-driven activity type',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  activityTypeId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 5000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  availableFrom?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  availableUntil?: string | null;

  @ApiPropertyOptional({ enum: LearningActivityStatusDto })
  @IsOptional()
  @IsEnum(LearningActivityStatusDto)
  status?: LearningActivityStatusDto;
}
