import { Injectable } from '@nestjs/common';
import { LearningMeetingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClassSubjectContext,
  LearningMeetingCreateData,
  LearningMeetingListFilter,
  LearningMeetingListResult,
  LearningMeetingRecord,
  LearningMeetingUpdateData,
  MeetingSequenceContext,
} from './learning-meeting.types';

export const LEARNING_MEETINGS_REPOSITORY = Symbol(
  'LEARNING_MEETINGS_REPOSITORY',
);

export interface LearningMeetingsRepository {
  create(data: LearningMeetingCreateData): Promise<LearningMeetingRecord>;
  findById(id: string): Promise<LearningMeetingRecord | null>;
  list(filter: LearningMeetingListFilter): Promise<LearningMeetingListResult>;
  update(
    id: string,
    data: LearningMeetingUpdateData,
  ): Promise<LearningMeetingRecord>;
  findClassSubjectContext(
    classSubjectId: string,
  ): Promise<ClassSubjectContext | null>;
  /** Sequence holder lookup, used to reject a duplicate sequence with 409. */
  findBySequence(
    classSubjectId: string,
    sequence: number,
    excludeId?: string,
  ): Promise<MeetingSequenceContext | null>;
  /** Highest sequence currently used by the class subject, or 0 when empty. */
  maxSequence(classSubjectId: string): Promise<number>;
  /** All meetings of a class subject, as lightweight sequence contexts. */
  listSequenceContexts(
    classSubjectId: string,
  ): Promise<MeetingSequenceContext[]>;
  /**
   * Applies a complete sequence plan for one class subject in a single
   * transaction. Returns the meetings in their new order.
   */
  applySequencePlan(
    classSubjectId: string,
    orderedMeetingIds: string[],
  ): Promise<LearningMeetingRecord[]>;
}

@Injectable()
export class PrismaLearningMeetingsRepository implements LearningMeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: LearningMeetingCreateData,
  ): Promise<LearningMeetingRecord> {
    return await this.prisma.learningMeeting.create({
      data: data as Prisma.LearningMeetingUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<LearningMeetingRecord | null> {
    return await this.prisma.learningMeeting.findUnique({ where: { id } });
  }

  async list(
    filter: LearningMeetingListFilter,
  ): Promise<LearningMeetingListResult> {
    const classSubjectFilter: Prisma.ClassSubjectWhereInput = {};

    if (filter.academicClassId) {
      classSubjectFilter.academicClassId = filter.academicClassId;
    }

    if (filter.educationBatchId) {
      classSubjectFilter.academicClass = {
        educationBatchId: filter.educationBatchId,
      };
    }

    const where: Prisma.LearningMeetingWhereInput = {
      classSubjectId: filter.classSubjectId,
      status: filter.status as LearningMeetingStatus | undefined,
      ...(filter.search
        ? { title: { contains: filter.search, mode: 'insensitive' } }
        : {}),
      ...(Object.keys(classSubjectFilter).length > 0
        ? { classSubject: classSubjectFilter }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningMeeting.findMany({
        where,
        // Sequence is the pedagogical order, so it is the primary sort key.
        orderBy: [{ classSubjectId: 'asc' }, { sequence: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.learningMeeting.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: LearningMeetingUpdateData,
  ): Promise<LearningMeetingRecord> {
    return await this.prisma.learningMeeting.update({
      where: { id },
      data: data as Prisma.LearningMeetingUncheckedUpdateInput,
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

  async findBySequence(
    classSubjectId: string,
    sequence: number,
    excludeId?: string,
  ): Promise<MeetingSequenceContext | null> {
    return await this.prisma.learningMeeting.findFirst({
      where: {
        classSubjectId,
        sequence,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, classSubjectId: true, sequence: true, status: true },
    });
  }

  async maxSequence(classSubjectId: string): Promise<number> {
    const result = await this.prisma.learningMeeting.aggregate({
      where: { classSubjectId },
      _max: { sequence: true },
    });

    return result._max.sequence ?? 0;
  }

  async listSequenceContexts(
    classSubjectId: string,
  ): Promise<MeetingSequenceContext[]> {
    return await this.prisma.learningMeeting.findMany({
      where: { classSubjectId },
      select: { id: true, classSubjectId: true, sequence: true, status: true },
    });
  }

  /**
   * Reassigns sequences for the whole class subject inside one transaction.
   *
   * The `[classSubjectId, sequence]` unique index makes a naive in-place update
   * fail whenever the plan swaps two meetings (the new value of the first still
   * collides with the old value of the second). The plan is therefore applied in
   * two passes: every meeting first moves to a temporary high sequence that no
   * real sequence can reach, and only then is the final value written. Inside the
   * transaction the intermediate state is never visible to other readers.
   */
  async applySequencePlan(
    classSubjectId: string,
    orderedMeetingIds: string[],
  ): Promise<LearningMeetingRecord[]> {
    const TEMPORARY_SEQUENCE_OFFSET = 1_000_000;

    return await this.prisma.$transaction(async (tx) => {
      const parked = await Promise.all(
        orderedMeetingIds.map((id, index) =>
          tx.learningMeeting.update({
            where: { id },
            data: { sequence: TEMPORARY_SEQUENCE_OFFSET + index + 1 },
          }),
        ),
      );

      const byId = new Map(parked.map((meeting) => [meeting.id, meeting]));

      for (const [index, id] of orderedMeetingIds.entries()) {
        const updated = await tx.learningMeeting.update({
          where: { id },
          data: { sequence: index + 1 },
        });
        byId.set(id, updated);
      }

      return orderedMeetingIds.map((id) => {
        const meeting = byId.get(id);
        if (!meeting) {
          // Unreachable: every id was just updated in this transaction.
          throw new Error(`Meeting ${id} disappeared during reorder`);
        }
        return meeting;
      });
    });
  }
}
