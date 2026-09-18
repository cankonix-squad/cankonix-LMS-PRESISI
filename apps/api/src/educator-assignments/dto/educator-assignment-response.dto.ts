import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatusDto } from './assignment-status.dto';

export class EducatorAssignmentResponseDto {
  @ApiProperty({ example: '99999999-9999-9999-9999-999999999999' })
  id!: string;

  @ApiProperty({ example: '66666666-6666-6666-6666-666666666666' })
  personId!: string;

  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  classSubjectId!: string;

  @ApiProperty({ example: '88888888-8888-8888-8888-888888888888' })
  educatorTypeId!: string;

  @ApiProperty({ example: '2026-10-01' })
  validFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  validUntil!: string | null;

  @ApiProperty({ enum: AssignmentStatusDto, example: 'ACTIVE' })
  status!: AssignmentStatusDto;

  @ApiProperty({ example: '2026-09-22T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-22T00:00:00.000Z' })
  updatedAt!: string;
}

export class EducatorAssignmentListResponseDto {
  @ApiProperty({ type: () => [EducatorAssignmentResponseDto] })
  data!: EducatorAssignmentResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
