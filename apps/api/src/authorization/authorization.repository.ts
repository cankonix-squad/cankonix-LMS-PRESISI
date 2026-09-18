import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PermissionCreateData,
  PermissionListFilter,
  PermissionListResult,
  PermissionRecord,
  RoleCreateData,
  RoleListFilter,
  RoleListResult,
  RoleRecord,
  RoleUpdateData,
} from './authorization.types';

export const AUTHORIZATION_REPOSITORY = Symbol('AUTHORIZATION_REPOSITORY');

/**
 * Persistence port for the RBAC catalog.
 *
 * Role-permission mutation is expressed as idempotent verbs (`grant`,
 * `revoke`, `grantToRoles`) rather than generic writes, so "assign twice" can
 * never create a duplicate row even under concurrent requests.
 */
export interface AuthorizationRepository {
  createRole(
    data: RoleCreateData,
    permissionIds?: string[],
  ): Promise<RoleRecord>;
  findRoleById(id: string): Promise<RoleRecord | null>;
  findRoleByCode(code: string): Promise<RoleRecord | null>;
  findRolesByCodes(codes: string[]): Promise<RoleRecord[]>;
  listRoles(filter: RoleListFilter): Promise<RoleListResult>;
  updateRole(id: string, data: RoleUpdateData): Promise<RoleRecord>;
  deleteRole(id: string): Promise<void>;

  createPermission(data: PermissionCreateData): Promise<PermissionRecord>;
  findPermissionById(id: string): Promise<PermissionRecord | null>;
  findPermissionByCode(code: string): Promise<PermissionRecord | null>;
  listPermissions(filter: PermissionListFilter): Promise<PermissionListResult>;

  listRolePermissions(roleId: string): Promise<PermissionRecord[]>;
  grantPermissionToRole(roleId: string, permissionId: string): Promise<boolean>;
  revokePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean>;
  /** Grants one permission to several roles. Returns how many were new. */
  grantPermissionToRoles(
    roleIds: string[],
    permissionId: string,
  ): Promise<number>;
}

@Injectable()
export class PrismaAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(
    data: RoleCreateData,
    permissionIds: string[] = [],
  ): Promise<RoleRecord> {
    return await this.prisma.$transaction(async (transaction) => {
      const role = await transaction.role.create({
        data: data as Prisma.RoleUncheckedCreateInput,
      });
      if (permissionIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
      return role;
    });
  }

  async findRoleById(id: string): Promise<RoleRecord | null> {
    return await this.prisma.role.findUnique({ where: { id } });
  }

  async findRoleByCode(code: string): Promise<RoleRecord | null> {
    return await this.prisma.role.findUnique({ where: { code } });
  }

  async findRolesByCodes(codes: string[]): Promise<RoleRecord[]> {
    return await this.prisma.role.findMany({ where: { code: { in: codes } } });
  }

  async listRoles(filter: RoleListFilter): Promise<RoleListResult> {
    const where: Prisma.RoleWhereInput = {
      status: filter.status,
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.role.count({ where }),
    ]);
    return { data, total };
  }

  async updateRole(id: string, data: RoleUpdateData): Promise<RoleRecord> {
    return await this.prisma.role.update({
      where: { id },
      data: data as Prisma.RoleUncheckedUpdateInput,
    });
  }

  async deleteRole(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  async createPermission(
    data: PermissionCreateData,
  ): Promise<PermissionRecord> {
    return await this.prisma.permission.create({
      data: data as Prisma.PermissionUncheckedCreateInput,
    });
  }

  async findPermissionById(id: string): Promise<PermissionRecord | null> {
    return await this.prisma.permission.findUnique({ where: { id } });
  }

  async findPermissionByCode(code: string): Promise<PermissionRecord | null> {
    return await this.prisma.permission.findUnique({ where: { code } });
  }

  async listPermissions(
    filter: PermissionListFilter,
  ): Promise<PermissionListResult> {
    const where: Prisma.PermissionWhereInput = filter.search
      ? {
          OR: [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.permission.count({ where }),
    ]);
    return { data, total };
  }

  async listRolePermissions(roleId: string): Promise<PermissionRecord[]> {
    const links = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
      orderBy: [{ permission: { code: 'asc' } }],
    });
    return links.map((link) => link.permission);
  }

  /** `createMany` with `skipDuplicates` makes the grant idempotent atomically. */
  async grantPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const created = await this.prisma.rolePermission.createMany({
      data: [{ roleId, permissionId }],
      skipDuplicates: true,
    });
    return created.count > 0;
  }

  /** `deleteMany` is a no-op when the grant is absent, so revocation is safe to retry. */
  async revokePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const deleted = await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
    return deleted.count > 0;
  }

  async grantPermissionToRoles(
    roleIds: string[],
    permissionId: string,
  ): Promise<number> {
    if (roleIds.length === 0) return 0;
    const created = await this.prisma.rolePermission.createMany({
      data: roleIds.map((roleId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
    return created.count;
  }
}
