import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportingScopeTypeDto } from './reporting-query.dto';
import { ReportingMetricsResponseDto } from './reporting-response.dto';
import { ExecutiveOverviewScopeDto } from './executive-overview-query.dto';

/**
 * Executive KPI block (TASK-061).
 *
 * Every figure is read from the reporting read model; none of it is computed from
 * transactional tables at request time. That is what keeps the dashboard's cost
 * independent of how much teaching has happened.
 */
export class ExecutiveKpiResponseDto {
  @ApiProperty({ description: 'Participants on roll across the scope' })
  participants!: number;

  @ApiProperty({ description: 'Participants with an active enrollment' })
  activeParticipants!: number;

  @ApiProperty({ description: 'Institutions (organizations) in the scope' })
  institutions!: number;

  @ApiProperty({ description: 'Education programs in the scope' })
  programs!: number;

  @ApiProperty({ description: 'Batches (angkatan) in the scope' })
  batches!: number;

  @ApiProperty({ description: 'Classes in the scope' })
  classes!: number;

  @ApiProperty({
    description:
      'Weighted mean learning progress, 0-100. Weighted by participants, not a mean of means.',
  })
  averageProgressPercent!: number;

  @ApiProperty({
    description:
      'Summed attendance over summed possible sessions, 0-100. present and late count as attended.',
  })
  attendancePercentage!: number;

  @ApiProperty({ description: 'Attendance sessions in the denominator' })
  totalSessions!: number;

  @ApiProperty({
    description:
      'Weighted mean final score across graded subjects, not a mean of means.',
  })
  averageFinalScore!: number;

  @ApiProperty({ description: 'Final grades counted in the score mean' })
  gradedCount!: number;

  @ApiProperty({
    description:
      'Final grades still awaiting approval, so a reader can judge how provisional the mean is',
  })
  unapprovedGradeCount!: number;

  @ApiProperty({ description: 'Graduation evaluations recorded in the scope' })
  graduationEvaluationCount!: number;

  @ApiProperty({ description: 'Evaluations whose outcome is ELIGIBLE' })
  graduationEligibleCount!: number;

  @ApiProperty({ description: 'Decisions in force (APPROVED)' })
  graduationApprovedCount!: number;

  @ApiProperty({ description: 'Certificates issued' })
  graduatedCount!: number;

  @ApiProperty({
    description:
      'Share of in-force decisions that produced a certificate, 0-100. Below 100 means approvals are waiting on document issuance.',
  })
  certificationRate!: number;
}

/**
 * The scope the figures describe.
 *
 * `accessLevel` reports what the resolver decided, not what was requested: a
 * caller with an institution-only grant receives `SCOPED` even when they omit the
 * filter, and the figures they receive are their institution's, never national.
 */
export class ExecutiveScopeResponseDto {
  @ApiProperty({ enum: ExecutiveOverviewScopeDto })
  scope!: ExecutiveOverviewScopeDto;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'Present for ORGANIZATION, PROGRAM and BATCH',
  })
  scopeId?: string | null;

  @ApiProperty({
    enum: ['NATIONAL', 'SCOPED'],
    description:
      'Whether the caller sees every institution (NATIONAL) or a resolved subset (SCOPED)',
  })
  accessLevel!: 'NATIONAL' | 'SCOPED';

  @ApiProperty({
    description:
      'How many institutions the resolved grant covers. 0 means unrestricted.',
  })
  institutionCount!: number;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  periodFrom?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  periodTo?: string | null;
}

/**
 * One row of the institution breakdown.
 *
 * This is the list the endpoint paginates. It reuses the per-scope metric shape
 * from TASK-060 so a drill-down can hand a row straight to a detail view without
 * a second contract.
 */
export class ExecutiveBreakdownItemResponseDto {
  @ApiProperty({ enum: ReportingScopeTypeDto })
  scopeType!: ReportingScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  scopeId!: string;

  @ApiPropertyOptional({ nullable: true })
  scopeName?: string | null;

  @ApiProperty({ type: ReportingMetricsResponseDto })
  metrics!: ReportingMetricsResponseDto;

  @ApiProperty({ format: 'date-time' })
  recalculatedAt!: string;
}

export class ExecutiveBreakdownListResponseDto {
  @ApiProperty({ type: [ExecutiveBreakdownItemResponseDto] })
  data!: ExecutiveBreakdownItemResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ExecutiveOverviewResponseDto {
  @ApiProperty({ type: ExecutiveScopeResponseDto })
  scope!: ExecutiveScopeResponseDto;

  @ApiProperty({ type: ExecutiveKpiResponseDto })
  kpis!: ExecutiveKpiResponseDto;

  @ApiProperty({
    type: ExecutiveBreakdownListResponseDto,
    description: 'Paginated breakdown of the scopes inside the KPI roll-up',
  })
  breakdown!: ExecutiveBreakdownListResponseDto;

  @ApiProperty({
    format: 'date-time',
    description: 'When this response was assembled from the read model',
  })
  generatedAt!: string;
}
