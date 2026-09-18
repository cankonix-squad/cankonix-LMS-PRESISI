import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssignmentSubmissionStatusDto } from './assignment-submission-status.dto';
import { ListAssignmentsQueryDto } from './list-assignments-query.dto';

export class ListSubmissionsQueryDto extends ListAssignmentsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @ApiPropertyOptional({ enum: AssignmentSubmissionStatusDto })
  @IsOptional()
  @IsEnum(AssignmentSubmissionStatusDto)
  submissionStatus?: AssignmentSubmissionStatusDto;
}

export class SubmitAssignmentDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The assignment being submitted to.',
  })
  @IsUUID()
  assignmentId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      "The participant's own enrollment. Authorization resolves the person " +
      'through this enrollment, so a participant can only submit as themselves.',
  })
  @IsUUID()
  enrollmentId!: string;

  @ApiPropertyOptional({
    description: 'The participant answer. Required when no file is attached.',
  })
  @IsOptional()
  @IsString()
  textAnswer?: string;
}

export class UpdateSubmissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textAnswer?: string;
}

export class AttachSubmissionFileDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Id of an already-uploaded, confirmed file from the file management service.',
  })
  @IsUUID()
  storedFileId!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  label?: string;
}
