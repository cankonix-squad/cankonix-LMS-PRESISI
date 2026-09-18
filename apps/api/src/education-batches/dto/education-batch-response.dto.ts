import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationBatchStatusDto } from './education-batch-status.dto';

export class EducationBatchResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) educationProgramId!: string;
  @ApiProperty({ format: 'uuid' }) curriculumId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'date-time' }) startDate!: string;
  @ApiProperty({ format: 'date-time' }) endDate!: string;
  @ApiProperty({ enum: EducationBatchStatusDto })
  status!: EducationBatchStatusDto;
  @ApiPropertyOptional({ nullable: true }) capacity!: number | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class EducationBatchListResponseDto {
  @ApiProperty({ type: [EducationBatchResponseDto] })
  data!: EducationBatchResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
