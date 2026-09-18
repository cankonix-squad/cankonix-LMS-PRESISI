import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LearningActivityTypeStatusDto } from './learning-activity-type-status.dto';

export class CreateLearningActivityTypeDto {
  @ApiProperty({
    description:
      'Stable code used by integrations and publish validation, e.g. READING, UPLOAD, DISCUSSION',
    example: 'READING',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Display name', example: 'Bacaan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: 'Explanation of when this activity type applies',
    example: 'Materi bacaan mandiri sebelum pertemuan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /**
   * Per-type publish rule. A type that carries material (reading, upload,
   * video) must say so here, otherwise the publish validation would have to
   * hardcode a list of type codes — exactly the branching the data-driven
   * design exists to avoid.
   */
  @ApiPropertyOptional({
    description:
      'Whether an activity of this type must have at least one published content before it can be published',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  requiresContent?: boolean;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: LearningActivityTypeStatusDto,
    default: LearningActivityTypeStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(LearningActivityTypeStatusDto)
  status?: LearningActivityTypeStatusDto;
}
