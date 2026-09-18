import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CurriculumCreateData,
  CurriculumListFilter,
  CurriculumListResult,
  CurriculumRecord,
  CurriculumUpdateData,
} from './curricula.types';

export const CURRICULA_REPOSITORY = Symbol('CURRICULA_REPOSITORY');

export interface CurriculaRepository {
  create(data: CurriculumCreateData): Promise<CurriculumRecord>;
  findById(id: string): Promise<CurriculumRecord | null>;
  findByProgramAndVersion(
    educationProgramId: string,
    version: string,
  ): Promise<CurriculumRecord | null>;
  list(filter: CurriculumListFilter): Promise<CurriculumListResult>;
  update(id: string, data: CurriculumUpdateData): Promise<CurriculumRecord>;
}

@Injectable()
export class PrismaCurriculaRepository implements CurriculaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CurriculumCreateData): Promise<CurriculumRecord> {
    return await this.prisma.curriculum.create({
      data: data as Prisma.CurriculumUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<CurriculumRecord | null> {
    return await this.prisma.curriculum.findUnique({ where: { id } });
  }

  async findByProgramAndVersion(
    educationProgramId: string,
    version: string,
  ): Promise<CurriculumRecord | null> {
    return await this.prisma.curriculum.findUnique({
      where: {
        educationProgramId_version: {
          educationProgramId,
          version,
        },
      },
    });
  }

  async list(filter: CurriculumListFilter): Promise<CurriculumListResult> {
    const where: Prisma.CurriculumWhereInput = {
      educationProgramId: filter.educationProgramId,
      status: filter.status,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.curriculum.findMany({
        where,
        orderBy: [{ version: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.curriculum.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: CurriculumUpdateData,
  ): Promise<CurriculumRecord> {
    return await this.prisma.curriculum.update({
      where: { id },
      data: data as Prisma.CurriculumUncheckedUpdateInput,
    });
  }
}
