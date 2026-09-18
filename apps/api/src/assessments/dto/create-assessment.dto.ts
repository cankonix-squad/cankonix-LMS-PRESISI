import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AssessmentStatusDto } from './assessment-status.dto';

/**
 * `maxScore` is the denominator every score for this assessment is expressed
 * against, so it is required and must be positive. `weight` is nullable: it is
 * only meaningful once a grading scheme aggregates several assessments
 * (TASK-050), and a missing weight means "not yet weighted", not zero.
 */
export class CreateAssessmentDto {
  @ApiProperty({ format: 'uuid', description: 'Owning class subject' })
  @IsUUID()
  classSubjectId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Data-driven assessment method, e.g. the seeded QUIZ type',
  })
  @IsUUID()
  assessmentTypeId!: string;

  @ApiProperty({ example: 'Kuis 1 — Dasar Hukum' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ maxLength: 5000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ minimum: 0.01, maximum: 99999.99, example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999.99)
  maxScore!: number;

  @ApiPropertyOptional({
    minimum: 0.01,
    maximum: 999.99,
    nullable: true,
    description:
      'Relative weight used when a grading scheme aggregates assessments. Omit to leave it unweighted.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999.99)
  weight?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  availableUntil?: string;

  @ApiPropertyOptional({ enum: AssessmentStatusDto, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(AssessmentStatusDto)
  status?: AssessmentStatusDto;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Free-form integration metadata. Never holds participant data.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
