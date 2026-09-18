import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningActivityStatusDto } from './learning-activity-status.dto';

export class LearningActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  meetingId!: string;

  @ApiProperty({ format: 'uuid' })
  activityTypeId!: string;

  @ApiProperty({ example: 1 })
  sequence!: number;

  @ApiProperty({ example: 'Membaca modul 1' })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  instructions!: string | null;

  @ApiProperty({ example: false })
  required!: boolean;

  @ApiPropertyOptional({ nullable: true })
  availableFrom!: string | null;

  @ApiPropertyOptional({ nullable: true })
  availableUntil!: string | null;

  @ApiProperty({ enum: LearningActivityStatusDto, example: 'DRAFT' })
  status!: LearningActivityStatusDto;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-25T00:00:00.000Z' })
  updatedAt!: string;
}

export class LearningActivityListResponseDto {
  @ApiProperty({ type: () => [LearningActivityResponseDto] })
  data!: LearningActivityResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class ReorderLearningActivitiesResponseDto {
  @ApiProperty({ type: () => [LearningActivityResponseDto] })
  data!: LearningActivityResponseDto[];

  @ApiProperty({ example: 3 })
  total!: number;
}
