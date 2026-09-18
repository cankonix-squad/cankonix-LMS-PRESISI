import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EnrollmentStatusDto } from './enrollment-status.dto';

export class CreateEnrollmentDto {
  @ApiProperty({
    description: 'Person joining the batch',
    example: '66666666-6666-6666-6666-666666666666',
  })
  @IsUUID()
  @IsNotEmpty()
  personId!: string;

  @ApiProperty({
    description: 'Batch the person is enrolled in',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  @IsNotEmpty()
  educationBatchId!: string;

  @ApiPropertyOptional({
    description: 'Optional class within the batch',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({
    description: 'Institutional enrollment number',
    example: 'ENR-2026-0001',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  enrollmentNumber?: string;

  @ApiPropertyOptional({
    description: 'Enrollment date (defaults to today)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  enrolledAt?: string;

  @ApiPropertyOptional({
    description: 'Initial enrollment status',
    enum: EnrollmentStatusDto,
    default: EnrollmentStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatusDto)
  status?: EnrollmentStatusDto;

  @ApiPropertyOptional({
    description: 'Flexible enrollment metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
