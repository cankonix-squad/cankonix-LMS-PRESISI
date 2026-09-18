import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PersonStatusDto } from './person-status.dto';

export class UpdatePersonDto {
  @ApiPropertyOptional({ example: '87012345' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  personnelNumber?: string;

  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: 'AKP', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rank?: string | null;

  @ApiPropertyOptional({ example: 'Penyidik', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string | null;

  @ApiPropertyOptional({ example: 'budi.santoso@polri.go.id', nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+628123456789', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ enum: PersonStatusDto })
  @IsOptional()
  @IsEnum(PersonStatusDto)
  status?: PersonStatusDto;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown> | null;
}
