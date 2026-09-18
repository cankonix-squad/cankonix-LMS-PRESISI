import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  AcademicScheduleModeDto,
  AcademicScheduleStatusDto,
} from './academic-schedule-status.dto';

export class CreateAcademicScheduleDto {
  @ApiProperty({
    description: 'Class subject (delivery instance) the activity belongs to',
    example: '55555555-5555-5555-5555-555555555555',
  })
  @IsUUID()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({ example: 'Sesi 1 — Pengantar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Pembukaan dan kontrak belajar' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Activity start (ISO 8601 with timezone offset)',
    example: '2026-10-01T08:00:00.000Z',
  })
  @IsDateString()
  startAt!: string;

  @ApiProperty({
    description: 'Activity end; must be strictly after startAt',
    example: '2026-10-01T10:00:00.000Z',
  })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({
    enum: AcademicScheduleModeDto,
    default: AcademicScheduleModeDto.FACE_TO_FACE,
  })
  @IsOptional()
  @IsEnum(AcademicScheduleModeDto)
  mode?: AcademicScheduleModeDto;

  @ApiPropertyOptional({
    description:
      'Room or site; required for FACE_TO_FACE unless a url is given',
    example: 'Ruang A-101',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description: 'Meeting link; required for ONLINE unless a location is given',
    example: 'https://meet.example.id/kelas-a',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional({
    enum: AcademicScheduleStatusDto,
    default: AcademicScheduleStatusDto.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(AcademicScheduleStatusDto)
  status?: AcademicScheduleStatusDto;

  @ApiPropertyOptional({
    description:
      'Free-form additional context, e.g. agenda or required reading',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
