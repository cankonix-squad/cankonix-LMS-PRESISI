import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentStatusDto } from './assessment-status.dto';

export class AssessmentResponseDto {
  @ApiProperty({ example: '99999999-9999-4999-8999-999999999999' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  classSubjectId!: string;

  @ApiProperty({ format: 'uuid' })
  assessmentTypeId!: string;

  @ApiProperty({ example: 'Kuis 1 — Dasar Hukum' })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({
    example: 100,
    description:
      'Denominator every score for this assessment is measured against',
  })
  maxScore!: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 30,
    description: 'Null means the assessment is not yet weighted',
  })
  weight!: number | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  availableFrom!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  availableUntil!: string | null;

  @ApiProperty({ enum: AssessmentStatusDto, example: 'DRAFT' })
  status!: AssessmentStatusDto;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  updatedAt!: string;
}

export class AssessmentListResponseDto {
  @ApiProperty({ type: () => [AssessmentResponseDto] })
  data!: AssessmentResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
