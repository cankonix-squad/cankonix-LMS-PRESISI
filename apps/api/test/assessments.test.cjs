const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  AssessmentTypesService,
} = require('../dist/assessment-types/assessment-types.service');
const {
  AssessmentsService,
} = require('../dist/assessments/assessments.service');
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

const CLASS_SUBJECT_1 = '55555555-5555-4000-8000-000000000001';
const CLASS_SUBJECT_ARCHIVED = '55555555-5555-4000-8000-000000000002';
const QUICK_TYPE = '77777777-7777-4777-8777-000000000001';
const INACTIVE_TYPE = '77777777-7777-4777-8777-000000000002';

function nextId(prefix, counter) {
  return `${prefix}-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

class MemoryAssessmentTypesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.liveAssessments = new Map();
  }

  async create(data) {
    const record = {
      id: nextId('bbbbbbb1', this.next++),
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-10-02T00:00:00.000Z'),
      updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByCode(code) {
    return this.records.find((record) => record.code === code) ?? null;
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.code.toLowerCase().includes(needle) ||
          r.name.toLowerCase().includes(needle),
      );
    }
    filtered.sort((a, b) => a.code.localeCompare(b.code));
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.records[index];
  }

  async countLiveAssessments(assessmentTypeId) {
    return this.liveAssessments.get(assessmentTypeId) ?? 0;
  }
}

class MemoryAssessmentsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.classSubjects = new Map([
      [
        CLASS_SUBJECT_1,
        {
          id: CLASS_SUBJECT_1,
          academicClassId: '66666666-6666-4666-8666-000000000001',
          curriculumSubjectId: '44444444-4444-4444-8444-000000000001',
          status: 'ACTIVE',
        },
      ],
      [
        CLASS_SUBJECT_ARCHIVED,
        {
          id: CLASS_SUBJECT_ARCHIVED,
          academicClassId: '66666666-6666-4666-8666-000000000001',
          curriculumSubjectId: '44444444-4444-4444-8444-000000000002',
          status: 'COMPLETED',
        },
      ],
    ]);
    this.types = new Map([
      [QUICK_TYPE, { id: QUICK_TYPE, code: 'QUIZ', status: 'ACTIVE' }],
      [
        INACTIVE_TYPE,
        { id: INACTIVE_TYPE, code: 'RETIRED', status: 'INACTIVE' },
      ],
    ]);
  }

  async create(data) {
    const now = new Date('2026-10-02T00:00:00.000Z');
    const record = {
      id: nextId('ccccccc1', this.next++),
      classSubjectId: data.classSubjectId,
      assessmentTypeId: data.assessmentTypeId,
      title: data.title,
      description: data.description ?? null,
      maxScore: data.maxScore,
      weight: data.weight ?? null,
      availableFrom: data.availableFrom ?? null,
      availableUntil: data.availableUntil ?? null,
      status: data.status ?? 'DRAFT',
      metadata: data.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.classSubjectId) {
      filtered = filtered.filter(
        (r) => r.classSubjectId === filter.classSubjectId,
      );
    }
    if (filter.assessmentTypeId) {
      filtered = filtered.filter(
        (r) => r.assessmentTypeId === filter.assessmentTypeId,
      );
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      filtered = filtered.filter((r) => r.title.toLowerCase().includes(needle));
    }
    if (filter.academicClassId) {
      filtered = filtered.filter(
        (r) =>
          this.classSubjects.get(r.classSubjectId)?.academicClassId ===
          filter.academicClassId,
      );
    }
    if (filter.curriculumSubjectId) {
      filtered = filtered.filter(
        (r) =>
          this.classSubjects.get(r.classSubjectId)?.curriculumSubjectId ===
          filter.curriculumSubjectId,
      );
    }
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    const next = { ...this.records[index], updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        next[key] = value;
      }
    }
    this.records[index] = next;
    return next;
  }

  async findClassSubjectContext(classSubjectId) {
    return this.classSubjects.get(classSubjectId) ?? null;
  }

  async findAssessmentTypeContext(assessmentTypeId) {
    return this.types.get(assessmentTypeId) ?? null;
  }
}

function build() {
  const typesRepo = new MemoryAssessmentTypesRepository();
  const assessmentsRepo = new MemoryAssessmentsRepository();
  const audit = new FakeAuditService();

  return {
    typesRepo,
    assessmentsRepo,
    audit,
    typesService: new AssessmentTypesService(typesRepo, audit),
    assessmentsService: new AssessmentsService(assessmentsRepo, audit),
  };
}

/** A minimal valid create payload; override per test. */
function createInput(overrides = {}) {
  return {
    classSubjectId: CLASS_SUBJECT_1,
    assessmentTypeId: QUICK_TYPE,
    title: 'Kuis 1 — Dasar Hukum',
    maxScore: 100,
    ...overrides,
  };
}

test('assessment types are a data-driven vocabulary, not a code branch', async () => {
  const ctx = build();

  const quiz = await ctx.typesService.create({ code: 'quiz', name: 'Kuis' });
  assert.equal(quiz.code, 'QUIZ');
  assert.equal(quiz.status, 'ACTIVE');
  assert.equal(ctx.audit.records.at(-1).action, 'assessment_type.created');

  // A method invented by the institution needs no schema or code change.
  const practical = await ctx.typesService.create({
    code: 'field practice',
    name: 'Praktik Lapangan',
  });
  assert.equal(practical.code, 'FIELD_PRACTICE');

  await assert.rejects(
    () => ctx.typesService.create({ code: 'QUIZ', name: 'Duplikat' }),
    ConflictException,
  );

  const listed = await ctx.typesService.list({ search: 'praktik' });
  assert.deepEqual(
    listed.data.map((type) => type.code),
    ['FIELD_PRACTICE'],
  );

  await assert.rejects(
    () => ctx.typesService.findOne('99999999-9999-4999-8999-999999999999'),
    NotFoundException,
  );
});

test('deactivating an assessment type is blocked only by live assessments', async () => {
  const ctx = build();
  const type = await ctx.typesService.create({ code: 'QUIZ', name: 'Kuis' });

  ctx.typesRepo.liveAssessments.set(type.id, 3);
  await assert.rejects(
    () => ctx.typesService.update(type.id, { status: 'INACTIVE' }),
    UnprocessableEntityException,
  );

  // Archived assessments stay readable, so they do not block retirement.
  ctx.typesRepo.liveAssessments.set(type.id, 0);
  const deactivated = await ctx.typesService.update(type.id, {
    status: 'INACTIVE',
  });
  assert.equal(deactivated.status, 'INACTIVE');
  assert.equal(ctx.audit.records.at(-1).action, 'assessment_type.updated');
});

test('creating an assessment validates the class subject and the type', async () => {
  const ctx = build();

  await assert.rejects(
    () =>
      ctx.assessmentsService.create(
        createInput({
          classSubjectId: '55555555-5555-4000-8000-0000000000ff',
        }),
      ),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      ctx.assessmentsService.create(
        createInput({ assessmentTypeId: INACTIVE_TYPE }),
      ),
    UnprocessableEntityException,
  );

  const created = await ctx.assessmentsService.create(createInput());
  assert.equal(created.status, 'DRAFT');
  assert.equal(created.maxScore, 100);
  assert.equal(created.weight, null);
  assert.equal(ctx.audit.records.at(-1).action, 'assessment.created');
});

test('maxScore and weight are validated and rounded to two decimals', async () => {
  const ctx = build();

  // maxScore is the denominator: a non-positive value is meaningless.
  await assert.rejects(
    () => ctx.assessmentsService.create(createInput({ maxScore: 0 })),
    BadRequestException,
  );
  await assert.rejects(
    () => ctx.assessmentsService.create(createInput({ maxScore: -10 })),
    BadRequestException,
  );

  // A weight is optional, but a present one must be positive.
  await assert.rejects(
    () => ctx.assessmentsService.create(createInput({ weight: 0 })),
    BadRequestException,
  );

  const weighted = await ctx.assessmentsService.create(
    createInput({ maxScore: 33.333, weight: 12.5 }),
  );
  assert.equal(weighted.maxScore, 33.33);
  assert.equal(weighted.weight, 12.5);

  // A missing weight means "not yet weighted", not zero.
  const unweighted = await ctx.assessmentsService.create(createInput());
  assert.equal(unweighted.weight, null);
});

test('the availability window must be ordered', async () => {
  const ctx = build();

  await assert.rejects(
    () =>
      ctx.assessmentsService.create(
        createInput({
          availableFrom: '2026-10-10T08:00:00.000Z',
          availableUntil: '2026-10-09T08:00:00.000Z',
        }),
      ),
    BadRequestException,
  );

  const ok = await ctx.assessmentsService.create(
    createInput({
      availableFrom: '2026-10-09T08:00:00.000Z',
      availableUntil: '2026-10-10T08:00:00.000Z',
    }),
  );
  assert.equal(ok.availableFrom, '2026-10-09T08:00:00.000Z');

  // Moving only one edge must still respect the stored other edge.
  await assert.rejects(
    () =>
      ctx.assessmentsService.update(ok.id, {
        availableFrom: '2026-10-11T08:00:00.000Z',
      }),
    BadRequestException,
  );
});

test('a published assessment is protected from destructive mutation', async () => {
  const ctx = build();
  const created = await ctx.assessmentsService.create(createInput());

  await ctx.assessmentsService.changeStatus(created.id, {
    status: 'PUBLISHED',
  });

  // Participants have already been measured against these numbers.
  await assert.rejects(
    () => ctx.assessmentsService.update(created.id, { maxScore: 50 }),
    UnprocessableEntityException,
  );
  await assert.rejects(
    () => ctx.assessmentsService.update(created.id, { weight: 40 }),
    UnprocessableEntityException,
  );

  // Rewording is not destructive and stays allowed.
  const renamed = await ctx.assessmentsService.update(created.id, {
    title: 'Kuis 1 (revisi judul)',
  });
  assert.equal(renamed.title, 'Kuis 1 (revisi judul)');
  assert.equal(renamed.maxScore, 100);

  // Idempotent writes of the same number are not a change.
  const same = await ctx.assessmentsService.update(created.id, {
    maxScore: 100,
  });
  assert.equal(same.maxScore, 100);

  // Lifecycle moves that do not destroy information stay available.
  const closed = await ctx.assessmentsService.changeStatus(created.id, {
    status: 'CLOSED',
  });
  assert.equal(closed.status, 'CLOSED');

  // Closing is one-way: results already exist against the frozen numbers.
  await assert.rejects(
    () => ctx.assessmentsService.changeStatus(created.id, { status: 'DRAFT' }),
    UnprocessableEntityException,
  );

  const archived = await ctx.assessmentsService.changeStatus(created.id, {
    status: 'ARCHIVED',
  });
  assert.equal(archived.status, 'ARCHIVED');
  assert.equal(ctx.audit.records.at(-1).action, 'assessment.status_changed');
});

test('a draft can be unpublished back from PUBLISHED without losing data', async () => {
  const ctx = build();
  const created = await ctx.assessmentsService.create(createInput());

  await ctx.assessmentsService.changeStatus(created.id, {
    status: 'PUBLISHED',
  });
  const back = await ctx.assessmentsService.changeStatus(created.id, {
    status: 'DRAFT',
  });
  assert.equal(back.status, 'DRAFT');

  // Once back in DRAFT the denominator is editable again.
  const fixed = await ctx.assessmentsService.update(created.id, {
    maxScore: 80,
  });
  assert.equal(fixed.maxScore, 80);
});

test('a same-status request is an idempotent no-op and illegal edges are refused', async () => {
  const ctx = build();
  const created = await ctx.assessmentsService.create(createInput());

  // A retried publish must not look like a transition or write an audit entry.
  const auditCount = ctx.audit.records.length;
  const noop = await ctx.assessmentsService.changeStatus(created.id, {
    status: 'DRAFT',
  });
  assert.equal(noop.status, 'DRAFT');
  assert.equal(ctx.audit.records.length, auditCount);

  // DRAFT may only go to PUBLISHED or ARCHIVED.
  await assert.rejects(
    () => ctx.assessmentsService.changeStatus(created.id, { status: 'CLOSED' }),
    UnprocessableEntityException,
  );

  const archived = await ctx.assessmentsService.changeStatus(created.id, {
    status: 'ARCHIVED',
  });
  assert.equal(archived.status, 'ARCHIVED');
  await assert.rejects(
    () =>
      ctx.assessmentsService.changeStatus(created.id, { status: 'PUBLISHED' }),
    UnprocessableEntityException,
  );
});

test('publishing is refused when the class subject is no longer active', async () => {
  const ctx = build();
  const created = await ctx.assessmentsService.create(
    createInput({ classSubjectId: CLASS_SUBJECT_ARCHIVED }),
  );

  await assert.rejects(
    () =>
      ctx.assessmentsService.changeStatus(created.id, { status: 'PUBLISHED' }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    () =>
      ctx.assessmentsService.create(
        createInput({
          classSubjectId: CLASS_SUBJECT_ARCHIVED,
          status: 'PUBLISHED',
        }),
      ),
    UnprocessableEntityException,
  );
});

test('the update path applies the same guards as the status endpoint', async () => {
  const ctx = build();
  const created = await ctx.assessmentsService.create(createInput());

  const published = await ctx.assessmentsService.update(created.id, {
    status: 'PUBLISHED',
  });
  assert.equal(published.status, 'PUBLISHED');

  // A swap to an inactive type is refused even through the generic update.
  await assert.rejects(
    () =>
      ctx.assessmentsService.update(created.id, {
        assessmentTypeId: INACTIVE_TYPE,
      }),
    UnprocessableEntityException,
  );

  // PUBLISHED -> CLOSED is a legal edge, so the generic update allows it...
  const closed = await ctx.assessmentsService.update(created.id, {
    status: 'CLOSED',
  });
  assert.equal(closed.status, 'CLOSED');

  // ...but CLOSED -> DRAFT is not, and is refused with the same guard.
  await assert.rejects(
    () => ctx.assessmentsService.update(created.id, { status: 'DRAFT' }),
    UnprocessableEntityException,
  );
});

test('assessments are listed per class subject and filterable', async () => {
  const ctx = build();

  const first = await ctx.assessmentsService.create(
    createInput({ title: 'Kuis 1' }),
  );
  await ctx.assessmentsService.create(createInput({ title: 'Kuis 2' }));
  await ctx.assessmentsService.create(
    createInput({
      title: 'Tugas 1',
      classSubjectId: CLASS_SUBJECT_ARCHIVED,
    }),
  );
  await ctx.assessmentsService.changeStatus(first.id, { status: 'PUBLISHED' });

  const byClassSubject = await ctx.assessmentsService.list({
    classSubjectId: CLASS_SUBJECT_1,
  });
  assert.equal(byClassSubject.total, 2);

  const published = await ctx.assessmentsService.list({
    classSubjectId: CLASS_SUBJECT_1,
    status: 'PUBLISHED',
  });
  assert.deepEqual(
    published.data.map((row) => row.title),
    ['Kuis 1'],
  );

  const searched = await ctx.assessmentsService.list({
    classSubjectId: CLASS_SUBJECT_1,
    search: 'kuis 2',
  });
  assert.equal(searched.total, 1);

  const byClass = await ctx.assessmentsService.list({
    academicClassId: '66666666-6666-4666-8666-000000000001',
  });
  assert.equal(byClass.total, 3);

  const bySubject = await ctx.assessmentsService.list({
    curriculumSubjectId: '44444444-4444-4444-8444-000000000002',
  });
  assert.deepEqual(
    bySubject.data.map((row) => row.title),
    ['Tugas 1'],
  );
});

test('assessment metadata is stored as free-form JSON and defaults to null', async () => {
  const ctx = build();

  const plain = await ctx.assessmentsService.create(createInput());
  assert.equal(plain.metadata, null);

  const tagged = await ctx.assessmentsService.create(
    createInput({ metadata: { blueprintId: 'bp-1', tags: ['hukum'] } }),
  );
  assert.deepEqual(tagged.metadata, {
    blueprintId: 'bp-1',
    tags: ['hukum'],
  });
});

test('assessment endpoints are exposed in OpenAPI under api v1 and fail closed', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/assessment-types'].post);
    assert.ok(spec.paths['/api/v1/assessment-types'].get);
    assert.ok(spec.paths['/api/v1/assessment-types/{id}'].get);
    assert.ok(spec.paths['/api/v1/assessment-types/{id}'].patch);

    assert.ok(spec.paths['/api/v1/assessments'].post);
    assert.ok(spec.paths['/api/v1/assessments'].get);
    assert.ok(spec.paths['/api/v1/assessments/{id}'].get);
    assert.ok(spec.paths['/api/v1/assessments/{id}'].patch);
    assert.ok(spec.paths['/api/v1/assessments/{id}/status'].patch);

    // A route with a permission requirement must never answer anonymously.
    const anonymous = await fetch(`${base}/api/v1/assessments`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});
