import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClassSubjectContext,
  EducatorAssignmentCreateData,
  EducatorAssignmentListFilter,
  EducatorAssignmentListResult,
  EducatorAssignmentRecord,
  EducatorAssignmentUpdateData,
  EducatorTypeContext,
  PersonContext,
} from './educator-assignment.types';

export const EDUCATOR_ASSIGNMENTS_REPOSITORY = Symbol(
  'EDUCATOR_ASSIGNMENTS_REPOSITORY',
);

export interface EducatorAssignmentsRepository {
  create(data: EducatorAssignmentCreateData): Promise<EducatorAssignmentRecord>;
  findById(id: string): Promise<EducatorAssignmentRecord | null>;
  findActiveDuplicate(
    personId: string,
    classSubjectId: string,
    educatorTypeId: string,
  ): Promise<EducatorAssignmentRecord | null>;
  findOverlapping(
    classSubjectId: string,
    educatorTypeId: string,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string,
  ): Promise<EducatorAssignmentRecord[]>;
  list(
    filter: EducatorAssignmentListFilter,
  ): Promise<EducatorAssignmentListResult>;
  update(
    id: string,
    data: EducatorAssignmentUpdateData,
  ): Promise<EducatorAssignmentRecord>;
  findPersonContext(personId: string): Promise<PersonContext | null>;
  findClassSubjectContext(
    classSubjectId: string,
  ): Promise<ClassSubjectContext | null>;
  findEducatorTypeContext(
    educatorTypeId: string,
  ): Promise<EducatorTypeContext | null>;
}

@Injectable()
export class PrismaEducatorAssignmentsRepository implements EducatorAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: EducatorAssignmentCreateData,
  ): Promise<EducatorAssignmentRecord> {
    return await this.prisma.educatorAssignment.create({
      data: data as Prisma.EducatorAssignmentUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<EducatorAssignmentRecord | null> {
    return await this.prisma.educatorAssignment.findUnique({ where: { id } });
  }

  async findActiveDuplicate(
    personId: string,
    classSubjectId: string,
    educatorTypeId: string,
  ): Promise<EducatorAssignmentRecord | null> {
    return await this.prisma.educatorAssignment.findFirst({
      where: {
        personId,
        classSubjectId,
        educatorTypeId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Finds assignments that would overlap the requested validity window for the
   * same class subject and educator type, ignoring the record being updated.
   */
  async findOverlapping(
    classSubjectId: string,
    educatorTypeId: string,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string,
  ): Promise<EducatorAssignmentRecord[]> {
    return await this.prisma.educatorAssignment.findMany({
      where: {
        classSubjectId,
        educatorTypeId,
        status: 'ACTIVE',
        ...(excludeId ? { id: { not: excludeId } } : {}),
        validFrom: validUntil ? { lte: validUntil } : undefined,
        OR: [{ validUntil: null }, { validUntil: { gte: validFrom } }],
      },
    });
  }

  async list(
    filter: EducatorAssignmentListFilter,
  ): Promise<EducatorAssignmentListResult> {
    const classSubjectFilter: Prisma.ClassSubjectWhereInput = {};

    if (filter.academicClassId) {
      classSubjectFilter.academicClassId = filter.academicClassId;
    }

    if (filter.educationBatchId) {
      classSubjectFilter.academicClass = {
        educationBatchId: filter.educationBatchId,
      };
    }

    const where: Prisma.EducatorAssignmentWhereInput = {
      personId: filter.personId,
      classSubjectId: filter.classSubjectId,
      educatorTypeId: filter.educatorTypeId,
      status: filter.status,
      ...(Object.keys(classSubjectFilter).length > 0
        ? { classSubject: classSubjectFilter }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.educatorAssignment.findMany({
        where,
        orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.educatorAssignment.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: EducatorAssignmentUpdateData,
  ): Promise<EducatorAssignmentRecord> {
    return await this.prisma.educatorAssignment.update({
      where: { id },
      data: data as Prisma.EducatorAssignmentUncheckedUpdateInput,
    });
  }

  async findPersonContext(personId: string): Promise<PersonContext | null> {
    return await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, fullName: true, status: true },
    });
  }

  async findClassSubjectContext(
    classSubjectId: string,
  ): Promise<ClassSubjectContext | null> {
    return await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      select: { id: true, academicClassId: true },
    });
  }

  async findEducatorTypeContext(
    educatorTypeId: string,
  ): Promise<EducatorTypeContext | null> {
    return await this.prisma.educatorType.findUnique({
      where: { id: educatorTypeId },
      select: { id: true, code: true, status: true },
    });
  }
}
