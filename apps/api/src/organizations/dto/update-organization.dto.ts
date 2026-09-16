import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'LEMDIKLAT' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({ example: 'Lembaga Pendidikan dan Pelatihan Polri' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 'national', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizationType?: string | null;

  @ApiPropertyOptional({ enum: OrganizationStatusDto })
  @IsOptional()
  @IsEnum(OrganizationStatusDto)
  status?: OrganizationStatusDto;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown> | null;
}
