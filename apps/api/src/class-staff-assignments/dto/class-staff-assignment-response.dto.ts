import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatusDto } from '../../educator-assignments/dto/assignment-status.dto';

export class ClassStaffAssignmentResponseDto {
  @ApiProperty({ example: '99999999-9999-9999-9999-999999999999' })
  id!: string;

  @ApiProperty({ example: '66666666-6666-6666-6666-666666666666' })
  personId!: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  academicClassId!: string;

  @ApiProperty({ example: 'WALI_KELAS' })
  staffType!: string;

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

export class ClassStaffAssignmentListResponseDto {
  @ApiProperty({ type: () => [ClassStaffAssignmentResponseDto] })
  data!: ClassStaffAssignmentResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
