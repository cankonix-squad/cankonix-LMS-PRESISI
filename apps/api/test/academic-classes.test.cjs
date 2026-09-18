const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ConflictException,
  BadRequestException,
  NotFoundException,
} = require('@nestjs/common');
const {
  AcademicClassesService,
} = require('../dist/academic-classes/academic-classes.service');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

class MemoryEducationBatchesRepository {
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
        `11111111-1111-4000-8000-${String(this.records.length + 1).padStart(12, '0')}`,
      educationProgramId:
        data.educationProgramId ?? '00000000-0000-4000-8000-000000000001',
      curriculumId: data.curriculumId ?? '00000000-0000-4000-8000-000000000002',
      code: data.code ?? 'BATCH-01',
      name: data.name ?? 'Angkatan 1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      status: data.status ?? 'ACTIVE',
      capacity: data.capacity ?? null,
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }
}

class MemoryAcademicClassesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  create(data) {
    const record = {
      id: `22222222-2222-4000-8000-${String(this.next++).padStart(12, '0')}`,
      educationBatchId: data.educationBatchId,
      code: data.code,
      name: data.name,
      capacity: data.capacity ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-19T00:00:00.000Z'),
      updatedAt: new Date('2026-09-19T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByBatchAndCode(educationBatchId, code) {
    return (
      this.records.find(
        (record) =>
          record.educationBatchId === educationBatchId && record.code === code,
      ) ?? null
    );
  }

  async findMany(filter) {
    let filtered = [...this.records];
    if (filter.educationBatchId) {
      filtered = filtered.filter(
        (r) => r.educationBatchId === filter.educationBatchId,
      );
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.code.toLowerCase().includes(searchLower) ||
          r.name.toLowerCase().includes(searchLower),
      );
    }
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return { data, total: filtered.length };
  }

  async update(id, data) {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Not found');
    const existing = this.records[index];
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.records[index] = updated;
    return updated;
  }
}

test('AcademicClassesService - creates class, prevents duplicates, validates capacity and audit log', async () => {
  const classesRepo = new MemoryAcademicClassesRepository();
  const batchesRepo = new MemoryEducationBatchesRepository();
  const auditService = new FakeAuditService();

  const batch = batchesRepo.create({
    id: '11111111-1111-4000-8000-000000000001',
    code: 'BATCH-01',
  });

  const service = new AcademicClassesService(
    classesRepo,
    batchesRepo,
    auditService,
  );

  // 1. Create class successfully
  const created = await service.create({
    educationBatchId: batch.id,
    code: 'kls-a',
    name: 'Kelas A Reserse',
    capacity: 30,
  });

  assert.equal(created.code, 'KLS-A');
  assert.equal(created.name, 'Kelas A Reserse');
  assert.equal(created.capacity, 30);
  assert.equal(created.status, 'ACTIVE');

  // Verify audit log
  assert.equal(auditService.records.length, 1);
  assert.equal(auditService.records[0].action, 'academic_class.created');
  assert.equal(auditService.records[0].resourceId, created.id);

  // 2. Reject duplicate code in same batch
  await assert.rejects(
    () =>
      service.create({
        educationBatchId: batch.id,
        code: 'KLS-A',
        name: 'Kelas A Duplikat',
      }),
    ConflictException,
  );

  // 3. Reject negative capacity
  await assert.rejects(
    () =>
      service.create({
        educationBatchId: batch.id,
        code: 'KLS-B',
        name: 'Kelas B',
        capacity: -5,
      }),
    BadRequestException,
  );

  // 4. Reject non-existent batch
  await assert.rejects(
    () =>
      service.create({
        educationBatchId: '99999999-9999-9999-9999-999999999999',
        code: 'KLS-C',
        name: 'Kelas C',
      }),
    NotFoundException,
  );
});

test('AcademicClassesService - updates class, handles duplicate check on code update and negative capacity', async () => {
  const classesRepo = new MemoryAcademicClassesRepository();
  const batchesRepo = new MemoryEducationBatchesRepository();
  const auditService = new FakeAuditService();

  const batch = batchesRepo.create({
    id: '11111111-1111-4000-8000-000000000001',
  });

  const service = new AcademicClassesService(
    classesRepo,
    batchesRepo,
    auditService,
  );

  const c1 = await service.create({
    educationBatchId: batch.id,
    code: 'KLS-A',
    name: 'Kelas A',
  });

  await service.create({
    educationBatchId: batch.id,
    code: 'KLS-B',
    name: 'Kelas B',
  });

  // Update c1 name & capacity
  const updated = await service.update(c1.id, {
    name: 'Kelas A Baru',
    capacity: 25,
  });
  assert.equal(updated.name, 'Kelas A Baru');
  assert.equal(updated.capacity, 25);

  // Reject duplicate code change
  await assert.rejects(
    () =>
      service.update(c1.id, {
        code: 'KLS-B',
      }),
    ConflictException,
  );

  // Reject negative capacity on update
  await assert.rejects(
    () =>
      service.update(c1.id, {
        capacity: -10,
      }),
    BadRequestException,
  );
});
