import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserAccountsService } from '../user-accounts/user-accounts.service';
import {
  AUTHORIZATION_REPOSITORY,
  AuthorizationRepository,
} from './authorization.repository';
import {
  AddScopesDto,
  CreateUserRoleAssignmentDto,
  ListUserRoleAssignmentsQueryDto,
  UpdateUserRoleAssignmentStatusDto,
} from './dto/role-assignment-request.dto';
import {
  EffectivePermissionResponseDto,
  UserEffectivePermissionsResponseDto,
  UserRoleAssignmentListResponseDto,
  UserRoleAssignmentResponseDto,
} from './dto/role-assignment-response.dto';
import {
  ScopeTypeDto,
  UserRoleAssignmentStatusDto,
} from './dto/scope-type.dto';
import {
  ROLE_ASSIGNMENTS_REPOSITORY,
  RoleAssignmentsRepository,
} from './role-assignments.repository';
import {
  EffectivePermission,
  ScopeInput,
  UserRoleAssignmentRecord,
} from './role-assignment.types';

/**
 * Role assignment and scope binding.
 *
 * Assignment changes are among the most sensitive mutations in the system: they
 * grant or remove access, so every one of them is audited with enough context to
 * reconstruct who held what, over which scope, and for how long.
 */
@Injectable()
export class RoleAssignmentsService {
  constructor(
    @Inject(ROLE_ASSIGNMENTS_REPOSITORY)
    private readonly repository: RoleAssignmentsRepository,
    @Inject(AUTHORIZATION_REPOSITORY)
    private readonly authRepository: AuthorizationRepository,
    private readonly userAccountsService: UserAccountsService,
    private readonly organizationsService: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async createAssignment(
    dto: CreateUserRoleAssignmentDto,
  ): Promise<UserRoleAssignmentResponseDto> {
    await this.userAccountsService.findOne(dto.userAccountId);

    const role = await this.authRepository.findRoleById(dto.roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
    }
    if (role.status !== 'ACTIVE') {
      throw new BadRequestException(`Role ${role.code} is inactive`);
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;

    if (validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    if (dto.scopes && dto.scopes.length > 0) {
      await this.validateScopesExist(dto.scopes);
    }

    const created = await this.repository.createAssignment(
      {
        userAccountId: dto.userAccountId,
        roleId: dto.roleId,
        validFrom,
        validUntil,
        status: UserRoleAssignmentStatusDto.ACTIVE,
      },
      dto.scopes,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT,
      resourceId: created.id,
      after: {
        userAccountId: created.userAccountId,
        roleId: created.roleId,
        roleCode: role.code,
        validFrom: created.validFrom.toISOString(),
        validUntil: created.validUntil?.toISOString() ?? null,
        status: created.status,
        scopes: (created.scopes ?? []).map((scope) => ({
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        })),
      },
    });

    return this.toResponseDto(created);
  }

  async findAssignment(id: string): Promise<UserRoleAssignmentResponseDto> {
    const item = await this.repository.findAssignmentById(id);
    if (!item) {
      throw new NotFoundException(`Role assignment with ID ${id} not found`);
    }
    return this.toResponseDto(item);
  }

  async listAssignments(
    query: ListUserRoleAssignmentsQueryDto,
  ): Promise<UserRoleAssignmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const res = await this.repository.listAssignments({
      userAccountId: query.userAccountId,
      roleId: query.roleId,
      status: query.status,
      page,
      limit,
    });
    return {
      data: res.data.map((item) => this.toResponseDto(item)),
      page,
      limit,
      total: res.total,
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateUserRoleAssignmentStatusDto,
  ): Promise<UserRoleAssignmentResponseDto> {
    const existing = await this.repository.findAssignmentById(id);
    if (!existing) {
      throw new NotFoundException(`Role assignment with ID ${id} not found`);
    }
    const updated = await this.repository.updateAssignmentStatus(
      id,
      dto.status,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT,
      resourceId: id,
      before: { status: existing.status },
      after: { status: updated.status },
    });

    return this.toResponseDto(updated);
  }

  async deleteAssignment(id: string): Promise<void> {
    const existing = await this.repository.findAssignmentById(id);
    if (!existing) {
      throw new NotFoundException(`Role assignment with ID ${id} not found`);
    }
    await this.repository.deleteAssignment(id);

    // The scope rows cascade with the assignment, so the entry records them
    // explicitly: after the delete they are the only evidence of what the
    // assignment covered.
    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_DELETED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT,
      resourceId: id,
      before: {
        userAccountId: existing.userAccountId,
        roleId: existing.roleId,
        status: existing.status,
        scopes: (existing.scopes ?? []).map((scope) => ({
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        })),
      },
    });
  }

  async addScopes(
    assignmentId: string,
    dto: AddScopesDto,
  ): Promise<UserRoleAssignmentResponseDto> {
    const existing = await this.repository.findAssignmentById(assignmentId);
    if (!existing) {
      throw new NotFoundException(
        `Role assignment with ID ${assignmentId} not found`,
      );
    }
    await this.validateScopesExist(dto.scopes);
    await this.repository.addScopes(assignmentId, dto.scopes);
    const updated = await this.repository.findAssignmentById(assignmentId);

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_SCOPE_ADDED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT_SCOPE,
      resourceId: assignmentId,
      after: {
        userAccountId: existing.userAccountId,
        roleId: existing.roleId,
        addedScopes: dto.scopes.map((scope) => ({
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        })),
        scopes: (updated?.scopes ?? []).map((scope) => ({
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        })),
      },
    });

    return this.toResponseDto(updated!);
  }

  async removeScope(
    assignmentId: string,
    scopeId: string,
  ): Promise<UserRoleAssignmentResponseDto> {
    const existing = await this.repository.findAssignmentById(assignmentId);
    if (!existing) {
      throw new NotFoundException(
        `Role assignment with ID ${assignmentId} not found`,
      );
    }
    const removed = await this.repository.removeScope(assignmentId, scopeId);
    if (!removed) {
      throw new NotFoundException(
        `Scope ${scopeId} not found under assignment ${assignmentId}`,
      );
    }
    const updated = await this.repository.findAssignmentById(assignmentId);

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_SCOPE_REMOVED,
      resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT_SCOPE,
      resourceId: assignmentId,
      before: {
        userAccountId: existing.userAccountId,
        roleId: existing.roleId,
        removedScopeId: scopeId,
      },
      after: {
        scopes: (updated?.scopes ?? []).map((scope) => ({
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
        })),
      },
    });

    return this.toResponseDto(updated!);
  }

  /**
   * Primary evaluation entry point for resolving user effective permissions
   * and evaluating whether a user has permission in a specific scope context.
   */
  async getUserEffectivePermissions(
    userAccountId: string,
    atTime = new Date(),
  ): Promise<UserEffectivePermissionsResponseDto> {
    const activeAssignments =
      await this.repository.findActiveAssignmentsForUser(userAccountId, atTime);

    const permissionMap = new Map<string, EffectivePermission>();

    for (const assignment of activeAssignments) {
      const assignmentScopes = assignment.scopes.map((s) => ({
        scopeType: s.scopeType as ScopeTypeDto,
        scopeId: s.scopeId,
      }));

      const isUnrestrictedAssignment = assignmentScopes.length === 0;

      for (const rolePerm of assignment.role.permissions) {
        const permCode = rolePerm.permission.code;
        const existing = permissionMap.get(permCode);

        if (!existing) {
          permissionMap.set(permCode, {
            code: permCode,
            isUnrestricted: isUnrestrictedAssignment,
            scopes: isUnrestrictedAssignment ? [] : [...assignmentScopes],
          });
        } else {
          if (isUnrestrictedAssignment) {
            existing.isUnrestricted = true;
            existing.scopes = [];
          } else if (!existing.isUnrestricted) {
            for (const scope of assignmentScopes) {
              const alreadyHas = existing.scopes.some(
                (s) =>
                  s.scopeType === scope.scopeType &&
                  s.scopeId === scope.scopeId,
              );
              if (!alreadyHas) {
                existing.scopes.push(scope);
              }
            }
          }
        }
      }
    }

    const permissions: EffectivePermissionResponseDto[] = Array.from(
      permissionMap.values(),
    ).map((p) => ({
      code: p.code,
      isUnrestricted: p.isUnrestricted,
      scopes: p.scopes,
    }));

    return {
      userAccountId,
      permissions,
    };
  }

  /**
   * Evaluates if `userAccountId` has permission `permissionCode` (supporting wildcards)
   * within `scopeType` + `scopeId` (supporting descendant organization hierarchy).
   */
  async hasPermission(
    userAccountId: string,
    permissionCode: string,
    targetScopeType?: ScopeTypeDto,
    targetScopeId?: string,
    atTime = new Date(),
  ): Promise<boolean> {
    const effective = await this.getUserEffectivePermissions(
      userAccountId,
      atTime,
    );
    if (effective.permissions.length === 0) return false;

    // Filter permissions matching `permissionCode` (exact or wildcard pattern)
    const matchingPerms = effective.permissions.filter((p) =>
      this.matchPermissionPattern(p.code, permissionCode),
    );

    if (matchingPerms.length === 0) return false;

    // If no scope check required, any match grants access
    if (!targetScopeType || !targetScopeId) return true;

    // Check if any matching permission grants unrestricted or target scope
    for (const perm of matchingPerms) {
      if (perm.isUnrestricted) return true;

      for (const scope of perm.scopes) {
        if (
          scope.scopeType === targetScopeType &&
          scope.scopeId === targetScopeId
        ) {
          return true;
        }

        // Descendant organization scope check
        if (
          targetScopeType === ScopeTypeDto.ORGANIZATION &&
          scope.scopeType === ScopeTypeDto.ORGANIZATION
        ) {
          const isDescendant = await this.isDescendantOrganization(
            targetScopeId,
            scope.scopeId,
          );
          if (isDescendant) return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper to match permission code pattern with wildcards (`*`).
   * E.g. `portal.*.access` matches `portal.admin.access`.
   * `*` in database code matches any segment.
   */
  matchPermissionPattern(grantedCode: string, requestedCode: string): boolean {
    if (grantedCode === requestedCode) return true;
    if (!grantedCode.includes('*')) return false;

    const grantedSegments = grantedCode.split('.');
    const requestedSegments = requestedCode.split('.');

    if (grantedSegments.length !== requestedSegments.length) return false;

    for (let i = 0; i < grantedSegments.length; i++) {
      if (
        grantedSegments[i] !== '*' &&
        grantedSegments[i] !== requestedSegments[i]
      ) {
        return false;
      }
    }
    return true;
  }

  private async isDescendantOrganization(
    targetOrgId: string,
    ancestorOrgId: string,
  ): Promise<boolean> {
    if (targetOrgId === ancestorOrgId) return true;
    try {
      const descendants =
        await this.organizationsService.getDescendantIds(ancestorOrgId);
      return descendants.includes(targetOrgId);
    } catch {
      return false;
    }
  }

  /**
   * Validates that every requested scope actually exists in the domain that
   * owns it.
   *
   * `RoleAssignmentScope` deliberately uses a plain UUID rather than a
   * polymorphic foreign key, so existence must be proven here. A scope type
   * whose owning domain module does not exist yet cannot be proven, so it is
   * rejected instead of being persisted as an orphan row that later access
   * decisions would trust.
   */
  private async validateScopesExist(scopes: ScopeInput[]): Promise<void> {
    for (const scope of scopes) {
      switch (scope.scopeType) {
        case ScopeTypeDto.ORGANIZATION:
          await this.organizationsService.findOne(scope.scopeId);
          break;
        case ScopeTypeDto.PROGRAM:
        case ScopeTypeDto.BATCH:
        case ScopeTypeDto.CLASS:
        case ScopeTypeDto.CLASS_SUBJECT:
          throw new BadRequestException(
            `Scope type ${scope.scopeType} cannot be validated yet: its domain module does not exist. Only ${ScopeTypeDto.ORGANIZATION} scopes are accepted until the owning domain validates existence.`,
          );
        default: {
          const unreachable: never = scope.scopeType;
          throw new BadRequestException(
            `Unsupported scope type ${String(unreachable)}`,
          );
        }
      }
    }
  }

  private toResponseDto(
    rec: UserRoleAssignmentRecord,
  ): UserRoleAssignmentResponseDto {
    return {
      id: rec.id,
      userAccountId: rec.userAccountId,
      roleId: rec.roleId,
      role: rec.role
        ? {
            id: rec.role.id,
            code: rec.role.code,
            name: rec.role.name,
            isSystem: rec.role.isSystem,
          }
        : {
            id: rec.roleId,
            code: '',
            name: '',
            isSystem: false,
          },
      validFrom: rec.validFrom.toISOString(),
      validUntil: rec.validUntil ? rec.validUntil.toISOString() : null,
      status: rec.status,
      scopes: (rec.scopes || []).map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        scopeType: s.scopeType,
        scopeId: s.scopeId,
        createdAt: s.createdAt.toISOString(),
      })),
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
    };
  }
}
