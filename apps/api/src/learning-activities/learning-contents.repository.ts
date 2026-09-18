import { Injectable } from '@nestjs/common';
import { LearningContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContentVersionState,
  LearningContentCreateData,
  LearningContentListFilter,
  LearningContentListResult,
  LearningContentRecord,
  LearningContentUpdateData,
} from './learning-content.types';

export const LEARNING_CONTENTS_REPOSITORY = Symbol(
  'LEARNING_CONTENTS_REPOSITORY',
);

export interface LearningContentsRepository {
  create(data: LearningContentCreateData): Promise<LearningContentRecord>;
  findById(id: string): Promise<LearningContentRecord | null>;
  list(filter: LearningContentListFilter): Promise<LearningContentListResult>;
  update(
    id: string,
    data: LearningContentUpdateData,
  ): Promise<LearningContentRecord>;
  /**
   * Version state of a group: highest version plus how many rows are currently
   * published. A group can never hold two published rows at once, so the count
   * is what makes that invariant checkable instead of assumed.
   */
  findVersionState(versionGroupId: string): Promise<ContentVersionState>;
  /** The single PUBLISHED row of a group, if any. */
  findPublishedInGroup(
    versionGroupId: string,
  ): Promise<LearningContentRecord | null>;
  /**
   * Marks a published row SUPERSEDED and inserts its successor in one
   * transaction, so a reader never observes a group with zero published rows.
   */
  supersedeAndCreate(
    supersededId: string,
    data: LearningContentCreateData,
  ): Promise<{
    content: LearningContentRecord;
    superseded: LearningContentRecord;
  }>;
}

@Injectable()
export class PrismaLearningContentsRepository implements LearningContentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: LearningContentCreateData,
  ): Promise<LearningContentRecord> {
    return await this.prisma.learningContent.create({
      data: data as Prisma.LearningContentUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<LearningContentRecord | null> {
    return await this.prisma.learningContent.findUnique({ where: { id } });
  }

  async list(
    filter: LearningContentListFilter,
  ): Promise<LearningContentListResult> {
    const where: Prisma.LearningContentWhereInput = {
      activityId: filter.activityId,
      status: filter.status
        ? (filter.status as LearningContentStatus)
        : filter.includeSuperseded
          ? undefined
          : { not: 'SUPERSEDED' },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningContent.findMany({
        where,
        orderBy: [{ versionGroupId: 'asc' }, { version: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.learningContent.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: LearningContentUpdateData,
  ): Promise<LearningContentRecord> {
    return await this.prisma.learningContent.update({
      where: { id },
      data: data as Prisma.LearningContentUncheckedUpdateInput,
    });
  }

  async findVersionState(versionGroupId: string): Promise<ContentVersionState> {
    const [aggregate, publishedCount] = await this.prisma.$transaction([
      this.prisma.learningContent.aggregate({
        where: { versionGroupId },
        _max: { version: true },
      }),
      this.prisma.learningContent.count({
        where: { versionGroupId, status: 'PUBLISHED' },
      }),
    ]);

    return {
      versionGroupId,
      maxVersion: aggregate._max.version ?? 0,
      publishedCount,
    };
  }

  async findPublishedInGroup(
    versionGroupId: string,
  ): Promise<LearningContentRecord | null> {
    return await this.prisma.learningContent.findFirst({
      where: { versionGroupId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
  }

  async supersedeAndCreate(
    supersededId: string,
    data: LearningContentCreateData,
  ): Promise<{
    content: LearningContentRecord;
    superseded: LearningContentRecord;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      const superseded = await tx.learningContent.update({
        where: { id: supersededId },
        data: { status: 'SUPERSEDED' },
      });

      const content = await tx.learningContent.create({
        data: data as Prisma.LearningContentUncheckedCreateInput,
      });

      return { content, superseded };
    });
  }
}
