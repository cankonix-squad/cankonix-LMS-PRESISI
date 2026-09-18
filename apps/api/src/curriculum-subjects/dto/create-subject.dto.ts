import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SubjectStatusDto } from './subject-status.dto';

export class CreateSubjectDto {
  @ApiProperty({ example: 'MATH' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Matematika' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Mata pelajaran matematika dasar' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: SubjectStatusDto,
    default: SubjectStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubjectStatusDto)
  status?: SubjectStatusDto;
}
