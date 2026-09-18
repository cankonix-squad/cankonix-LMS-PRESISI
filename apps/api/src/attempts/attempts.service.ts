import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExamAttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveAttemptAnswerDto, StartAttemptDto } from './dto/attempt.dto';
export const ATTEMPTS_REPOSITORY = Symbol('ATTEMPTS_REPOSITORY');
type AttemptRecord = {
  id: string;
  participantId: string;
  startedAt: Date;
  expiresAt: Date;
  status: string;
  questions: Array<{
    sequence: number;
    points: unknown;
    questionVersion: {
      id: string;
      question: { id: string };
      stem: string;
      options: Array<{ key: string; label: string }>;
    };
  }>;
};
export interface AttemptsRepository {
  start(participantId: string, now: Date): Promise<AttemptRecord>;
  find(id: string): Promise<AttemptRecord | null>;
  submit(id: string, now: Date): Promise<AttemptRecord>;
  saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAttemptAnswerDto,
    now: Date,
  ): Promise<unknown>;
}
@Injectable()
export class PrismaAttemptsRepository implements AttemptsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async start(participantId: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.examParticipant.findUnique({
        where: { id: participantId },
        include: {
          session: {
            include: {
              exam: { include: { blueprint: { include: { rules: true } } } },
            },
          },
        },
      });
      if (!p) throw new NotFoundException('Participant not found');
      if (p.status !== 'ELIGIBLE')
        throw new UnprocessableEntityException('Participant is not eligible');
      const existing = await tx.examAttempt.findFirst({
        where: { participantId, status: ExamAttemptStatus.IN_PROGRESS },
        include: {
          questions: {
            include: {
              questionVersion: {
                include: {
                  question: true,
                  options: {
                    select: { key: true, label: true },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      });
      if (existing) return existing as unknown as AttemptRecord;
      const attemptNo =
        (await tx.examAttempt.count({ where: { participantId } })) + 1;
      const duration = p.session.exam.durationMinutes;
      const expiresAt = new Date(
        Math.min(now.getTime() + duration * 60000, p.session.endAt.getTime()),
      );
      if (expiresAt <= now)
        throw new UnprocessableEntityException('Session has ended');
      const blueprint = p.session.exam.blueprint;
      if (!blueprint)
        throw new UnprocessableEntityException('Exam blueprint is missing');
      const versions = [];
      for (const rule of blueprint.rules) {
        const pool = await tx.questionVersion.findMany({
          where: {
            status: 'PUBLISHED',
            difficulty: rule.difficulty ?? undefined,
            topic: rule.topic ?? undefined,
            question: {
              questionBankId: rule.questionBankId ?? undefined,
              questionTypeId: rule.questionTypeId ?? undefined,
            },
          },
          take: rule.count,
          orderBy: { id: 'asc' },
        });
        if (pool.length < rule.count)
          throw new UnprocessableEntityException(
            `Insufficient question pool for rule ${rule.code}`,
          );
        versions.push(
          ...pool.map((v, index) => ({
            questionVersionId: v.id,
            sequence: versions.length + index + 1,
            points: rule.pointsPerQuestion,
          })),
        );
      }
      return tx.examAttempt.create({
        data: {
          participantId,
          attemptNo,
          startedAt: now,
          expiresAt,
          status: ExamAttemptStatus.IN_PROGRESS,
          questions: { create: versions },
        },
        include: {
          questions: {
            include: {
              questionVersion: {
                include: {
                  question: true,
                  options: {
                    select: { key: true, label: true },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      }) as unknown as AttemptRecord;
    });
  }
  find(id: string) {
    return this.prisma.examAttempt.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            questionVersion: {
              include: {
                question: true,
                options: {
                  select: { key: true, label: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    }) as unknown as Promise<AttemptRecord | null>;
  }
  async submit(id: string, now: Date) {
    const a = await this.find(id);
    if (!a) throw new NotFoundException('Attempt not found');
    if (a.status !== 'IN_PROGRESS') return a;
    return this.prisma.examAttempt.update({
      where: { id },
      data: {
        status:
          now >= a.expiresAt
            ? ExamAttemptStatus.EXPIRED
            : ExamAttemptStatus.SUBMITTED,
        submittedAt: now,
      },
      include: {
        questions: {
          include: {
            questionVersion: {
              include: {
                question: true,
                options: {
                  select: { key: true, label: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    }) as unknown as Promise<AttemptRecord>;
  }
  async saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAttemptAnswerDto,
    now: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const question = await tx.attemptQuestion.findFirst({
        where: { id: attemptQuestionId, attemptId },
        include: { attempt: true },
      });
      if (!question) throw new NotFoundException('Attempt question not found');
      if (
        question.attempt.status !== ExamAttemptStatus.IN_PROGRESS ||
        now >= question.attempt.expiresAt
      )
        throw new UnprocessableEntityException('Attempt is no longer active');
      const current = await tx.attemptAnswer.findUnique({
        where: { attemptQuestionId },
      });
      if (current && dto.revision < current.revision)
        throw new UnprocessableEntityException('Stale answer revision');
      if (current && dto.revision === current.revision) {
        if (
          JSON.stringify(current.answerPayload) ===
          JSON.stringify(dto.answerPayload)
        )
          return current;
        throw new UnprocessableEntityException('Answer revision conflict');
      }
      return tx.attemptAnswer.upsert({
        where: { attemptQuestionId },
        create: {
          attemptQuestionId,
          answerPayload: dto.answerPayload as Prisma.InputJsonValue,
          revision: dto.revision + 1,
          savedAt: now,
        },
        update: {
          answerPayload: dto.answerPayload as Prisma.InputJsonValue,
          revision: dto.revision + 1,
          savedAt: now,
        },
      });
    });
  }
}
@Injectable()
export class AttemptsService {
  constructor(
    @Inject(ATTEMPTS_REPOSITORY) private readonly repo: AttemptsRepository,
  ) {}
  start(dto: StartAttemptDto) {
    return this.repo.start(dto.participantId, new Date());
  }
  get(id: string) {
    return this.repo.find(id);
  }
  submit(id: string) {
    return this.repo.submit(id, new Date());
  }
  saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAttemptAnswerDto,
  ) {
    return this.repo.saveAnswer(attemptId, attemptQuestionId, dto, new Date());
  }
}
