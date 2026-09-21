import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ReportingScopeTypeDto } from './reporting-query.dto';

/**
 * Drill-down query (TASK-062).
 *
 * ## Why `level` names the children, not the parent
 *
 * The request says *what to return* (`level`) and *where from* (`parentId`). Naming
 * the child level means the parent level is derived rather than supplied, so there
 * is exactly one valid parent level per request — which is what makes "every
 * transition validates parent-child relationship" a single lookup instead of a
 * matrix of combinations to police.
 *
 * ## Why `parentId` is optional but almost never omitted
 *
 * Omitting it means "my entry points", which is only meaningful for the
 * organization level: an institution has no parent, so listing the institutions the
 * caller may enter is a well-formed question. For every other level the parent *is*
 * the question — "all programs" is not something the walk defines — and the
 * omission is refused.
 *
 * That rule is enforced in the service rather than by a decorator, because it is a
 * statement about the hierarchy rather than about the string in the field. Keeping
 * it in the domain means it is testable without HTTP, and means a future level
 * added to the hierarchy inherits it instead of needing a new validator.
 *
 * ## Why the DTO reuses the reporting scope enum
 *
 * `ReportingScopeTypeDto` already names these levels for the metric read. A second
 * enum would be a second vocabulary for the same six things, and the two would
 * drift — so the drill-down validates against the same one and a test pins the two
 * to each other.
 */
export class DrilldownQueryDto {
  @ApiProperty({
    enum: ReportingScopeTypeDto,
    description:
      'The level of the nodes to return. The parent level is derived from it.',
  })
  @IsEnum(ReportingScopeTypeDto)
  level!: ReportingScopeTypeDto;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'The node whose children are wanted. Required for every level except ORGANIZATION, where omitting it means "the institutions I may enter".',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

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
    description: 'Page size for the children list',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
