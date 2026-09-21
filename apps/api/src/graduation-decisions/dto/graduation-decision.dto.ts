import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum GraduationDecisionOutcomeDto {
  PASS = 'PASS',
  FAIL = 'FAIL',
  REMEDIAL = 'REMEDIAL',
  WITHDRAWN = 'WITHDRAWN',
}

export enum GraduationDecisionStatusDto {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  REVOKED = 'REVOKED',
}

/**
 * Records a decision against a graduation evaluation.
 *
 * `graduationEvaluationId` is required and validated as a UUID: the acceptance
 * criterion "no decision without evaluation" is enforced structurally — there is
 * no code path that creates a decision without naming the evaluation it rests
 * on. Whether that evaluation exists is checked in the domain layer, where the
 * "must not be superseded" rule lives.
 */
export class CreateGraduationDecisionDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The evaluation this decision is taken against',
  })
  @IsUUID()
  graduationEvaluationId!: string;

  @ApiProperty({ enum: GraduationDecisionOutcomeDto })
  @IsEnum(GraduationDecisionOutcomeDto)
  decision!: GraduationDecisionOutcomeDto;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  decidedByUserId?: string | null;
}

export class ApproveGraduationDecisionDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  approvedByUserId?: string | null;
}

export class RevokeGraduationDecisionDto {
  @ApiProperty({
    maxLength: 1000,
    description: 'Why the decision is withdrawn',
  })
  @IsString()
  @MaxLength(1000)
  revokedReason!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  revokedByUserId?: string | null;
}

/**
 * Corrects the verdict of a decision that is already in force.
 *
 * A correction is not a new decision row: the evaluation is the evidence, and it
 * has not changed, so the row keeps its identity and only its verdict moves. The
 * previous verdict is captured by the audit trail rather than discarded.
 */
export class CorrectGraduationDecisionDto {
  @ApiProperty({ enum: GraduationDecisionOutcomeDto })
  @IsEnum(GraduationDecisionOutcomeDto)
  decision!: GraduationDecisionOutcomeDto;

  @ApiProperty({ maxLength: 1000, description: 'Why the verdict is corrected' })
  @IsString()
  @MaxLength(1000)
  note!: string;
}

export class ListGraduationDecisionsQueryDto {
  @ApiPropertyOptional({ enum: GraduationDecisionStatusDto })
  @IsOptional()
  @IsEnum(GraduationDecisionStatusDto)
  status?: GraduationDecisionStatusDto;

  @ApiPropertyOptional({ enum: GraduationDecisionOutcomeDto })
  @IsOptional()
  @IsEnum(GraduationDecisionOutcomeDto)
  decision?: GraduationDecisionOutcomeDto;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
