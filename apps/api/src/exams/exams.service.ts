import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExamStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import {
  ChangeExamStatusDto,
  CreateBlueprintDto,
  CreateExamDto,
  UpdateExamDto,
} from './dto/exam.dto';

type ExamRecord = {
  id: string;
  status: string;
  assessmentId: string;
  assessment?: { classSubject?: { curriculumSubjectId: string } | null } | null;
  blueprint?: { rules: Array<ExamRule> } | null;
};
type ExamRule = {
  code: string;
  count: number;
  questionBankId?: string | null;
  questionTypeId?: string | null;
  topic?: string | null;
  difficulty?: string | null;
};
export const EXAMS_REPOSITORY = Symbol('EXAMS_REPOSITORY');
export interface ExamsRepository {
  find(id: string): Promise<ExamRecord | null>;
  create(dto: CreateExamDto): Promise<ExamRecord>;
  update(id: string, dto: UpdateExamDto): Promise<ExamRecord>;
  saveBlueprint(id: string, dto: CreateBlueprintDto): Promise<unknown>;
  countPool(rule: ExamRule, assessmentId: string): Promise<number>;
  updateStatus(id: string, status: string): Promise<ExamRecord>;
}
@Injectable()
export class PrismaExamsRepository implements ExamsRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        blueprint: { include: { rules: true } },
        assessment: {
          include: { classSubject: { select: { curriculumSubjectId: true } } },
        },
      },
    });
  }
  create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        assessmentId: dto.assessmentId,
        title: dto.title.trim(),
        instructions: dto.instructions,
        durationMinutes: dto.durationMinutes,
        attemptsAllowed: dto.attemptsAllowed,
        shuffleQuestions: dto.shuffleQuestions,
        shuffleOptions: dto.shuffleOptions,
        showResultImmediately: dto.showResultImmediately,
        timeZone: dto.timeZone,
        metadata: dto.metadata as Prisma.InputJsonValue,
      },
    });
  }
  update(id: string, dto: UpdateExamDto) {
    return this.prisma.exam.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        instructions: dto.instructions,
        durationMinutes: dto.durationMinutes,
        attemptsAllowed: dto.attemptsAllowed,
        shuffleQuestions: dto.shuffleQuestions,
        shuffleOptions: dto.shuffleOptions,
        showResultImmediately: dto.showResultImmediately,
        timeZone: dto.timeZone,
        metadata: dto.metadata as Prisma.InputJsonValue,
      },
    });
  }
  async saveBlueprint(id: string, dto: CreateBlueprintDto) {
    const rules = dto.rules.map((r, i) => ({
      code: r.code,
      label: r.label,
      sortOrder: i,
      questionBankId: r.questionBankId,
      questionTypeId: r.questionTypeId,
      topic: r.topic,
      difficulty: r.difficulty,
      count: r.count,
      pointsPerQuestion: r.pointsPerQuestion,
      exam: { connect: { id } },
    }));
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.examBlueprint.upsert({
        where: { examId: id },
        create: {
          examId: id,
          title: dto.title,
          description: dto.description,
          totalQuestions: rules.reduce((s, r) => s + r.count, 0),
          totalPoints: rules.reduce(
            (s, r) => s + r.count * r.pointsPerQuestion,
            0,
          ),
          rules: { create: rules },
        },
        update: {
          title: dto.title,
          description: dto.description,
          totalQuestions: rules.reduce((s, r) => s + r.count, 0),
          totalPoints: rules.reduce(
            (s, r) => s + r.count * r.pointsPerQuestion,
            0,
          ),
          rules: { deleteMany: {}, create: rules },
        },
      });
      await tx.exam.update({
        where: { id },
        data: { configVersion: { increment: 1 } },
      });
      return b;
    });
  }
  countPool(rule: ExamRule, curriculumSubjectId: string) {
    return this.prisma.questionVersion.count({
      where: {
        status: 'PUBLISHED',
        difficulty: rule.difficulty ?? undefined,
        topic: rule.topic ?? undefined,
        question: {
          questionBankId: rule.questionBankId ?? undefined,
          questionTypeId: rule.questionTypeId ?? undefined,
          questionBank: { curriculumSubjectId },
        },
      },
    });
  }
  updateStatus(id: string, status: string) {
    return this.prisma.exam.update({
      where: { id },
      data: { status: status as ExamStatus },
    });
  }
}
@Injectable()
export class ExamsService {
  constructor(
    @Inject(EXAMS_REPOSITORY) private readonly repo: ExamsRepository,
    private readonly audit: AuditService,
  ) {}
  async create(dto: CreateExamDto) {
    const e = await this.repo.create(dto);
    await this.audit.record({
      action: AUDIT_ACTIONS.EXAM_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.EXAM,
      resourceId: e.id,
      after: e,
    });
    return e;
  }
  async get(id: string) {
    const e = await this.repo.find(id);
    if (!e) throw new NotFoundException('Exam not found');
    return e;
  }
  async update(id: string, dto: UpdateExamDto) {
    const e = await this.get(id);
    if (['SCHEDULED', 'CLOSED', 'ARCHIVED'].includes(e.status))
      throw new UnprocessableEntityException(
        'Scheduled or closed exam is immutable',
      );
    return this.repo.update(id, dto);
  }
  async blueprint(id: string, dto: CreateBlueprintDto) {
    const e = await this.get(id);
    if (['SCHEDULED', 'CLOSED', 'ARCHIVED'].includes(e.status))
      throw new UnprocessableEntityException('Exam blueprint is immutable');
    if (!dto.rules.length)
      throw new BadRequestException('Blueprint requires rules');
    return this.repo.saveBlueprint(id, dto);
  }
  async status(id: string, dto: ChangeExamStatusDto) {
    const e = await this.get(id);
    if (dto.status === 'VALIDATED') {
      const b = e.blueprint;
      const curriculumSubjectId =
        e.assessment?.classSubject?.curriculumSubjectId;
      if (!b || !curriculumSubjectId)
        throw new UnprocessableEntityException(
          'Blueprint and assessment subject are required',
        );
      for (const r of b.rules) {
        const n = await this.repo.countPool(r, curriculumSubjectId);
        if (n < r.count)
          throw new UnprocessableEntityException(
            `Insufficient question pool for rule ${r.code}`,
          );
      }
    }
    const allowed: Record<string, string[]> = {
      DRAFT: ['VALIDATED'],
      VALIDATED: ['SCHEDULED', 'DRAFT'],
      SCHEDULED: ['CLOSED'],
      CLOSED: ['ARCHIVED'],
    };
    if (dto.status !== e.status && !allowed[e.status]?.includes(dto.status))
      throw new UnprocessableEntityException('Invalid exam status transition');
    const out = await this.repo.updateStatus(id, dto.status);
    await this.audit.record({
      action: AUDIT_ACTIONS.EXAM_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.EXAM,
      resourceId: id,
      before: e,
      after: out,
    });
    return out;
  }
}
