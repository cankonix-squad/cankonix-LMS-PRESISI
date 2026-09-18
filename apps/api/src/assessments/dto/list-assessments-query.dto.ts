import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AssessmentStatusDto } from './assessment-status.dto';

export class ListAssessmentsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by class subject',
  })
  @IsOptional()
  @IsUUID()
  classSubjectId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by the class the class subject belongs to',
  })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by subject' })
  @IsOptional()
  @IsUUID()
  curriculumSubjectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assessmentTypeId?: string;

  @ApiPropertyOptional({ enum: AssessmentStatusDto })
  @IsOptional()
  @IsEnum(AssessmentStatusDto)
  status?: AssessmentStatusDto;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
