import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssessmentStatusDto } from './assessment-status.dto';

export class ChangeAssessmentStatusDto {
  @ApiProperty({ enum: AssessmentStatusDto })
  @IsEnum(AssessmentStatusDto)
  status!: AssessmentStatusDto;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
