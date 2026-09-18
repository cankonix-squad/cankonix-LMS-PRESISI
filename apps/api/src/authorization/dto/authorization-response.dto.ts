import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleStatusDto } from './role-status.dto';

export class PermissionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'academic.program.read' }) code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'AKADEMIK_ADMIN' }) code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({
    description:
      'Role sistem tidak dapat dihapus, tidak dapat dinonaktifkan, dan tidak dapat diubah code-nya.',
  })
  isSystem!: boolean;
  @ApiProperty({ enum: RoleStatusDto }) status!: RoleStatusDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class RoleDetailResponseDto extends RoleResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];
}

export class RoleListResponseDto {
  @ApiProperty({ type: [RoleResponseDto] }) data!: RoleResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export class PermissionListResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  data!: PermissionResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export class RolePermissionResponseDto {
  @ApiProperty({ format: 'uuid' }) roleId!: string;
  @ApiProperty({ format: 'uuid' }) permissionId!: string;
  @ApiProperty({
    enum: ['granted', 'already_granted', 'removed', 'already_removed'],
    description:
      'Idempotent outcome: mengulang operasi yang sama tidak mengubah state.',
  })
  outcome!: 'granted' | 'already_granted' | 'removed' | 'already_removed';
}

export class PermissionSeedResponseDto {
  @ApiProperty({ type: PermissionResponseDto })
  permission!: PermissionResponseDto;
  @ApiProperty({
    description:
      'Diisi hanya bila role dengan code tersebut sudah ada. Seed tidak membuat role.',
  })
  grantedToRoles!: string[];
  @ApiProperty({
    description: 'Role code yang diminta tetapi belum ada di database.',
  })
  skippedRoleCodes!: string[];
}
