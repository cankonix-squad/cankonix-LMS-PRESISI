import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ExecutiveOverviewScopeDto } from './executive-overview-query.dto';
import { ReportingScopeTypeDto } from './reporting-query.dto';

export enum KpiDetailLevelDto {
  PROGRAM = 'PROGRAM',
  BATCH = 'BATCH',
  CLASS = 'CLASS',
  CLASS_SUBJECT = 'CLASS_SUBJECT',
  ENROLLMENT = 'ENROLLMENT',
}

export class ExecutiveKpiQueryDto {
  @ApiPropertyOptional({
    enum: ExecutiveOverviewScopeDto,
    default: ExecutiveOverviewScopeDto.NATIONAL,
    description: 'Population to summarize before KPI details are derived.',
  })
  @IsOptional()
  @IsEnum(ExecutiveOverviewScopeDto)
  scope?: ExecutiveOverviewScopeDto;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required for ORGANIZATION, PROGRAM or BATCH; must be omitted for NATIONAL.',
  })
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({
    enum: KpiDetailLevelDto,
    default: KpiDetailLevelDto.CLASS,
    description: 'Stored reporting row level used for distributions.',
  })
  @IsOptional()
  @IsEnum(KpiDetailLevelDto)
  level?: KpiDetailLevelDto;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Inclusive lower bound on the batch start date',
  })
  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Inclusive upper bound on the batch end date',
  })
  @IsOptional()
  @IsDateString()
  periodTo?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 25,
    description: 'Page size for the detail rows behind the KPI.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 10,
    description: 'Maximum rows returned in the attention list.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  attentionLimit?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 24,
    default: 12,
    description: 'Maximum cohort-period points returned in trend output.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  trendLimit?: number;
}

export function toKpiReportingLevel(
  level: KpiDetailLevelDto | undefined,
): ReportingScopeTypeDto {
  return (level ?? KpiDetailLevelDto.CLASS) as unknown as ReportingScopeTypeDto;
}
