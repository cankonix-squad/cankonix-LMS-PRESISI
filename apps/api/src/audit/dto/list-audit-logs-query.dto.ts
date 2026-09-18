import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Read filters for the audit trail.
 *
 * Every filter is optional so the endpoint can also serve as a "show the most
 * recent activity" view, which is the common case during an incident.
 */
export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only entries whose actor is this user account.',
  })
  @IsOptional()
  @IsUUID()
  actorUserAccountId?: string;

  @ApiPropertyOptional({
    example: 'role_assignment.created',
    description: 'Exact action match. Use `search` for a partial match.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional({
    example: 'role_assignment',
    description: 'Exact resource type match.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Exact resource id match. Not necessarily a UUID.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  resourceId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only entries recorded against this organization scope.',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive lower bound on `createdAt`.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive upper bound on `createdAt`.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Case-insensitive partial match on action, type, or id.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
