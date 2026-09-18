import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurriculumStatusDto } from './curriculum-status.dto';

export class CreateCurriculumDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  educationProgramId!: string;

  @ApiProperty({ example: '2026.1' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  version!: string;

  @ApiProperty({ example: 'Kurikulum 2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @ApiPropertyOptional({
    enum: CurriculumStatusDto,
    default: CurriculumStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CurriculumStatusDto)
  status?: CurriculumStatusDto;
}
