import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { AssignmentStatusDto } from './assignment-status.dto';

export class CreateEducatorAssignmentDto {
  @ApiProperty({
    description: 'Person who teaches',
    example: '66666666-6666-6666-6666-666666666666',
  })
  @IsUUID()
  @IsNotEmpty()
  personId!: string;

  @ApiProperty({
    description: 'Class subject (delivery instance) being taught',
    example: '55555555-5555-5555-5555-555555555555',
  })
  @IsUUID()
  @IsNotEmpty()
  classSubjectId!: string;

  @ApiProperty({
    description: 'Data-driven educator type, e.g. GADIK / PENGUJI',
    example: '88888888-8888-8888-8888-888888888888',
  })
  @IsUUID()
  @IsNotEmpty()
  educatorTypeId!: string;

  @ApiProperty({
    description: 'Assignment validity start date',
    example: '2026-10-01',
  })
  @IsDateString()
  validFrom!: string;

  @ApiPropertyOptional({
    description: 'Assignment validity end date (optional until ended)',
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
