import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EducationProgramStatusDto } from './education-program-status.dto';

export class CreateEducationProgramDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ example: 'P1' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Program Pendidikan Dasar' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Deskripsi singkat program pendidikan' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: EducationProgramStatusDto,
    default: EducationProgramStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EducationProgramStatusDto)
  status?: EducationProgramStatusDto;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
