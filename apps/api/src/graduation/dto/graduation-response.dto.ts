import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GraduationComponentTypeDto,
  GraduationRuleStatusDto,
} from './graduation.dto';

export class GraduationRuleComponentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  graduationRuleId!: string;

  @ApiProperty({ enum: GraduationComponentTypeDto })
  componentType!: GraduationComponentTypeDto;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional({ nullable: true })
  thresholdValue?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  subjectId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assessmentId?: string | null;

  @ApiProperty()
  required!: boolean;

  @ApiProperty()
  sortOrder!: number;
}

export class GraduationRuleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  educationBatchId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Monotonic version within (batch, code)' })
  version!: number;

  @ApiProperty({ enum: GraduationRuleStatusDto })
  status!: GraduationRuleStatusDto;

  @ApiPropertyOptional({ nullable: true })
  publishedAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  publishedByUserId?: string | null;

  @ApiProperty({ type: [GraduationRuleComponentResponseDto] })
  components!: GraduationRuleComponentResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class GraduationRuleListResponseDto {
  @ApiProperty({ type: [GraduationRuleResponseDto] })
  data!: GraduationRuleResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class GraduationEvaluationDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: GraduationComponentTypeDto })
  componentType!: GraduationComponentTypeDto;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional({ nullable: true })
  observedValue?: number | null;

  @ApiPropertyOptional({ nullable: true })
  thresholdValue?: number | null;

  @ApiProperty()
  passed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;
}

export class GraduationEvaluationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  graduationRuleId!: string;

  @ApiProperty({
    enum: ['PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE', 'SUPERSEDED'],
  })
  outcome!: string;

  @ApiProperty()
  evaluatedAt!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  evaluatedByUserId?: string | null;

  /**
   * The frozen inputs and thresholds behind the verdict. Returned as-is so a
   * reviewer can reproduce the outcome without re-querying live data.
   */
  @ApiProperty({ type: 'object', additionalProperties: true })
  snapshot!: Record<string, unknown>;

  @ApiProperty({ type: [GraduationEvaluationDetailResponseDto] })
  details!: GraduationEvaluationDetailResponseDto[];
}

export class BatchEvaluationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  educationBatchId!: string;

  @ApiProperty({ format: 'uuid' })
  graduationRuleId!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty({ description: 'Evaluations whose outcome is ELIGIBLE' })
  eligible!: number;

  @ApiProperty({ description: 'Evaluations whose outcome is NOT_ELIGIBLE' })
  notEligible!: number;

  @ApiProperty({ type: [GraduationEvaluationResponseDto] })
  results!: GraduationEvaluationResponseDto[];
}
