import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionVersionStatusDto } from './question-version-status.dto';

/** ACTIVE/INACTIVE pair shared by every controlled vocabulary in the project. */
export const QuestionStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type QuestionStatusDto =
  (typeof QuestionStatusDto)[keyof typeof QuestionStatusDto];

/**
 * One answer choice.
 *
 * `key` is stable inside its version and is what the scoring rule refers to, so
 * it survives an option being relabelled. `isCorrect` is server-only data: it is
 * accepted on input and stored, but the student-safe projection strips it before
 * a question is ever handed to a participant.
 */
export class QuestionOptionDto {
  @ApiProperty({ example: 'A', maxLength: 16 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  key!: string;

  @ApiProperty({ example: 'Undang-Undang Dasar 1945', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  label!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Server-only. Never serialized into a student-facing payload.',
  })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 99999.99,
    nullable: true,
    description:
      'Optional per-option points, used by weighted scoring rules. Server-only.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999.99)
  value?: number;

  @ApiPropertyOptional({ default: 0, description: 'Display order' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

/**
 * The editable content of a question version.
 *
 * `scoringRule` is deliberately an opaque object: a multiple-choice key, an
 * essay rubric and a numeric tolerance all fit in the same column, and the shape
 * is validated by the service against the selected question type rather than by
 * a rigid DTO. It is server-only.
 */
export class QuestionVersionInputDto {
  @ApiProperty({ description: 'Question text shown to the participant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  stem!: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Machine-readable answer key. Server-only; required once the version is published for an option-based type.',
  })
  @IsOptional()
  @IsObject()
  scoringRule?: Record<string, unknown>;

  @ApiPropertyOptional({
    maxLength: 10000,
    nullable: true,
    description: 'Shown only after grading. Server-only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  explanation?: string;

  @ApiPropertyOptional({ maxLength: 32, nullable: true, example: 'EASY' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  difficulty?: string;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  topic?: string;

  @ApiProperty({ minimum: 0.01, maximum: 99999.99, example: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999.99)
  maxScore!: number;

  @ApiPropertyOptional({ type: [QuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}

export class CreateQuestionDto extends QuestionVersionInputDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Data-driven question type, e.g. the seeded SINGLE_CHOICE',
  })
  @IsUUID()
  questionTypeId!: string;

  @ApiPropertyOptional({
    maxLength: 64,
    description: 'Optional human reference, unique within the bank',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code?: string;
}

export class UpdateQuestionVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  stem?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  scoringRule?: Record<string, unknown>;

  @ApiPropertyOptional({ maxLength: 10000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  explanation?: string | null;

  @ApiPropertyOptional({ maxLength: 32, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  difficulty?: string | null;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  topic?: string | null;

  @ApiPropertyOptional({ minimum: 0.01, maximum: 99999.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999.99)
  maxScore?: number;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description:
      'Replaces the whole option set when present. Rejected once the version is published.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}

/**
 * A new version is always authored as DRAFT: publishing is what freezes it and
 * supersedes the previous published version, so it stays a separate, deliberate
 * action rather than a side effect of creating the row.
 */
export class CreateQuestionVersionDto extends QuestionVersionInputDto {}

export class PublishQuestionVersionDto {
  @ApiProperty({ enum: [QuestionVersionStatusDto.PUBLISHED] })
  @IsEnum({ PUBLISHED: QuestionVersionStatusDto.PUBLISHED })
  status!: typeof QuestionVersionStatusDto.PUBLISHED;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  questionTypeId?: string;

  @ApiPropertyOptional({ maxLength: 64, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @ApiPropertyOptional({ enum: QuestionStatusDto })
  @IsOptional()
  @IsEnum(QuestionStatusDto)
  status?: QuestionStatusDto;
}

export class ListQuestionsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  questionTypeId?: string;

  @ApiPropertyOptional({ enum: QuestionStatusDto })
  @IsOptional()
  @IsEnum(QuestionStatusDto)
  status?: QuestionStatusDto;

  @ApiPropertyOptional({ enum: QuestionVersionStatusDto })
  @IsOptional()
  @IsEnum(QuestionVersionStatusDto)
  versionStatus?: QuestionVersionStatusDto;

  @ApiPropertyOptional({ description: 'Matches question code or version stem' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class ListQuestionTypesQueryDto {
  @ApiPropertyOptional({ enum: QuestionStatusDto })
  @IsOptional()
  @IsEnum(QuestionStatusDto)
  status?: QuestionStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
