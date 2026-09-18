import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  CreatePermissionDto,
  CreateRoleDto,
  ListPermissionsQueryDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from './dto/authorization-request.dto';
import {
  PermissionListResponseDto,
  PermissionResponseDto,
  PermissionSeedResponseDto,
  RoleDetailResponseDto,
  RoleListResponseDto,
  RolePermissionResponseDto,
  RoleResponseDto,
} from './dto/authorization-response.dto';
import { RoleStatusDto } from './dto/role-status.dto';
import {
  isValidPermissionCode,
  isValidRoleCode,
  normalizeCode,
  normalizePermissionCode,
  PERMISSION_WILDCARD_ACTION,
} from './permission-code';
import {
  AUTHORIZATION_REPOSITORY,
  AuthorizationRepository,
} from './authorization.repository';
import {
  PermissionRecord,
  RoleRecord,
  RoleUpdateData,
} from './authorization.types';

/**
 * RBAC catalog management.
 *
 * This service manages *definitions*: roles, permissions, and which permission
 * belongs to which role. It deliberately exposes no `hasPermission` helper —
 * effective authorization depends on assignments and scopes and arrives with
 * the role-assignment task. Business logic must decide through permissions and
 * scopes, never by comparing a role code.
 *
 * Every mutation of the authorization catalogue is audited: changing what a role
 * may do, or who holds it, is exactly the class of change that must be
 * attributable afterwards (`docs/05-api-standards.md`, `docs/07-security-standards.md`).
 */
