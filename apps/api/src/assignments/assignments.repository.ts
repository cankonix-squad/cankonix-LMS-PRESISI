import { Injectable } from '@nestjs/common';
import {
  AssignmentLifecycleStatus,
  AssignmentSubmissionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityContext,
  AssignmentCreateData,
  AssignmentGradeRecord,
  AssignmentGradeUpsertData,
  AssignmentListFilter,
  AssignmentListResult,
  AssignmentRecord,
  AssignmentUpdateData,
  EnrollmentContext,
  StoredFileContext,
  SubmissionCreateData,
  SubmissionFileDetail,
  SubmissionFileRecord,
  SubmissionListFilter,
  SubmissionListResult,
  SubmissionRecord,
  SubmissionUpdateData,
} from './assignment.types';

export const ASSIGNMENTS_REPOSITORY = Symbol('ASSIGNMENTS_REPOSITORY');

export interface AssignmentsRepository {
  create(data: AssignmentCreateData): Promise<AssignmentRecord>;
  findById(id: string): Promise<AssignmentRecord | null>;
  findByActivityId(activityId: string): Promise<AssignmentRecord | null>;
  list(filter: AssignmentListFilter): Promise<AssignmentListResult>;
  update(id: string, data: AssignmentUpdateData): Promise<AssignmentRecord>;
  findActivityContext(activityId: string): Promise<ActivityContext | null>;
  findEnrollmentContext(
    enrollmentId: string,
  ): Promise<EnrollmentContext | null>;
  /** True when the person is an active educator on the class subject. */
  isEducatorForClassSubject(
    personId: string,
    classSubjectId: string,
    at: Date,
  ): Promise<boolean>;

  createSubmission(data: SubmissionCreateData): Promise<SubmissionRecord>;
  findSubmissionById(id: string): Promise<SubmissionRecord | null>;
  listSubmissions(filter: SubmissionListFilter): Promise<SubmissionListResult>;
  updateSubmission(
    id: string,
    data: SubmissionUpdateData,
  ): Promise<SubmissionRecord>;
  /** Highest attempt number already used, or 0 when there is none. */
  maxAttemptNo(assignmentId: string, enrollmentId: string): Promise<number>;
  findSubmissionByAttempt(
    assignmentId: string,
    enrollmentId: string,
    attemptNo: number,
  ): Promise<SubmissionRecord | null>;
  findLatestSubmission(
    assignmentId: string,
    enrollmentId: string,
  ): Promise<SubmissionRecord | null>;

  attachFile(
    submissionId: string,
    storedFileId: string,
    label: string | null,
  ): Promise<SubmissionFileRecord>;
  findFileLink(
    submissionId: string,
    storedFileId: string,
  ): Promise<SubmissionFileRecord | null>;
  listFiles(submissionId: string): Promise<SubmissionFileDetail[]>;
  detachFile(submissionId: string, storedFileId: string): Promise<void>;
  findStoredFileContext(
    storedFileId: string,
  ): Promise<StoredFileContext | null>;

  upsertGrade(
    submissionId: string,
    data: AssignmentGradeUpsertData,
  ): Promise<AssignmentGradeRecord>;
  findGrade(submissionId: string): Promise<AssignmentGradeRecord | null>;
}

