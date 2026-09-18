import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  ExamParticipantStatus,
  ExamSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddParticipantDto,
  ChangeSessionStatusDto,
  CreateSessionDto,
  ParticipantStatusDto,
  SessionStatusDto,
} from './dto/session.dto';
export const EXAM_SESSIONS_REPOSITORY = Symbol('EXAM_SESSIONS_REPOSITORY');
type SessionRecord = { id: string; status: string; startAt: Date; endAt: Date };
export interface ExamSessionsRepository {
  create(dto: CreateSessionDto): Promise<unknown>;
  find(id: string): Promise<SessionRecord | null>;
  updateStatus(id: string, status: SessionStatusDto): Promise<unknown>;
  addParticipant(id: string, dto: AddParticipantDto): Promise<unknown>;
}
@Injectable()
export class PrismaExamSessionsRepository implements ExamSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(dto: CreateSessionDto) {
    return this.prisma.examSession.create({
      data: {
        examId: dto.examId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        settings: dto.settings as Prisma.InputJsonValue,
      },
    });
  }
  find(id: string) {
    return this.prisma.examSession.findUnique({
      where: { id },
      include: { exam: true, participants: true },
    });
  }
  updateStatus(id: string, status: SessionStatusDto) {
    return this.prisma.examSession.update({
      where: { id },
      data: { status: status as ExamSessionStatus },
    });
  }
  addParticipant(id: string, dto: AddParticipantDto) {
    return this.prisma.examParticipant.create({
      data: {
        sessionId: id,
        enrollmentId: dto.enrollmentId,
        status: (dto.status ??
          ParticipantStatusDto.INVITED) as ExamParticipantStatus,
        accommodations: dto.accommodations as Prisma.InputJsonValue,
      },
    });
  }
}
@Injectable()
export class ExamSessionsService {
  constructor(
    @Inject(EXAM_SESSIONS_REPOSITORY)
    private readonly repo: ExamSessionsRepository,
  ) {}
  async create(dto: CreateSessionDto) {
    const start = new Date(dto.startAt),
      end = new Date(dto.endAt);
    if (start >= end)
      throw new BadRequestException('endAt must be after startAt');
    return this.repo.create(dto);
  }
  async get(id: string) {
    const found = await this.repo.find(id);
    if (!found) throw new NotFoundException('Exam session not found');
    return found;
  }
  async status(id: string, dto: ChangeSessionStatusDto) {
    const s = await this.get(id);
    const allowed: Record<string, string[]> = {
      DRAFT: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['OPEN', 'CANCELLED'],
      OPEN: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
    };
    if (dto.status !== s.status && !allowed[s.status]?.includes(dto.status))
      throw new UnprocessableEntityException(
        'Invalid session status transition',
      );
    return this.repo.updateStatus(id, dto.status);
  }
  async addParticipant(id: string, dto: AddParticipantDto) {
    const s = await this.get(id);
    if (!['DRAFT', 'SCHEDULED'].includes(s.status))
      throw new UnprocessableEntityException(
        'Participants can only be assigned before opening',
      );
    try {
      return await this.repo.addParticipant(id, dto);
    } catch (error) {
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError ||
          (typeof error === 'object' && error !== null && 'code' in error)) &&
        (error as { code?: string }).code === 'P2002'
      )
        throw new ConflictException(
          'Enrollment is already assigned to this session',
        );
      throw error;
    }
  }
}
