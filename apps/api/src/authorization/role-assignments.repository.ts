import { Injectable } from '@nestjs/common';
import { Prisma, ScopeType, UserRoleAssignmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScopeTypeDto,
  UserRoleAssignmentStatusDto,
} from './dto/scope-type.dto';
import {
  AssignmentCreateData,
  AssignmentListFilter,
  AssignmentListResult,
  ScopeInput,
  ScopeRecord,
  UserRoleAssignmentRecord,
} from './role-assignment.types';

export const ROLE_ASSIGNMENTS_REPOSITORY = Symbol(
  'ROLE_ASSIGNMENTS_REPOSITORY',
);

export interface RoleAssignmentsRepository {
  createAssignment(
    data: AssignmentCreateData,
    scopes?: ScopeInput[],
  ): Promise<UserRoleAssignmentRecord>;
  findAssignmentById(id: string): Promise<UserRoleAssignmentRecord | null>;
  listAssignments(filter: AssignmentListFilter): Promise<AssignmentListResult>;
  updateAssignmentStatus(
    id: string,
    status: UserRoleAssignmentStatusDto,
  ): Promise<UserRoleAssignmentRecord>;
  deleteAssignment(id: string): Promise<void>;

  addScopes(
    assignmentId: string,
    scopes: ScopeInput[],
  ): Promise<{ added: number; existing: number }>;
  removeScope(assignmentId: string, scopeId: string): Promise<boolean>;
  listScopes(assignmentId: string): Promise<ScopeRecord[]>;

  /**
   * Reads all active, non-expired role assignments with their attached roles,
   * permissions, and scopes for a given user account.
   */
  findActiveAssignmentsForUser(
    userAccountId: string,
    atTime: Date,
  ): Promise<
    Array<{
      id: string;
      roleId: string;
      role: {
        id: string;
        code: string;
        name: string;
        status: string;
        isSystem: boolean;
        permissions: Array<{
          permission: {
            id: string;
            code: string;
            name: string;
          };
        }>;
      };
      validFrom: Date;
      validUntil: Date | null;
      status: string;
      scopes: Array<{
        id: string;
        scopeType: ScopeType;
        scopeId: string;
      }>;
    }>
  >;
}

