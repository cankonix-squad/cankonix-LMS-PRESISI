import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GraduationDecisionOutcomeDto,
  GraduationDecisionStatusDto,
} from './graduation-decision.dto';

/**
 * The evaluation a decision rests on, flattened for display.
 *
 * Returned alongside the decision so a reviewer can see *why* it was taken
 * without a second request. The snapshot is the evaluation's own frozen inputs,
 * not a recomputation, so it cannot drift from the decision it explains.
 */
export class GraduationDecisionEvaluationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  graduationRuleId!: string;

  @ApiProperty({ enum: ['PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE', 'SUPERSEDED'] })
  outcome!: string;

  @ApiProperty()
  evaluatedAt!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  snapshot!: Record<string, unknown>;
}

export class GraduationDecisionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  graduationEvaluationId!: string;

  @ApiProperty({ enum: GraduationDecisionOutcomeDto })
  decision!: GraduationDecisionOutcomeDto;

  @ApiProperty({ enum: GraduationDecisionStatusDto })
  status!: GraduationDecisionStatusDto;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  decidedByUserId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  decidedAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  approvedByUserId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  revokedByUserId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  revokedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  revokedReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: GraduationDecisionEvaluationDto })
  evaluation?: GraduationDecisionEvaluationDto;
}

export class GraduationDecisionListResponseDto {
  @ApiProperty({ type: [GraduationDecisionResponseDto] })
  data!: GraduationDecisionResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
