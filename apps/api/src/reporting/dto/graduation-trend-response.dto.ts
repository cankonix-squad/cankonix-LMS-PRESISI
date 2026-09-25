import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExecutiveOverviewScopeDto } from './executive-overview-query.dto';
import { GraduationTrendGranularityDto } from './graduation-trend-query.dto';
import { ReportingScopeTypeDto } from './reporting-query.dto';

export class GraduationTrendScopeResponseDto {
  @ApiProperty({ enum: ExecutiveOverviewScopeDto })
  scope!: ExecutiveOverviewScopeDto;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  scopeId?: string | null;

  @ApiProperty({ enum: ['NATIONAL', 'SCOPED'] })
  accessLevel!: 'NATIONAL' | 'SCOPED';

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  periodFrom?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  periodTo?: string | null;
}

export class GraduationTrendPointResponseDto {
  @ApiProperty()
  period!: string;

  @ApiProperty()
  scopeCount!: number;

  @ApiProperty()
  evaluationCount!: number;

  @ApiProperty()
  eligibleCount!: number;

  @ApiProperty()
  approvedCount!: number;

  @ApiProperty()
  passCount!: number;

  @ApiProperty()
  failCount!: number;

  @ApiProperty()
  remedialCount!: number;

  @ApiProperty()
  withdrawnCount!: number;

  @ApiProperty()
  certificateIssuedCount!: number;

  @ApiProperty()
  passRate!: number;

  @ApiProperty()
  failRate!: number;

  @ApiProperty()
  remedialRate!: number;

  @ApiProperty()
  certificationRate!: number;
}

export class GraduationTrendResponseDto {
  @ApiProperty({ type: GraduationTrendScopeResponseDto })
  scope!: GraduationTrendScopeResponseDto;

  @ApiProperty({ enum: ReportingScopeTypeDto })
  level!: ReportingScopeTypeDto;

  @ApiProperty({ enum: GraduationTrendGranularityDto })
  granularity!: GraduationTrendGranularityDto;

  @ApiProperty({ type: [GraduationTrendPointResponseDto] })
  trends!: GraduationTrendPointResponseDto[];

  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;
}
