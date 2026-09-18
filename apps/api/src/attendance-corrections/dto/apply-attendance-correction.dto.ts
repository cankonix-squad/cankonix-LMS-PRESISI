import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from '../../attendance/dto/attendance-status.dto';

export class ApplyAttendanceCorrectionDto {
  @ApiProperty({
    enum: ATTENDANCE_STATUSES,
    description: 'The corrected attendance status',
    example: ATTENDANCE_STATUSES.EXCUSED,
  })
  @IsEnum(ATTENDANCE_STATUSES)
  newStatus!: AttendanceStatus;

  @ApiProperty({
    description:
      'Mandatory reason for the correction. A correction without a stated reason is not auditable.',
    example: 'Surat keterangan sakit diterima setelah sesi ditutup.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Optional corrected check-in timestamp (ISO 8601)',
    example: '2026-09-20T08:05:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({
    description: 'Optional corrected note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
