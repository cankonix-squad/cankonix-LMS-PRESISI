import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnrollmentStatusDto } from './enrollment-status.dto';

/**
 * Withdrawal and completion are modelled as status transitions so the education
 * history row is never deleted.
 */
export class UpdateEnrollmentStatusDto {
  @ApiProperty({
    description: 'Target enrollment status',
    enum: EnrollmentStatusDto,
  })
  @IsEnum(EnrollmentStatusDto)
  status!: EnrollmentStatusDto;

  @ApiPropertyOptional({
    description: 'Reason recorded in the audit trail',
    example: 'Peserta mengundurkan diri',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
