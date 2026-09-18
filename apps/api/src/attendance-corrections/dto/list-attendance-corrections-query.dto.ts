import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  ATTENDANCE_CORRECTION_STATUSES,
  type AttendanceCorrectionStatus,
} from './attendance-correction-status.dto';

export class ListAttendanceCorrectionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by attendance record ID',
  })
  @IsOptional()
  @IsUUID('4')
  recordId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by attendance session ID. Lets a roster view fetch the correction history of every participant in one request instead of one call per record.',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by requesting user account ID',
  })
  @IsOptional()
  @IsUUID('4')
  requestedByUserId?: string;

  @ApiPropertyOptional({
    enum: ATTENDANCE_CORRECTION_STATUSES,
  })
  @IsOptional()
  @IsEnum(ATTENDANCE_CORRECTION_STATUSES)
  status?: AttendanceCorrectionStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
