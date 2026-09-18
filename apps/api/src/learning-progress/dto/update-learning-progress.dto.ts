import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { LearningProgressStatusDto } from './learning-progress-status.dto';

/**
 * Records progress for one activity.
 *
 * `enrollmentId` is part of the request rather than inferred, because progress
 * belongs to an enrollment, not to a user account: the same person may be
 * enrolled in two batches and their progress must not be conflated.
 *
 * `progressPercent` and `status` may be sent together or separately. When only
 * one is sent the service derives the other, so a client cannot produce the
 * contradictory `{ status: 'COMPLETED', progressPercent: 10 }` state.
 */
export class UpdateLearningProgressDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  activityId!: string;

  @ApiPropertyOptional({
    enum: LearningProgressStatusDto,
    description:
      'Coarse lifecycle. When omitted it is derived from progressPercent.',
  })
  @IsOptional()
  @IsEnum(LearningProgressStatusDto)
  status?: LearningProgressStatusDto;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description:
      'Completion of this activity, 0..100. When omitted it is derived from status.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Domain-specific extras, e.g. playback position.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
