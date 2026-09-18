const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConflictException, NotFoundException } = require('@nestjs/common');
const {
  SubjectsService,
} = require('../dist/curriculum-subjects/subjects.service');
const {
  CurriculaService,
} = require('../dist/curriculum-subjects/curricula.service');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

class MemorySubjectsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
      ...data,
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
    const search = filter.search?.toLowerCase();
    const filtered = this.records
      .filter((record) => !filter.status || record.status === filter.status)
      .filter(
        (record) =>
          !search ||
          record.code.toLowerCase().includes(search) ||
          record.name.toLowerCase().includes(search),
      )
      .sort((left, right) => left.code.localeCompare(right.code));
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error('record missing');
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date('2026-09-16T01:00:00.000Z'),
    };
    return this.records[index];
  }
}

class MemoryCurriculaRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      educationProgramId: data.educationProgramId,
      version: data.version,
      name: data.name,
      effectiveFrom: data.effectiveFrom ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
      ...data,
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByProgramAndVersion(educationProgramId, version) {
    return (
      this.records.find(
        (record) =>
          record.educationProgramId === educationProgramId &&
          record.version === version,
      ) ?? null
    );
  }

  async list(filter) {
    const filtered = this.records.filter(
      (record) =>
        (!filter.educationProgramId ||
          record.educationProgramId === filter.educationProgramId) &&
        (!filter.status || record.status === filter.status),
    );
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error('record missing');
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date('2026-09-16T01:00:00.000Z'),
    };
    return this.records[index];
  }
}

function createSubjectService() {
  const repository = new MemorySubjectsRepository();
  const audit = new FakeAuditService();
  return {
    repository,
    audit,
    service: new SubjectsService(repository, audit),
  };
}

function createCurriculumService() {
  const repository = new MemoryCurriculaRepository();
  const audit = new FakeAuditService();
  return {
    repository,
    audit,
    service: new CurriculaService(repository, audit),
  };
}

test('subject creates normalizes code and supports list/search', async () => {
  const { service } = createSubjectService();
  const created = await service.create({
    code: '  math  ',
    name: 'Matematika',
  });
  assert.equal(created.code, 'MATH');

  const list = await service.list({ search: 'mat', page: 1, limit: 10 });
  assert.equal(list.total, 1);
  assert.equal(list.data[0].name, 'Matematika');
});

test('subject rejects duplicate code and missing id', async () => {
  const { service } = createSubjectService();
  await service.create({ code: 'BIO', name: 'Biologi' });

  await assert.rejects(
    service.create({ code: 'bio', name: 'Biologi lain' }),
    ConflictException,
  );

  await assert.rejects(
    service.findOne('00000000-0000-4000-8000-000000000999'),
    NotFoundException,
  );
});

test('curriculum reserves unique version per program and records audit', async () => {
  const { service, audit } = createCurriculumService();
  const programId = '00000000-0000-4000-8000-000000000010';

  const created = await service.create({
    educationProgramId: programId,
    version: 'v1',
    name: 'Curriculum 2026',
  });

  await assert.rejects(
    service.create({
      educationProgramId: programId,
      version: 'V1',
      name: 'Duplicate version',
    }),
    ConflictException,
  );

  await service.update(created.id, { name: 'Curriculum 2026 revised' });
  assert.equal(audit.records.length, 2);
  assert.equal(audit.records[1].action, 'curriculum.updated');
});

test('curriculum reject updates when version is invalid and list filters by program', async () => {
  const { service } = createCurriculumService();
  const programA = '00000000-0000-4000-8000-000000000020';
  const programB = '00000000-0000-4000-8000-000000000021';

  await service.create({
    educationProgramId: programA,
    version: '2026.1',
    name: 'A1',
  });
  await service.create({
    educationProgramId: programB,
    version: '2026.1',
    name: 'B1',
  });

  const list = await service.list({
    educationProgramId: programA,
    page: 1,
    limit: 10,
  });
  assert.equal(list.total, 1);
  assert.equal(list.data[0].name, 'A1');
});
