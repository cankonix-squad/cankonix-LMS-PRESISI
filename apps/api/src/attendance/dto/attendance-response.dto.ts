import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ATTENDANCE_METHODS,
  type AttendanceMethod,
} from './attendance-method.dto';
import {
  ATTENDANCE_SESSION_STATUSES,
  type AttendanceSessionStatus,
} from './attendance-session-status.dto';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from './attendance-status.dto';

export class AttendanceRecordResponseDto {
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

  @ApiPropertyOptional()
  participantName?: string | null;

  @ApiPropertyOptional()
  enrollmentNumber?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AttendanceSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  classSubjectId!: string;

  @ApiPropertyOptional()
  meetingId?: string | null;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ enum: ATTENDANCE_METHODS })
  method!: AttendanceMethod;

  @ApiProperty({ enum: ATTENDANCE_SESSION_STATUSES })
  status!: AttendanceSessionStatus;

  @ApiPropertyOptional()
  totalRecords?: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AttendanceSessionDetailResponseDto extends AttendanceSessionResponseDto {
  @ApiProperty({ type: [AttendanceRecordResponseDto] })
  records!: AttendanceRecordResponseDto[];
}

export class AttendanceSessionListResponseDto {
  @ApiProperty({ type: [AttendanceSessionResponseDto] })
  data!: AttendanceSessionResponseDto[];

  @ApiProperty()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AttendanceRecordListResponseDto {
  @ApiProperty({ type: [AttendanceRecordResponseDto] })
  data!: AttendanceRecordResponseDto[];

  @ApiProperty()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
