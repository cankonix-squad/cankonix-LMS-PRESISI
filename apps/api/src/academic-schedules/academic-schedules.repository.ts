import { Injectable } from '@nestjs/common';
import {
  AcademicScheduleMode,
  AcademicScheduleStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcademicScheduleCreateData,
  AcademicScheduleListFilter,
  AcademicScheduleListResult,
  AcademicScheduleRecord,
  AcademicScheduleUpdateData,
  ClassSubjectContext,
  ScheduleConflictRecord,
} from './academic-schedule.types';

export const ACADEMIC_SCHEDULES_REPOSITORY = Symbol(
  'ACADEMIC_SCHEDULES_REPOSITORY',
);

export interface AcademicSchedulesRepository {
  create(data: AcademicScheduleCreateData): Promise<AcademicScheduleRecord>;
  findById(id: string): Promise<AcademicScheduleRecord | null>;
  list(filter: AcademicScheduleListFilter): Promise<AcademicScheduleListResult>;
  update(
    id: string,
    data: AcademicScheduleUpdateData,
  ): Promise<AcademicScheduleRecord>;
  findClassSubjectContext(
    classSubjectId: string,
  ): Promise<ClassSubjectContext | null>;
  /**
   * Other occupying schedules for the same class subject whose period overlaps
   * the requested window, excluding the record being updated.
   */
  findConflicts(
    classSubjectId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<ScheduleConflictRecord[]>;
}

@Injectable()
export class PrismaAcademicSchedulesRepository implements AcademicSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: AcademicScheduleCreateData,
  ): Promise<AcademicScheduleRecord> {
    return await this.prisma.academicSchedule.create({
      data: data as Prisma.AcademicScheduleUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<AcademicScheduleRecord | null> {
    return await this.prisma.academicSchedule.findUnique({ where: { id } });
  }

  async list(
    filter: AcademicScheduleListFilter,
  ): Promise<AcademicScheduleListResult> {
    const classSubjectFilter: Prisma.ClassSubjectWhereInput = {};

    if (filter.academicClassId) {
      classSubjectFilter.academicClassId = filter.academicClassId;
    }

    if (filter.educationBatchId) {
      classSubjectFilter.academicClass = {
        educationBatchId: filter.educationBatchId,
      };
    }

    const where: Prisma.AcademicScheduleWhereInput = {
      classSubjectId: filter.classSubjectId,
      mode: filter.mode as AcademicScheduleMode | undefined,
      status: filter.status as AcademicScheduleStatus | undefined,
      ...(Object.keys(classSubjectFilter).length > 0
        ? { classSubject: classSubjectFilter }
        : {}),
      // Overlap semantics: an entry is in-window when it starts at or before the
      // window end and ends at or after the window start.
      ...(filter.to ? { startAt: { lte: filter.to } } : {}),
      ...(filter.from ? { endAt: { gte: filter.from } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.academicSchedule.findMany({
        where,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.academicSchedule.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: AcademicScheduleUpdateData,
  ): Promise<AcademicScheduleRecord> {
    return await this.prisma.academicSchedule.update({
      where: { id },
      data: data as Prisma.AcademicScheduleUncheckedUpdateInput,
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
        academicClass: { select: { id: true, educationBatchId: true } },
      },
    });
  }

  /**
   * Uses strict overlap (existing.startAt < new.endAt AND existing.endAt >
   * new.startAt) so back-to-back sessions — one ending exactly when the next
   * begins — are not flagged as conflicting.
   */
  async findConflicts(
    classSubjectId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<ScheduleConflictRecord[]> {
    return await this.prisma.academicSchedule.findMany({
      where: {
        classSubjectId,
        status: { not: 'CANCELLED' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: {
        id: true,
        classSubjectId: true,
        title: true,
        startAt: true,
        endAt: true,
        status: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }
}
