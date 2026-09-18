import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClassSubjectCreateData,
  ClassSubjectListFilter,
  ClassSubjectListResult,
  ClassSubjectRecord,
  ClassSubjectUpdateData,
} from './class-subjects.types';

export const CLASS_SUBJECTS_REPOSITORY = Symbol('CLASS_SUBJECTS_REPOSITORY');

/**
 * Minimal context needed to enforce "curriculum subject must belong to the
 * curriculum of the classroom batch" without the caller touching Prisma.
 */
export type AcademicClassContext = {
  id: string;
  educationBatchId: string;
  curriculumId: string;
};

export type CurriculumSubjectContext = {
  id: string;
  curriculumId: string;
};

export interface ClassSubjectsRepository {
  create(data: ClassSubjectCreateData): Promise<ClassSubjectRecord>;
  findById(id: string): Promise<ClassSubjectRecord | null>;
  findByClassAndCurriculumSubject(
    academicClassId: string,
    curriculumSubjectId: string,
  ): Promise<ClassSubjectRecord | null>;
  list(filter: ClassSubjectListFilter): Promise<ClassSubjectListResult>;
  update(id: string, data: ClassSubjectUpdateData): Promise<ClassSubjectRecord>;
  findClassContext(
    academicClassId: string,
  ): Promise<AcademicClassContext | null>;
  findCurriculumSubjectContext(
    curriculumSubjectId: string,
  ): Promise<CurriculumSubjectContext | null>;
}

@Injectable()
export class PrismaClassSubjectsRepository implements ClassSubjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ClassSubjectCreateData): Promise<ClassSubjectRecord> {
    return await this.prisma.classSubject.create({
      data: data as Prisma.ClassSubjectUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<ClassSubjectRecord | null> {
    return await this.prisma.classSubject.findUnique({ where: { id } });
  }

  async findByClassAndCurriculumSubject(
    academicClassId: string,
    curriculumSubjectId: string,
  ): Promise<ClassSubjectRecord | null> {
    return await this.prisma.classSubject.findUnique({
      where: {
        academicClassId_curriculumSubjectId: {
          academicClassId,
          curriculumSubjectId,
        },
      },
    });
  }

  async list(filter: ClassSubjectListFilter): Promise<ClassSubjectListResult> {
    const batchFilter: Prisma.EducationBatchWhereInput = {};

    if (filter.educationBatchId) {
      batchFilter.id = filter.educationBatchId;
    }

    if (filter.educationProgramId) {
      batchFilter.educationProgramId = filter.educationProgramId;
    }

    if (filter.organizationId) {
      batchFilter.educationProgram = { organizationId: filter.organizationId };
    }

    const where: Prisma.ClassSubjectWhereInput = {
      academicClassId: filter.academicClassId,
      curriculumSubjectId: filter.curriculumSubjectId,
      status: filter.status,
      ...(Object.keys(batchFilter).length > 0
        ? { academicClass: { educationBatch: batchFilter } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.classSubject.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.classSubject.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: ClassSubjectUpdateData,
  ): Promise<ClassSubjectRecord> {
    return await this.prisma.classSubject.update({
      where: { id },
      data: data as Prisma.ClassSubjectUncheckedUpdateInput,
    });
  }

  async findClassContext(
    academicClassId: string,
  ): Promise<AcademicClassContext | null> {
    const found = await this.prisma.academicClass.findUnique({
      where: { id: academicClassId },
      select: {
        id: true,
        educationBatchId: true,
        educationBatch: { select: { curriculumId: true } },
      },
    });

    if (!found) {
      return null;
    }

    return {
      id: found.id,
      educationBatchId: found.educationBatchId,
      curriculumId: found.educationBatch.curriculumId,
    };
  }

  async findCurriculumSubjectContext(
    curriculumSubjectId: string,
  ): Promise<CurriculumSubjectContext | null> {
    return await this.prisma.curriculumSubject.findUnique({
      where: { id: curriculumSubjectId },
      select: { id: true, curriculumId: true },
    });
  }
}
