import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { LearningMeetingStatusDto } from './learning-meeting-status.dto';

export class ChangeLearningMeetingStatusDto {
  @ApiProperty({ enum: LearningMeetingStatusDto, example: 'PUBLISHED' })
  @IsEnum(LearningMeetingStatusDto)
  status!: LearningMeetingStatusDto;

  @ApiPropertyOptional({
    description: 'Optional operator note stored in the audit trail',
    example: 'Materi sudah lengkap',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Reordering takes the complete ordered list of a class subject's meetings. A
 * partial list would leave the untouched meetings with stale sequence numbers and
 * produce duplicates, so the contract requires the whole set: the caller states
 * the final order, and the service assigns 1..N.
 */
export class ReorderLearningMeetingsDto {
  @ApiProperty({
    description: 'Class subject whose meetings are being reordered',
    example: '55555555-5555-5555-5555-555555555555',
  })
  @IsUUID()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({
    description:
      'Every meeting of the class subject, in the desired order. Must contain exactly the current meetings, no more and no fewer.',
    type: [String],
    example: [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  orderedMeetingIds!: string[];
}
