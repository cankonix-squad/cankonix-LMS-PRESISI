import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class EndPersonOrganizationDto {
  @ApiPropertyOptional({
    format: 'date',
    description: 'Defaults to the current date when omitted',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
