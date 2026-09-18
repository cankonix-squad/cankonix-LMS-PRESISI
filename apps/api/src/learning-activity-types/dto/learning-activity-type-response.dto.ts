import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningActivityTypeStatusDto } from './learning-activity-type-status.dto';

export class LearningActivityTypeResponseDto {
  @ApiProperty({ example: '99999999-9999-4999-8999-999999999999' })
  id!: string;

  @ApiProperty({ example: 'READING' })
  code!: string;

  @ApiProperty({ example: 'Bacaan' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: true })
  requiresContent!: boolean;

  @ApiProperty({ enum: LearningActivityTypeStatusDto, example: 'ACTIVE' })
  status!: LearningActivityTypeStatusDto;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  updatedAt!: string;
}

export class LearningActivityTypeListResponseDto {
  @ApiProperty({ type: () => [LearningActivityTypeResponseDto] })
  data!: LearningActivityTypeResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 4 })
  total!: number;
}
