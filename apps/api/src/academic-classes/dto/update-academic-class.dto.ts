import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AcademicClassStatus } from './academic-class-status.dto';

export class UpdateAcademicClassDto {
  @ApiPropertyOptional({
    description: 'Class code unique within the batch',
    example: 'KLS-A-REVISI',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({
    description: 'Class display name',
    example: 'Kelas A Reserse Unggulan',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Maximum student capacity for this class (non-negative)',
    example: 35,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'capacity must not be negative' })
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Class status',
    enum: AcademicClassStatus,
  })
  @IsOptional()
  @IsEnum(AcademicClassStatus)
  status?: AcademicClassStatus;
}
