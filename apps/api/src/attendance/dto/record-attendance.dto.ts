import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from './attendance-status.dto';

export class RecordAttendanceItemDto {
  @ApiProperty({
    description: 'Enrollment ID of participant',
    example: '33333333-3333-4333-8333-333333333333',
  })
  @IsUUID('4')
  @IsNotEmpty()
  enrollmentId!: string;

  @ApiProperty({
    enum: ATTENDANCE_STATUSES,
    example: ATTENDANCE_STATUSES.PRESENT,
  })
  @IsEnum(ATTENDANCE_STATUSES)
  status!: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Optional check-in timestamp (ISO 8601)',
    example: '2026-09-20T08:05:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({
    description: 'Optional note or remark',
    example: 'Hadir tepat waktu',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RecordAttendanceDto extends RecordAttendanceItemDto {
  @ApiProperty({
    description: 'Attendance Session ID',
    example: '44444444-4444-4444-8444-444444444444',
  })
  @IsUUID('4')
  @IsNotEmpty()
  sessionId!: string;
}

export class BulkRecordAttendanceDto {
  @ApiProperty({
    type: [RecordAttendanceItemDto],
    description: 'List of attendance records to create or update',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordAttendanceItemDto)
  records!: RecordAttendanceItemDto[];
}
