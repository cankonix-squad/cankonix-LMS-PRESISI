import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScopeTypeDto, UserRoleAssignmentStatusDto } from './scope-type.dto';

export class ScopeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty({ enum: ScopeTypeDto })
  scopeType!: ScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  scopeId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class RoleAssignmentRoleSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isSystem!: boolean;
}

export class UserRoleAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userAccountId!: string;

  @ApiProperty({ format: 'uuid' })
  roleId!: string;

  @ApiProperty({ type: () => RoleAssignmentRoleSummaryDto })
  role!: RoleAssignmentRoleSummaryDto;

  @ApiProperty()
  validFrom!: string;

  @ApiPropertyOptional()
  validUntil!: string | null;

  @ApiProperty({ enum: UserRoleAssignmentStatusDto })
  status!: UserRoleAssignmentStatusDto;

  @ApiProperty({ type: [ScopeResponseDto] })
  scopes!: ScopeResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UserRoleAssignmentListResponseDto {
  @ApiProperty({ type: [UserRoleAssignmentResponseDto] })
  data!: UserRoleAssignmentResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class EffectiveScopeDto {
  @ApiProperty({ enum: ScopeTypeDto })
  scopeType!: ScopeTypeDto;

  @ApiProperty({ format: 'uuid' })
  scopeId!: string;
}

export class EffectivePermissionResponseDto {
  @ApiProperty({ description: 'The verified permission code' })
  code!: string;

  @ApiProperty({
    description:
      'True if permission is granted with no scope boundaries (unrestricted / national access)',
  })
  isUnrestricted!: boolean;

  @ApiProperty({
    type: [EffectiveScopeDto],
    description:
      'Scopes within which this permission is active. Empty if isUnrestricted is true or caller has no scope boundaries.',
  })
  scopes!: EffectiveScopeDto[];
}

export class UserEffectivePermissionsResponseDto {
  @ApiProperty({ format: 'uuid' })
  userAccountId!: string;

  @ApiProperty({ type: [EffectivePermissionResponseDto] })
  permissions!: EffectivePermissionResponseDto[];
}

export class PermissionEvaluationResultDto {
  @ApiProperty()
  allowed!: boolean;

  @ApiPropertyOptional({ description: 'Explanation or reason if denied' })
  reason?: string;
}
