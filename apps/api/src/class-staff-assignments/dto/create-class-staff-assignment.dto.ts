import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AssignmentStatusDto } from '../../educator-assignments/dto/assignment-status.dto';
import { StaffTypeExamples } from './staff-type.dto';

export class CreateClassStaffAssignmentDto {
  @ApiProperty({
    description: 'Person taking the class staff role',
    example: '66666666-6666-6666-6666-666666666666',
  })
  @IsUUID()
  @IsNotEmpty()
  personId!: string;

  @ApiProperty({
    description: 'Class the staff role applies to',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  @IsNotEmpty()
  academicClassId!: string;

  @ApiProperty({
    description:
      'Data-driven staff type code, e.g. WALI_KELAS, ADMIN_KELAS. Not an enum: the institution owns this vocabulary.',
    example: StaffTypeExamples[0],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  staffType!: string;

  @ApiProperty({
    description: 'Validity start date',
    example: '2026-10-01',
  })
  @IsDateString()
  validFrom!: string;

  @ApiPropertyOptional({
    description: 'Validity end date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Initial assignment status',
    enum: AssignmentStatusDto,
    default: AssignmentStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AssignmentStatusDto)
  status?: AssignmentStatusDto;
}
