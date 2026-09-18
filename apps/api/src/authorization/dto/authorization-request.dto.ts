import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PERMISSION_CODE_PATTERN,
  ROLE_CODE_INPUT_PATTERN,
} from '../permission-code';
import { RoleStatusDto } from './role-status.dto';

export class CreateRoleDto {
  @ApiProperty({
    example: 'AKADEMIK_ADMIN',
    description:
      'Label unik untuk manusia. Authorization tidak pernah membaca nilai ini.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(ROLE_CODE_INPUT_PATTERN, {
    message:
      'code must start with a letter and contain only letters, digits and underscores',
  })
  code!: string;

  @ApiProperty({ example: 'Administrator Akademik' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: RoleStatusDto,
    default: RoleStatusDto.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RoleStatusDto)
  status?: RoleStatusDto;

  @ApiPropertyOptional({
    format: 'uuid',
    isArray: true,
    description:
      'Permission awal yang langsung diberikan ke role ini. Harus sudah ada di katalog permission.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['permissionIds'] as const),
) {}

export class ListRolesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: RoleStatusDto })
  @IsOptional()
  @IsEnum(RoleStatusDto)
  status?: RoleStatusDto;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class CreatePermissionDto {
  @ApiProperty({
    example: 'academic.program.read',
    description:
      'Format <domain>.<resource>.<action> dengan segmen huruf kecil.',
  })
  @IsString()
  @MaxLength(100)
  @Matches(PERMISSION_CODE_PATTERN, {
    message:
      'code must follow <domain>.<resource>.<action> using lowercase segments',
  })
  code!: string;

  @ApiProperty({ example: 'Lihat Program Pendidikan' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['AKADEMIK_ADMIN'],
    description:
      'Role code yang diberi permission ini. Role yang belum ada dilewati, bukan dibuat.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  grantToRoleCodes?: string[];
}

export class ListPermissionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
