import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from '../../attendance/dto/attendance-status.dto';
import {
  ATTENDANCE_CORRECTION_STATUSES,
  type AttendanceCorrectionStatus,
} from './attendance-correction-status.dto';

export class AttendanceCorrectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  attendanceRecordId!: string;

  @ApiProperty({ enum: ATTENDANCE_STATUSES })
  previousStatus!: AttendanceStatus;

  @ApiProperty({ enum: ATTENDANCE_STATUSES })
  newStatus!: AttendanceStatus;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional()
  requestedByUserId?: string | null;

  @ApiPropertyOptional()
  approvedByUserId?: string | null;

  @ApiPropertyOptional()
  approvedAt?: string | null;

  @ApiProperty({ enum: ATTENDANCE_CORRECTION_STATUSES })
  status!: AttendanceCorrectionStatus;

  @ApiProperty()
  createdAt!: string;
}

export class AttendanceRecordAfterCorrectionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  enrollmentId!: string;

  @ApiProperty({ enum: ATTENDANCE_STATUSES })
  status!: AttendanceStatus;

  @ApiPropertyOptional()
  checkInAt?: string | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional()
  recordedByUserId?: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class ApplyAttendanceCorrectionResponseDto {
  @ApiProperty({ type: AttendanceCorrectionResponseDto })
  correction!: AttendanceCorrectionResponseDto;

  @ApiProperty({ type: AttendanceRecordAfterCorrectionDto })
  record!: AttendanceRecordAfterCorrectionDto;
}

export class AttendanceCorrectionListResponseDto {
  @ApiProperty({ type: [AttendanceCorrectionResponseDto] })
  data!: AttendanceCorrectionResponseDto[];

  @ApiProperty()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
