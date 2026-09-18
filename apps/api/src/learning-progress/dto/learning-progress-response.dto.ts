import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningProgressStatusDto } from './learning-progress-status.dto';

export class LearningProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  activityId!: string;

  @ApiProperty({ enum: LearningProgressStatusDto })
  status!: LearningProgressStatusDto;

  @ApiProperty({ minimum: 0, maximum: 100 })
  progressPercent!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastAccessedAt!: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata!: unknown;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class LearningProgressListResponseDto {
  @ApiProperty({ type: [LearningProgressResponseDto] })
  data!: LearningProgressResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

/**
 * A participant's rollup for one class subject.
 *
 * Read from the stored aggregate, never recomputed from history on the request
 * path. `recalculatedAt` is exposed so a consumer can tell how fresh it is.
 */
export class ClassSubjectProgressSummaryDto {
  @ApiProperty({ format: 'uuid' })
  classSubjectId!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty()
  totalActivities!: number;

  @ApiProperty()
  completedActivities!: number;

  @ApiProperty()
  requiredActivities!: number;

  @ApiProperty()
  completedRequiredActivities!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  progressPercent!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastActivityAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  recalculatedAt!: string;
}

export class ClassSubjectProgressSummaryResponseDto {
  @ApiProperty({ type: [ClassSubjectProgressSummaryDto] })
  data!: ClassSubjectProgressSummaryDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

/** Per-meeting rollup, derived from the same rows the class-subject summary uses. */
export class MeetingProgressSummaryDto {
  @ApiProperty({ format: 'uuid' })
  meetingId!: string;

  @ApiProperty()
  totalActivities!: number;

  @ApiProperty()
  completedActivities!: number;

  @ApiProperty()
  requiredActivities!: number;

  @ApiProperty()
  completedRequiredActivities!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  progressPercent!: number;
}

export class ParticipantProgressSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  academicClassId!: string | null;

  @ApiProperty({ format: 'uuid' })
  classSubjectId!: string;

  @ApiProperty({ type: ClassSubjectProgressSummaryDto })
  classSubject!: ClassSubjectProgressSummaryDto;

  @ApiProperty({ type: [MeetingProgressSummaryDto] })
  meetings!: MeetingProgressSummaryDto[];
}
