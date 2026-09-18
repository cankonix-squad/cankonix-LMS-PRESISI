import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  CreateQuestionBankDto,
  ListQuestionBanksQueryDto,
  QuestionBankStatusDto,
  UpdateQuestionBankDto,
} from './dto/question-bank.dto';
import {
  CreateQuestionDto,
  CreateQuestionVersionDto,
  ListQuestionTypesQueryDto,
  ListQuestionsQueryDto,
  QuestionOptionDto,
  QuestionStatusDto,
  UpdateQuestionDto,
  UpdateQuestionVersionDto,
} from './dto/question.dto';
import {
  QuestionBankListResponseDto,
  QuestionBankResponseDto,
  QuestionListResponseDto,
  QuestionResponseDto,
  QuestionTypeListResponseDto,
  QuestionTypeResponseDto,
  QuestionVersionPublishResponseDto,
  QuestionVersionResponseDto,
  StudentQuestionDto,
  StudentQuestionListResponseDto,
} from './dto/question-response.dto';
import { QuestionVersionStatusDto } from './dto/question-version-status.dto';
import {
  QUESTION_BANKS_REPOSITORY,
  QUESTIONS_REPOSITORY,
  QUESTION_VERSIONS_REPOSITORY,
  QuestionBanksRepository,
  QuestionsRepository,
  QuestionVersionsRepository,
} from './question-banks.repository';
import {
  QuestionBankRecord,
  QuestionOptionCreateData,
  QuestionOptionRecord,
  QuestionRecord,
  QuestionTypeContext,
  QuestionVersionRecord,
  QuestionVersionWithOptions,
} from './question-bank.types';

/**
 * The question bank domain.
 *
 * Two invariants drive every rule in this service:
 *
 * 1. **A version is immutable once published.** Attaching an attempt to a
 *    version is only meaningful if the version cannot change afterwards, so a
 *    published version is frozen and a correction is a NEW version. This is what
 *    `docs/07-security-standards.md` means by "immutable question versions".
 * 2. **The answer key never leaves the server through a student route.** The
 *    student projection is built field-by-field from a dedicated DTO rather than
 *    by deleting keys from an educator payload, so a leak would require adding
 *    the field explicitly, not forgetting to remove it.
 *
 * Option validity is DATA-DRIVEN: `question_types.has_options` and `.multi_select`
 * decide whether an option set is required and whether more than one correct
 * answer is allowed. No code in this file compares a type against a string code.
 */
