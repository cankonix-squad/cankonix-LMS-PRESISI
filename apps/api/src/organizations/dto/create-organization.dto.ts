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
import { OrganizationStatusDto } from './organization-status.dto';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'LEMDIKLAT' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Lembaga Pendidikan dan Pelatihan Polri' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 'national' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizationType?: string;

  @ApiPropertyOptional({
    enum: OrganizationStatusDto,
    default: OrganizationStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OrganizationStatusDto)
  status?: OrganizationStatusDto;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown>;
}
