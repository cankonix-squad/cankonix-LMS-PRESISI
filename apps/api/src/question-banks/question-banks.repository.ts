import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CurriculumSubjectContext,
  QuestionBankCreateData,
  QuestionBankListFilter,
  QuestionBankListResult,
  QuestionBankRecord,
  QuestionBankUpdateData,
  QuestionCreateData,
  QuestionListFilter,
  QuestionListResult,
  QuestionRecord,
  QuestionTypeContext,
  QuestionUpdateData,
  QuestionVersionCreateData,
  QuestionVersionState,
  QuestionVersionUpdateData,
  QuestionVersionWithOptions,
} from './question-bank.types';

export const QUESTION_BANKS_REPOSITORY = Symbol('QUESTION_BANKS_REPOSITORY');
export const QUESTIONS_REPOSITORY = Symbol('QUESTIONS_REPOSITORY');
export const QUESTION_VERSIONS_REPOSITORY = Symbol(
  'QUESTION_VERSIONS_REPOSITORY',
);

export interface QuestionBanksRepository {
  create(data: QuestionBankCreateData): Promise<QuestionBankRecord>;
  findById(id: string): Promise<QuestionBankRecord | null>;
  findBySubjectAndCode(
    curriculumSubjectId: string,
    code: string,
  ): Promise<QuestionBankRecord | null>;
  list(filter: QuestionBankListFilter): Promise<QuestionBankListResult>;
  update(id: string, data: QuestionBankUpdateData): Promise<QuestionBankRecord>;
  findCurriculumSubjectContext(
    curriculumSubjectId: string,
  ): Promise<CurriculumSubjectContext | null>;
}

export interface QuestionsRepository {
  create(data: QuestionCreateData): Promise<QuestionRecord>;
  findById(id: string): Promise<QuestionRecord | null>;
  list(filter: QuestionListFilter): Promise<QuestionListResult>;
  update(id: string, data: QuestionUpdateData): Promise<QuestionRecord>;
  findByBankAndCode(
    questionBankId: string,
    code: string,
  ): Promise<QuestionRecord | null>;
  findTypeContext(questionTypeId: string): Promise<QuestionTypeContext | null>;
  /** The seeded, data-driven question type vocabulary. Read-only by design. */
  listTypes(): Promise<QuestionTypeContext[]>;
}

export interface QuestionVersionsRepository {
  create(data: QuestionVersionCreateData): Promise<QuestionVersionWithOptions>;
  findById(id: string): Promise<QuestionVersionWithOptions | null>;
  findLatest(questionId: string): Promise<QuestionVersionWithOptions | null>;
  /** Highest version number in a question plus the total number of versions. */
  findVersionState(questionId: string): Promise<QuestionVersionState>;
  findPublished(questionId: string): Promise<QuestionVersionWithOptions | null>;
  /**
   * Replaces the editable fields of a DRAFT version and, when `options` is
   * present, swaps the whole option set, in one transaction. The service
   * refuses to call this on a published row.
   */
  updateDraft(
    id: string,
    data: QuestionVersionUpdateData,
  ): Promise<QuestionVersionWithOptions>;
  /**
   * Publishes the target version and, when there is a predecessor, marks it
   * SUPERSEDED — in one transaction. A reader therefore never observes a
   * question with two published versions, nor one with none.
   */
  supersedeAndPublish(
    supersededId: string | null,
    publishedId: string,
  ): Promise<{
    published: QuestionVersionWithOptions;
    superseded: QuestionVersionWithOptions | null;
  }>;
  /**
   * The student-safe read: a specific version, regardless of its status, with
   * its options. Used by the exam runtime to pin a historical version.
   */
  findForParticipant(
    questionId: string,
    versionId: string,
  ): Promise<QuestionVersionWithOptions | null>;
}

/** Options are always returned in presentation order. */
const OPTIONS_INCLUDE = {
  options: {
    orderBy: [{ sortOrder: 'asc' as const }, { key: 'asc' as const }],
  },
};

