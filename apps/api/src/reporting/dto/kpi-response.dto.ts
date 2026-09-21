import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExecutiveKpiResponseDto } from './executive-overview-response.dto';
import { ExecutiveOverviewScopeDto } from './executive-overview-query.dto';
import { ReportingMetricsResponseDto } from './reporting-response.dto';
import { ReportingScopeTypeDto } from './reporting-query.dto';

export class KpiScopeResponseDto {
  @ApiProperty({ enum: ExecutiveOverviewScopeDto })
  scope!: ExecutiveOverviewScopeDto;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  scopeId?: string | null;

  @ApiProperty({
    enum: ['NATIONAL', 'SCOPED'],
    description: 'Resolved access width of the caller.',
  })
  accessLevel!: 'NATIONAL' | 'SCOPED';

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  periodFrom?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  periodTo?: string | null;
}

export class KpiDistributionBucketResponseDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  min!: number;

  @ApiProperty()
  max!: number;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  participants!: number;
}

export class KpiDistributionsResponseDto {
  @ApiProperty({ type: [KpiDistributionBucketResponseDto] })
  attendance!: KpiDistributionBucketResponseDto[];

  @ApiProperty({ type: [KpiDistributionBucketResponseDto] })
  learningProgress!: KpiDistributionBucketResponseDto[];

  @ApiProperty({ type: [KpiDistributionBucketResponseDto] })
  finalScore!: KpiDistributionBucketResponseDto[];

  @ApiProperty({ type: [KpiDistributionBucketResponseDto] })
  remedialRisk!: KpiDistributionBucketResponseDto[];
}

export class KpiAttentionItemResponseDto {
  @ApiProperty({ enum: ReportingScopeTypeDto })
  scopeType!: ReportingScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  scopeId!: string;

  @ApiPropertyOptional({ nullable: true })
  scopeName?: string | null;

  @ApiProperty()
  severity!: number;

  @ApiProperty({ type: [String] })
  reasons!: string[];

  @ApiProperty({ type: ReportingMetricsResponseDto })
  metrics!: ReportingMetricsResponseDto;

  @ApiProperty({ format: 'date-time' })
  recalculatedAt!: string;
}

export class KpiTrendPointResponseDto {
  @ApiProperty({
    description:
      'Period key derived from stored batch start/end dates, or NO_PERIOD when absent.',
  })
  period!: string;

  @ApiProperty()
  scopeCount!: number;

  @ApiProperty({ type: ExecutiveKpiResponseDto })
  kpis!: ExecutiveKpiResponseDto;
}

export class DetailedExecutiveKpiResponseDto {
  @ApiProperty({ type: KpiScopeResponseDto })
  scope!: KpiScopeResponseDto;

  @ApiProperty({ enum: ReportingScopeTypeDto })
  level!: ReportingScopeTypeDto;

  @ApiProperty({ type: ExecutiveKpiResponseDto })
  summary!: ExecutiveKpiResponseDto;

  @ApiProperty({ type: KpiDistributionsResponseDto })
  distributions!: KpiDistributionsResponseDto;

  @ApiProperty({ type: [KpiAttentionItemResponseDto] })
  attention!: KpiAttentionItemResponseDto[];

  @ApiProperty({ type: [KpiTrendPointResponseDto] })
  trends!: KpiTrendPointResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;
}
