import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcademicClassContext,
  EnrollmentCreateData,
  EnrollmentListFilter,
  EnrollmentListResult,
  EnrollmentRecord,
  EnrollmentUpdateData,
  PersonContext,
} from './enrollment.types';

export const ENROLLMENTS_REPOSITORY = Symbol('ENROLLMENTS_REPOSITORY');

export interface EnrollmentsRepository {
  create(data: EnrollmentCreateData): Promise<EnrollmentRecord>;
  findById(id: string): Promise<EnrollmentRecord | null>;
  findByPersonAndBatch(
    personId: string,
    educationBatchId: string,
  ): Promise<EnrollmentRecord | null>;
  findByEnrollmentNumber(
    enrollmentNumber: string,
  ): Promise<EnrollmentRecord | null>;
  list(filter: EnrollmentListFilter): Promise<EnrollmentListResult>;
  update(id: string, data: EnrollmentUpdateData): Promise<EnrollmentRecord>;
  findClassContext(
    academicClassId: string,
  ): Promise<AcademicClassContext | null>;
  findPersonContext(personId: string): Promise<PersonContext | null>;
}

@Injectable()
export class PrismaEnrollmentsRepository implements EnrollmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: EnrollmentCreateData): Promise<EnrollmentRecord> {
    return await this.prisma.enrollment.create({
      data: data as Prisma.EnrollmentUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<EnrollmentRecord | null> {
    return await this.prisma.enrollment.findUnique({ where: { id } });
  }

  async findByPersonAndBatch(
    personId: string,
    educationBatchId: string,
  ): Promise<EnrollmentRecord | null> {
    return await this.prisma.enrollment.findUnique({
      where: {
        personId_educationBatchId: { personId, educationBatchId },
      },
    });
  }

  async findByEnrollmentNumber(
    enrollmentNumber: string,
  ): Promise<EnrollmentRecord | null> {
    return await this.prisma.enrollment.findUnique({
      where: { enrollmentNumber },
    });
  }

  async list(filter: EnrollmentListFilter): Promise<EnrollmentListResult> {
    const batchFilter: Prisma.EducationBatchWhereInput = {};

    if (filter.educationProgramId) {
      batchFilter.educationProgramId = filter.educationProgramId;
    }

    if (filter.organizationId) {
      batchFilter.educationProgram = { organizationId: filter.organizationId };
    }

    const where: Prisma.EnrollmentWhereInput = {
      personId: filter.personId,
      educationBatchId: filter.educationBatchId,
      academicClassId: filter.academicClassId,
      status: filter.status,
      ...(Object.keys(batchFilter).length > 0
        ? { educationBatch: batchFilter }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        orderBy: [{ enrolledAt: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: EnrollmentUpdateData,
  ): Promise<EnrollmentRecord> {
    return await this.prisma.enrollment.update({
      where: { id },
      data: data as Prisma.EnrollmentUncheckedUpdateInput,
    });
  }

  async findClassContext(
    academicClassId: string,
  ): Promise<AcademicClassContext | null> {
    return await this.prisma.academicClass.findUnique({
      where: { id: academicClassId },
      select: { id: true, educationBatchId: true },
    });
  }

  async findPersonContext(personId: string): Promise<PersonContext | null> {
    return await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, fullName: true, status: true },
    });
  }
}
