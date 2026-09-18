import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FILE_NAMESPACES } from '../object-key';

export class InitiateUploadDto {
  @ApiProperty({
    description: 'Server-side namespace the file belongs to',
    enum: FILE_NAMESPACES,
    example: 'learning-content',
  })
  @IsEnum(FILE_NAMESPACES)
  namespace!: string;

  @ApiProperty({
    description:
      'Client filename. Stored only as sanitized display metadata; it never becomes part of the object key.',
    example: 'Modul 1.pdf',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;

  @ApiProperty({
    description: 'MIME type; must be on the configured upload policy',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty({
    description: 'Declared size in bytes; validated against the policy',
    minimum: 0,
    example: 204800,
  })
  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @ApiPropertyOptional({
    description: 'Optional client-provided checksum (e.g. SHA-256 hex)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;
}
