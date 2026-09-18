import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One audit entry as returned by the read API.
 *
 * `before`/`after` are already redacted by the time they reach this DTO: the
 * service masks secret-looking fields on the way out as well as on the way in, so
 * a payload persisted by an older build cannot leak through the read path.
 */
export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Actor account. `null` for system/background actions. Historical: the account may no longer exist.',
  })
  actorUserAccountId!: string | null;

  @ApiProperty({ example: 'role_assignment.created' })
  action!: string;

  @ApiProperty({ example: 'role_assignment' })
  resourceType!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Resource id as a string; not necessarily a UUID.',
  })
  resourceId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  organizationId!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Redacted state snapshot before the mutation.',
  })
  before!: unknown;

  @ApiProperty({
    nullable: true,
    description: 'Redacted state snapshot after the mutation.',
  })
  after!: unknown;

  @ApiProperty({
    nullable: true,
    description: 'Redacted supplementary context.',
  })
  metadata!: unknown;

  @ApiPropertyOptional({ nullable: true }) ipAddress!: string | null;

  @ApiPropertyOptional({ nullable: true }) userAgent!: string | null;

  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data!: AuditLogResponseDto[];

  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
