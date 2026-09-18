import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AcademicClassStatus } from './academic-class-status.dto';

export class CreateAcademicClassDto {
  @ApiProperty({
    description: 'Unique identifier of the EducationBatch owning this class',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  @IsNotEmpty()
  educationBatchId!: string;

  @ApiProperty({
    description: 'Class code unique within the batch',
    example: 'KLS-A',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Class display name',
    example: 'Kelas A Reserse',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Maximum student capacity for this class (non-negative)',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'capacity must not be negative' })
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Initial class status',
    enum: AcademicClassStatus,
    default: AcademicClassStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AcademicClassStatus)
  status?: AcademicClassStatus;
}
