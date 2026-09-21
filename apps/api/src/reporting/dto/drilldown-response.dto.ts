import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportingScopeTypeDto } from './reporting-query.dto';
import { ReportingMetricsResponseDto } from './reporting-response.dto';

/**
 * One node of the drill-down walk (TASK-062).
 *
 * `metrics` is nullable and that is the important part of this DTO. A branch can
 * exist in the hierarchy without ever having been refreshed, and reporting `0`
 * participants for it would be a statement the data does not support — a genuinely
 * empty class and an un-refreshed class look identical from outside, and only one
 * of them means "nobody is enrolled".
 *
 * So the response says `null`, and the client says "not yet reported", which is the
 * truth.
 */
export class DrilldownChildResponseDto {
  @ApiProperty({ enum: ReportingScopeTypeDto })
  level!: ReportingScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  name?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'The institution code, for levels that have one',
  })
  code?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'The immediate parent, as the domain records it',
  })
  parentId?: string | null;

  @ApiProperty({ description: 'How many nodes sit one level below this one' })
  childCount!: number;

  @ApiProperty({
    description:
      'Whether this node has anything below it. Derived from childCount, so a node with children is always expandable and one without never is.',
  })
  hasChildren!: boolean;

  @ApiPropertyOptional({
    type: ReportingMetricsResponseDto,
    nullable: true,
    description:
      'Stored metrics for this node, or null when the scope has never been refreshed. Null is not zero.',
  })
  metrics?: ReportingMetricsResponseDto | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date-time',
    description: 'When this node was last recomputed, or null if never',
  })
  recalculatedAt?: string | null;
}

/** One breadcrumb entry of the walk. */
export class DrilldownTrailEntryResponseDto {
  @ApiProperty({ enum: ReportingScopeTypeDto })
  level!: ReportingScopeTypeDto;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'Null for the level being listed, which has no node yet',
  })
  id?: string | null;
}

export class DrilldownListResponseDto {
  @ApiProperty({ enum: ReportingScopeTypeDto })
  level!: ReportingScopeTypeDto;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  parentId?: string | null;

  @ApiPropertyOptional({
    enum: ReportingScopeTypeDto,
    nullable: true,
    description:
      'The parent level, derived from `level`. Null when standing at the entry points.',
  })
  parentLevel?: ReportingScopeTypeDto | null;

  @ApiProperty({
    type: [DrilldownTrailEntryResponseDto],
    description: 'The levels above this one, for a breadcrumb',
  })
  trail!: DrilldownTrailEntryResponseDto[];

  @ApiProperty({
    enum: ReportingScopeTypeDto,
    isArray: true,
    description:
      'Levels the caller may open from here. Offered so a client cannot present a door that will be refused.',
  })
  openableLevels!: ReportingScopeTypeDto[];

  @ApiProperty({ type: [DrilldownChildResponseDto] })
  data!: DrilldownChildResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
