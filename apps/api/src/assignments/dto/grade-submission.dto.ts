import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Grade payload.
 *
 * `score` is validated 0..`maxScore` in the service, not here, because the
 * ceiling is a property of the assignment this submission belongs to and cannot
 * be known from the request body alone.
 */
export class GradeSubmissionDto {
  @ApiProperty({
    type: Number,
    minimum: 0,
    description: 'Score for this attempt. Must be 0..assignment.maxScore.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;

  @ApiPropertyOptional({
    description:
      'When true, the grade is released to the participant (submission becomes RETURNED).',
    default: false,
  })
  @IsOptional()
  returnToParticipant?: boolean;
}
