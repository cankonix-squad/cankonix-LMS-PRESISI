import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AcademicClassStatus } from './academic-class-status.dto';

export class ListAcademicClassesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by EducationBatch ID',
  })
  @IsOptional()
  @IsUUID()
  educationBatchId?: string;

  @ApiPropertyOptional({
    description: 'Filter by EducationProgram ID',
  })
  @IsOptional()
  @IsUUID()
  educationProgramId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Organization ID',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: AcademicClassStatus,
  })
  @IsOptional()
  @IsEnum(AcademicClassStatus)
  status?: AcademicClassStatus;

  @ApiPropertyOptional({
    description: 'Search term for code or name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
