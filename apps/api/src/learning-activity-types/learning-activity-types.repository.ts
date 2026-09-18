import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LearningActivityTypeCreateData,
  LearningActivityTypeListFilter,
  LearningActivityTypeListResult,
  LearningActivityTypeRecord,
  LearningActivityTypeUpdateData,
} from './learning-activity-type.types';

export const LEARNING_ACTIVITY_TYPES_REPOSITORY = Symbol(
  'LEARNING_ACTIVITY_TYPES_REPOSITORY',
);

export interface LearningActivityTypesRepository {
  create(
    data: LearningActivityTypeCreateData,
  ): Promise<LearningActivityTypeRecord>;
  findById(id: string): Promise<LearningActivityTypeRecord | null>;
  findByCode(code: string): Promise<LearningActivityTypeRecord | null>;
  list(
    filter: LearningActivityTypeListFilter,
  ): Promise<LearningActivityTypeListResult>;
  update(
    id: string,
    data: LearningActivityTypeUpdateData,
  ): Promise<LearningActivityTypeRecord>;
  /**
   * Activities that are still live for this type. Used to decide whether
   * deactivation is safe: an INACTIVE type must not be selectable for new
   * activities, but existing ones keep working, so only a non-zero count of
   * non-archived activities is a reason to warn.
   */
  countActivities(activityTypeId: string): Promise<number>;
}

@Injectable()
export class PrismaLearningActivityTypesRepository implements LearningActivityTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: LearningActivityTypeCreateData,
  ): Promise<LearningActivityTypeRecord> {
    return await this.prisma.learningActivityType.create({
      data: data as Prisma.LearningActivityTypeUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<LearningActivityTypeRecord | null> {
    return await this.prisma.learningActivityType.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<LearningActivityTypeRecord | null> {
    return await this.prisma.learningActivityType.findUnique({
      where: { code },
    });
  }

  async list(
    filter: LearningActivityTypeListFilter,
  ): Promise<LearningActivityTypeListResult> {
    const where: Prisma.LearningActivityTypeWhereInput = {
      status: filter.status as Prisma.LearningActivityTypeWhereInput['status'],
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningActivityType.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.learningActivityType.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: LearningActivityTypeUpdateData,
  ): Promise<LearningActivityTypeRecord> {
    return await this.prisma.learningActivityType.update({
      where: { id },
      data: data as Prisma.LearningActivityTypeUncheckedUpdateInput,
    });
  }

  async countActivities(activityTypeId: string): Promise<number> {
    return await this.prisma.learningActivity.count({
      where: { activityTypeId, status: { not: 'ARCHIVED' } },
    });
  }
}
