import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  ATTENDANCE_SESSION_STATUSES,
  type AttendanceSessionStatus,
} from './attendance-session-status.dto';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from './attendance-status.dto';

export class ListAttendanceSessionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by class subject ID',
  })
  @IsOptional()
  @IsUUID('4')
  classSubjectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by learning meeting ID',
  })
  @IsOptional()
  @IsUUID('4')
  meetingId?: string;

  @ApiPropertyOptional({
    enum: ATTENDANCE_SESSION_STATUSES,
  })
  @IsOptional()
  @IsEnum(ATTENDANCE_SESSION_STATUSES)
  status?: AttendanceSessionStatus;

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

export class ListAttendanceRecordsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by attendance session ID',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrollment ID',
  })
  @IsOptional()
  @IsUUID('4')
  enrollmentId?: string;

  @ApiPropertyOptional({
    enum: ATTENDANCE_STATUSES,
  })
  @IsOptional()
  @IsEnum(ATTENDANCE_STATUSES)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}
