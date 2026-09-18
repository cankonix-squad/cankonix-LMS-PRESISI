import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentTypeStatusDto } from './assessment-type-status.dto';

export class AssessmentTypeResponseDto {
  @ApiProperty({ example: '99999999-9999-4999-8999-999999999999' })
  id!: string;

  @ApiProperty({ example: 'QUIZ' })
  code!: string;

  @ApiProperty({ example: 'Kuis' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: AssessmentTypeStatusDto, example: 'ACTIVE' })
  status!: AssessmentTypeStatusDto;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  updatedAt!: string;
}

export class AssessmentTypeListResponseDto {
  @ApiProperty({ type: () => [AssessmentTypeResponseDto] })
  data!: AssessmentTypeResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 6 })
  total!: number;
}
