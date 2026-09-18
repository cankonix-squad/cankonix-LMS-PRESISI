import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatusDto } from './enrollment-status.dto';

export class EnrollmentResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the enrollment',
    example: '77777777-7777-7777-7777-777777777777',
  })
  id!: string;

  @ApiProperty({ example: '66666666-6666-6666-6666-666666666666' })
  personId!: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  educationBatchId!: string;

  @ApiPropertyOptional({
    description: 'Class within the batch, when assigned',
    example: '22222222-2222-2222-2222-222222222222',
    nullable: true,
  })
  academicClassId!: string | null;

  @ApiPropertyOptional({
    description: 'Institutional enrollment number',
    example: 'ENR-2026-0001',
    nullable: true,
  })
  enrollmentNumber!: string | null;

  @ApiProperty({ example: '2026-10-01' })
  enrolledAt!: string;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatusDto,
    example: EnrollmentStatusDto.ACTIVE,
  })
  status!: EnrollmentStatusDto;

  @ApiPropertyOptional({
    description: 'Completion date, set when the status becomes COMPLETED',
    example: '2027-03-31',
    nullable: true,
  })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  metadata!: unknown;

  @ApiProperty({ example: '2026-09-21T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-21T00:00:00.000Z' })
  updatedAt!: string;
}

export class EnrollmentListResponseDto {
  @ApiProperty({ type: () => [EnrollmentResponseDto] })
  data!: EnrollmentResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 15 })
  total!: number;
}