@Injectable()
export class PrismaRoleAssignmentsRepository implements RoleAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAssignment(
    data: AssignmentCreateData,
    scopes: ScopeInput[] = [],
  ): Promise<UserRoleAssignmentRecord> {
    return await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.userRoleAssignment.create({
        data: {
          userAccountId: data.userAccountId,
          roleId: data.roleId,
          validFrom: data.validFrom ?? new Date(),
          validUntil: data.validUntil ?? null,
          status:
            (data.status as UserRoleAssignmentStatus) ??
            UserRoleAssignmentStatus.ACTIVE,
        },
        include: {
          role: true,
        },
      });

      if (scopes.length > 0) {
        await tx.roleAssignmentScope.createMany({
          data: scopes.map((s) => ({
            assignmentId: assignment.id,
            scopeType: s.scopeType as ScopeType,
            scopeId: s.scopeId,
          })),
          skipDuplicates: true,
        });
      }

      const loadedScopes = await tx.roleAssignmentScope.findMany({
        where: { assignmentId: assignment.id },
      });

      return {
        ...assignment,
        status: assignment.status as UserRoleAssignmentStatusDto,
        role: assignment.role
          ? {
              id: assignment.role.id,
              code: assignment.role.code,
              name: assignment.role.name,
              isSystem: assignment.role.isSystem,
              status: assignment.role.status,
            }
          : undefined,
        scopes: loadedScopes.map((s) => ({
          ...s,
          scopeType: s.scopeType as ScopeTypeDto,
        })),
      };
    });
  }

  async findAssignmentById(
    id: string,
  ): Promise<UserRoleAssignmentRecord | null> {
    const item = await this.prisma.userRoleAssignment.findUnique({
      where: { id },
      include: {
        role: true,
        scopes: true,
      },
    });
    if (!item) return null;
    return {
      ...item,
      status: item.status as UserRoleAssignmentStatusDto,
      role: item.role
        ? {
            id: item.role.id,
            code: item.role.code,
            name: item.role.name,
            isSystem: item.role.isSystem,
            status: item.role.status,
          }
        : undefined,
      scopes: item.scopes.map((s) => ({
        ...s,
        scopeType: s.scopeType as ScopeTypeDto,
      })),
    };
  }

  async listAssignments(
    filter: AssignmentListFilter,
  ): Promise<AssignmentListResult> {
    const where: Prisma.UserRoleAssignmentWhereInput = {
      userAccountId: filter.userAccountId,
      roleId: filter.roleId,
      status: filter.status as UserRoleAssignmentStatus | undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.userRoleAssignment.findMany({
        where,
        include: {
          role: true,
          scopes: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.userRoleAssignment.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        ...item,
        status: item.status as UserRoleAssignmentStatusDto,
        role: item.role
          ? {
              id: item.role.id,
              code: item.role.code,
              name: item.role.name,
              isSystem: item.role.isSystem,
              status: item.role.status,
            }
          : undefined,
        scopes: item.scopes.map((s) => ({
          ...s,
          scopeType: s.scopeType as ScopeTypeDto,
        })),
      })),
      total,
    };
  }

  async updateAssignmentStatus(
    id: string,
    status: UserRoleAssignmentStatusDto,
  ): Promise<UserRoleAssignmentRecord> {
    const updated = await this.prisma.userRoleAssignment.update({
      where: { id },
      data: { status: status as UserRoleAssignmentStatus },
      include: {
        role: true,
        scopes: true,
      },
    });
    return {
      ...updated,
      status: updated.status as UserRoleAssignmentStatusDto,
      role: updated.role
        ? {
            id: updated.role.id,
            code: updated.role.code,
            name: updated.role.name,
            isSystem: updated.role.isSystem,
            status: updated.role.status,
          }
        : undefined,
      scopes: updated.scopes.map((s) => ({
        ...s,
        scopeType: s.scopeType as ScopeTypeDto,
      })),
    };
  }

  async deleteAssignment(id: string): Promise<void> {
    await this.prisma.userRoleAssignment.delete({ where: { id } });
  }

  async addScopes(
    assignmentId: string,
    scopes: ScopeInput[],
  ): Promise<{ added: number; existing: number }> {
    const existing = await this.prisma.roleAssignmentScope.findMany({
      where: { assignmentId },
    });
    const existingKey = new Set(
      existing.map((s) => `${s.scopeType}:${s.scopeId}`),
    );

    const newOnes = scopes.filter(
      (s) => !existingKey.has(`${s.scopeType}:${s.scopeId}`),
    );

    if (newOnes.length > 0) {
      await this.prisma.roleAssignmentScope.createMany({
        data: newOnes.map((s) => ({
          assignmentId,
          scopeType: s.scopeType as ScopeType,
          scopeId: s.scopeId,
        })),
        skipDuplicates: true,
      });
    }

    return {
      added: newOnes.length,
      existing: scopes.length - newOnes.length,
    };
  }

  async removeScope(assignmentId: string, scopeId: string): Promise<boolean> {
    const res = await this.prisma.roleAssignmentScope.deleteMany({
      where: {
        assignmentId,
        OR: [{ id: scopeId }, { scopeId }],
      },
    });
    return res.count > 0;
  }

  async listScopes(assignmentId: string): Promise<ScopeRecord[]> {
    const scopes = await this.prisma.roleAssignmentScope.findMany({
      where: { assignmentId },
      orderBy: [{ createdAt: 'asc' }],
    });
    return scopes.map((s) => ({
      ...s,
      scopeType: s.scopeType as ScopeTypeDto,
    }));
  }

  async findActiveAssignmentsForUser(
    userAccountId: string,
    atTime: Date,
  ): Promise<
    Array<{
      id: string;
      roleId: string;
      role: {
        id: string;
        code: string;
        name: string;
        status: string;
        isSystem: boolean;
        permissions: Array<{
          permission: {
            id: string;
            code: string;
            name: string;
          };
        }>;
      };
      validFrom: Date;
      validUntil: Date | null;
      status: string;
      scopes: Array<{
        id: string;
        scopeType: ScopeType;
        scopeId: string;
      }>;
    }>
  > {
    return await this.prisma.userRoleAssignment.findMany({
      where: {
        userAccountId,
        status: UserRoleAssignmentStatus.ACTIVE,
        validFrom: { lte: atTime },
        OR: [{ validUntil: null }, { validUntil: { gte: atTime } }],
        role: {
          status: 'ACTIVE',
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        scopes: true,
      },
    });
  }
}
