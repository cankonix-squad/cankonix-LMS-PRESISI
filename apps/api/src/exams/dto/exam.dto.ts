import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class BlueprintRuleDto {
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() questionBankId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() questionTypeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() topic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() difficulty?: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) count!: number;
  @ApiProperty({ minimum: 0.01 }) @IsInt() @Min(1) pointsPerQuestion!: number;
}

export class CreateExamDto {
  @ApiProperty() @IsUUID() assessmentId!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;
  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptsAllowed?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleOptions?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showResultImmediately?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() timeZone?: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}
export class CreateBlueprintDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ type: [BlueprintRuleDto] })
  @ValidateNested({ each: true })
  @Type(() => BlueprintRuleDto)
  rules!: BlueprintRuleDto[];
}
export class ChangeExamStatusDto {
  @ApiProperty({
    enum: ['VALIDATED', 'SCHEDULED', 'CLOSED', 'ARCHIVED', 'DRAFT'],
  })
  @IsString()
  status!: string;
}
