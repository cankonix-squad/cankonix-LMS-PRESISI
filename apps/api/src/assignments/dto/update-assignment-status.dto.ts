import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssignmentLifecycleStatusDto } from './assignment-status.dto';
import { ListAssignmentsQueryDto } from './list-assignments-query.dto';

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: AssignmentLifecycleStatusDto })
  @IsEnum(AssignmentLifecycleStatusDto)
  status!: AssignmentLifecycleStatusDto;
}

export class ListAssignmentsWithScopeQueryDto extends ListAssignmentsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  educationBatchId?: string;

  @ApiPropertyOptional({ description: 'Free-text search over the title.' })
  @IsOptional()
  @IsString()
  search?: string;
}
