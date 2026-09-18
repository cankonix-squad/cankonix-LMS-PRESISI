import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcademicClassContext,
  ClassStaffAssignmentCreateData,
  ClassStaffAssignmentListFilter,
  ClassStaffAssignmentListResult,
  ClassStaffAssignmentRecord,
  ClassStaffAssignmentUpdateData,
  PersonContext,
} from './class-staff-assignment.types';

export const CLASS_STAFF_ASSIGNMENTS_REPOSITORY = Symbol(
  'CLASS_STAFF_ASSIGNMENTS_REPOSITORY',
);

export interface ClassStaffAssignmentsRepository {
  create(
    data: ClassStaffAssignmentCreateData,
  ): Promise<ClassStaffAssignmentRecord>;
  findById(id: string): Promise<ClassStaffAssignmentRecord | null>;
  findActiveDuplicate(
    personId: string,
    academicClassId: string,
    staffType: string,
  ): Promise<ClassStaffAssignmentRecord | null>;
  findOverlapping(
    personId: string,
    academicClassId: string,
    staffType: string,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string,
  ): Promise<ClassStaffAssignmentRecord[]>;
  list(
    filter: ClassStaffAssignmentListFilter,
  ): Promise<ClassStaffAssignmentListResult>;
  update(
    id: string,
    data: ClassStaffAssignmentUpdateData,
  ): Promise<ClassStaffAssignmentRecord>;
  findPersonContext(personId: string): Promise<PersonContext | null>;
  findAcademicClassContext(
    academicClassId: string,
  ): Promise<AcademicClassContext | null>;
}

@Injectable()
export class PrismaClassStaffAssignmentsRepository implements ClassStaffAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: ClassStaffAssignmentCreateData,
  ): Promise<ClassStaffAssignmentRecord> {
    return await this.prisma.classStaffAssignment.create({
      data: data as Prisma.ClassStaffAssignmentUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<ClassStaffAssignmentRecord | null> {
    return await this.prisma.classStaffAssignment.findUnique({ where: { id } });
  }

  async findActiveDuplicate(
    personId: string,
    academicClassId: string,
    staffType: string,
  ): Promise<ClassStaffAssignmentRecord | null> {
    return await this.prisma.classStaffAssignment.findFirst({
      where: {
        personId,
        academicClassId,
        staffType,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Finds active assignments for the same person, class, and staff type that
   * would overlap the requested validity window, ignoring the record being
   * updated. Overlap means existing.validFrom <= newValidUntil AND
   * (existing.validUntil IS NULL OR existing.validUntil >= newValidFrom).
   *
   * The check is deliberately scoped to the person, unlike educator assignments
   * which are scoped to the class subject and educator type. A class staff role
   * code is institution-owned free text and may legitimately have several
   * concurrent holders (for example PENGASUH or PEMBIMBING), whereas a class
   * subject has exactly one holder per educator type at a time.
   */
  async findOverlapping(
    personId: string,
    academicClassId: string,
    staffType: string,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string,
  ): Promise<ClassStaffAssignmentRecord[]> {
    return await this.prisma.classStaffAssignment.findMany({
      where: {
        personId,
        academicClassId,
        staffType,
        status: 'ACTIVE',
        ...(excludeId ? { id: { not: excludeId } } : {}),
        validFrom: validUntil ? { lte: validUntil } : undefined,
        OR: [{ validUntil: null }, { validUntil: { gte: validFrom } }],
      },
    });
  }

  async list(
    filter: ClassStaffAssignmentListFilter,
  ): Promise<ClassStaffAssignmentListResult> {
    const where: Prisma.ClassStaffAssignmentWhereInput = {
      personId: filter.personId,
      academicClassId: filter.academicClassId,
      staffType: filter.staffType,
      status: filter.status,
      ...(filter.educationBatchId
        ? { academicClass: { educationBatchId: filter.educationBatchId } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.classStaffAssignment.findMany({
        where,
        orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.classStaffAssignment.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: ClassStaffAssignmentUpdateData,
  ): Promise<ClassStaffAssignmentRecord> {
    return await this.prisma.classStaffAssignment.update({
      where: { id },
      data: data as Prisma.ClassStaffAssignmentUncheckedUpdateInput,
    });
  }

  async findPersonContext(personId: string): Promise<PersonContext | null> {
    return await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, fullName: true, status: true },
    });
  }

  async findAcademicClassContext(
    academicClassId: string,
  ): Promise<AcademicClassContext | null> {
    return await this.prisma.academicClass.findUnique({
      where: { id: academicClassId },
      select: { id: true, code: true, educationBatchId: true },
    });
  }
}
