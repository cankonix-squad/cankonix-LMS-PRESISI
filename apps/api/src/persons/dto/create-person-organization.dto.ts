import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePersonOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Kasi Binlat' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  positionName?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Defaults to the current date when omitted',
    example: '2026-09-16',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'When true the placement becomes the single active primary placement',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
