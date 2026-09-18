import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubjectCreateData,
  SubjectListFilter,
  SubjectListResult,
  SubjectRecord,
  SubjectUpdateData,
} from './subjects.types';

export const SUBJECTS_REPOSITORY = Symbol('SUBJECTS_REPOSITORY');

export interface SubjectsRepository {
  create(data: SubjectCreateData): Promise<SubjectRecord>;
  findById(id: string): Promise<SubjectRecord | null>;
  findByCode(code: string): Promise<SubjectRecord | null>;
  list(filter: SubjectListFilter): Promise<SubjectListResult>;
  update(id: string, data: SubjectUpdateData): Promise<SubjectRecord>;
}

@Injectable()
export class PrismaSubjectsRepository implements SubjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: SubjectCreateData): Promise<SubjectRecord> {
    return await this.prisma.subject.create({
      data: data as Prisma.SubjectUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<SubjectRecord | null> {
    return await this.prisma.subject.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<SubjectRecord | null> {
    return await this.prisma.subject.findUnique({ where: { code } });
  }

  async list(filter: SubjectListFilter): Promise<SubjectListResult> {
    const where: Prisma.SubjectWhereInput = {
      status: filter.status,
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: SubjectUpdateData): Promise<SubjectRecord> {
    return await this.prisma.subject.update({
      where: { id },
      data: data as Prisma.SubjectUncheckedUpdateInput,
    });
  }
}
