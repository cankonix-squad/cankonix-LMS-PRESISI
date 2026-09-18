import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EducationBatchCreateData,
  EducationBatchListFilter,
  EducationBatchListResult,
  EducationBatchRecord,
  EducationBatchUpdateData,
} from './education-batches.types';

export const EDUCATION_BATCHES_REPOSITORY = Symbol(
  'EDUCATION_BATCHES_REPOSITORY',
);

export interface EducationBatchesRepository {
  create(data: EducationBatchCreateData): Promise<EducationBatchRecord>;
  findById(id: string): Promise<EducationBatchRecord | null>;
  findByProgramAndCode(
    educationProgramId: string,
    code: string,
  ): Promise<EducationBatchRecord | null>;
  list(filter: EducationBatchListFilter): Promise<EducationBatchListResult>;
  update(
    id: string,
    data: EducationBatchUpdateData,
  ): Promise<EducationBatchRecord>;
}

@Injectable()
export class PrismaEducationBatchesRepository implements EducationBatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: EducationBatchCreateData): Promise<EducationBatchRecord> {
    return await this.prisma.educationBatch.create({
      data: data as Prisma.EducationBatchUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<EducationBatchRecord | null> {
    return await this.prisma.educationBatch.findUnique({ where: { id } });
  }

  async findByProgramAndCode(
    educationProgramId: string,
    code: string,
  ): Promise<EducationBatchRecord | null> {
    return await this.prisma.educationBatch.findUnique({
      where: {
        educationProgramId_code: {
          educationProgramId,
          code,
        },
      },
    });
  }

  async list(
    filter: EducationBatchListFilter,
  ): Promise<EducationBatchListResult> {
    const andClauses: Prisma.EducationBatchWhereInput[] = [];

    if (filter.fromDate) {
      andClauses.push({ startDate: { gte: filter.fromDate } });
    }

    if (filter.toDate) {
      andClauses.push({ endDate: { lte: filter.toDate } });
    }

    const where: Prisma.EducationBatchWhereInput = {
      educationProgramId: filter.educationProgramId,
      curriculumId: filter.curriculumId,
      status: filter.status,
      ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.educationBatch.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.educationBatch.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: EducationBatchUpdateData,
  ): Promise<EducationBatchRecord> {
    return await this.prisma.educationBatch.update({
      where: { id },
      data: data as Prisma.EducationBatchUncheckedUpdateInput,
    });
  }
}
