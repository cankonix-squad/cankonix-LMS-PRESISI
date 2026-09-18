import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcademicClassRecord,
  CreateAcademicClassData,
  FindAcademicClassesFilter,
  UpdateAcademicClassData,
} from './academic-classes.types';

export const ACADEMIC_CLASSES_REPOSITORY = Symbol(
  'ACADEMIC_CLASSES_REPOSITORY',
);

export interface AcademicClassesRepository {
  create(data: CreateAcademicClassData): Promise<AcademicClassRecord>;
  findById(id: string): Promise<AcademicClassRecord | null>;
  findByBatchAndCode(
    educationBatchId: string,
    code: string,
  ): Promise<AcademicClassRecord | null>;
  findMany(filter: FindAcademicClassesFilter): Promise<{
    data: AcademicClassRecord[];
    total: number;
  }>;
  update(
    id: string,
    data: UpdateAcademicClassData,
  ): Promise<AcademicClassRecord>;
}

@Injectable()
export class PrismaAcademicClassesRepository implements AcademicClassesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAcademicClassData): Promise<AcademicClassRecord> {
    return this.prisma.academicClass.create({
      data: {
        educationBatchId: data.educationBatchId,
        code: data.code,
        name: data.name,
        capacity: data.capacity ?? null,
        status: data.status,
      },
    });
  }

  async findById(id: string): Promise<AcademicClassRecord | null> {
    return this.prisma.academicClass.findUnique({
      where: { id },
    });
  }

  async findByBatchAndCode(
    educationBatchId: string,
    code: string,
  ): Promise<AcademicClassRecord | null> {
    return this.prisma.academicClass.findUnique({
      where: {
        educationBatchId_code: {
          educationBatchId,
          code,
        },
      },
    });
  }

  async findMany(filter: FindAcademicClassesFilter): Promise<{
    data: AcademicClassRecord[];
    total: number;
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.educationBatchId) {
      where.educationBatchId = filter.educationBatchId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.educationProgramId || filter.organizationId) {
      where.educationBatch = {
        ...(filter.educationProgramId
          ? { educationProgramId: filter.educationProgramId }
          : {}),
        ...(filter.organizationId
          ? { educationProgram: { organizationId: filter.organizationId } }
          : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.academicClass.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { code: 'asc' }],
      }),
      this.prisma.academicClass.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: UpdateAcademicClassData,
  ): Promise<AcademicClassRecord> {
    return this.prisma.academicClass.update({
      where: { id },
      data,
    });
  }
}
