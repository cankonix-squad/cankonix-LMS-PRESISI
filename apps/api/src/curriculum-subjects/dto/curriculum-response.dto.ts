import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurriculumStatusDto } from './curriculum-status.dto';

export class CurriculumResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  educationProgramId!: string;

  @ApiProperty() version!: string;

  @ApiProperty() name!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  effectiveFrom!: string | null;

  @ApiProperty({ enum: CurriculumStatusDto })
  status!: CurriculumStatusDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class CurriculumListResponseDto {
  @ApiProperty({ type: [CurriculumResponseDto] })
  data!: CurriculumResponseDto[];

  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
