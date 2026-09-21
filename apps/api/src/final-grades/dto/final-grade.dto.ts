import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CalculateFinalGradeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classSubjectId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gradingSchemeId!: string;
}

export class ApproveFinalGradeDto {
  @ApiProperty({ format: 'uuid', description: 'Acting user account id' })
  @IsUUID()
  approvedByUserId!: string;
}

export class ReopenFinalGradeDto {
  @ApiProperty({ format: 'uuid', description: 'Acting user account id' })
  @IsUUID()
  reopenedByUserId!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
