import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  activityId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional link into the assessment domain.',
  })
  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Server-authoritative deadline. Omit to leave it unset.',
  })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxScore?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  attemptsAllowed?: number;
}
