import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationProgramStatusDto } from './education-program-status.dto';

export class EducationProgramResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: EducationProgramStatusDto })
  status!: EducationProgramStatusDto;
  @ApiPropertyOptional({ nullable: true }) metadata!: unknown;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class EducationProgramListResponseDto {
  @ApiProperty({ type: [EducationProgramResponseDto] })
  data!: EducationProgramResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