@Injectable()
export class PrismaQuestionBanksRepository implements QuestionBanksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: QuestionBankCreateData): Promise<QuestionBankRecord> {
    return await this.prisma.questionBank.create({
      data: {
        curriculumSubjectId: data.curriculumSubjectId,
        code: data.code,
        name: data.name,
        description: data.description,
        status: data.status as Prisma.QuestionBankCreateInput['status'],
        metadata: toJsonInput(data.metadata),
      },
    });
  }

  async findById(id: string): Promise<QuestionBankRecord | null> {
    return await this.prisma.questionBank.findUnique({ where: { id } });
  }

  async findBySubjectAndCode(
    curriculumSubjectId: string,
    code: string,
  ): Promise<QuestionBankRecord | null> {
    return await this.prisma.questionBank.findUnique({
      where: { curriculumSubjectId_code: { curriculumSubjectId, code } },
    });
  }

  async list(filter: QuestionBankListFilter): Promise<QuestionBankListResult> {
    const where: Prisma.QuestionBankWhereInput = {
      curriculumSubjectId: filter.curriculumSubjectId,
      status: filter.status as Prisma.QuestionBankWhereInput['status'],
      curriculumSubject:
        filter.curriculumId || filter.subjectId
          ? {
              curriculumId: filter.curriculumId,
              subjectId: filter.subjectId,
            }
          : undefined,
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.questionBank.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.questionBank.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: QuestionBankUpdateData,
  ): Promise<QuestionBankRecord> {
    return await this.prisma.questionBank.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status as Prisma.QuestionBankUpdateInput['status'],
        metadata: toJsonInput(data.metadata),
      },
    });
  }

  async findCurriculumSubjectContext(
    curriculumSubjectId: string,
  ): Promise<CurriculumSubjectContext | null> {
    return await this.prisma.curriculumSubject.findUnique({
      where: { id: curriculumSubjectId },
      select: { id: true, curriculumId: true, subjectId: true },
    });
  }
}

/**
 * A question row with its newest version, counted in one pass.
 *
 * `take: 1` on a `version: desc` order is what makes "latest" cheap, and the
 * `_count` gives the author the total history size without loading every row.
 */
const QUESTION_WITH_LATEST = {
  include: {
    versions: {
      orderBy: { version: 'desc' as const },
      take: 1,
      include: OPTIONS_INCLUDE,
    },
    _count: { select: { versions: true } },
  },
};

type QuestionRowWithLatest = Prisma.QuestionGetPayload<
  typeof QUESTION_WITH_LATEST
>;

function toQuestionWithVersion(row: QuestionRowWithLatest) {
  return {
    id: row.id,
    questionBankId: row.questionBankId,
    questionTypeId: row.questionTypeId,
    code: row.code,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    latestVersion: row.versions[0] ?? null,
    versionCount: row._count.versions,
  };
}

@Injectable()
export class PrismaQuestionsRepository implements QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: QuestionCreateData): Promise<QuestionRecord> {
    return await this.prisma.question.create({
      data: {
        questionBankId: data.questionBankId,
        questionTypeId: data.questionTypeId,
        code: data.code,
      },
    });
  }

  async findById(id: string): Promise<QuestionRecord | null> {
    return await this.prisma.question.findUnique({ where: { id } });
  }

  async list(filter: QuestionListFilter): Promise<QuestionListResult> {
    const where: Prisma.QuestionWhereInput = {
      questionBankId: filter.questionBankId,
      questionTypeId: filter.questionTypeId,
      status: filter.status as Prisma.QuestionWhereInput['status'],
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: 'insensitive' } },
            {
              versions: {
                some: {
                  stem: { contains: filter.search, mode: 'insensitive' },
                },
              },
            },
          ]
        : undefined,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        ...QUESTION_WITH_LATEST,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { data: rows.map(toQuestionWithVersion), total };
  }

  async update(id: string, data: QuestionUpdateData): Promise<QuestionRecord> {
    return await this.prisma.question.update({
      where: { id },
      data: {
        questionTypeId: data.questionTypeId,
        code: data.code,
        status: data.status as Prisma.QuestionUpdateInput['status'],
      },
    });
  }

  async findByBankAndCode(
    questionBankId: string,
    code: string,
  ): Promise<QuestionRecord | null> {
    return await this.prisma.question.findUnique({
      where: { questionBankId_code: { questionBankId, code } },
    });
  }

  async findTypeContext(
    questionTypeId: string,
  ): Promise<QuestionTypeContext | null> {
    return await this.prisma.questionType.findUnique({
      where: { id: questionTypeId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        hasOptions: true,
        multiSelect: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listTypes(): Promise<QuestionTypeContext[]> {
    return await this.prisma.questionType.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        hasOptions: true,
        multiSelect: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ code: 'asc' }],
    });
  }
}

