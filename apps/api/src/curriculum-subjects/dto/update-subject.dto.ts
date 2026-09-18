import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubjectStatusDto } from './subject-status.dto';

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'BIO' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'Biologi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Deskripsi baru' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: SubjectStatusDto })
  @IsOptional()
  @IsEnum(SubjectStatusDto)
  status?: SubjectStatusDto;
}
