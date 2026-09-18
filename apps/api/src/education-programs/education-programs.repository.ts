import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EducationProgramCreateData,
  EducationProgramListFilter,
  EducationProgramListResult,
  EducationProgramRecord,
  EducationProgramUpdateData,
} from './education-programs.types';

export const EDUCATION_PROGRAMS_REPOSITORY = Symbol(
  'EDUCATION_PROGRAMS_REPOSITORY',
);

export interface EducationProgramsRepository {
  create(data: EducationProgramCreateData): Promise<EducationProgramRecord>;
  findById(id: string): Promise<EducationProgramRecord | null>;
  findByOrganizationAndCode(
    organizationId: string,
    code: string,
  ): Promise<EducationProgramRecord | null>;
  list(filter: EducationProgramListFilter): Promise<EducationProgramListResult>;
  update(
    id: string,
    data: EducationProgramUpdateData,
  ): Promise<EducationProgramRecord>;
}

@Injectable()
export class PrismaEducationProgramsRepository implements EducationProgramsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: EducationProgramCreateData,
  ): Promise<EducationProgramRecord> {
    return await this.prisma.educationProgram.create({
      data: data as Prisma.EducationProgramUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<EducationProgramRecord | null> {
    return await this.prisma.educationProgram.findUnique({ where: { id } });
  }

  async findByOrganizationAndCode(
    organizationId: string,
    code: string,
  ): Promise<EducationProgramRecord | null> {
    return await this.prisma.educationProgram.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
    });
  }

  async list(
    filter: EducationProgramListFilter,
  ): Promise<EducationProgramListResult> {
    const where: Prisma.EducationProgramWhereInput = {
      organizationId: filter.organizationId,
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
      this.prisma.educationProgram.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.educationProgram.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: EducationProgramUpdateData,
  ): Promise<EducationProgramRecord> {
    return await this.prisma.educationProgram.update({
      where: { id },
      data: data as Prisma.EducationProgramUncheckedUpdateInput,
    });
  }
}
