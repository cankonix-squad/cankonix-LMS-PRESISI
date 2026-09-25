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
import { KpiDetailLevelDto } from './kpi-query.dto';

export enum GraduationTrendGranularityDto {
  COHORT = 'COHORT',
  YEAR = 'YEAR',
  QUARTER = 'QUARTER',
  MONTH = 'MONTH',
}

export class GraduationTrendQueryDto {
  @ApiPropertyOptional({
    enum: ExecutiveOverviewScopeDto,
    default: ExecutiveOverviewScopeDto.NATIONAL,
  })
  @IsOptional()
  @IsEnum(ExecutiveOverviewScopeDto)
  scope?: ExecutiveOverviewScopeDto;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({
    enum: KpiDetailLevelDto,
    default: KpiDetailLevelDto.BATCH,
    description:
      'Stored reporting row level used as trend source. BATCH is the default graduation grain.',
  })
  @IsOptional()
  @IsEnum(KpiDetailLevelDto)
  level?: KpiDetailLevelDto;

  @ApiPropertyOptional({
    enum: GraduationTrendGranularityDto,
    default: GraduationTrendGranularityDto.COHORT,
  })
  @IsOptional()
  @IsEnum(GraduationTrendGranularityDto)
  granularity?: GraduationTrendGranularityDto;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  periodTo?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 36, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  limit?: number;
}