@Injectable()
export class PrismaAssignmentsRepository implements AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AssignmentCreateData): Promise<AssignmentRecord> {
    return await this.prisma.assignment.create({
      data: data as Prisma.AssignmentUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<AssignmentRecord | null> {
    return await this.prisma.assignment.findUnique({ where: { id } });
  }

  async findByActivityId(activityId: string): Promise<AssignmentRecord | null> {
    return await this.prisma.assignment.findUnique({
      where: { activityId },
    });
  }

  async list(filter: AssignmentListFilter): Promise<AssignmentListResult> {
    const where: Prisma.AssignmentWhereInput = {
      status: filter.status as AssignmentLifecycleStatus | undefined,
      ...(filter.search
        ? { title: { contains: filter.search, mode: 'insensitive' } }
        : {}),
      ...(filter.activityId ||
      filter.meetingId ||
      filter.classSubjectId ||
      filter.academicClassId ||
      filter.educationBatchId
        ? {
            activity: {
              id: filter.activityId,
              meetingId: filter.meetingId,
              meeting: {
                classSubject: {
                  id: filter.classSubjectId,
                  academicClassId: filter.academicClassId,
                  academicClass: filter.educationBatchId
                    ? { educationBatchId: filter.educationBatchId }
                    : undefined,
                },
              },
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assignment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: AssignmentUpdateData,
  ): Promise<AssignmentRecord> {
    return await this.prisma.assignment.update({
      where: { id },
      data: data as Prisma.AssignmentUncheckedUpdateInput,
    });
  }

  async findActivityContext(
    activityId: string,
  ): Promise<ActivityContext | null> {
    const activity = await this.prisma.learningActivity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        status: true,
        meetingId: true,
        meeting: {
          select: {
            status: true,
            classSubjectId: true,
            classSubject: {
              select: {
                status: true,
                academicClassId: true,
                academicClass: { select: { educationBatchId: true } },
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
      meetingId: activity.meetingId,
      meetingStatus: activity.meeting.status,
      classSubjectId: activity.meeting.classSubjectId,
      classSubjectStatus: activity.meeting.classSubject.status,
      academicClassId: activity.meeting.classSubject.academicClassId,
      educationBatchId:
        activity.meeting.classSubject.academicClass.educationBatchId,
    };
  }

  async findEnrollmentContext(
    enrollmentId: string,
  ): Promise<EnrollmentContext | null> {
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

  async isEducatorForClassSubject(
    personId: string,
    classSubjectId: string,
    at: Date,
  ): Promise<boolean> {
    const found = await this.prisma.educatorAssignment.findFirst({
      where: {
        personId,
        classSubjectId,
        status: 'ACTIVE',
        validFrom: { lte: at },
        OR: [{ validUntil: null }, { validUntil: { gte: at } }],
      },
      select: { id: true },
    });

    return found !== null;
  }

  async createSubmission(
    data: SubmissionCreateData,
  ): Promise<SubmissionRecord> {
    return await this.prisma.assignmentSubmission.create({
      data: data as Prisma.AssignmentSubmissionUncheckedCreateInput,
    });
  }

  async findSubmissionById(id: string): Promise<SubmissionRecord | null> {
    return await this.prisma.assignmentSubmission.findUnique({
      where: { id },
    });
  }

  async listSubmissions(
    filter: SubmissionListFilter,
  ): Promise<SubmissionListResult> {
    const where: Prisma.AssignmentSubmissionWhereInput = {
      assignmentId: filter.assignmentId,
      enrollmentId: filter.enrollmentId,
      status: filter.status as AssignmentSubmissionStatus | undefined,
      ...(filter.personId ? { enrollment: { personId: filter.personId } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assignmentSubmission.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.assignmentSubmission.count({ where }),
    ]);

    return { data, total };
  }

  async updateSubmission(
    id: string,
    data: SubmissionUpdateData,
  ): Promise<SubmissionRecord> {
    return await this.prisma.assignmentSubmission.update({
      where: { id },
      data: data as Prisma.AssignmentSubmissionUncheckedUpdateInput,
    });
  }

  async maxAttemptNo(
    assignmentId: string,
    enrollmentId: string,
  ): Promise<number> {
    const result = await this.prisma.assignmentSubmission.aggregate({
      where: { assignmentId, enrollmentId },
      _max: { attemptNo: true },
    });
    return result._max.attemptNo ?? 0;
  }

  async findSubmissionByAttempt(
    assignmentId: string,
    enrollmentId: string,
    attemptNo: number,
  ): Promise<SubmissionRecord | null> {
    return await this.prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_enrollmentId_attemptNo: {
          assignmentId,
          enrollmentId,
          attemptNo,
        },
      },
    });
  }

  async findLatestSubmission(
    assignmentId: string,
    enrollmentId: string,
  ): Promise<SubmissionRecord | null> {
    return await this.prisma.assignmentSubmission.findFirst({
      where: { assignmentId, enrollmentId },
      orderBy: { attemptNo: 'desc' },
    });
  }

  async attachFile(
    submissionId: string,
    storedFileId: string,
    label: string | null,
  ): Promise<SubmissionFileRecord> {
    return await this.prisma.assignmentSubmissionFile.create({
      data: { submissionId, storedFileId, label },
    });
  }

  async findFileLink(
    submissionId: string,
    storedFileId: string,
  ): Promise<SubmissionFileRecord | null> {
    return await this.prisma.assignmentSubmissionFile.findUnique({
      where: {
        submissionId_storedFileId: { submissionId, storedFileId },
      },
    });
  }

  async listFiles(submissionId: string): Promise<SubmissionFileDetail[]> {
    const rows = await this.prisma.assignmentSubmissionFile.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'asc' },
      include: {
        storedFile: {
          select: {
            objectKey: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            status: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      submissionId: row.submissionId,
      storedFileId: row.storedFileId,
      label: row.label,
      createdAt: row.createdAt,
      objectKey: row.storedFile.objectKey,
      originalName: row.storedFile.originalName,
      mimeType: row.storedFile.mimeType,
      sizeBytes: row.storedFile.sizeBytes,
      storedFileStatus: row.storedFile.status,
    }));
  }

  async detachFile(submissionId: string, storedFileId: string): Promise<void> {
    await this.prisma.assignmentSubmissionFile.delete({
      where: {
        submissionId_storedFileId: { submissionId, storedFileId },
      },
    });
  }

  async findStoredFileContext(
    storedFileId: string,
  ): Promise<StoredFileContext | null> {
    return await this.prisma.storedFile.findUnique({
      where: { id: storedFileId },
      select: {
        id: true,
        namespace: true,
        status: true,
        ownerUserId: true,
        mimeType: true,
      },
    });
  }

  async upsertGrade(
    submissionId: string,
    data: AssignmentGradeUpsertData,
  ): Promise<AssignmentGradeRecord> {
    return await this.prisma.assignmentGrade.upsert({
      where: { submissionId },
      create: { submissionId, ...data },
      update: data,
    });
  }

  async findGrade(submissionId: string): Promise<AssignmentGradeRecord | null> {
    return await this.prisma.assignmentGrade.findUnique({
      where: { submissionId },
    });
  }
}
