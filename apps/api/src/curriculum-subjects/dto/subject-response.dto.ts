import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubjectStatusDto } from './subject-status.dto';

export class SubjectResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: SubjectStatusDto }) status!: SubjectStatusDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class SubjectListResponseDto {
  @ApiProperty({ type: [SubjectResponseDto] })
  data!: SubjectResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
