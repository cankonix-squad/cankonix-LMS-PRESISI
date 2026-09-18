import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ManualGradeDto {
  @ApiProperty({ minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  graderPersonId!: string;
}
