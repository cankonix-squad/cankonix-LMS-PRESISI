import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { LearningActivityStatusDto } from './learning-activity-status.dto';

export class ChangeLearningActivityStatusDto {
  @ApiProperty({ enum: LearningActivityStatusDto })
  @IsEnum(LearningActivityStatusDto)
  status!: LearningActivityStatusDto;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * The full ordered plan for one meeting. A partial move list ("put activity X at
 * position 3") needs a displacement rule that is easy to get wrong and produces
 * duplicate sequences under concurrent reordering; stating the complete final
 * order makes the result unambiguous and lets the service validate the request
 * against stored state before writing.
 */
export class ReorderLearningActivitiesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  meetingId!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  orderedActivityIds!: string[];
}
