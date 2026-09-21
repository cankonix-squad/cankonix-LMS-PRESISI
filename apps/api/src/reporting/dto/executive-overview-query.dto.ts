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

/**
 * Executive KPI grain (TASK-061).
 *
 * `NATIONAL` is the top level: every organization the caller can see. The other
 * values narrow the roll-up to one scope, and `scopeId` is required with them.
 *
 * This is a *grain*, not a permission. Whether a caller may read national figures
 * or only their own institution is decided by the scope resolver from their role
 * assignments, never by which value they typed — a caller cannot reach national
 * numbers by asking for them.
 */
export enum ExecutiveOverviewScopeDto {
  NATIONAL = 'NATIONAL',
  ORGANIZATION = 'ORGANIZATION',
  PROGRAM = 'PROGRAM',
  BATCH = 'BATCH',
}

/**
 * Overview query (TASK-061).
 *
 * The period narrows on the batch's date range rather than on when a row was
 * written, because that is what makes a period meaningful for a cohort KPI:
 * filtering on write time would silently mix intakes.
 */
export class ExecutiveOverviewQueryDto {
  @ApiPropertyOptional({
    enum: ExecutiveOverviewScopeDto,
    default: ExecutiveOverviewScopeDto.NATIONAL,
    description: 'Roll-up grain. Defaults to NATIONAL.',
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
    description: 'Page size for the institution list',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
