import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum GraduationComponentTypeDto {
  ATTENDANCE_PERCENTAGE = 'ATTENDANCE_PERCENTAGE',
  FINAL_SCORE = 'FINAL_SCORE',
  REQUIRED_SUBJECT = 'REQUIRED_SUBJECT',
  FINAL_EXAM = 'FINAL_EXAM',
}

export enum GraduationRuleStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * One requirement inside a graduation rule.
 *
 * The conditional requirements (a `REQUIRED_SUBJECT` needs a `subjectId`, a
 * `FINAL_EXAM` needs an `assessmentId`) are validated in the domain layer by
 * `validateRuleComponents`, because they depend on `componentType` rather than
 * on a single field — a concern class-validator expresses poorly and the domain
 * already owns.
 */
export class GraduationRuleComponentDto {
  @ApiProperty({ enum: GraduationComponentTypeDto })
  @IsEnum(GraduationComponentTypeDto)
  componentType!: GraduationComponentTypeDto;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  thresholdValue?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  subjectId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assessmentId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateGraduationRuleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  educationBatchId!: string;

  @ApiProperty({ maxLength: 64, description: 'Stable code within the batch' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({ type: [GraduationRuleComponentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GraduationRuleComponentDto)
  components!: GraduationRuleComponentDto[];
}

export class UpdateGraduationRuleDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class ChangeGraduationRuleStatusDto {
  @ApiProperty({ enum: GraduationRuleStatusDto })
  @IsEnum(GraduationRuleStatusDto)
  status!: GraduationRuleStatusDto;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Acting user account id, required when publishing',
  })
  @IsOptional()
  @IsUUID()
  publishedByUserId?: string | null;
}

export class ListGraduationRulesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  educationBatchId?: string;

  @ApiPropertyOptional({ enum: GraduationRuleStatusDto })
  @IsOptional()
  @IsEnum(GraduationRuleStatusDto)
  status?: GraduationRuleStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

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

export class EvaluateEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  enrollmentId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Rule to evaluate against; defaults to the latest published rule',
  })
  @IsOptional()
  @IsUUID()
  graduationRuleId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  evaluatedByUserId?: string | null;
}

export class EvaluateBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  educationBatchId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Rule to evaluate against; defaults to the latest published rule',
  })
  @IsOptional()
  @IsUUID()
  graduationRuleId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  evaluatedByUserId?: string | null;
}
