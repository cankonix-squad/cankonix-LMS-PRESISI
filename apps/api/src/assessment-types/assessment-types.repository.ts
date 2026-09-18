import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssessmentTypeCreateData,
  AssessmentTypeListFilter,
  AssessmentTypeListResult,
  AssessmentTypeRecord,
  AssessmentTypeUpdateData,
} from './assessment-type.types';

export const ASSESSMENT_TYPES_REPOSITORY = Symbol(
  'ASSESSMENT_TYPES_REPOSITORY',
);

export interface AssessmentTypesRepository {
  create(data: AssessmentTypeCreateData): Promise<AssessmentTypeRecord>;
  findById(id: string): Promise<AssessmentTypeRecord | null>;
  findByCode(code: string): Promise<AssessmentTypeRecord | null>;
  list(filter: AssessmentTypeListFilter): Promise<AssessmentTypeListResult>;
  update(
    id: string,
    data: AssessmentTypeUpdateData,
  ): Promise<AssessmentTypeRecord>;
  /**
   * Assessments that are still live for this type. Used to decide whether
   * deactivation is safe: an INACTIVE type must not be selectable for new
   * assessments, but existing ones keep working, so only a non-zero count of
   * non-archived assessments is a reason to warn.
   */
  countLiveAssessments(assessmentTypeId: string): Promise<number>;
}

@Injectable()
export class PrismaAssessmentTypesRepository implements AssessmentTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AssessmentTypeCreateData): Promise<AssessmentTypeRecord> {
    return await this.prisma.assessmentType.create({
      data: data as Prisma.AssessmentTypeUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<AssessmentTypeRecord | null> {
    return await this.prisma.assessmentType.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<AssessmentTypeRecord | null> {
    return await this.prisma.assessmentType.findUnique({ where: { code } });
  }

  async list(
    filter: AssessmentTypeListFilter,
  ): Promise<AssessmentTypeListResult> {
    const where: Prisma.AssessmentTypeWhereInput = {
      status: filter.status as Prisma.AssessmentTypeWhereInput['status'],
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assessmentType.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.assessmentType.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: AssessmentTypeUpdateData,
  ): Promise<AssessmentTypeRecord> {
    return await this.prisma.assessmentType.update({
      where: { id },
      data: data as Prisma.AssessmentTypeUncheckedUpdateInput,
    });
  }

  async countLiveAssessments(assessmentTypeId: string): Promise<number> {
    return await this.prisma.assessment.count({
      where: { assessmentTypeId, status: { not: 'ARCHIVED' } },
    });
  }
}
