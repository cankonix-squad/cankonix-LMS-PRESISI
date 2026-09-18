import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScopeTypeDto, UserRoleAssignmentStatusDto } from './scope-type.dto';

export class ScopeInputDto {
  @ApiProperty({ enum: ScopeTypeDto })
  @IsEnum(ScopeTypeDto)
  scopeType!: ScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  scopeId!: string;
}

export class CreateUserRoleAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  userAccountId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  roleId!: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 start timestamp. Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end timestamp. Optional.' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ type: [ScopeInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeInputDto)
  scopes?: ScopeInputDto[];
}

export class AddScopesDto {
  @ApiProperty({ type: [ScopeInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeInputDto)
  scopes!: ScopeInputDto[];
}

export class UpdateUserRoleAssignmentStatusDto {
  @ApiProperty({ enum: UserRoleAssignmentStatusDto })
  @IsEnum(UserRoleAssignmentStatusDto)
  status!: UserRoleAssignmentStatusDto;
}

export class ListUserRoleAssignmentsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  userAccountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  @ApiPropertyOptional({ enum: UserRoleAssignmentStatusDto })
  @IsOptional()
  @IsEnum(UserRoleAssignmentStatusDto)
  status?: UserRoleAssignmentStatusDto;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class EvaluatePermissionQueryDto {
  @ApiPropertyOptional({ enum: ScopeTypeDto })
  @IsOptional()
  @IsEnum(ScopeTypeDto)
  scopeType?: ScopeTypeDto;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  scopeId?: string;
}
