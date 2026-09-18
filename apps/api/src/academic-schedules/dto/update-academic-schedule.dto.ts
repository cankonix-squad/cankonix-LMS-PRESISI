import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  AcademicScheduleModeDto,
  AcademicScheduleStatusDto,
} from './academic-schedule-status.dto';

/**
 * `classSubjectId` is intentionally absent: re-pointing a schedule would move
 * history between classes. Cancel it and create a new one instead.
 */
export class UpdateAcademicScheduleDto {
  @ApiPropertyOptional({ example: 'Sesi 1 — Pengantar (revisi)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Pembukaan dan kontrak belajar' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-10-01T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-10-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ enum: AcademicScheduleModeDto })
  @IsOptional()
  @IsEnum(AcademicScheduleModeDto)
  mode?: AcademicScheduleModeDto;

  @ApiPropertyOptional({ example: 'Ruang A-102' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.example.id/kelas-a' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional({ enum: AcademicScheduleStatusDto })
  @IsOptional()
  @IsEnum(AcademicScheduleStatusDto)
  status?: AcademicScheduleStatusDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