@Injectable()
export class PrismaQuestionVersionsRepository implements QuestionVersionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: QuestionVersionCreateData,
  ): Promise<QuestionVersionWithOptions> {
    return await this.prisma.questionVersion.create({
      data: {
        questionId: data.questionId,
        version: data.version,
        stem: data.stem,
        scoringRule: toJsonInput(data.scoringRule),
        explanation: data.explanation,
        difficulty: data.difficulty,
        topic: data.topic,
        maxScore: data.maxScore,
        status: data.status as Prisma.QuestionVersionCreateInput['status'],
        options: { create: data.options },
      },
      include: OPTIONS_INCLUDE,
    });
  }

  async findById(id: string): Promise<QuestionVersionWithOptions | null> {
    return await this.prisma.questionVersion.findUnique({
      where: { id },
      include: OPTIONS_INCLUDE,
    });
  }

  async findLatest(
    questionId: string,
  ): Promise<QuestionVersionWithOptions | null> {
    return await this.prisma.questionVersion.findFirst({
      where: { questionId },
      orderBy: { version: 'desc' },
      include: OPTIONS_INCLUDE,
    });
  }

  async findVersionState(questionId: string): Promise<QuestionVersionState> {
    const [aggregate, versionCount] = await this.prisma.$transaction([
      this.prisma.questionVersion.aggregate({
        where: { questionId },
        _max: { version: true },
      }),
      this.prisma.questionVersion.count({ where: { questionId } }),
    ]);

    return {
      questionId,
      maxVersion: aggregate._max.version ?? 0,
      versionCount,
    };
  }

  async findPublished(
    questionId: string,
  ): Promise<QuestionVersionWithOptions | null> {
    return await this.prisma.questionVersion.findFirst({
      where: { questionId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
      include: OPTIONS_INCLUDE,
    });
  }

  async updateDraft(
    id: string,
    data: QuestionVersionUpdateData,
  ): Promise<QuestionVersionWithOptions> {
    return await this.prisma.$transaction(async (tx) => {
      if (data.options) {
        // The option set is versioned as a unit: replacing it wholesale keeps
        // `(version_id, key)` unique and avoids a key colliding with a row that
        // is about to be removed.
        await tx.questionOption.deleteMany({ where: { versionId: id } });
      }

      await tx.questionVersion.update({
        where: { id },
        data: {
          stem: data.stem,
          scoringRule: toJsonInput(data.scoringRule),
          explanation: data.explanation,
          difficulty: data.difficulty,
          topic: data.topic,
          maxScore: data.maxScore,
          status: data.status as Prisma.QuestionVersionUpdateInput['status'],
          ...(data.options ? { options: { create: data.options } } : {}),
        },
      });

      return await tx.questionVersion.findUniqueOrThrow({
        where: { id },
        include: OPTIONS_INCLUDE,
      });
    });
  }

  async supersedeAndPublish(
    supersededId: string | null,
    publishedId: string,
  ): Promise<{
    published: QuestionVersionWithOptions;
    superseded: QuestionVersionWithOptions | null;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      const superseded = supersededId
        ? await tx.questionVersion.update({
            where: { id: supersededId },
            data: { status: 'SUPERSEDED' },
            include: OPTIONS_INCLUDE,
          })
        : null;

      const published = await tx.questionVersion.update({
        where: { id: publishedId },
        data: { status: 'PUBLISHED' },
        include: OPTIONS_INCLUDE,
      });

      return { published, superseded };
    });
  }

  async findForParticipant(
    questionId: string,
    versionId: string,
  ): Promise<QuestionVersionWithOptions | null> {
    return await this.prisma.questionVersion.findFirst({
      where: { id: versionId, questionId },
      include: OPTIONS_INCLUDE,
    });
  }
}

/**
 * Normalizes a metadata/scoring-rule value into a Prisma JSON input.
 *
 * SQL `NULL` is kept distinguishable from a deliberate JSON `null`. `undefined`
 * means "leave it alone" on update, so it is passed through rather than turned
 * into `null`.
 */
function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
