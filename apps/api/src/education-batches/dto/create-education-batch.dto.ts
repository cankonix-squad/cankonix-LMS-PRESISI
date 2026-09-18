import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EducationBatchStatusDto } from './education-batch-status.dto';

export class CreateEducationBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  educationProgramId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  curriculumId!: string;

  @ApiProperty({ example: '2026A' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Angkatan 2026 A' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '2026-08-01' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty({ example: '2026-12-31' })
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiPropertyOptional({
    enum: EducationBatchStatusDto,
    default: EducationBatchStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EducationBatchStatusDto)
  status?: EducationBatchStatusDto;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number | null;
}
