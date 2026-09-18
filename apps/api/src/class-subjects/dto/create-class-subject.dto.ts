import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ClassSubjectStatus } from './class-subject-status.dto';

export class CreateClassSubjectDto {
  @ApiProperty({
    description: 'AcademicClass that delivers this subject',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  @IsNotEmpty()
  academicClassId!: string;

  @ApiProperty({
    description:
      'CurriculumSubject entry from the curriculum owned by the classroom batch',
    example: '44444444-4444-4444-4444-444444444444',
  })
  @IsUUID()
  @IsNotEmpty()
  curriculumSubjectId!: string;

  @ApiPropertyOptional({
    description: 'Optional delivery code shown to the class',
    example: 'KLS-A-HUKUM',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({
    description: 'Optional display name overriding the subject master name',
    example: 'Hukum Pidana (Kelas A)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Delivery start date',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Delivery end date (must be on or after startDate)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Initial delivery status',
    enum: ClassSubjectStatus,
    default: ClassSubjectStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassSubjectStatus)
  status?: ClassSubjectStatus;
}
