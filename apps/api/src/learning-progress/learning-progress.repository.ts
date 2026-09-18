import { Injectable } from '@nestjs/common';
import { LearningProgressStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityEligibilityContext,
  ClassSubjectActivityCounts,
  ClassSubjectProgressAggregateRecord,
  EnrollmentEligibilityContext,
  EnrollmentProgressCounts,
  LearningProgressCreateData,
  LearningProgressListFilter,
  LearningProgressListResult,
  LearningProgressRecord,
  LearningProgressUpdateData,
} from './learning-progress.types';

export const LEARNING_PROGRESS_REPOSITORY = Symbol(
  'LEARNING_PROGRESS_REPOSITORY',
);

export interface LearningProgressRepository {
  upsert(
    data: LearningProgressCreateData,
    updateData: LearningProgressUpdateData,
  ): Promise<LearningProgressRecord>;
  findById(id: string): Promise<LearningProgressRecord | null>;
  findByEnrollmentAndActivity(
    enrollmentId: string,
    activityId: string,
  ): Promise<LearningProgressRecord | null>;
  list(filter: LearningProgressListFilter): Promise<LearningProgressListResult>;
  findActivityContext(
    activityId: string,
  ): Promise<ActivityEligibilityContext | null>;
  findEnrollmentContext(
    enrollmentId: string,
  ): Promise<EnrollmentEligibilityContext | null>;
  getClassSubjectActivityCounts(
    classSubjectId: string,
  ): Promise<ClassSubjectActivityCounts>;
  getEnrollmentProgressCounts(
    classSubjectId: string,
    enrollmentId: string,
  ): Promise<EnrollmentProgressCounts>;
  upsertAggregate(
    classSubjectId: string,
    enrollmentId: string,
    totalActivities: number,
    completedActivities: number,
    requiredActivities: number,
    completedRequiredActivities: number,
    progressPercent: number,
    lastActivityAt: Date | null,
  ): Promise<ClassSubjectProgressAggregateRecord>;
  findAggregate(
    classSubjectId: string,
    enrollmentId: string,
  ): Promise<ClassSubjectProgressAggregateRecord | null>;
  listAggregatesByClassSubject(
    classSubjectId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ClassSubjectProgressAggregateRecord[]; total: number }>;
}

