import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AttendanceSummaryScopeType } from '@prisma/client';

export class RefreshAttendanceSummaryDto {
  @ApiProperty({ enum: AttendanceSummaryScopeType })
  @IsEnum(AttendanceSummaryScopeType)
  scopeType!: AttendanceSummaryScopeType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scopeId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  classSubjectId?: string;
}
