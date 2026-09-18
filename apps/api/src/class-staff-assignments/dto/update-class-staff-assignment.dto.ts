import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AssignmentStatusDto } from '../../educator-assignments/dto/assignment-status.dto';

/**
 * Person, class, and staff type are not editable: re-pointing an assignment
 * would rewrite history. End it and create a new one.
 */
export class UpdateClassStaffAssignmentDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ enum: AssignmentStatusDto })
  @IsOptional()
  @IsEnum(AssignmentStatusDto)
  status?: AssignmentStatusDto;
}