@Injectable()
export class PrismaLearningProgressRepository implements LearningProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    data: LearningProgressCreateData,
    updateData: LearningProgressUpdateData,
  ): Promise<LearningProgressRecord> {
    return await this.prisma.learningProgress.upsert({
      where: {
        enrollmentId_activityId: {
          enrollmentId: data.enrollmentId,
          activityId: data.activityId,
        },
      },
      create: data as Prisma.LearningProgressUncheckedCreateInput,
      update: updateData as Prisma.LearningProgressUncheckedUpdateInput,
    });
  }

  async findById(id: string): Promise<LearningProgressRecord | null> {
    return await this.prisma.learningProgress.findUnique({ where: { id } });
  }

  async findByEnrollmentAndActivity(
    enrollmentId: string,
    activityId: string,
  ): Promise<LearningProgressRecord | null> {
    return await this.prisma.learningProgress.findUnique({
      where: {
        enrollmentId_activityId: { enrollmentId, activityId },
      },
    });
  }

  async list(
    filter: LearningProgressListFilter,
  ): Promise<LearningProgressListResult> {
    const where: Prisma.LearningProgressWhereInput = {
      enrollmentId: filter.enrollmentId,
      activityId: filter.activityId,
      status: filter.status as LearningProgressStatus | undefined,
      ...(filter.classSubjectId || filter.meetingId
        ? {
            activity: {
              meetingId: filter.meetingId,
              meeting: filter.classSubjectId
                ? { classSubjectId: filter.classSubjectId }
                : undefined,
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningProgress.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.learningProgress.count({ where }),
    ]);

    return { data, total };
  }

  async findActivityContext(
    activityId: string,
  ): Promise<ActivityEligibilityContext | null> {
    const activity = await this.prisma.learningActivity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        status: true,
        required: true,
        meetingId: true,
        meeting: {
          select: {
            status: true,
            classSubjectId: true,
            classSubject: {
              select: {
                status: true,
                academicClassId: true,
              },
            },
          },
        },
      },
    });

    if (!activity) {
      return null;
    }

    return {
      activityId: activity.id,
      activityStatus: activity.status,
      activityRequired: activity.required,
      meetingId: activity.meetingId,
      meetingStatus: activity.meeting.status,
      classSubjectId: activity.meeting.classSubjectId,
      classSubjectStatus: activity.meeting.classSubject.status,
      academicClassId: activity.meeting.classSubject.academicClassId,
    };
  }

  async findEnrollmentContext(
    enrollmentId: string,
  ): Promise<EnrollmentEligibilityContext | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        personId: true,
        status: true,
        educationBatchId: true,
        academicClassId: true,
      },
    });

    if (!enrollment) {
      return null;
    }

    return {
      enrollmentId: enrollment.id,
      personId: enrollment.personId,
      status: enrollment.status,
      educationBatchId: enrollment.educationBatchId,
      academicClassId: enrollment.academicClassId,
    };
  }

  async getClassSubjectActivityCounts(
    classSubjectId: string,
  ): Promise<ClassSubjectActivityCounts> {
    const activities = await this.prisma.learningActivity.findMany({
      where: {
        meeting: { classSubjectId },
        status: 'PUBLISHED',
      },
      select: { required: true },
    });

    const totalActivities = activities.length;
    const requiredActivities = activities.filter((a) => a.required).length;

    return {
      classSubjectId,
      totalActivities,
      requiredActivities,
    };
  }

  async getEnrollmentProgressCounts(
    classSubjectId: string,
    enrollmentId: string,
  ): Promise<EnrollmentProgressCounts> {
    const progressList = await this.prisma.learningProgress.findMany({
      where: {
        enrollmentId,
        activity: {
          meeting: { classSubjectId },
          status: 'PUBLISHED',
        },
      },
      select: {
        status: true,
        completedAt: true,
        lastAccessedAt: true,
        activity: {
          select: { required: true },
        },
      },
    });

    const completed = progressList.filter(
      (p) => p.status === LearningProgressStatus.COMPLETED,
    );
    const completedActivities = completed.length;
    const completedRequiredActivities = completed.filter(
      (p) => p.activity.required,
    ).length;

    let lastActivityAt: Date | null = null;
    for (const p of progressList) {
      const ts = p.completedAt ?? p.lastAccessedAt;
      if (ts && (!lastActivityAt || ts > lastActivityAt)) {
        lastActivityAt = ts;
      }
    }

    return {
      completedActivities,
      completedRequiredActivities,
      lastActivityAt,
    };
  }

  async upsertAggregate(
    classSubjectId: string,
    enrollmentId: string,
    totalActivities: number,
    completedActivities: number,
    requiredActivities: number,
    completedRequiredActivities: number,
    progressPercent: number,
    lastActivityAt: Date | null,
  ): Promise<ClassSubjectProgressAggregateRecord> {
    const now = new Date();
    return await this.prisma.classSubjectProgressAggregate.upsert({
      where: {
        classSubjectId_enrollmentId: { classSubjectId, enrollmentId },
      },
      create: {
        classSubjectId,
        enrollmentId,
        totalActivities,
        completedActivities,
        requiredActivities,
        completedRequiredActivities,
        progressPercent,
        lastActivityAt,
        recalculatedAt: now,
      },
      update: {
        totalActivities,
        completedActivities,
        requiredActivities,
        completedRequiredActivities,
        progressPercent,
        lastActivityAt,
        recalculatedAt: now,
      },
    });
  }

  async findAggregate(
    classSubjectId: string,
    enrollmentId: string,
  ): Promise<ClassSubjectProgressAggregateRecord | null> {
    return await this.prisma.classSubjectProgressAggregate.findUnique({
      where: {
        classSubjectId_enrollmentId: { classSubjectId, enrollmentId },
      },
    });
  }

  async listAggregatesByClassSubject(
    classSubjectId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ClassSubjectProgressAggregateRecord[]; total: number }> {
    const where = { classSubjectId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.classSubjectProgressAggregate.findMany({
        where,
        orderBy: [{ progressPercent: 'desc' }, { enrollmentId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.classSubjectProgressAggregate.count({ where }),
    ]);

    return { data, total };
  }
}
