const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ConflictException,
  BadRequestException,
  NotFoundException,
} = require('@nestjs/common');
const {
  EducationBatchesService,
} = require('../dist/education-batches/education-batches.service');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

class MemoryEducationProgramsRepository {
  constructor() {
    this.records = [];
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  create(data) {
    const record = {
      id:
        data.id ??
        `00000000-0000-4000-8000-${String(this.records.length + 1).padStart(12, '0')}`,
      organizationId: data.organizationId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
      metadata: data.metadata ?? null,
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }
}

class MemoryCurriculaRepository {
  constructor() {
    this.records = [];
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByProgramAndVersion(educationProgramId, version) {
    return this.records.find(
      (record) =>
        record.educationProgramId === educationProgramId &&
        record.version === version,
    );
  }

  create(data) {
    const record = {
      id:
        data.id ??
        `00000000-0000-4000-8000-${String(this.records.length + 1).padStart(12, '0')}`,
      educationProgramId: data.educationProgramId,
      version: data.version,
      name: data.name,
      effectiveFrom: data.effectiveFrom ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }
}

class MemoryEducationBatchesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  create(data) {
    const record = {
      id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      educationProgramId: data.educationProgramId,
      curriculumId: data.curriculumId,
      code: data.code,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status ?? 'ACTIVE',
      capacity: data.capacity ?? null,
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByProgramAndCode(educationProgramId, code) {
    return (
      this.records.find(
        (record) =>
          record.educationProgramId === educationProgramId &&
          record.code === code,
      ) ?? null
    );
  }

  async list(filter) {
    const filtered = this.records.filter(
      (record) =>
        (!filter.educationProgramId ||
          record.educationProgramId === filter.educationProgramId) &&
        (!filter.curriculumId || record.curriculumId === filter.curriculumId) &&
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

function createService() {
  const programs = new MemoryEducationProgramsRepository();
  const curricula = new MemoryCurriculaRepository();
  const batches = new MemoryEducationBatchesRepository();
  const audit = new FakeAuditService();
  return {
    programs,
    curricula,
    batches,
    audit,
    service: new EducationBatchesService(batches, programs, curricula, audit),
  };
}

test('batch validates curriculum ownership and date range', async () => {
  const { service, programs, curricula } = createService();
  const programId = '00000000-0000-4000-8000-000000000010';
  const otherProgramId = '00000000-0000-4000-8000-000000000011';

  programs.create({
    id: programId,
    organizationId: '00000000-0000-4000-8000-000000000100',
    code: 'P1',
    name: 'Program A',
  });

  const curriculumId = '00000000-0000-4000-8000-000000000030';
  curricula.create({
    id: curriculumId,
    educationProgramId: programId,
    version: '2026.1',
    name: 'Kurikulum 2026',
  });

  await assert.rejects(
    service.create({
      educationProgramId: programId,
      curriculumId: '00000000-0000-4000-8000-000000000999',
      code: 'B1',
      name: 'Batch 1',
      startDate: '2026-08-01',
      endDate: '2026-07-31',
    }),
    BadRequestException,
  );

  await assert.rejects(
    service.create({
      educationProgramId: programId,
      curriculumId: curriculumId,
      code: 'B1',
      name: 'Batch 1',
      startDate: '2026-08-01',
      endDate: '2026-07-31',
    }),
    BadRequestException,
  );

  await assert.rejects(
    service.create({
      educationProgramId: programId,
      curriculumId: otherProgramId,
      code: 'B2',
      name: 'Batch 2',
      startDate: '2026-08-01',
      endDate: '2026-09-30',
    }),
    ConflictException,
  );
});

test('batch enforces unique code per program and records audit', async () => {
  const { service, programs, curricula, audit } = createService();
  const programId = '00000000-0000-4000-8000-000000000020';

  programs.create({
    id: programId,
    organizationId: '00000000-0000-4000-8000-000000000200',
    code: 'P2',
    name: 'Program B',
  });

  const curriculumId = '00000000-0000-4000-8000-000000000040';
  curricula.create({
    id: curriculumId,
    educationProgramId: programId,
    version: '2026.2',
    name: 'Kurikulum 2026',
  });

  const created = await service.create({
    educationProgramId: programId,
    curriculumId,
    code: '2026A',
    name: 'Angkatan 2026A',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
  });

  await assert.rejects(
    service.create({
      educationProgramId: programId,
      curriculumId,
      code: '2026a',
      name: 'Duplicate batch',
      startDate: '2026-09-01',
      endDate: '2027-01-31',
    }),
    ConflictException,
  );

  await service.update(created.id, { status: 'INACTIVE' });
  assert.equal(audit.records.length, 2);
  assert.equal(audit.records[1].action, 'education_batch.updated');
});

test('batch not found throws and list filters by program', async () => {
  const { service, programs, curricula } = createService();
  const programId = '00000000-0000-4000-8000-000000000030';

  programs.create({
    id: programId,
    organizationId: '00000000-0000-4000-8000-000000000300',
    code: 'P3',
    name: 'Program C',
  });

  const curriculumId = '00000000-0000-4000-8000-000000000050';
  curricula.create({
    id: curriculumId,
    educationProgramId: programId,
    version: '2026.3',
    name: 'Kurikulum 2026 C',
  });

  await service.create({
    educationProgramId: programId,
    curriculumId,
    code: '2026C',
    name: 'Angkatan C',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
  });

  await assert.rejects(
    service.findOne('00000000-0000-4000-8000-000000001000'),
    NotFoundException,
  );

  const list = await service.list({
    educationProgramId: programId,
    page: 1,
    limit: 10,
  });
  assert.equal(list.total, 1);
  assert.equal(list.data[0].name, 'Angkatan C');
});
