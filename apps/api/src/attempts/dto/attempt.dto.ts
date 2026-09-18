import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsUUID, Min } from 'class-validator';
export class StartAttemptDto {
  @ApiProperty() @IsUUID() participantId!: string;
}
export class AttemptIdDto {
  @ApiProperty() @IsUUID() id!: string;
}
export class SaveAttemptAnswerDto {
  @ApiProperty({ type: Object })
  @IsObject()
  answerPayload!: Record<string, unknown>;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
}
