import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExamAttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ATTEMPT_SELECT,
  StudentAttempt,
  StudentAttemptAnswer,
  toSavedAnswer,
  toStudentAttempt,
} from './attempt-response';
import { SaveAttemptAnswerDto, StartAttemptDto } from './dto/attempt.dto';
export const ATTEMPTS_REPOSITORY = Symbol('ATTEMPTS_REPOSITORY');

/**
 * Every method returns the participant-safe projection, never a database row.
 *
 * That is deliberate: the answer key is not fetched (see `ATTEMPT_SELECT`) and
 * the return type carries no field for it, so neither a careless caller nor a
 * future serializer can widen what a participant receives.
 */
export interface AttemptsRepository {
  start(participantId: string, now: Date): Promise<StudentAttempt | null>;
  find(id: string): Promise<StudentAttempt | null>;
  submit(id: string, now: Date): Promise<StudentAttempt | null>;
  saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAttemptAnswerDto,
    now: Date,
  ): Promise<StudentAttemptAnswer>;
  /** Frozen deadline, read separately so expiry is decided on server time. */
  expiresAt(id: string): Promise<Date | null>;
  statusOf(id: string): Promise<string | null>;
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
        select: ATTEMPT_SELECT,
      });
      if (existing) return toStudentAttempt(existing);
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
      const created = await tx.examAttempt.create({
        data: {
          participantId,
          attemptNo,
          startedAt: now,
          expiresAt,
          status: ExamAttemptStatus.IN_PROGRESS,
          questions: { create: versions },
        },
        select: ATTEMPT_SELECT,
      });
      return toStudentAttempt(created);
    });
  }
  async find(id: string) {
    const record = await this.prisma.examAttempt.findUnique({
      where: { id },
      select: ATTEMPT_SELECT,
    });
    return toStudentAttempt(record);
  }
  async expiresAt(id: string) {
    const record = await this.prisma.examAttempt.findUnique({
      where: { id },
      select: { expiresAt: true },
    });
    return record?.expiresAt ?? null;
  }
  async statusOf(id: string) {
    const record = await this.prisma.examAttempt.findUnique({
      where: { id },
      select: { status: true },
    });
    return record?.status ?? null;
  }
  async submit(id: string, now: Date) {
    const deadline = await this.expiresAt(id);
    if (!deadline) throw new NotFoundException('Attempt not found');
    const current = await this.statusOf(id);
    // Re-submitting a finalized attempt is an idempotent no-op, so a retry after
    // a dropped response cannot move a closed attempt back into play.
    if (current && current !== ExamAttemptStatus.IN_PROGRESS)
      return this.find(id);
    const updated = await this.prisma.examAttempt.update({
      where: { id },
      data: {
        status:
          now >= deadline
            ? ExamAttemptStatus.EXPIRED
            : ExamAttemptStatus.SUBMITTED,
        submittedAt: now,
      },
      select: ATTEMPT_SELECT,
    });
    return toStudentAttempt(updated);
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
        select: {
          id: true,
          attempt: { select: { status: true, expiresAt: true } },
        },
      });
      if (!question) throw new NotFoundException('Attempt question not found');
      if (
        question.attempt.status !== ExamAttemptStatus.IN_PROGRESS ||
        now >= question.attempt.expiresAt
      )
        throw new UnprocessableEntityException('Attempt is no longer active');
      const current = await tx.attemptAnswer.findUnique({
        where: { attemptQuestionId },
        select: { answerPayload: true, revision: true, savedAt: true },
      });
      // Idempotency is decided by the *payload*, not by the revision.
      //
      // The client always sends the revision the server last acknowledged, so
      // an edit and a retry of that same edit both arrive with the same
      // revision. Comparing revisions alone therefore cannot tell them apart:
      // an edit would be rejected as a conflict, and a retry would be rejected
      // as stale (TASK-045 requires "repeated PUT idempotent"). Comparing the
      // payload can: an identical payload is a replay and is a no-op, a
      // different payload is a new answer.
      if (
        current !== null &&
        JSON.stringify(current.answerPayload) ===
          JSON.stringify(dto.answerPayload)
      )
        return toSavedAnswer(current);
      // A different payload built on an older revision than the stored one
      // would silently overwrite a newer answer, so it is refused.
      if (current && dto.revision < current.revision)
        throw new UnprocessableEntityException('Stale answer revision');
      const saved = await tx.attemptAnswer.upsert({
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
        select: { answerPayload: true, revision: true, savedAt: true },
      });
      return toSavedAnswer(saved);
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
  async get(id: string) {
    const attempt = await this.repo.find(id);
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }
  async submit(id: string) {
    const attempt = await this.repo.submit(id, new Date());
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }
  saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAttemptAnswerDto,
  ) {
    return this.repo.saveAnswer(attemptId, attemptQuestionId, dto, new Date());
  }
}
