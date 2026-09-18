import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionVersionStatusDto } from './question-version-status.dto';
import { QuestionBankStatusDto } from './question-bank.dto';
import { QuestionStatusDto } from './question.dto';

export class QuestionBankResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  curriculumSubjectId!: string;

  @ApiProperty({ example: 'TWK-DASAR' })
  code!: string;

  @ApiProperty({ example: 'Bank Soal TWK Dasar' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: QuestionBankStatusDto, example: 'ACTIVE' })
  status!: QuestionBankStatusDto;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  updatedAt!: string;
}

export class QuestionBankListResponseDto {
  @ApiProperty({ type: () => [QuestionBankResponseDto] })
  data!: QuestionBankResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class QuestionTypeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'SINGLE_CHOICE' })
  code!: string;

  @ApiProperty({ example: 'Pilihan Ganda' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: true })
  hasOptions!: boolean;

  @ApiProperty({ example: false })
  multiSelect!: boolean;

  @ApiProperty({ enum: QuestionBankStatusDto, example: 'ACTIVE' })
  status!: QuestionBankStatusDto;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  updatedAt!: string;
}

export class QuestionTypeListResponseDto {
  @ApiProperty({ type: () => [QuestionTypeResponseDto] })
  data!: QuestionTypeResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;
}

/** Full option, including the server-only answer key. Educator/tooling only. */
export class QuestionOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'A' })
  key!: string;

  @ApiProperty({ example: 'Undang-Undang Dasar 1945' })
  label!: string;

  @ApiProperty({ example: true, description: 'Server-only field' })
  isCorrect!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  value!: number | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

export class QuestionVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: 'Sebutkan dasar hukum...' })
  stem!: string;

  @ApiPropertyOptional({ nullable: true, type: Object })
  scoringRule!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  explanation!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'EASY' })
  difficulty!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Dasar Hukum' })
  topic!: string | null;

  @ApiProperty({ example: 1 })
  maxScore!: number;

  @ApiProperty({ enum: QuestionVersionStatusDto, example: 'DRAFT' })
  status!: QuestionVersionStatusDto;

  @ApiProperty({ type: () => [QuestionOptionResponseDto] })
  options!: QuestionOptionResponseDto[];

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  updatedAt!: string;
}

/**
 * Question as an educator sees it: the identity plus the newest version.
 *
 * `versionCount` and `latestVersion.version` together tell an author whether the
 * question has a history worth inspecting; the exact historical version an
 * attempt used is resolved by the exam runtime (TASK-044), not here.
 */
export class QuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  questionBankId!: string;

  @ApiProperty({ format: 'uuid' })
  questionTypeId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Q-001' })
  code!: string | null;

  @ApiProperty({ enum: QuestionStatusDto, example: 'ACTIVE' })
  status!: QuestionStatusDto;

  @ApiProperty({ example: 2, description: 'How many versions exist in total' })
  versionCount!: number;

  @ApiPropertyOptional({
    type: () => QuestionVersionResponseDto,
    nullable: true,
  })
  latestVersion!: QuestionVersionResponseDto | null;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  updatedAt!: string;
}

export class QuestionListResponseDto {
  @ApiProperty({ type: () => [QuestionResponseDto] })
  data!: QuestionResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 10 })
  total!: number;
}

export class QuestionVersionPublishResponseDto {
  @ApiProperty({ type: () => QuestionVersionResponseDto })
  version!: QuestionVersionResponseDto;

  @ApiPropertyOptional({
    type: () => QuestionVersionResponseDto,
    nullable: true,
    description: 'The version this publication replaced, if any',
  })
  superseded!: QuestionVersionResponseDto | null;
}

/* -------------------------------------------------------------------------- */
/* Student-safe projection                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A student-facing answer choice.
 *
 * It is a DIFFERENT type from `QuestionOptionResponseDto`, not a subset built by
 * deleting fields at serialization time. That is the whole point: `isCorrect`
 * and `value` are not properties of this class at all, so there is no code path
 * — present or future — that can leak them by spreading a full record into the
 * response. See `question-banks.test.cjs`, which asserts the projection contains
 * no forbidden key at any depth.
 */
export class StudentQuestionOptionDto {
  @ApiProperty({ example: 'A' })
  key!: string;

  @ApiProperty({ example: 'Undang-Undang Dasar 1945' })
  label!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

/**
 * A student-facing question.
 *
 * Deliberately absent: `scoringRule`, `explanation`, and the option answer key.
 * The stem and the option labels are the only question content a participant may
 * see, and `maxScore` is omitted too so the weighting cannot be reverse
 * engineered from the payload.
 */
export class StudentQuestionDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty({ format: 'uuid' })
  versionId!: string;

  @ApiProperty({ example: 1, description: 'Pinned version of the question' })
  version!: number;

  @ApiProperty({ example: 'Sebutkan dasar hukum...' })
  stem!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Dasar Hukum' })
  topic!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'EASY' })
  difficulty!: string | null;

  @ApiProperty({ type: () => [StudentQuestionOptionDto] })
  options!: StudentQuestionOptionDto[];
}

export class StudentQuestionListResponseDto {
  @ApiProperty({ type: () => [StudentQuestionDto] })
  data!: StudentQuestionDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 10 })
  total!: number;
}
