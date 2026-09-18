import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceSummaryScopeType } from '@prisma/client';

export class AttendanceSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AttendanceSummaryScopeType })
  scopeType!: AttendanceSummaryScopeType;

  @ApiProperty({ format: 'uuid' })
  scopeId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  enrollmentId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classSubjectId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  academicClassId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  educationBatchId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  academicProgramId?: string | null;

  @ApiProperty({
    description: 'Total eligible/closed attendance sessions evaluated',
  })
  totalSessions!: number;

  @ApiProperty({ description: 'Enrollments that contributed to this scope' })
  participants!: number;

  @ApiProperty({ description: 'Count of PRESENT records' })
  presentCount!: number;

  @ApiProperty({ description: 'Count of LATE records' })
  lateCount!: number;

  @ApiProperty({ description: 'Count of EXCUSED records' })
  excusedCount!: number;

  @ApiProperty({ description: 'Count of SICK records' })
  sickCount!: number;

  @ApiProperty({ description: 'Count of ABSENT records' })
  absentCount!: number;

  @ApiProperty({
    description:
      'Percentage of attendance ((present + late) / totalSessions * 100)',
  })
  attendancePercentage!: number;

  @ApiProperty()
  recalculatedAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AttendanceSummaryListResponseDto {
  @ApiProperty({ type: [AttendanceSummaryResponseDto] })
  data!: AttendanceSummaryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
