import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
} from 'class-validator';
export enum SessionStatusDto {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}
export enum ParticipantStatusDto {
  INVITED = 'INVITED',
  ELIGIBLE = 'ELIGIBLE',
  DISQUALIFIED = 'DISQUALIFIED',
  COMPLETED = 'COMPLETED',
}
export class CreateSessionDto {
  @ApiProperty() @IsUUID() examId!: string;
  @ApiProperty() @IsDateString() startAt!: string;
  @ApiProperty() @IsDateString() endAt!: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
export class ChangeSessionStatusDto {
  @ApiProperty({ enum: SessionStatusDto })
  @IsEnum(SessionStatusDto)
  status!: SessionStatusDto;
}
export class AddParticipantDto {
  @ApiProperty() @IsUUID() enrollmentId!: string;
  @ApiPropertyOptional({ enum: ParticipantStatusDto })
  @IsOptional()
  @IsEnum(ParticipantStatusDto)
  status?: ParticipantStatusDto;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  accommodations?: Record<string, unknown>;
}
