import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningMeetingStatusDto } from './learning-meeting-status.dto';

export class LearningMeetingResponseDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  id!: string;

  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  classSubjectId!: string;

  @ApiProperty({ example: 1 })
  sequence!: number;

  @ApiProperty({ example: 'Pertemuan 1 — Pengantar' })
  title!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Kontrak belajar' })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-10-01T08:00:00.000Z' })
  plannedStartAt!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-10-01T10:00:00.000Z' })
  plannedEndAt!: string | null;

  @ApiProperty({ enum: LearningMeetingStatusDto, example: 'DRAFT' })
  status!: LearningMeetingStatusDto;

  @ApiProperty({ example: '2026-09-24T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-24T00:00:00.000Z' })
  updatedAt!: string;
}

export class LearningMeetingListResponseDto {
  @ApiProperty({ type: () => [LearningMeetingResponseDto] })
  data!: LearningMeetingResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: 16 })
  total!: number;
}

export class ReorderLearningMeetingsResponseDto {
  @ApiProperty({ type: () => [LearningMeetingResponseDto] })
  data!: LearningMeetingResponseDto[];

  @ApiProperty({ example: 16 })
  total!: number;
}