@Injectable()
export class QuestionBanksService {
  constructor(
    @Inject(QUESTION_BANKS_REPOSITORY)
    private readonly banks: QuestionBanksRepository,
    @Inject(QUESTIONS_REPOSITORY)
    private readonly questions: QuestionsRepository,
    @Inject(QUESTION_VERSIONS_REPOSITORY)
    private readonly versions: QuestionVersionsRepository,
    private readonly audit: AuditService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Banks                                                               */
  /* ------------------------------------------------------------------ */

  async createBank(
    dto: CreateQuestionBankDto,
  ): Promise<QuestionBankResponseDto> {
    await this.ensureCurriculumSubject(dto.curriculumSubjectId);

    const code = normalizeCode(dto.code);
    if (await this.banks.findBySubjectAndCode(dto.curriculumSubjectId, code)) {
      throw new ConflictException(
        `Question bank code ${code} is already used in this curriculum subject`,
      );
    }

    const created = await this.banks.create({
      curriculumSubjectId: dto.curriculumSubjectId,
      code,
      name: dto.name.trim(),
      description: normalizeOptionalText(dto.description),
      status: dto.status ?? QuestionBankStatusDto.ACTIVE,
      metadata: dto.metadata ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_BANK_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION_BANK,
      resourceId: created.id,
      after: bankSnapshot(created),
    });

    return toBankResponse(created);
  }

  async listBanks(
    query: ListQuestionBanksQueryDto,
  ): Promise<QuestionBankListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.banks.list({
      curriculumSubjectId: query.curriculumSubjectId,
      curriculumId: query.curriculumId,
      subjectId: query.subjectId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return {
      data: result.data.map(toBankResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findBank(id: string): Promise<QuestionBankResponseDto> {
    return toBankResponse(await this.getBankOrThrow(id));
  }

  async updateBank(
    id: string,
    dto: UpdateQuestionBankDto,
  ): Promise<QuestionBankResponseDto> {
    const existing = await this.getBankOrThrow(id);

    const updated = await this.banks.update(id, {
      name: dto.name === undefined ? undefined : dto.name.trim(),
      description: normalizeOptionalText(dto.description),
      status: dto.status,
      metadata: dto.metadata,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_BANK_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION_BANK,
      resourceId: updated.id,
      before: bankSnapshot(existing),
      after: bankSnapshot(updated),
    });

    return toBankResponse(updated);
  }

  /* ------------------------------------------------------------------ */
  /* Question types (seeded, read-only vocabulary)                       */
  /* ------------------------------------------------------------------ */

  async listQuestionTypes(
    query: ListQuestionTypesQueryDto,
  ): Promise<QuestionTypeListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim().toLowerCase();
    const all = await this.questions.listTypes();
    const filtered = all.filter(
      (type) =>
        (!query.status || type.status === query.status) &&
        (!search ||
          type.code.toLowerCase().includes(search) ||
          type.name.toLowerCase().includes(search)),
    );

    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toTypeResponse),
      page,
      limit,
      total: filtered.length,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Questions                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Creating a question also creates its version 1 as a DRAFT. A question with
   * no version would be an unrenderable row, and forcing the caller to make two
   * calls would leave that broken state reachable if the second call failed.
   */
  async createQuestion(
    bankId: string,
    dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const bank = await this.getBankOrThrow(bankId);
    assertBankAcceptsContent(bank);
    const type = await this.ensureActiveType(dto.questionTypeId);

    const code = normalizeOptionalText(dto.code);
    if (code && (await this.questions.findByBankAndCode(bankId, code))) {
      throw new ConflictException(
        `Question code ${code} is already used in this bank`,
      );
    }

    const scoringRule = normalizeScoringRule(dto.scoringRule);
    const options = normalizeOptions(dto.options);
    assertOptionsMatchType(type, options);
    assertScoringRuleMatchesOptions(scoringRule, options);

    const question = await this.questions.create({
      questionBankId: bankId,
      questionTypeId: dto.questionTypeId,
      code,
    });

    const version = await this.versions.create({
      questionId: question.id,
      version: 1,
      stem: dto.stem.trim(),
      scoringRule,
      explanation: normalizeOptionalText(dto.explanation),
      difficulty: normalizeOptionalText(dto.difficulty),
      topic: normalizeOptionalText(dto.topic),
      maxScore: dto.maxScore.toFixed(2),
      status: QuestionVersionStatusDto.DRAFT,
      options: toOptionsCreateData(options) ?? [],
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION,
      resourceId: question.id,
      after: {
        ...questionSnapshot(question),
        versionId: version.id,
        version: version.version,
      },
    });

    return toQuestionResponse(question, version, 1);
  }

  async listQuestions(
    bankId: string,
    query: ListQuestionsQueryDto,
  ): Promise<QuestionListResponseDto> {
    await this.getBankOrThrow(bankId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.questions.list({
      questionBankId: bankId,
      questionTypeId: query.questionTypeId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    // `versionStatus` filters on the newest version only: it answers "which
    // questions are still unpublished", which is the question an author has.
    const filterVersionStatus = query.versionStatus;
    const filtered = filterVersionStatus
      ? result.data.filter(
          (row) => row.latestVersion?.status === filterVersionStatus,
        )
      : result.data;

    return {
      data: filtered.map((row) =>
        toQuestionResponse(row, row.latestVersion, row.versionCount),
      ),
      page,
      limit,
      total: filterVersionStatus ? filtered.length : result.total,
    };
  }

  async findQuestion(id: string): Promise<QuestionResponseDto> {
    const question = await this.getQuestionOrThrow(id);
    const latest = await this.versions.findLatest(id);
    const state = await this.versions.findVersionState(id);
    return toQuestionResponse(question, latest, state.versionCount);
  }

  async updateQuestion(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const existing = await this.getQuestionOrThrow(id);

    if (dto.questionTypeId && dto.questionTypeId !== existing.questionTypeId) {
      await this.ensureActiveType(dto.questionTypeId);

      // Changing the type of a question that already has a published version
      // would reinterpret an option set that participants may already have been
      // measured against, so it is refused rather than silently migrating.
      const published = await this.versions.findPublished(id);
      if (published) {
        throw new UnprocessableEntityException(
          'Question type cannot change while a published version exists',
        );
      }
    }

    const code = normalizeOptionalText(dto.code);
    if (code) {
      const clash = await this.questions.findByBankAndCode(
        existing.questionBankId,
        code,
      );
      if (clash && clash.id !== id) {
        throw new ConflictException(
          `Question code ${code} is already used in this bank`,
        );
      }
    }

    const updated = await this.questions.update(id, {
      questionTypeId: dto.questionTypeId,
      code: dto.code === undefined ? undefined : code,
      status: dto.status,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION,
      resourceId: updated.id,
      before: questionSnapshot(existing),
      after: questionSnapshot(updated),
    });

    const latest = await this.versions.findLatest(id);
    const state = await this.versions.findVersionState(id);
    return toQuestionResponse(updated, latest, state.versionCount);
  }

  /* ------------------------------------------------------------------ */
  /* Versions — the immutability boundary                                */
  /* ------------------------------------------------------------------ */

  /**
   * Appends the next version number and leaves it as DRAFT.
   *
   * The new row starts from the caller's payload, not by copying the previous
   * version: a copy would silently carry a stale answer key into a correction,
   * which is exactly the failure versioning is meant to prevent.
   */
  async createVersion(
    questionId: string,
    dto: CreateQuestionVersionDto,
  ): Promise<QuestionVersionResponseDto> {
    const question = await this.getQuestionOrThrow(questionId);
    const type = await this.ensureActiveType(question.questionTypeId);

    const scoringRule = normalizeScoringRule(dto.scoringRule);
    const options = normalizeOptions(dto.options);
    assertOptionsMatchType(type, options);
    assertScoringRuleMatchesOptions(scoringRule, options);

    const state = await this.versions.findVersionState(questionId);

    const version = await this.versions.create({
      questionId,
      version: state.maxVersion + 1,
      stem: dto.stem.trim(),
      scoringRule,
      explanation: normalizeOptionalText(dto.explanation),
      difficulty: normalizeOptionalText(dto.difficulty),
      topic: normalizeOptionalText(dto.topic),
      maxScore: dto.maxScore.toFixed(2),
      status: QuestionVersionStatusDto.DRAFT,
      options: toOptionsCreateData(options) ?? [],
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_VERSION_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION_VERSION,
      resourceId: version.id,
      metadata: { questionId, version: version.version },
      after: versionSnapshot(version),
    });

    return toVersionResponse(version);
  }

  /**
   * Editing is allowed ONLY while the version is DRAFT.
   *
   * A PUBLISHED version is the thing an attempt points at; rewriting it would
   * retroactively change what a participant was asked. A SUPERSEDED version is
   * historical and equally frozen. Both cases answer 422 with the corrective
   * action spelled out, so the caller is told to create a new version rather
   * than left to guess.
   */
  async updateVersion(
    questionId: string,
    versionId: string,
    dto: UpdateQuestionVersionDto,
  ): Promise<QuestionVersionResponseDto> {
    const question = await this.getQuestionOrThrow(questionId);
    const existing = await this.versions.findForParticipant(
      questionId,
      versionId,
    );
    if (!existing) {
      throw new NotFoundException('Question version not found');
    }

    if (existing.status !== QuestionVersionStatusDto.DRAFT) {
      throw new UnprocessableEntityException(
        `Version ${existing.version} is ${existing.status} and immutable; create a new version instead`,
      );
    }

    const type = await this.ensureActiveType(question.questionTypeId);

    const scoringRule =
      dto.scoringRule === undefined
        ? undefined
        : normalizeScoringRule(dto.scoringRule);
    const options =
      dto.options === undefined ? undefined : normalizeOptions(dto.options);

    if (options) {
      assertOptionsMatchType(type, options);
    }
    if (scoringRule) {
      assertScoringRuleMatchesOptions(
        scoringRule,
        options ?? existing.options.map(optionCreateData),
      );
    }

    const updated = await this.versions.updateDraft(versionId, {
      stem: dto.stem === undefined ? undefined : dto.stem.trim(),
      scoringRule,
      explanation: normalizeOptionalText(dto.explanation),
      difficulty: normalizeOptionalText(dto.difficulty),
      topic: normalizeOptionalText(dto.topic),
      maxScore:
        dto.maxScore === undefined ? undefined : dto.maxScore.toFixed(2),
      options: toOptionsCreateData(options),
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_VERSION_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION_VERSION,
      resourceId: updated.id,
      metadata: {
        questionId,
        version: updated.version,
        optionsReplaced: options !== undefined,
      },
      before: versionSnapshot(existing),
      after: versionSnapshot(updated),
    });

    return toVersionResponse(updated);
  }

  /**
   * Publishing freezes a draft and, in the same transaction, retires whatever
   * version was published before it — so a question never has two published
   * versions (which would make "the current answer key" ambiguous) and never
   * drops to zero (which would make it unusable in an exam).
   */
  async publishVersion(
    questionId: string,
    versionId: string,
  ): Promise<QuestionVersionPublishResponseDto> {
    const question = await this.getQuestionOrThrow(questionId);
    const existing = await this.versions.findForParticipant(
      questionId,
      versionId,
    );
    if (!existing) {
      throw new NotFoundException('Question version not found');
    }

    if (existing.status === QuestionVersionStatusDto.PUBLISHED) {
      // Idempotent no-op, matching `assessments` status handling: re-sending the
      // same status returns the record and writes no audit entry.
      return { version: toVersionResponse(existing), superseded: null };
    }
    if (existing.status === QuestionVersionStatusDto.SUPERSEDED) {
      throw new UnprocessableEntityException(
        `Version ${existing.version} is SUPERSEDED and cannot be republished; create a new version instead`,
      );
    }

    assertPublishable(question, existing);

    const previous = await this.versions.findPublished(questionId);
    // Always go through the transaction: publishing the FIRST version must also
    // persist PUBLISHED, not merely return a record whose status was never
    // written. A `null` predecessor is the first-publish case.
    const result = await this.versions.supersedeAndPublish(
      previous?.id ?? null,
      versionId,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.QUESTION_VERSION_PUBLISHED,
      resourceType: AUDIT_RESOURCE_TYPES.QUESTION_VERSION,
      resourceId: result.published.id,
      metadata: {
        questionId,
        version: result.published.version,
        supersededId: result.superseded?.id ?? null,
      },
      before: result.superseded ? versionSnapshot(result.superseded) : null,
      after: versionSnapshot(result.published),
    });

    return {
      version: toVersionResponse(result.published),
      superseded: result.superseded
        ? toVersionResponse(result.superseded)
        : null,
    };
  }

  /**
   * The student-facing projection of one frozen version.
   *
   * The payload is assembled from an explicit allow-list of fields rather than
   * derived from `toVersionResponse` by subtraction.
   *
   * PUBLISHED **and** SUPERSEDED versions are readable: an attempt pins the
   * version it was taken against, so once a question is corrected into a newer
   * version the old one must still render exactly as the participant saw it —
   * that is what "historical attempt references version" requires. Only a DRAFT
   * is withheld, because it has no approved content to present.
   *
   * The owning question's `status` is deliberately NOT checked: retiring a
   * question removes it from new exams, it does not blank an attempt already in
   * flight against a frozen version.
   */
  async findStudentVersion(
    questionId: string,
    versionId: string,
  ): Promise<StudentQuestionDto> {
    const question = await this.getQuestionOrThrow(questionId);
    const version = await this.versions.findForParticipant(
      questionId,
      versionId,
    );
    if (!version) {
      throw new NotFoundException('Question version not found');
    }

    assertParticipantVisible(version);

    return toStudentQuestion(question, version);
  }

  /**
   * The student-safe read of a bank, for exam authoring previews.
   *
   * Only questions with a published version appear, and each one is projected
   * from its PUBLISHED version — never from DRAFT — so the endpoint can never
   * become a way to read an unapproved stem or a working answer key.
   */
  async listStudentQuestions(
    bankId: string,
    query: ListQuestionsQueryDto,
  ): Promise<StudentQuestionListResponseDto> {
    await this.getBankOrThrow(bankId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.questions.list({
      questionBankId: bankId,
      questionTypeId: query.questionTypeId,
      status: QuestionStatusDto.ACTIVE,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    const available: StudentQuestionDto[] = [];
    for (const row of result.data) {
      const published = await this.versions.findPublished(row.id);
      if (!published) {
        continue;
      }
      available.push(
        toStudentQuestion({ id: row.id, status: row.status }, published),
      );
    }

    return { data: available, page, limit, total: available.length };
  }

  /* ------------------------------------------------------------------ */
  /* Lookups and guards                                                  */
  /* ------------------------------------------------------------------ */

  private async getBankOrThrow(id: string): Promise<QuestionBankRecord> {
    const bank = await this.banks.findById(id);
    if (!bank) {
      throw new NotFoundException('Question bank not found');
    }
    return bank;
  }

  private async getQuestionOrThrow(id: string): Promise<QuestionRecord> {
    const question = await this.questions.findById(id);
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  private async getTypeOrThrow(id: string): Promise<QuestionTypeContext> {
    const type = await this.questions.findTypeContext(id);
    if (!type) {
      throw new NotFoundException('Question type not found');
    }
    return type;
  }
  private async ensureActiveType(id: string): Promise<QuestionTypeContext> {
    const type = await this.getTypeOrThrow(id);
    if (type.status !== QuestionBankStatusDto.ACTIVE) {
      throw new UnprocessableEntityException(
        `Question type ${type.code} is INACTIVE and cannot be used for new content`,
      );
    }
    return type;
  }

  private async ensureCurriculumSubject(id: string): Promise<void> {
    const subject = await this.banks.findCurriculumSubjectContext(id);
    if (!subject) {
      throw new NotFoundException('Curriculum subject not found');
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Validation helpers                                                      */
/* ---------------------------------------------------------------------- */

/** A bank that is retired or a curriculum that has not started yet accepts nothing new. */
function assertBankAcceptsContent(bank: QuestionBankRecord): void {
  if (bank.status !== QuestionBankStatusDto.ACTIVE) {
    throw new UnprocessableEntityException(
      `Question bank is ${bank.status} and cannot receive new questions`,
    );
  }
}

/**
 * Option validity is decided by the TYPE's flags, never by its code:
 *
 * - a type without options must not carry any (an essay with choices is a data
 *   error that would surface as a stray UI control);
 * - a type with options must carry at least two, because a one-choice question
 *   is not a question;
 * - a single-select type must have exactly one correct answer, or scoring would
 *   have to guess which one counts.
 */
function assertOptionsMatchType(
  type: QuestionTypeContext,
  options: QuestionOptionDto[],
): void {
  if (!type.hasOptions) {
    if (options.length > 0) {
      throw new BadRequestException(
        `Question type ${type.code} does not accept answer options`,
      );
    }
    return;
  }

  if (options.length < 2) {
    throw new BadRequestException(
      `Question type ${type.code} requires at least two options`,
    );
  }

  const keys = new Set<string>();
  for (const option of options) {
    const key = option.key.trim();
    if (keys.has(key)) {
      throw new BadRequestException(`Duplicate option key ${key}`);
    }
    keys.add(key);
  }

  const correct = options.filter((option) => option.isCorrect === true);
  if (correct.length === 0) {
    throw new BadRequestException('At least one option must be marked correct');
  }
  if (!type.multiSelect && correct.length > 1) {
    throw new BadRequestException(
      `Question type ${type.code} allows a single correct option, but ${correct.length} were marked correct`,
    );
  }
}

/**
 * Cross-checks the machine-readable answer key against the option set.
 *
 * The rule is intentionally narrow: when a scoring rule names correct option
 * keys, those keys must exist AND must be exactly the options flagged
 * `isCorrect`. Storing two disagreeing answers is the kind of inconsistency that
 * only shows up during an exam, so it is rejected at write time. A scoring rule
 * that names no keys (an essay rubric, a numeric tolerance) is left alone.
 */
function assertScoringRuleMatchesOptions(
  scoringRule: Record<string, unknown> | null,
  options: QuestionOptionDto[],
): void {
  if (!scoringRule) {
    return;
  }

  const declared = scoringRule.correctKeys;
  if (declared === undefined) {
    return;
  }

  if (
    !Array.isArray(declared) ||
    declared.some((key) => typeof key !== 'string')
  ) {
    throw new BadRequestException(
      'scoringRule.correctKeys must be an array of option keys',
    );
  }

  const optionKeys = new Set(options.map((option) => option.key.trim()));
  for (const key of declared as string[]) {
    if (!optionKeys.has(key)) {
      throw new BadRequestException(
        `scoringRule references unknown option key ${key}`,
      );
    }
  }

  const flagged = options
    .filter((option) => option.isCorrect === true)
    .map((option) => option.key.trim())
    .sort();
  const expected = [...(declared as string[])].sort();
  if (flagged.join('\u0000') !== expected.join('\u0000')) {
    throw new BadRequestException(
      'scoringRule.correctKeys must match the options flagged isCorrect',
    );
  }
}

/**
 * A version may only be published once it is complete.
 *
 * This is the last line of defence for the immutability guarantee: after this
 * call the row can never change, so publishing something incomplete would freeze
 * a broken question into the exam history permanently.
 */
function assertPublishable(
  question: QuestionRecord,
  version: QuestionVersionWithOptions,
): void {
  if (question.status !== QuestionStatusDto.ACTIVE) {
    throw new UnprocessableEntityException(
      'An inactive question cannot publish a version',
    );
  }
  if (!version.stem.trim()) {
    throw new UnprocessableEntityException('Version stem is empty');
  }
  if (Number(version.maxScore.toString()) <= 0) {
    throw new UnprocessableEntityException(
      'Version maxScore must be greater than 0 before publishing',
    );
  }
}

/**
 * Guards the one status a participant must never be handed.
 *
 * PUBLISHED is the current content; SUPERSEDED is a frozen historical version an
 * attempt may still reference. DRAFT is an unfinished answer key and is refused.
 */
function assertParticipantVisible(version: QuestionVersionRecord): void {
  if (version.status === QuestionVersionStatusDto.DRAFT) {
    throw new UnprocessableEntityException(
      'A draft question version is not available to participants',
    );
  }
}

function normalizeOptions(options?: QuestionOptionDto[]): QuestionOptionDto[] {
  if (!options) {
    return [];
  }
  return options.map((option, index) => ({
    ...option,
    key: option.key.trim(),
    label: option.label.trim(),
    isCorrect: option.isCorrect ?? false,
    sortOrder: option.sortOrder ?? index,
  }));
}

/**
 * Converts a validated option DTO into the repository's create shape.
 *
 * The decimal is formatted with `toFixed(2)` to match the project's DECIMAL
 * convention (see `assessments`), so the value written is always an exact
 * two-place string rather than a float that Prisma has to round.
 */
function toOptionCreateData(
  option: QuestionOptionDto,
): QuestionOptionCreateData {
  return {
    key: option.key,
    label: option.label,
    isCorrect: option.isCorrect ?? false,
    value: option.value === undefined ? null : option.value.toFixed(2),
    sortOrder: option.sortOrder ?? 0,
  };
}

function toOptionsCreateData(
  options?: QuestionOptionDto[],
): QuestionOptionCreateData[] | undefined {
  return options?.map(toOptionCreateData);
}

function optionCreateData(option: QuestionOptionRecord): QuestionOptionDto {
  return {
    key: option.key,
    label: option.label,
    isCorrect: option.isCorrect,
    value:
      option.value === null || option.value === undefined
        ? undefined
        : Number(option.value.toString()),
    sortOrder: option.sortOrder,
  };
}

function normalizeScoringRule(
  value?: Record<string, unknown>,
): Record<string, unknown> | null {
  return value ?? null;
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (!normalized) {
    throw new BadRequestException('Code is required');
  }
  return normalized;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim() || null;
}

/* ---------------------------------------------------------------------- */
/* Response mapping                                                        */
/* ---------------------------------------------------------------------- */

function toBankResponse(record: QuestionBankRecord): QuestionBankResponseDto {
  return {
    id: record.id,
    curriculumSubjectId: record.curriculumSubjectId,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status as QuestionBankResponseDto['status'],
    metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toTypeResponse(record: QuestionTypeContext): QuestionTypeResponseDto {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    hasOptions: record.hasOptions,
    multiSelect: record.multiSelect,
    status: record.status as QuestionTypeResponseDto['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toOptionResponse(
  record: QuestionOptionRecord,
): QuestionVersionResponseDto['options'][number] {
  return {
    id: record.id,
    key: record.key,
    label: record.label,
    isCorrect: record.isCorrect,
    value:
      record.value === null || record.value === undefined
        ? null
        : Number(record.value.toString()),
    sortOrder: record.sortOrder,
  };
}

function toVersionResponse(
  record: QuestionVersionRecord & { options?: QuestionOptionRecord[] },
): QuestionVersionResponseDto {
  return {
    id: record.id,
    questionId: record.questionId,
    version: record.version,
    stem: record.stem,
    scoringRule: (record.scoringRule as Record<string, unknown> | null) ?? null,
    explanation: record.explanation,
    difficulty: record.difficulty,
    topic: record.topic,
    maxScore: Number(record.maxScore.toString()),
    status: record.status as QuestionVersionResponseDto['status'],
    options: (record.options ?? []).map(toOptionResponse),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toQuestionResponse(
  question: Pick<
    QuestionRecord,
    | 'id'
    | 'questionBankId'
    | 'questionTypeId'
    | 'code'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  >,
  latestVersion: QuestionVersionRecord | null,
  versionCount: number,
): QuestionResponseDto {
  return {
    id: question.id,
    questionBankId: question.questionBankId,
    questionTypeId: question.questionTypeId,
    code: question.code,
    status: question.status as QuestionResponseDto['status'],
    versionCount,
    latestVersion: latestVersion ? toVersionResponse(latestVersion) : null,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

/**
 * Builds the student payload from an explicit allow-list.
 *
 * Nothing is spread from the source record: each field is named, so adding a
 * server-only column to `QuestionVersion` cannot leak it here by default. The
 * options go through the same treatment, dropping `isCorrect` and `value`
 * entirely rather than blanking them.
 */
function toStudentQuestion(
  question: Pick<QuestionRecord, 'id' | 'status'>,
  version: QuestionVersionWithOptions,
): StudentQuestionDto {
  return {
    questionId: question.id,
    versionId: version.id,
    version: version.version,
    stem: version.stem,
    topic: version.topic,
    difficulty: version.difficulty,
    options: version.options.map((option) => ({
      key: option.key,
      label: option.label,
      sortOrder: option.sortOrder,
    })),
  };
}

function bankSnapshot(record: QuestionBankRecord): Record<string, unknown> {
  return {
    id: record.id,
    curriculumSubjectId: record.curriculumSubjectId,
    code: record.code,
    name: record.name,
    status: record.status,
  };
}

function questionSnapshot(record: QuestionRecord): Record<string, unknown> {
  return {
    id: record.id,
    questionBankId: record.questionBankId,
    questionTypeId: record.questionTypeId,
    code: record.code,
    status: record.status,
  };
}

/**
 * Audit snapshots deliberately exclude the answer key. The audit log is widely
 * readable (reporting, security review) and is not a place to duplicate a
 * correct answer, so only the version's identity and classification are kept.
 */
function versionSnapshot(
  record: QuestionVersionRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    questionId: record.questionId,
    version: record.version,
    difficulty: record.difficulty,
    topic: record.topic,
    maxScore: Number(record.maxScore.toString()),
    status: record.status,
  };
}
