import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssessmentCreateData,
  AssessmentListFilter,
  AssessmentListResult,
  AssessmentRecord,
  AssessmentTypeContext,
  AssessmentUpdateData,
  ClassSubjectContext,
} from './assessment.types';

export const ASSESSMENTS_REPOSITORY = Symbol('ASSESSMENTS_REPOSITORY');

export interface AssessmentsRepository {
  create(data: AssessmentCreateData): Promise<AssessmentRecord>;
  findById(id: string): Promise<AssessmentRecord | null>;
  list(filter: AssessmentListFilter): Promise<AssessmentListResult>;
  update(id: string, data: AssessmentUpdateData): Promise<AssessmentRecord>;
  findClassSubjectContext(
    classSubjectId: string,
  ): Promise<ClassSubjectContext | null>;
  findAssessmentTypeContext(
    assessmentTypeId: string,
  ): Promise<AssessmentTypeContext | null>;
}

@Injectable()
export class PrismaAssessmentsRepository implements AssessmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AssessmentCreateData): Promise<AssessmentRecord> {
    return await this.prisma.assessment.create({
      data: {
        classSubjectId: data.classSubjectId,
        assessmentTypeId: data.assessmentTypeId,
        title: data.title,
        description: data.description,
        maxScore: data.maxScore,
        weight: data.weight,
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
        status: data.status,
        metadata: toJsonInput(data.metadata),
      },
    });
  }

  async findById(id: string): Promise<AssessmentRecord | null> {
    return await this.prisma.assessment.findUnique({ where: { id } });
  }

  async list(filter: AssessmentListFilter): Promise<AssessmentListResult> {
    const where: Prisma.AssessmentWhereInput = {
      classSubjectId: filter.classSubjectId,
      assessmentTypeId: filter.assessmentTypeId,
      status: filter.status as Prisma.AssessmentWhereInput['status'],
      title: filter.search
        ? { contains: filter.search, mode: 'insensitive' }
        : undefined,
      classSubject:
        filter.academicClassId || filter.curriculumSubjectId
          ? {
              academicClassId: filter.academicClassId,
              curriculumSubjectId: filter.curriculumSubjectId,
            }
          : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: AssessmentUpdateData,
  ): Promise<AssessmentRecord> {
    return await this.prisma.assessment.update({
      where: { id },
      data: {
        assessmentTypeId: data.assessmentTypeId,
        title: data.title,
        description: data.description,
        maxScore: data.maxScore,
        weight: data.weight,
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
        status: data.status,
        metadata: toJsonInput(data.metadata),
      },
    });
  }

  async findClassSubjectContext(
    classSubjectId: string,
  ): Promise<ClassSubjectContext | null> {
    return await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      select: {
        id: true,
        academicClassId: true,
        curriculumSubjectId: true,
        status: true,
      },
    });
  }

  async findAssessmentTypeContext(
    assessmentTypeId: string,
  ): Promise<AssessmentTypeContext | null> {
    return await this.prisma.assessmentType.findUnique({
      where: { id: assessmentTypeId },
      select: { id: true, code: true, status: true },
    });
  }
}

/**
 * Normalizes a metadata value into a Prisma JSON input.
 *
 * The column stays SQL `NULL` when there is no metadata, which is
 * distinguishable from a deliberate JSON `null`. `undefined` means "leave it
 * alone" on update, so it is passed through rather than turned into `null`.
 */
function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