@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(AUTHORIZATION_REPOSITORY)
    private readonly repository: AuthorizationRepository,
    private readonly audit: AuditService,
  ) {}

  async createRole(dto: CreateRoleDto): Promise<RoleDetailResponseDto> {
    const code = this.resolveRoleCode(dto.code);
    if (await this.repository.findRoleByCode(code)) {
      throw new ConflictException(`Role code ${code} is already in use`);
    }

    const permissionIds = await this.resolvePermissionIds(dto.permissionIds);
    const created = await this.repository.createRole(
      {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? RoleStatusDto.ACTIVE,
      },
      permissionIds,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE,
      resourceId: created.id,
      after: roleSnapshot(created),
      metadata: { grantedPermissionIds: permissionIds },
    });

    return this.toDetailResponse(created);
  }
  async listRoles(query: ListRolesQueryDto): Promise<RoleListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.listRoles({
      search: query.search?.trim() || undefined,
      status: query.status,
      page,
      limit,
    });
    return {
      data: result.data.map(toRoleResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findRole(id: string): Promise<RoleDetailResponseDto> {
    return this.toDetailResponse(await this.findRoleOrFail(id));
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
  ): Promise<RoleDetailResponseDto> {
    const role = await this.findRoleOrFail(id);
    const data: RoleUpdateData = {};

    if (dto.code !== undefined) {
      const code = this.resolveRoleCode(dto.code);
      if (code !== role.code) {
        this.assertNotSystemRole(role, 'its code cannot be changed');
        if (await this.repository.findRoleByCode(code)) {
          throw new ConflictException(`Role code ${code} is already in use`);
        }
        data.code = code;
      }
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.status !== undefined && dto.status !== role.status) {
      // Deactivating a system role could silently disable an operational
      // baseline, so a system role may be renamed but never deactivated here.
      this.assertNotSystemRole(role, 'it cannot be deactivated');
      data.status = dto.status;
    }

    const updated = await this.repository.updateRole(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE,
      resourceId: updated.id,
      before: roleSnapshot(role),
      after: roleSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return this.toDetailResponse(updated);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.findRoleOrFail(id);
    this.assertNotSystemRole(role, 'it cannot be deleted');
    await this.repository.deleteRole(id);

    // Recorded after the delete succeeds, and with the role's final state as
    // `before`: the row is gone, so the audit entry is the only remaining record
    // of what was removed.
    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_DELETED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE,
      resourceId: role.id,
      before: roleSnapshot(role),
    });
  }

  async listPermissions(
    query: ListPermissionsQueryDto,
  ): Promise<PermissionListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.listPermissions({
      search: query.search?.trim() || undefined,
      page,
      limit,
    });
    return {
      data: result.data.map(toPermissionResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async createPermission(
    dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const code = this.resolvePermissionCode(dto.code);
    if (await this.repository.findPermissionByCode(code)) {
      throw new ConflictException(`Permission code ${code} is already in use`);
    }
    const created = await this.repository.createPermission({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PERMISSION_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.PERMISSION,
      resourceId: created.id,
      after: permissionSnapshot(created),
    });

    return toPermissionResponse(created);
  }

  /**
   * Registers a permission unless it already exists, then grants it to the
   * requested roles. Safe to re-run: an existing permission is reused instead of
   * failing, and repeated grants are no-ops.
   */
  async seedPermission(
    dto: CreatePermissionDto,
  ): Promise<PermissionSeedResponseDto> {
    const code = this.resolvePermissionCode(dto.code);
    const existing = await this.repository.findPermissionByCode(code);
    const permission =
      existing ??
      (await this.repository.createPermission({
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      }));

    const requestedCodes = [
      ...new Set(
        (dto.grantToRoleCodes ?? []).map((value) => normalizeCode(value)),
      ),
    ];
    const roles = await this.repository.findRolesByCodes(requestedCodes);

    if (roles.length > 0) {
      await this.repository.grantPermissionToRoles(
        roles.map((role) => role.id),
        permission.id,
      );
    }

    // Audited only when the call changed something. A re-run of an idempotent
    // seed must not fill the trail with entries that record no change, or the
    // trail stops distinguishing meaningful grants from noise.
    if (roles.length > 0 || !existing) {
      await this.audit.record({
        action: AUDIT_ACTIONS.ROLE_PERMISSION_GRANTED,
        resourceType: AUDIT_RESOURCE_TYPES.PERMISSION,
        resourceId: permission.id,
        after: {
          permission: permissionSnapshot(permission),
          roleIds: roles.map((role) => role.id),
        },
        metadata: {
          roleCodes: roles.map((role) => role.code).sort(),
          permissionCreated: !existing,
        },
      });
    }

    const grantedCodes = new Set(roles.map((role) => role.code));
    return {
      permission: toPermissionResponse(permission),
      grantedToRoles: [...grantedCodes].sort(),
      // Seeding never invents roles: a typo must surface, not silently create
      // a role with unintended access.
      skippedRoleCodes: requestedCodes
        .filter((requested) => !grantedCodes.has(requested))
        .sort(),
    };
  }

  async listRolePermissions(roleId: string): Promise<PermissionResponseDto[]> {
    await this.findRoleOrFail(roleId);
    const permissions = await this.repository.listRolePermissions(roleId);
    return permissions.map(toPermissionResponse);
  }

  /** Idempotent: granting an already-granted permission reports `already_granted`. */
  async grantPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermissionResponseDto> {
    const role = await this.findRoleOrFail(roleId);
    const permission = await this.findPermissionOrFail(permissionId);
    this.assertAssignable(permission, role);

    const created = await this.repository.grantPermissionToRole(
      role.id,
      permission.id,
    );

    // Audited only on a real state change: an idempotent re-grant that reports
    // `already_granted` changed nothing and would only add noise to the trail.
    if (created) {
      await this.audit.record({
        action: AUDIT_ACTIONS.ROLE_PERMISSION_GRANTED,
        resourceType: AUDIT_RESOURCE_TYPES.ROLE_PERMISSION,
        resourceId: role.id,
        after: {
          roleId: role.id,
          roleCode: role.code,
          permissionId: permission.id,
          permissionCode: permission.code,
        },
      });
    }

    return {
      roleId: role.id,
      permissionId: permission.id,
      outcome: created ? 'granted' : 'already_granted',
    };
  }

  /** Idempotent: revoking an absent grant reports `already_removed`. */
  async revokePermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermissionResponseDto> {
    const role = await this.findRoleOrFail(roleId);
    const permission = await this.findPermissionOrFail(permissionId);

    const removed = await this.repository.revokePermissionFromRole(
      role.id,
      permission.id,
    );

    if (removed) {
      await this.audit.record({
        action: AUDIT_ACTIONS.ROLE_PERMISSION_REVOKED,
        resourceType: AUDIT_RESOURCE_TYPES.ROLE_PERMISSION,
        resourceId: role.id,
        before: {
          roleId: role.id,
          roleCode: role.code,
          permissionId: permission.id,
          permissionCode: permission.code,
        },
      });
    }

    return {
      roleId: role.id,
      permissionId: permission.id,
      outcome: removed ? 'removed' : 'already_removed',
    };
  }

  /** Used by authentication to read the catalogue without touching Prisma. */
  async findRoleOrFail(id: string): Promise<RoleRecord> {
    const role = await this.repository.findRoleById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private async findPermissionOrFail(id: string): Promise<PermissionRecord> {
    const permission = await this.repository.findPermissionById(id);
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  private resolveRoleCode(input: string): string {
    const code = normalizeCode(input);
    if (!isValidRoleCode(code)) {
      throw new BadRequestException(
        'Role code must be 2-64 characters: a leading letter followed by letters, digits or underscores',
      );
    }
    return code;
  }

  private resolvePermissionCode(input: string): string {
    const code = normalizePermissionCode(input);
    if (!isValidPermissionCode(code)) {
      throw new BadRequestException(
        'Permission code must follow <domain>.<resource>.<action>',
      );
    }
    return code;
  }

  private async resolvePermissionIds(ids?: string[]): Promise<string[]> {
    const unique = [...new Set(ids ?? [])];
    if (unique.length === 0) return [];

    // A role created through the API is never a system role, so wildcard
    // permissions are rejected here rather than silently attached.
    for (const id of unique) {
      this.assertAssignable(await this.findPermissionOrFail(id));
    }
    return unique;
  }

  private assertNotSystemRole(role: RoleRecord, reason: string): void {
    if (role.isSystem) {
      throw new ConflictException(
        `Role ${role.code} is a protected system role: ${reason}`,
      );
    }
  }

  /**
   * A wildcard permission (`domain.*.action`) reaches every resource of its
   * domain, so it may only be attached to an explicit system role. This keeps
   * "very broad access" a deliberate, reviewable decision instead of an accident
   * of a role-management screen.
   */
  private assertAssignable(
    permission: PermissionRecord,
    role?: RoleRecord,
  ): void {
    if (!isWildcardPermission(permission.code)) return;
    if (role?.isSystem) return;
    throw new BadRequestException(
      `Wildcard permission ${permission.code} may only be granted to a system role`,
    );
  }

  private async toDetailResponse(
    role: RoleRecord,
  ): Promise<RoleDetailResponseDto> {
    const permissions = await this.repository.listRolePermissions(role.id);
    return {
      ...toRoleResponse(role),
      permissions: permissions.map(toPermissionResponse),
    };
  }
}

/**
 * State snapshot of a role for the audit trail.
 *
 * Only the role's own columns: `permissions` is a relation and is recorded in
 * `metadata` where it is meaningful (grants/revokes), so the snapshot stays a
 * faithful image of this row rather than a partial graph.
 */
function roleSnapshot(role: RoleRecord): Record<string, unknown> {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    status: role.status,
  };
}

function permissionSnapshot(
  permission: PermissionRecord,
): Record<string, unknown> {
  return {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    description: permission.description,
  };
}

function isWildcardPermission(code: string): boolean {
  return code.split('.').includes(PERMISSION_WILDCARD_ACTION);
}

function toRoleResponse(role: RoleRecord): RoleResponseDto {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    status: role.status,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

function toPermissionResponse(
  permission: PermissionRecord,
): PermissionResponseDto {
  return {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    description: permission.description,
    createdAt: permission.createdAt.toISOString(),
    updatedAt: permission.updatedAt.toISOString(),
  };
}
