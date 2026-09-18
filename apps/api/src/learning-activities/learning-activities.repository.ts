import { Injectable } from '@nestjs/common';
import { LearningActivityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivitySequenceContext,
  ActivityTypeContext,
  LearningActivityCreateData,
  LearningActivityListFilter,
  LearningActivityListResult,
  LearningActivityRecord,
  LearningActivityUpdateData,
  MeetingContext,
} from './learning-activity.types';

export const LEARNING_ACTIVITIES_REPOSITORY = Symbol(
  'LEARNING_ACTIVITIES_REPOSITORY',
);

export interface LearningActivitiesRepository {
  create(data: LearningActivityCreateData): Promise<LearningActivityRecord>;
  findById(id: string): Promise<LearningActivityRecord | null>;
  list(filter: LearningActivityListFilter): Promise<LearningActivityListResult>;
  update(
    id: string,
    data: LearningActivityUpdateData,
  ): Promise<LearningActivityRecord>;
  findMeetingContext(meetingId: string): Promise<MeetingContext | null>;
  findActivityTypeContext(
    activityTypeId: string,
  ): Promise<ActivityTypeContext | null>;
  /** Sequence holder lookup, used to reject a duplicate sequence with 409. */
  findBySequence(
    meetingId: string,
    sequence: number,
    excludeId?: string,
  ): Promise<ActivitySequenceContext | null>;
  /** Highest sequence in the meeting, or 0 when the meeting has no activity. */
  maxSequence(meetingId: string): Promise<number>;
  /** All activities of a meeting, as lightweight sequence contexts. */
  listSequenceContexts(meetingId: string): Promise<ActivitySequenceContext[]>;
  /**
   * Applies a complete sequence plan for one meeting in a single transaction.
   * Returns the activities in their new order.
   */
  applySequencePlan(
    meetingId: string,
    orderedActivityIds: string[],
  ): Promise<LearningActivityRecord[]>;
  /** Published content count, used by the publish validation. */
  countPublishedContents(activityId: string): Promise<number>;
  /** Content of any status, used to decide whether a type change is safe. */
  countContents(activityId: string): Promise<number>;
}

@Injectable()
export class PrismaLearningActivitiesRepository implements LearningActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: LearningActivityCreateData,
  ): Promise<LearningActivityRecord> {
    return await this.prisma.learningActivity.create({
      data: data as Prisma.LearningActivityUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<LearningActivityRecord | null> {
    return await this.prisma.learningActivity.findUnique({ where: { id } });
  }

  async list(
    filter: LearningActivityListFilter,
  ): Promise<LearningActivityListResult> {
    const where: Prisma.LearningActivityWhereInput = {
      meetingId: filter.meetingId,
      activityTypeId: filter.activityTypeId,
      status: filter.status as LearningActivityStatus | undefined,
      ...(filter.classSubjectId ||
      filter.academicClassId ||
      filter.educationBatchId
        ? {
            meeting: {
              classSubjectId: filter.classSubjectId,
              classSubject:
                filter.academicClassId || filter.educationBatchId
                  ? {
                      academicClassId: filter.academicClassId,
                      academicClass: filter.educationBatchId
                        ? { educationBatchId: filter.educationBatchId }
                        : undefined,
                    }
                  : undefined,
            },
          }
        : {}),
      ...(filter.search
        ? { title: { contains: filter.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningActivity.findMany({
        where,
        orderBy: [{ meetingId: 'asc' }, { sequence: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.learningActivity.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: LearningActivityUpdateData,
  ): Promise<LearningActivityRecord> {
    return await this.prisma.learningActivity.update({
      where: { id },
      data: data as Prisma.LearningActivityUncheckedUpdateInput,
    });
  }

  async findMeetingContext(meetingId: string): Promise<MeetingContext | null> {
    return await this.prisma.learningMeeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        classSubjectId: true,
        sequence: true,
        status: true,
      },
    });
  }

  async findActivityTypeContext(
    activityTypeId: string,
  ): Promise<ActivityTypeContext | null> {
    return await this.prisma.learningActivityType.findUnique({
      where: { id: activityTypeId },
      select: {
        id: true,
        code: true,
        requiresContent: true,
        status: true,
      },
    });
  }

  async findBySequence(
    meetingId: string,
    sequence: number,
    excludeId?: string,
  ): Promise<ActivitySequenceContext | null> {
    return await this.prisma.learningActivity.findFirst({
      where: {
        meetingId,
        sequence,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, meetingId: true, sequence: true, status: true },
    });
  }

  async maxSequence(meetingId: string): Promise<number> {
    const result = await this.prisma.learningActivity.aggregate({
      where: { meetingId },
      _max: { sequence: true },
    });
    return result._max.sequence ?? 0;
  }

  async listSequenceContexts(
    meetingId: string,
  ): Promise<ActivitySequenceContext[]> {
    return await this.prisma.learningActivity.findMany({
      where: { meetingId },
      select: { id: true, meetingId: true, sequence: true, status: true },
      orderBy: { sequence: 'asc' },
    });
  }

  /**
   * Two-phase plan, mirroring the meeting reorder: park every activity on a
   * temporary sequence so a swap cannot collide with the
   * `[meetingId, sequence]` unique index, then write the final values. A single
   * transaction keeps the temporary state invisible to readers.
   */
  async applySequencePlan(
    meetingId: string,
    orderedActivityIds: string[],
  ): Promise<LearningActivityRecord[]> {
    const TEMPORARY_SEQUENCE_OFFSET = 1_000_000;

    return await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of orderedActivityIds.entries()) {
        await tx.learningActivity.update({
          where: { id },
          data: { sequence: TEMPORARY_SEQUENCE_OFFSET + index + 1 },
        });
      }

      const updated: LearningActivityRecord[] = [];
      for (const [index, id] of orderedActivityIds.entries()) {
        updated.push(
          await tx.learningActivity.update({
            where: { id },
            data: { sequence: index + 1 },
          }),
        );
      }

      return updated;
    });
  }

  async countPublishedContents(activityId: string): Promise<number> {
    return await this.prisma.learningContent.count({
      where: { activityId, status: 'PUBLISHED' },
    });
  }

  async countContents(activityId: string): Promise<number> {
    return await this.prisma.learningContent.count({ where: { activityId } });
  }
}
