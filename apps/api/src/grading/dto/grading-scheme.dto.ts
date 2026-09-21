import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum GradingSchemeStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class GradingComponentInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assessmentId!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ minimum: 0, description: 'Percentage weight, > 0' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weight!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateGradingSchemeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classSubjectId!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ enum: GradingSchemeStatusDto })
  @IsOptional()
  @IsEnum(GradingSchemeStatusDto)
  status?: GradingSchemeStatusDto;

  /**
   * Optional inline components. When supplied, their weights must total 100.
   */
  @ApiPropertyOptional({ type: [GradingComponentInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GradingComponentInputDto)
  components?: GradingComponentInputDto[];
}

export class CreateGradingComponentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assessmentId!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ minimum: 0, description: 'Percentage weight, > 0' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weight!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
