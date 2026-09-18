const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');
const {
  ClassSubjectsService,
} = require('../dist/class-subjects/class-subjects.service');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

const CLASS_A = '22222222-2222-4000-8000-000000000001';
const CLASS_B = '22222222-2222-4000-8000-000000000002';
const BATCH_1 = '11111111-1111-4000-8000-000000000001';
const BATCH_2 = '11111111-1111-4000-8000-000000000002';
const CURRICULUM_1 = '33333333-3333-4000-8000-000000000001';
const CURRICULUM_2 = '33333333-3333-4000-8000-000000000002';
const CS_1 = '44444444-4444-4000-8000-000000000001';
const CS_2 = '44444444-4444-4000-8000-000000000002';

class MemoryClassSubjectsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.classes = new Map([
      [
        CLASS_A,
        { id: CLASS_A, educationBatchId: BATCH_1, curriculumId: CURRICULUM_1 },
      ],
      [
        CLASS_B,
        { id: CLASS_B, educationBatchId: BATCH_2, curriculumId: CURRICULUM_2 },
      ],
    ]);
    this.curriculumSubjects = new Map([
      [CS_1, { id: CS_1, curriculumId: CURRICULUM_1 }],
      [CS_2, { id: CS_2, curriculumId: CURRICULUM_2 }],
    ]);
  }

  async create(data) {
    const record = {
      id: `55555555-5555-4000-8000-${String(this.next++).padStart(12, '0')}`,
      academicClassId: data.academicClassId,
      curriculumSubjectId: data.curriculumSubjectId,
      code: data.code ?? null,
      displayName: data.displayName ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-20T00:00:00.000Z'),
      updatedAt: new Date('2026-09-20T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByClassAndCurriculumSubject(academicClassId, curriculumSubjectId) {
    return (
      this.records.find(
        (record) =>
          record.academicClassId === academicClassId &&
          record.curriculumSubjectId === curriculumSubjectId,
      ) ?? null
    );
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.academicClassId) {
      filtered = filtered.filter(
        (r) => r.academicClassId === filter.academicClassId,
      );
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error('Not found');
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.records[index];
  }

  async findClassContext(academicClassId) {
    return this.classes.get(academicClassId) ?? null;
  }

  async findCurriculumSubjectContext(curriculumSubjectId) {
    return this.curriculumSubjects.get(curriculumSubjectId) ?? null;
  }
}

test('ClassSubjectsService - rejects cross-curriculum mapping', async () => {
  const repo = new MemoryClassSubjectsRepository();
  const service = new ClassSubjectsService(repo, new FakeAuditService());

  await assert.rejects(
    () =>
      service.create({
        academicClassId: CLASS_A,
        curriculumSubjectId: CS_2,
      }),
    BadRequestException,
  );

  // A subject from the batch curriculum is accepted.
  const ok = await service.create({
    academicClassId: CLASS_A,
    curriculumSubjectId: CS_1,
  });
  assert.equal(ok.curriculumSubjectId, CS_1);
});

test('ClassSubjectsService - rejects unknown class or curriculum subject', async () => {
  const repo = new MemoryClassSubjectsRepository();
  const service = new ClassSubjectsService(repo, new FakeAuditService());

  await assert.rejects(
    () =>
      service.create({
        academicClassId: '99999999-9999-4999-8999-999999999999',
        curriculumSubjectId: CS_1,
      }),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      service.create({
        academicClassId: CLASS_A,
        curriculumSubjectId: '99999999-9999-4999-8999-999999999999',
      }),
    NotFoundException,
  );
});

test('ClassSubjectsService - enforces unique delivery and date range, records audit', async () => {
  const repo = new MemoryClassSubjectsRepository();
  const audit = new FakeAuditService();
  const service = new ClassSubjectsService(repo, audit);

  const created = await service.create({
    academicClassId: CLASS_A,
    curriculumSubjectId: CS_1,
    code: 'KLS-A-HUKUM',
    displayName: 'Hukum Pidana (Kelas A)',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
  });

  assert.equal(created.code, 'KLS-A-HUKUM');
  assert.equal(created.startDate, '2026-10-01');
  assert.equal(created.endDate, '2026-12-31');
  assert.equal(audit.records.length, 1);
  assert.equal(audit.records[0].action, 'class_subject.created');

  // Duplicate delivery for the same class + curriculum subject is rejected.
  await assert.rejects(
    () =>
      service.create({
        academicClassId: CLASS_A,
        curriculumSubjectId: CS_1,
      }),
    ConflictException,
  );

  // startDate after endDate is rejected.
  await assert.rejects(
    () =>
      service.create({
        academicClassId: CLASS_B,
        curriculumSubjectId: CS_2,
        startDate: '2026-12-31',
        endDate: '2026-10-01',
      }),
    BadRequestException,
  );

  // Update keeps the date range valid.
  await assert.rejects(
    () => service.update(created.id, { endDate: '2026-09-01' }),
    BadRequestException,
  );

  const updated = await service.update(created.id, { status: 'COMPLETED' });
  assert.equal(updated.status, 'COMPLETED');
  assert.equal(audit.records.length, 2);
  assert.equal(audit.records[1].action, 'class_subject.updated');
});
