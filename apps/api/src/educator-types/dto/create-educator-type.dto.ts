import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EducatorTypeStatusDto } from './educator-type-status.dto';

export class CreateEducatorTypeDto {
  @ApiProperty({
    description:
      'Stable code used by integrations, e.g. GADIK, INSTRUKTUR, PENGUJI',
    example: 'GADIK',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Display name', example: 'Gadik (Pendidik)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: 'Explanation of when this educator type applies',
    example: 'Tenaga pendidik tetap pada program pendidikan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: EducatorTypeStatusDto,
    default: EducatorTypeStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EducatorTypeStatusDto)
  status?: EducatorTypeStatusDto;
}
