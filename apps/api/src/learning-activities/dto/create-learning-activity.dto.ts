import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { LearningActivityStatusDto } from './learning-activity-status.dto';

export class CreateLearningActivityDto {
  @ApiProperty({ description: 'Owning learning meeting', format: 'uuid' })
  @IsUUID()
  meetingId!: string;

  @ApiProperty({ description: 'Data-driven activity type', format: 'uuid' })
  @IsUUID()
  activityTypeId!: string;

  @ApiPropertyOptional({
    description:
      'Order inside the meeting. Omit to append after the last activity.',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiProperty({ example: 'Membaca modul 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 5000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Whether the activity must be completed to finish the meeting',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({ enum: LearningActivityStatusDto, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(LearningActivityStatusDto)
  status?: LearningActivityStatusDto;
}
