import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportingMetricRecord } from '../reporting.types';
import { ReportingScopeTypeDto } from './reporting-query.dto';

/**
 * Reported metrics for one scope (TASK-060).
 *
 * These are deliberately named after the question they answer rather than the
 * table they came from, because a report consumer should not have to know that
 * "attendance" happens to live in `attendance_summaries`.
 */
export class ReportingMetricsResponseDto {
  @ApiProperty({ description: 'Participants on roll in this scope' })
  participants!: number;

  @ApiProperty({
    description: 'Participants with a recorded enrollment status',
  })
  activeParticipants!: number;

  @ApiProperty({
    description: 'Mean learning progress across participants, 0-100',
  })
  averageProgressPercent!: number;

  @ApiProperty({ description: 'Mean attendance across participants, 0-100' })
  attendancePercentage!: number;

  @ApiProperty({
    description: 'Attendance sessions counted in the denominator',
  })
  totalSessions!: number;

  @ApiProperty({ description: 'Mean final numeric score across subjects' })
  averageFinalScore!: number;

  @ApiProperty({ description: 'Final grades that exist for this scope' })
  gradedCount!: number;

  @ApiProperty({ description: 'Final grades still in CALCULATED state' })
  unapprovedGradeCount!: number;
}

export class ReportingScopeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ReportingScopeTypeDto })
  scopeType!: ReportingScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  scopeId!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Resolved display name' })
  scopeName?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  organizationId?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  educationProgramId?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  educationBatchId?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  academicClassId?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  classSubjectId?: string | null;

  @ApiProperty({ type: ReportingMetricsResponseDto })
  metrics!: ReportingMetricsResponseDto;

  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({
    format: 'date-time',
    description: 'When this aggregate row was last recomputed from source data',
  })
  recalculatedAt!: string;
}

export class ReportingMetricsListResponseDto {
  @ApiProperty({ type: [ReportingScopeResponseDto] })
  data!: ReportingScopeResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ReportingRefreshResponseDto {
  @ApiProperty({ description: 'Scopes recomputed by this request' })
  refreshed!: number;

  @ApiProperty({ description: 'Scope keys recomputed, in scope order' })
  scopes!: string[];

  @ApiProperty({ format: 'date-time' })
  refreshedAt!: string;
}

/**
 * Projects a stored metric row onto the metrics block a client sees.
 *
 * One mapper, used by every endpoint that publishes metrics, because the fields are
 * a decision rather than a copy. The row also carries the totals and sample counts
 * the averages were derived from, and those are deliberately not exposed: a client
 * that divides `progressPercentTotal` by `progressSampleCount` itself can land on a
 * slightly different number than `averageProgressPercent` — different rounding, or
 * a row refreshed between the two reads — and two dashboards disagreeing about the
 * same cohort is a support ticket nobody can close.
 */
export function toReportingMetricsResponse(
  record: ReportingMetricRecord,
): ReportingMetricsResponseDto {
  return {
    participants: record.participants,
    activeParticipants: record.activeParticipants,
    averageProgressPercent: record.averageProgressPercent,
    attendancePercentage: record.attendancePercentage,
    totalSessions: record.totalSessions,
    averageFinalScore: record.averageFinalScore,
    gradedCount: record.gradedCount,
    unapprovedGradeCount: record.unapprovedGradeCount,
  };
}
