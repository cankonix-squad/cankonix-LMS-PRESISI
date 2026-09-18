import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ClassSubjectStatus } from './class-subject-status.dto';

/**
 * A delivery instance is bound to its class and curriculum entry for life:
 * moving it would silently re-point learning, exam, and grading history.
 * To re-map a subject, retire this row and create a new one.
 */
export class UpdateClassSubjectDto {
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
    description: 'Delivery status',
    enum: ClassSubjectStatus,
  })
  @IsOptional()
  @IsEnum(ClassSubjectStatus)
  status?: ClassSubjectStatus;
}
