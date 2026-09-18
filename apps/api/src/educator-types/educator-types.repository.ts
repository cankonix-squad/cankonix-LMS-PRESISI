import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EducatorTypeCreateData,
  EducatorTypeListFilter,
  EducatorTypeListResult,
  EducatorTypeRecord,
  EducatorTypeUpdateData,
} from './educator-type.types';

export const EDUCATOR_TYPES_REPOSITORY = Symbol('EDUCATOR_TYPES_REPOSITORY');

export interface EducatorTypesRepository {
  create(data: EducatorTypeCreateData): Promise<EducatorTypeRecord>;
  findById(id: string): Promise<EducatorTypeRecord | null>;
  findByCode(code: string): Promise<EducatorTypeRecord | null>;
  list(filter: EducatorTypeListFilter): Promise<EducatorTypeListResult>;
  update(id: string, data: EducatorTypeUpdateData): Promise<EducatorTypeRecord>;
  /** Only ACTIVE assignments block deactivation; ended history never does. */
  countActiveAssignments(educatorTypeId: string): Promise<number>;
}

@Injectable()
export class PrismaEducatorTypesRepository implements EducatorTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: EducatorTypeCreateData): Promise<EducatorTypeRecord> {
    return await this.prisma.educatorType.create({
      data: data as Prisma.EducatorTypeUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<EducatorTypeRecord | null> {
    return await this.prisma.educatorType.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<EducatorTypeRecord | null> {
    return await this.prisma.educatorType.findUnique({ where: { code } });
  }

  async list(filter: EducatorTypeListFilter): Promise<EducatorTypeListResult> {
    const where: Prisma.EducatorTypeWhereInput = {
      status: filter.status,
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.educatorType.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.educatorType.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: EducatorTypeUpdateData,
  ): Promise<EducatorTypeRecord> {
    return await this.prisma.educatorType.update({
      where: { id },
      data: data as Prisma.EducatorTypeUncheckedUpdateInput,
    });
  }

  async countActiveAssignments(educatorTypeId: string): Promise<number> {
    return await this.prisma.educatorAssignment.count({
      where: { educatorTypeId, status: 'ACTIVE' },
    });
  }
}
