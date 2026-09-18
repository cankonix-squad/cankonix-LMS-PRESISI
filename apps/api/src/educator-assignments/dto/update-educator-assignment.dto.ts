import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AssignmentStatusDto } from './assignment-status.dto';

/**
 * Person, class subject, and educator type are not editable: re-pointing an
 * assignment would silently rewrite teaching history. End it and create a new
 * assignment instead.
 */
export class UpdateEducatorAssignmentDto {
  @ApiPropertyOptional({
    description: 'Adjust the validity start date',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Set or adjust the validity end date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Assignment status',
    enum: AssignmentStatusDto,
  })
  @IsOptional()
  @IsEnum(AssignmentStatusDto)
  status?: AssignmentStatusDto;
}
