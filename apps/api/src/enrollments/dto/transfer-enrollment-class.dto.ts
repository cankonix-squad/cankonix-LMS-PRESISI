import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class TransferEnrollmentClassDto {
  @ApiProperty({
    description:
      'Target class within the same batch. Must belong to the enrollment batch.',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  academicClassId!: string;

  @ApiPropertyOptional({
    description: 'Reason recorded in the audit trail',
    example: 'Penyeimbangan jumlah peserta antar kelas',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
