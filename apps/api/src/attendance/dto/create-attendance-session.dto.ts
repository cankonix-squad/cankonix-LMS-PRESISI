import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ATTENDANCE_METHODS,
  type AttendanceMethod,
} from './attendance-method.dto';
import {
  ATTENDANCE_SESSION_STATUSES,
  type AttendanceSessionStatus,
} from './attendance-session-status.dto';

export class CreateAttendanceSessionDto {
  @ApiProperty({
    description: 'Class subject ID',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID('4')
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiPropertyOptional({
    description: 'Optional learning meeting ID',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @IsOptional()
  @IsUUID('4')
  meetingId?: string;

  @ApiPropertyOptional({
    description: 'Title of the session',
    example: 'Pertemuan 1 - Presensi Teori',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Session start timestamp (ISO 8601)',
    example: '2026-09-20T08:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startAt!: string;

  @ApiProperty({
    description: 'Session end timestamp (ISO 8601)',
    example: '2026-09-20T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endAt!: string;

  @ApiPropertyOptional({
    enum: ATTENDANCE_METHODS,
    default: ATTENDANCE_METHODS.MANUAL,
  })
  @IsOptional()
  @IsEnum(ATTENDANCE_METHODS)
  method?: AttendanceMethod;

  @ApiPropertyOptional({
    enum: ATTENDANCE_SESSION_STATUSES,
    default: ATTENDANCE_SESSION_STATUSES.OPEN,
  })
  @IsOptional()
  @IsEnum(ATTENDANCE_SESSION_STATUSES)
  status?: AttendanceSessionStatus;
}

export class UpdateAttendanceSessionDto {
  @ApiPropertyOptional({
    description: 'Optional learning meeting ID',
  })
  @IsOptional()
  @IsUUID('4')
  meetingId?: string;

  @ApiPropertyOptional({
    description: 'Title of the session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Session start timestamp (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({
    description: 'Session end timestamp (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    enum: ATTENDANCE_METHODS,
  })
  @IsOptional()
  @IsEnum(ATTENDANCE_METHODS)
  method?: AttendanceMethod;
}

export class UpdateAttendanceSessionStatusDto {
  @ApiProperty({
    enum: ATTENDANCE_SESSION_STATUSES,
  })
  @IsEnum(ATTENDANCE_SESSION_STATUSES)
  status!: AttendanceSessionStatus;
}
