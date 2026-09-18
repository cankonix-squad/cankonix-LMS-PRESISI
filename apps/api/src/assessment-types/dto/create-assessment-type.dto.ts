import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AssessmentTypeStatusDto } from './assessment-type-status.dto';

export class CreateAssessmentTypeDto {
  @ApiProperty({
    description:
      'Stable code used by integrations and publish validation, e.g. QUIZ, EXAM, ASSIGNMENT, PRACTICAL, OBSERVATION, COMPETENCY',
    example: 'QUIZ',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Display name', example: 'Kuis' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: 'Explanation of when this assessment method applies',
    example: 'Penilaian singkat pada satu topik',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: AssessmentTypeStatusDto,
    default: AssessmentTypeStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AssessmentTypeStatusDto)
  status?: AssessmentTypeStatusDto;
}
