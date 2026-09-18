import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AcademicScheduleModeDto,
  AcademicScheduleStatusDto,
} from './academic-schedule-status.dto';

export class AcademicScheduleResponseDto {
  @ApiProperty({ example: 'abcabcab-abca-4bca-8bca-abcabcabcabc' })
  id!: string;

  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  classSubjectId!: string;

  @ApiProperty({ example: 'Sesi 1 — Pengantar' })
  title!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Pembukaan' })
  description!: string | null;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  startAt!: string;

  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  endAt!: string;

  @ApiProperty({ enum: AcademicScheduleModeDto, example: 'FACE_TO_FACE' })
  mode!: AcademicScheduleModeDto;

  @ApiPropertyOptional({ nullable: true, example: 'Ruang A-101' })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  url!: string | null;

  @ApiProperty({ enum: AcademicScheduleStatusDto, example: 'SCHEDULED' })
  status!: AcademicScheduleStatusDto;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown;

  @ApiProperty({ example: '2026-09-23T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-23T00:00:00.000Z' })
  updatedAt!: string;
}

export class AcademicScheduleListResponseDto {
  @ApiProperty({ type: () => [AcademicScheduleResponseDto] })
  data!: AcademicScheduleResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
