import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentLifecycleStatusDto } from './assignment-status.dto';
import { AssignmentSubmissionStatusDto } from './assignment-submission-status.dto';

export class AssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  activityId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  assessmentId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  instructions!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dueAt!: string | null;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty()
  attemptsAllowed!: number;

  @ApiProperty({ enum: AssignmentLifecycleStatusDto })
  status!: AssignmentLifecycleStatusDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class AssignmentListResponseDto {
  @ApiProperty({ type: [AssignmentResponseDto] })
  data!: AssignmentResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class SubmissionFileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storedFileId!: string;

  @ApiProperty({ nullable: true })
  label!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  objectKey!: string | null;

  @ApiProperty({ nullable: true })
  originalName!: string | null;

  @ApiProperty({ nullable: true })
  mimeType!: string | null;

  @ApiProperty({ nullable: true })
  sizeBytes!: number | null;
}

export class AssignmentGradeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: Number })
  score!: number;

  @ApiProperty({ format: 'uuid' })
  graderPersonId!: string;

  @ApiProperty({ nullable: true })
  feedback!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  gradedAt!: string;
}

export class SubmissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty()
  attemptNo!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ nullable: true })
  textAnswer!: string | null;

  @ApiProperty()
  isLate!: boolean;

  @ApiProperty({ enum: AssignmentSubmissionStatusDto })
  status!: AssignmentSubmissionStatusDto;

  @ApiProperty({ type: [SubmissionFileResponseDto] })
  files!: SubmissionFileResponseDto[];

  @ApiPropertyOptional({ type: AssignmentGradeResponseDto })
  grade?: AssignmentGradeResponseDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class SubmissionListResponseDto {
  @ApiProperty({ type: [SubmissionResponseDto] })
  data!: SubmissionResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

/** Returned when a participant submits, so the client learns the attempt number. */
export class SubmitResponseDto extends SubmissionResponseDto {
  @ApiProperty({
    description: 'How many attempts of the allowed total are now used.',
  })
  attemptsUsed!: number;

  @ApiProperty()
  attemptsRemaining!: number;
}
