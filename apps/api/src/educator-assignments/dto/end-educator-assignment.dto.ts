import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class EndEducatorAssignmentDto {
  @ApiPropertyOptional({
    description: 'Validity end date; defaults to today when omitted',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
