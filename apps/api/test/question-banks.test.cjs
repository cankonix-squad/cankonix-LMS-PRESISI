const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  QuestionBanksService,
} = require('../dist/question-banks/question-banks.service');
const { createApp } = require('../dist/app');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

const SUBJECT_1 = '44444444-4444-4444-8444-000000000001';
const SINGLE_CHOICE = '88888888-8888-4888-8888-000000000001';
const MULTIPLE_CHOICE = '88888888-8888-4888-8888-000000000002';
const ESSAY = '88888888-8888-4888-8888-000000000003';
const INACTIVE_TYPE = '88888888-8888-4888-8888-000000000004';

function nextId(prefix, counter) {
  return `${prefix}-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

class MemoryQuestionBanksRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.subjects = new Map([
      [SUBJECT_1, { id: SUBJECT_1, curriculumId: 'c1', subjectId: 's1' }],
    ]);
  }

  async create(data) {
    const now = new Date('2026-10-03T00:00:00.000Z');
    const record = {
      id: nextId('abababa1', this.next++),
      curriculumSubjectId: data.curriculumSubjectId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
      metadata: data.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findBySubjectAndCode(curriculumSubjectId, code) {
    return (
      this.records.find(
        (r) => r.curriculumSubjectId === curriculumSubjectId && r.code === code,
      ) ?? null
    );
  }

  async list(filter) {
    let rows = [...this.records];
    if (filter.curriculumSubjectId) {
      rows = rows.filter(
        (r) => r.curriculumSubjectId === filter.curriculumSubjectId,
      );
    }
    if (filter.status) {
      rows = rows.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(needle) ||
          r.name.toLowerCase().includes(needle),
      );
    }
    const start = (filter.page - 1) * filter.limit;
    return {
      data: rows.slice(start, start + filter.limit),
      total: rows.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((r) => r.id === id);
    const next = { ...this.records[index], updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        next[key] = value;
      }
    }
    this.records[index] = next;
    return next;
  }

  async findCurriculumSubjectContext(curriculumSubjectId) {
    return this.subjects.get(curriculumSubjectId) ?? null;
  }
}

class MemoryQuestionsRepository {
  constructor(versions) {
    this.versions = versions;
    this.records = [];
    this.next = 1;
    this.types = new Map([
      [
        SINGLE_CHOICE,
        {
          id: SINGLE_CHOICE,
          code: 'SINGLE_CHOICE',
          name: 'Pilihan Ganda',
          description: null,
          hasOptions: true,
          multiSelect: false,
          status: 'ACTIVE',
          createdAt: new Date('2026-10-03T00:00:00.000Z'),
          updatedAt: new Date('2026-10-03T00:00:00.000Z'),
        },
      ],
      [
        MULTIPLE_CHOICE,
        {
          id: MULTIPLE_CHOICE,
          code: 'MULTIPLE_CHOICE',
          name: 'Pilihan Ganda Kompleks',
          description: null,
          hasOptions: true,
          multiSelect: true,
          status: 'ACTIVE',
          createdAt: new Date('2026-10-03T00:00:00.000Z'),
          updatedAt: new Date('2026-10-03T00:00:00.000Z'),
        },
      ],
      [
        ESSAY,
        {
          id: ESSAY,
          code: 'ESSAY',
          name: 'Uraian',
          description: null,
          hasOptions: false,
          multiSelect: false,
          status: 'ACTIVE',
          createdAt: new Date('2026-10-03T00:00:00.000Z'),
          updatedAt: new Date('2026-10-03T00:00:00.000Z'),
        },
      ],
      [
        INACTIVE_TYPE,
        {
          id: INACTIVE_TYPE,
          code: 'RETIRED',
          name: 'Tipe Pensiun',
          description: null,
          hasOptions: true,
          multiSelect: false,
          status: 'INACTIVE',
          createdAt: new Date('2026-10-03T00:00:00.000Z'),
          updatedAt: new Date('2026-10-03T00:00:00.000Z'),
        },
      ],
    ]);
  }

  async create(data) {
    const now = new Date('2026-10-03T00:00:00.000Z');
    const record = {
      id: nextId('cdcdcdc1', this.next++),
      questionBankId: data.questionBankId,
      questionTypeId: data.questionTypeId,
      code: data.code ?? null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByBankAndCode(questionBankId, code) {
    return (
      this.records.find(
        (r) => r.questionBankId === questionBankId && r.code === code,
      ) ?? null
    );
  }

  async findTypeContext(questionTypeId) {
    return this.types.get(questionTypeId) ?? null;
  }

  async listTypes() {
    return [...this.types.values()];
  }

  async update(id, data) {
    const index = this.records.findIndex((r) => r.id === id);
    const next = { ...this.records[index], updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        next[key] = value;
      }
    }
    this.records[index] = next;
    return next;
  }

  async list(filter) {
    let rows = this.records.filter(
      (r) => r.questionBankId === filter.questionBankId,
    );
    if (filter.questionTypeId) {
      rows = rows.filter((r) => r.questionTypeId === filter.questionTypeId);
    }
    if (filter.status) {
      rows = rows.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.code ?? '').toLowerCase().includes(needle) ||
          this.records.some(
            (v) =>
              v.__optionOf === undefined &&
              v.questionId === r.id &&
              v.stem.toLowerCase().includes(needle),
          ),
      );
    }
    const start = (filter.page - 1) * filter.limit;
    const data = [];
    for (const row of rows.slice(start, start + filter.limit)) {
      const latestVersion = await this.versions.findLatest(row.id);
      const state = await this.versions.findVersionState(row.id);
      data.push({
        ...row,
        latestVersion,
        versionCount: state.versionCount,
      });
    }
    return { data, total: rows.length };
  }
}

class MemoryQuestionVersionsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  _hydrate(record) {
    if (!record) {
      return null;
    }
    return {
      ...record,
      options: this.records
        .filter((r) => r.__optionOf === record.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => ({
          id: option.id,
          versionId: option.versionId,
          key: option.key,
          label: option.label,
          isCorrect: option.isCorrect,
          value: option.value ?? null,
          sortOrder: option.sortOrder,
          createdAt: option.createdAt,
        })),
    };
  }

  async create(data) {
    const now = new Date('2026-10-03T00:00:00.000Z');
    const record = {
      id: nextId('efefefe1', this.next++),
      questionId: data.questionId,
      version: data.version,
      stem: data.stem,
      scoringRule: data.scoringRule ?? null,
      explanation: data.explanation ?? null,
      difficulty: data.difficulty ?? null,
      topic: data.topic ?? null,
      maxScore: data.maxScore,
      status: data.status,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    for (const option of data.options ?? []) {
      this.records.push({
        ...option,
        __optionOf: record.id,
        id: nextId('121212a1', this.next++),
        versionId: record.id,
        createdAt: now,
      });
    }
    return this._hydrate(record);
  }

  async findById(id) {
    return this._hydrate(
      this.records.find((r) => r.id === id && !r.__optionOf),
    );
  }

  async findLatest(questionId) {
    const versions = this.records
      .filter((r) => r.questionId === questionId && !r.__optionOf)
      .sort((a, b) => b.version - a.version);
    return this._hydrate(versions[0]);
  }

  async findForParticipant(questionId, versionId) {
    return this._hydrate(
      this.records.find(
        (r) =>
          r.id === versionId && r.questionId === questionId && !r.__optionOf,
      ),
    );
  }

  async findVersionState(questionId) {
    const versions = this.records.filter(
      (r) => r.questionId === questionId && !r.__optionOf,
    );
    return {
      questionId,
      maxVersion: versions.reduce((max, r) => Math.max(max, r.version), 0),
      versionCount: versions.length,
    };
  }

  async findPublished(questionId) {
    const versions = this.records
      .filter(
        (r) =>
          r.questionId === questionId &&
          !r.__optionOf &&
          r.status === 'PUBLISHED',
      )
      .sort((a, b) => b.version - a.version);
    return this._hydrate(versions[0]);
  }

  async updateDraft(id, data) {
    const record = this.records.find((r) => r.id === id);
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'options') {
        record[key] = value;
      }
    }
    if (data.options) {
      for (let i = this.records.length - 1; i >= 0; i -= 1) {
        if (this.records[i].__optionOf === id) {
          this.records.splice(i, 1);
        }
      }
      for (const option of data.options) {
        this.records.push({
          ...option,
          __optionOf: id,
          id: nextId('121212a1', this.next++),
          versionId: id,
          createdAt: new Date(),
        });
      }
    }
    return this._hydrate(record);
  }

  async supersedeAndPublish(supersededId, publishedId) {
    const published = this.records.find((r) => r.id === publishedId);
    published.status = 'PUBLISHED';
    if (!supersededId) {
      return { published: this._hydrate(published), superseded: null };
    }
    const superseded = this.records.find((r) => r.id === supersededId);
    superseded.status = 'SUPERSEDED';
    return {
      published: this._hydrate(published),
      superseded: this._hydrate(superseded),
    };
  }
}

function build() {
  const banksRepo = new MemoryQuestionBanksRepository();
  const versionsRepo = new MemoryQuestionVersionsRepository();
  const questionsRepo = new MemoryQuestionsRepository(versionsRepo);
  const audit = new FakeAuditService();

  return {
    banksRepo,
    questionsRepo,
    versionsRepo,
    audit,
    service: new QuestionBanksService(
      banksRepo,
      questionsRepo,
      versionsRepo,
      audit,
    ),
  };
}

async function seedBank(ctx, overrides = {}) {
  return await ctx.service.createBank({
    curriculumSubjectId: SUBJECT_1,
    code: 'TWK-DASAR',
    name: 'Bank Soal TWK Dasar',
    ...overrides,
  });
}

/** A minimal valid single-choice question. */
function choiceInput(overrides = {}) {
  return {
    questionTypeId: SINGLE_CHOICE,
    stem: 'Dasar hukum negara Indonesia adalah?',
    maxScore: 1,
    options: [
      { key: 'A', label: 'UUD 1945', isCorrect: true },
      { key: 'B', label: 'Pancasila', isCorrect: false },
      { key: 'C', label: 'Keputusan Presiden', isCorrect: false },
    ],
    ...overrides,
  };
}

test('a question bank is created, scoped to a curriculum subject, and audited', async () => {
  const ctx = build();

  const bank = await seedBank(ctx);
  assert.equal(bank.code, 'TWK-DASAR');
  assert.equal(bank.status, 'ACTIVE');
  assert.equal(ctx.audit.records.at(-1).action, 'question_bank.created');

  // Codes are normalized and unique per subject.
  const other = await ctx.service.createBank({
    curriculumSubjectId: SUBJECT_1,
    code: ' twk lanjutan ',
    name: 'TWK Lanjutan',
  });
  assert.equal(other.code, 'TWK_LANJUTAN');

  await assert.rejects(() => seedBank(ctx), ConflictException);

  await assert.rejects(
    () =>
      ctx.service.createBank({
        curriculumSubjectId: '99999999-9999-4999-8999-999999999999',
        code: 'X',
        name: 'X',
      }),
    NotFoundException,
  );

  const listed = await ctx.service.listBanks({ search: 'lanjutan' });
  assert.deepEqual(
    listed.data.map((row) => row.code),
    ['TWK_LANJUTAN'],
  );
});

test('creating a question records version 1 as an editable draft', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);

  const question = await ctx.service.createQuestion(bank.id, choiceInput());
  assert.equal(question.versionCount, 1);
  assert.equal(question.latestVersion.version, 1);
  assert.equal(question.latestVersion.status, 'DRAFT');
  assert.equal(question.latestVersion.options.length, 3);
  assert.equal(ctx.audit.records.at(-1).action, 'question.created');

  // A retired bank stops accepting content but stays readable.
  await ctx.service.updateBank(bank.id, { status: 'INACTIVE' });
  await assert.rejects(
    () => ctx.service.createQuestion(bank.id, choiceInput()),
    UnprocessableEntityException,
  );
});

test('option validation is driven by the question type flags, not a code', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);

  // A type without options rejects an option set...
  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({ questionTypeId: ESSAY }),
      ),
    BadRequestException,
  );
  // ...and accepts a bare stem.
  const essay = await ctx.service.createQuestion(
    bank.id,
    choiceInput({ questionTypeId: ESSAY, options: [] }),
  );
  assert.equal(essay.latestVersion.options.length, 0);

  // A single-select type refuses two correct answers.
  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({
          options: [
            { key: 'A', label: 'Satu', isCorrect: true },
            { key: 'B', label: 'Dua', isCorrect: true },
          ],
        }),
      ),
    BadRequestException,
  );

  // The same payload is fine for a multi-select type.
  const multi = await ctx.service.createQuestion(
    bank.id,
    choiceInput({
      questionTypeId: MULTIPLE_CHOICE,
      options: [
        { key: 'A', label: 'Satu', isCorrect: true },
        { key: 'B', label: 'Dua', isCorrect: true },
      ],
    }),
  );
  assert.equal(multi.latestVersion.options.length, 2);

  // Duplicate keys and a missing correct answer are both refused.
  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({
          options: [
            { key: 'A', label: 'Satu', isCorrect: true },
            { key: 'A', label: 'Dua', isCorrect: false },
          ],
        }),
      ),
    BadRequestException,
  );
  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({
          options: [
            { key: 'A', label: 'Satu', isCorrect: false },
            { key: 'B', label: 'Dua', isCorrect: false },
          ],
        }),
      ),
    BadRequestException,
  );

  // An inactive type cannot author new content.
  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({ questionTypeId: INACTIVE_TYPE }),
      ),
    UnprocessableEntityException,
  );
});

test('a scoring rule that disagrees with the option key is rejected', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);

  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({ scoringRule: { correctKeys: ['B'] } }),
      ),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({ scoringRule: { correctKeys: ['Z'] } }),
      ),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      ctx.service.createQuestion(
        bank.id,
        choiceInput({ scoringRule: { correctKeys: 'A' } }),
      ),
    BadRequestException,
  );

  // A rule that agrees with the flags is accepted.
  const ok = await ctx.service.createQuestion(
    bank.id,
    choiceInput({ scoringRule: { correctKeys: ['A'], points: 1 } }),
  );
  assert.deepEqual(ok.latestVersion.scoringRule, {
    correctKeys: ['A'],
    points: 1,
  });

  // A rule naming no keys (an essay rubric) is left alone.
  const rubric = await ctx.service.createQuestion(
    bank.id,
    choiceInput({
      questionTypeId: ESSAY,
      options: [],
      scoringRule: { criteria: ['kelengkapan'] },
    }),
  );
  assert.deepEqual(rubric.latestVersion.scoringRule, {
    criteria: ['kelengkapan'],
  });
});

test('editing a published version is refused; a correction is a new version', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);
  const question = await ctx.service.createQuestion(bank.id, choiceInput());
  const v1 = question.latestVersion;

  // A draft is editable in place.
  const edited = await ctx.service.updateVersion(question.id, v1.id, {
    stem: 'Dasar hukum negara Indonesia adalah...',
    options: [
      { key: 'A', label: 'UUD 1945', isCorrect: true },
      { key: 'B', label: 'Pancasila', isCorrect: false },
    ],
  });
  assert.equal(edited.stem, 'Dasar hukum negara Indonesia adalah...');
  assert.equal(edited.options.length, 2);
  assert.equal(ctx.audit.records.at(-1).action, 'question_version.updated');

  // Publishing freezes it.
  const published = await ctx.service.publishVersion(question.id, v1.id);
  assert.equal(published.version.status, 'PUBLISHED');
  assert.equal(published.superseded, null);
  assert.equal(ctx.audit.records.at(-1).action, 'question_version.published');

  await assert.rejects(
    () =>
      ctx.service.updateVersion(question.id, v1.id, { stem: 'Diubah lagi' }),
    UnprocessableEntityException,
  );

  // The correction is appended as version 2 and supersedes version 1 atomically.
  const v2 = await ctx.service.createVersion(question.id, {
    stem: 'Dasar hukum negara Republik Indonesia adalah?',
    maxScore: 2,
    options: [
      { key: 'A', label: 'UUD 1945', isCorrect: true },
      { key: 'B', label: 'Pancasila', isCorrect: false },
    ],
  });
  assert.equal(v2.version, 2);
  assert.equal(v2.status, 'DRAFT');

  const publishV2 = await ctx.service.publishVersion(question.id, v2.id);
  assert.equal(publishV2.version.status, 'PUBLISHED');
  assert.equal(publishV2.superseded.id, v1.id);
  assert.equal(publishV2.superseded.status, 'SUPERSEDED');

  // Version 1 still renders exactly what was published — the immutable snapshot.
  const historical = await ctx.service.findStudentVersion(question.id, v1.id);
  assert.equal(historical.version, 1);
  assert.equal(historical.stem, 'Dasar hukum negara Indonesia adalah...');
  assert.deepEqual(
    historical.options.map((option) => option.key),
    ['A', 'B'],
  );

  // A superseded version cannot be republished, and publishing again is a no-op.
  await assert.rejects(
    () => ctx.service.publishVersion(question.id, v1.id),
    UnprocessableEntityException,
  );
  const republish = await ctx.service.publishVersion(question.id, v2.id);
  assert.equal(republish.superseded, null);

  const state = await ctx.service.findQuestion(question.id);
  assert.equal(state.versionCount, 2);
  assert.equal(state.latestVersion.version, 2);
});

test('publishing requires a complete version and an active question', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);
  const question = await ctx.service.createQuestion(bank.id, choiceInput());
  const v1 = question.latestVersion;

  await ctx.service.updateQuestion(question.id, { status: 'INACTIVE' });
  await assert.rejects(
    () => ctx.service.publishVersion(question.id, v1.id),
    UnprocessableEntityException,
  );

  // Reactivating restores the ability to publish.
  await ctx.service.updateQuestion(question.id, { status: 'ACTIVE' });
  const published = await ctx.service.publishVersion(question.id, v1.id);
  assert.equal(published.version.status, 'PUBLISHED');
});

test('a question type cannot change once a version is published', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);

  // While nothing is published, a type correction is still allowed.
  const editable = await ctx.service.createQuestion(bank.id, choiceInput());
  await ctx.service.updateQuestion(editable.id, { questionTypeId: ESSAY });
  assert.equal(
    (await ctx.service.findQuestion(editable.id)).questionTypeId,
    ESSAY,
  );

  // Once a version is frozen, switching type would reinterpret the stored
  // option set, so it is refused.
  const frozen = await ctx.service.createQuestion(
    bank.id,
    choiceInput({ questionTypeId: MULTIPLE_CHOICE, code: 'Q-002' }),
  );
  await ctx.service.publishVersion(frozen.id, frozen.latestVersion.id);

  await assert.rejects(
    () => ctx.service.updateQuestion(frozen.id, { questionTypeId: ESSAY }),
    UnprocessableEntityException,
  );

  // A duplicate code inside the same bank is refused.
  await assert.rejects(
    () => ctx.service.createQuestion(bank.id, choiceInput({ code: 'Q-002' })),
    ConflictException,
  );
});

test('questions are listed per bank and filterable by newest version status', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);

  const published = await ctx.service.createQuestion(
    bank.id,
    choiceInput({ code: 'Q-001' }),
  );
  await ctx.service.publishVersion(published.id, published.latestVersion.id);
  await ctx.service.createQuestion(bank.id, choiceInput({ code: 'Q-002' }));

  const all = await ctx.service.listQuestions(bank.id, {});
  assert.equal(all.total, 2);

  const drafts = await ctx.service.listQuestions(bank.id, {
    versionStatus: 'DRAFT',
  });
  assert.deepEqual(
    drafts.data.map((row) => row.code),
    ['Q-002'],
  );

  const byType = await ctx.service.listQuestions(bank.id, {
    questionTypeId: ESSAY,
  });
  assert.equal(byType.total, 0);

  const searched = await ctx.service.listQuestions(bank.id, {
    search: 'Q-001',
  });
  assert.equal(searched.total, 1);

  const types = await ctx.service.listQuestionTypes({});
  assert.ok(types.data.some((type) => type.code === 'SINGLE_CHOICE'));
  const filtered = await ctx.service.listQuestionTypes({ search: 'uraian' });
  assert.deepEqual(
    filtered.data.map((type) => type.code),
    ['ESSAY'],
  );
});

/* -------------------------------------------------------------------------- */
/* Student-safe projection — the leak test                                     */
/* -------------------------------------------------------------------------- */

const FORBIDDEN_KEYS = [
  'isCorrect',
  'scoringRule',
  'explanation',
  'correctKeys',
  'value',
  'maxScore',
];

/** Walks the whole payload, not just the top level. */
function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

test('the student projection never carries a correct answer or explanation', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);
  const question = await ctx.service.createQuestion(
    bank.id,
    choiceInput({
      scoringRule: { correctKeys: ['A'] },
      explanation: 'UUD 1945 adalah hukum dasar tertulis.',
      difficulty: 'EASY',
      topic: 'Dasar Hukum',
    }),
  );
  await ctx.service.publishVersion(question.id, question.latestVersion.id);

  const student = await ctx.service.findStudentVersion(
    question.id,
    question.latestVersion.id,
  );

  const keys = collectKeys(student);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(
      !keys.has(forbidden),
      `student payload must not contain ${forbidden}`,
    );
  }

  // The serialized form is what actually crosses the wire, so assert on it too:
  // a value could still be smuggled in as a nested string.
  const serialized = JSON.stringify(student);
  assert.ok(!serialized.includes('UUD 1945 adalah hukum dasar tertulis.'));
  assert.ok(!serialized.includes('correctKeys'));

  // What IS allowed is present and complete.
  assert.equal(student.stem, question.latestVersion.stem);
  assert.equal(student.topic, 'Dasar Hukum');
  assert.deepEqual(
    student.options.map((option) => option.key),
    ['A', 'B', 'C'],
  );
  assert.deepEqual(Object.keys(student.options[0]).sort(), [
    'key',
    'label',
    'sortOrder',
  ]);
});

test('a draft version is never readable, but a frozen one survives retirement', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);
  const question = await ctx.service.createQuestion(bank.id, choiceInput());

  // DRAFT is not available to participants.
  await assert.rejects(
    () =>
      ctx.service.findStudentVersion(question.id, question.latestVersion.id),
    UnprocessableEntityException,
  );

  await ctx.service.publishVersion(question.id, question.latestVersion.id);
  assert.ok(
    await ctx.service.findStudentVersion(
      question.id,
      question.latestVersion.id,
    ),
  );

  // Retiring the question removes it from new exams but must not blank an
  // attempt already in flight against the frozen version.
  await ctx.service.updateQuestion(question.id, { status: 'INACTIVE' });
  const stillReadable = await ctx.service.findStudentVersion(
    question.id,
    question.latestVersion.id,
  );
  assert.equal(stillReadable.questionId, question.id);

  // A retired question no longer appears in the bank listing, though.
  const listing = await ctx.service.listStudentQuestions(bank.id, {});
  assert.equal(listing.total, 0);

  await assert.rejects(
    () =>
      ctx.service.findStudentVersion(
        question.id,
        '99999999-9999-4999-8999-999999999999',
      ),
    NotFoundException,
  );
});

test('the student bank listing exposes only published questions, safely projected', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);

  const live = await ctx.service.createQuestion(
    bank.id,
    choiceInput({
      code: 'Q-001',
      scoringRule: { correctKeys: ['A'] },
      explanation: 'Rahasia.',
    }),
  );
  await ctx.service.publishVersion(live.id, live.latestVersion.id);

  // A draft question must not appear to a participant.
  await ctx.service.createQuestion(bank.id, choiceInput({ code: 'Q-002' }));

  const listing = await ctx.service.listStudentQuestions(bank.id, {});
  assert.equal(listing.total, 1);
  assert.equal(listing.data[0].questionId, live.id);

  const keys = collectKeys(listing);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(
      !keys.has(forbidden),
      `student listing must not contain ${forbidden}`,
    );
  }
});

test('audit snapshots of a version do not duplicate the answer key', async () => {
  const ctx = build();
  const bank = await seedBank(ctx);
  const question = await ctx.service.createQuestion(
    bank.id,
    choiceInput({ scoringRule: { correctKeys: ['A'] } }),
  );
  await ctx.service.publishVersion(question.id, question.latestVersion.id);

  for (const entry of ctx.audit.records) {
    const serialized = JSON.stringify(entry);
    assert.ok(
      !serialized.includes('correctKeys'),
      'audit entries must not carry the answer key',
    );
  }

  const publishEntry = ctx.audit.records.find(
    (entry) => entry.action === 'question_version.published',
  );
  assert.equal(publishEntry.after.status, 'PUBLISHED');
  assert.equal(publishEntry.after.version, 1);
});

test('question bank endpoints are exposed in OpenAPI under api v1 and fail closed', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();

    assert.ok(spec.paths['/api/v1/question-banks'].post);
    assert.ok(spec.paths['/api/v1/question-banks'].get);
    assert.ok(spec.paths['/api/v1/question-banks/{id}'].get);
    assert.ok(spec.paths['/api/v1/question-banks/{id}'].patch);
    assert.ok(spec.paths['/api/v1/question-banks/{bankId}/questions'].post);
    assert.ok(spec.paths['/api/v1/question-banks/{bankId}/questions'].get);
    assert.ok(
      spec.paths['/api/v1/question-banks/{bankId}/questions/student'].get,
    );

    assert.ok(spec.paths['/api/v1/question-types'].get);
    assert.ok(spec.paths['/api/v1/questions/{id}'].get);
    assert.ok(spec.paths['/api/v1/questions/{id}'].patch);
    assert.ok(spec.paths['/api/v1/questions/{id}/versions'].post);
    assert.ok(spec.paths['/api/v1/questions/{id}/versions/{versionId}'].patch);
    assert.ok(
      spec.paths['/api/v1/questions/{id}/versions/{versionId}/publish'].post,
    );
    assert.ok(
      spec.paths['/api/v1/questions/{id}/versions/{versionId}/student'].get,
    );

    // A route with a permission requirement must never answer anonymously.
    for (const path of [
      '/api/v1/question-banks',
      '/api/v1/question-types',
      '/api/v1/questions/00000000-0000-4000-8000-000000000000',
    ]) {
      const anonymous = await fetch(`${base}${path}`);
      assert.equal(anonymous.status, 401, `${path} must answer 401`);
    }
  } finally {
    await app.close();
  }
});
