import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * Reporting scopes (TASK-060).
 *
 * Mirrors the transactional hierarchy so a scope name means the same thing in a
 * report as it does in the data: Organization → Program → Batch → Class →
 * ClassSubject, plus the participant-level Enrollment used by detail views.
 */
export enum ReportingScopeTypeDto {
  ORGANIZATION = 'ORGANIZATION',
  PROGRAM = 'PROGRAM',
  BATCH = 'BATCH',
  CLASS = 'CLASS',
  CLASS_SUBJECT = 'CLASS_SUBJECT',
  ENROLLMENT = 'ENROLLMENT',
}

/**
 * Scope filter shared by the reporting read endpoints.
 *
 * `scopeId` is validated as a UUID rather than a free string so a report cannot
 * be used to probe for identifiers of another shape.
 */
export class ReportingScopeQueryDto {
  @ApiPropertyOptional({ enum: ReportingScopeTypeDto })
  @IsOptional()
  @IsEnum(ReportingScopeTypeDto)
  scopeType?: ReportingScopeTypeDto;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scopeId?: string;
}

/**
 * Period filter for reporting reads.
 *
 * Both bounds are optional and inclusive. They filter on the *batch* date range,
 * because that is what makes a period meaningful for a cohort report — filtering
 * on "when the row was written" would silently mix intakes.
 */
export class ReportingPeriodQueryDto {
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive lower bound on the batch period',
  })
  @IsOptional()
  @Type(() => Date)
  periodFrom?: Date;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive upper bound on the batch period',
  })
  @IsOptional()
  @Type(() => Date)
  periodTo?: Date;
}

export class ListReportingMetricsQueryDto extends ReportingScopeQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Restrict the list to a single organization subtree',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/**
 * Triggers a refresh of the reporting read model.
 *
 * A refresh is a maintenance action, so it is granted separately from reading a
 * report. `scopeType`/`scopeId` narrow it to one subtree; omitting both refreshes
 * every scope the caller is allowed to touch.
 */
export class RefreshReportingDto extends ReportingScopeQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Restrict the refresh to a single organization subtree',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
