import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrganizationCreateData,
  OrganizationListFilter,
  OrganizationListResult,
  OrganizationRecord,
  OrganizationUpdateData,
} from './organization.types';

export const ORGANIZATIONS_REPOSITORY = Symbol('ORGANIZATIONS_REPOSITORY');

export interface OrganizationsRepository {
  create(data: OrganizationCreateData): Promise<OrganizationRecord>;
  findById(id: string): Promise<OrganizationRecord | null>;
  findByCode(code: string): Promise<OrganizationRecord | null>;
  list(filter: OrganizationListFilter): Promise<OrganizationListResult>;
  update(id: string, data: OrganizationUpdateData): Promise<OrganizationRecord>;
  findChildren(parentId: string): Promise<OrganizationRecord[]>;
}

@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: OrganizationCreateData): Promise<OrganizationRecord> {
    return await this.prisma.organization.create({
      data: data as Prisma.OrganizationUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    return await this.prisma.organization.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<OrganizationRecord | null> {
    return await this.prisma.organization.findUnique({ where: { code } });
  }

  async list(filter: OrganizationListFilter): Promise<OrganizationListResult> {
    const where: Prisma.OrganizationWhereInput = {
      status: filter.status,
      parentId: filter.parentId,
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { data, total };
  }

  async update(
    id: string,
    data: OrganizationUpdateData,
  ): Promise<OrganizationRecord> {
    return await this.prisma.organization.update({
      where: { id },
      data: data as Prisma.OrganizationUncheckedUpdateInput,
    });
  }

  async findChildren(parentId: string): Promise<OrganizationRecord[]> {
    return await this.prisma.organization.findMany({
      where: { parentId },
      orderBy: [{ code: 'asc' }],
    });
  }
}
