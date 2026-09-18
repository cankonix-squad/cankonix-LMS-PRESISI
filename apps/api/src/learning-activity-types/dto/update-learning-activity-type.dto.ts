import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LearningActivityTypeStatusDto } from './learning-activity-type-status.dto';

export class UpdateLearningActivityTypeDto {
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Whether an activity of this type must have at least one published content before it can be published',
  })
  @IsOptional()
  @IsBoolean()
  requiresContent?: boolean;

  @ApiPropertyOptional({ enum: LearningActivityTypeStatusDto })
  @IsOptional()
  @IsEnum(LearningActivityTypeStatusDto)
  status?: LearningActivityTypeStatusDto;
}
