import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassSubjectStatus } from './class-subject-status.dto';

export class ClassSubjectResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the ClassSubject delivery instance',
    example: '55555555-5555-5555-5555-555555555555',
  })
  id!: string;

  @ApiProperty({
    description: 'AcademicClass delivering this subject',
    example: '22222222-2222-2222-2222-222222222222',
  })
  academicClassId!: string;

  @ApiProperty({
    description: 'CurriculumSubject entry backing this delivery',
    example: '44444444-4444-4444-4444-444444444444',
  })
  curriculumSubjectId!: string;

  @ApiPropertyOptional({
    description: 'Delivery code shown to the class',
    example: 'KLS-A-HUKUM',
    nullable: true,
  })
  code!: string | null;

  @ApiPropertyOptional({
    description: 'Display name overriding the subject master name',
    example: 'Hukum Pidana (Kelas A)',
    nullable: true,
  })
  displayName!: string | null;

  @ApiPropertyOptional({
    description: 'Delivery start date',
    example: '2026-10-01',
    nullable: true,
  })
  startDate!: string | null;

  @ApiPropertyOptional({
    description: 'Delivery end date',
    example: '2026-12-31',
    nullable: true,
  })
  endDate!: string | null;

  @ApiProperty({
    description: 'Delivery status',
    enum: ClassSubjectStatus,
    example: ClassSubjectStatus.ACTIVE,
  })
  status!: ClassSubjectStatus;

  @ApiProperty({ example: '2026-09-20T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-20T00:00:00.000Z' })
  updatedAt!: string;
}

export class ClassSubjectListResponseDto {
  @ApiProperty({ type: () => [ClassSubjectResponseDto] })
  data!: ClassSubjectResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 12 })
  total!: number;
}
