import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcademicClassStatus } from './academic-class-status.dto';

export class AcademicClassResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the AcademicClass',
    example: '22222222-2222-2222-2222-222222222222',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the EducationBatch this class belongs to',
    example: '11111111-1111-1111-1111-111111111111',
  })
  educationBatchId!: string;

  @ApiProperty({
    description: 'Class code unique within the batch',
    example: 'KLS-A',
  })
  code!: string;

  @ApiProperty({
    description: 'Class display name',
    example: 'Kelas A Reserse',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Class capacity limit',
    example: 30,
    nullable: true,
  })
  capacity?: number | null;

  @ApiProperty({
    description: 'Class status',
    enum: AcademicClassStatus,
    example: AcademicClassStatus.ACTIVE,
  })
  status!: AcademicClassStatus;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-09-19T00:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-09-19T00:00:00.000Z',
  })
  updatedAt!: string;
}

export class AcademicClassListMetaDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class AcademicClassListResponseDto {
  @ApiProperty({ type: () => [AcademicClassResponseDto] })
  data!: AcademicClassResponseDto[];

  @ApiProperty({ type: () => AcademicClassListMetaDto })
  meta!: AcademicClassListMetaDto;
}
