import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CurriculumStatusDto } from './curriculum-status.dto';

export class UpdateCurriculumDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  educationProgramId?: string;

  @ApiPropertyOptional({ example: '2026.2' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string;

  @ApiPropertyOptional({ example: 'Kurikulum 2026 revisi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @ApiPropertyOptional({ enum: CurriculumStatusDto })
  @IsOptional()
  @IsEnum(CurriculumStatusDto)
  status?: CurriculumStatusDto;
}
