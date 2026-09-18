import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Status of a question bank.
 *
 * Reuses the same ACTIVE/INACTIVE pair as every other controlled vocabulary in
 * the project. A bank is never deleted — only retired — because questions
 * underneath may still be referenced by historical attempts. Deactivating hides
 * the bank from new exam blueprints while leaving the history readable.
 */
export const QuestionBankStatusDto = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type QuestionBankStatusDto =
  (typeof QuestionBankStatusDto)[keyof typeof QuestionBankStatusDto];

export class CreateQuestionBankDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Curriculum subject that owns this bank',
  })
  @IsUUID()
  curriculumSubjectId!: string;

  @ApiProperty({
    description: 'Stable short code, unique within the curriculum subject',
    example: 'TWK-DASAR',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Bank Soal TWK Dasar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: QuestionBankStatusDto, default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(QuestionBankStatusDto)
  status?: QuestionBankStatusDto;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Free-form integration metadata. Never holds participant data or answer keys.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateQuestionBankDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: QuestionBankStatusDto })
  @IsOptional()
  @IsEnum(QuestionBankStatusDto)
  status?: QuestionBankStatusDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListQuestionBanksQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  curriculumSubjectId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by the curriculum that owns the subject',
  })
  @IsOptional()
  @IsUUID()
  curriculumId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ enum: QuestionBankStatusDto })
  @IsOptional()
  @IsEnum(QuestionBankStatusDto)
  status?: QuestionBankStatusDto;

  @ApiPropertyOptional({ description: 'Matches code or name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  limit?: number;
}
