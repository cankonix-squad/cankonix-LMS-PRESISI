import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum CertificateTemplateStatusDto {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateCertificateTemplateDto {
  @ApiProperty({
    maxLength: 64,
    description: 'Stable code within an institution',
  })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 512,
    description:
      'Object-storage key of the template artwork (TASK-022). Binaries never live in PostgreSQL.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  templateObjectKey?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Non-secret presentation settings (field list, wording, layout)',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}

export class UpdateCertificateTemplateDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  templateObjectKey?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}

export class ChangeCertificateTemplateStatusDto {
  @ApiProperty({ enum: CertificateTemplateStatusDto })
  @IsEnum(CertificateTemplateStatusDto)
  status!: CertificateTemplateStatusDto;
}

export class ListCertificateTemplatesQueryDto {
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({ enum: CertificateTemplateStatusDto })
  @IsOptional()
  @IsEnum(CertificateTemplateStatusDto)
  status?: CertificateTemplateStatusDto;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Creates a new version of an existing template code.
 *
 * The code is taken from the path, not the body, so a caller cannot silently
 * create a differently-coded template by passing a mismatched pair.
 */
export class CreateCertificateTemplateVersionDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  templateObjectKey?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}
