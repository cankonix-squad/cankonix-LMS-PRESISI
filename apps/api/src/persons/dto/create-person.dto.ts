import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreatePersonDto {
  @ApiProperty({ example: '87012345' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  personnelNumber!: string;

  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @ApiPropertyOptional({ example: 'AKP' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rank?: string;

  @ApiPropertyOptional({ example: 'Penyidik' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'budi.santoso@polri.go.id' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+628123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    enum: PersonStatusDto,
    default: PersonStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PersonStatusDto)
  status?: PersonStatusDto;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
