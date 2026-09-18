const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConflictException, NotFoundException } = require('@nestjs/common');
const {
  EducationProgramsService,
} = require('../dist/education-programs/education-programs.service');

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
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      organizationId: data.organizationId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
      metadata: data.metadata ?? null,
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

  async findByOrganizationAndCode(organizationId, code) {
    return (
      this.records.find(
        (record) =>
          record.organizationId === organizationId && record.code === code,
      ) ?? null
    );
  }

  async list(filter) {
    const search = filter.search?.toLowerCase();
    const filtered = this.records
      .filter(
        (record) =>
          (!filter.organizationId ||
            record.organizationId === filter.organizationId) &&
          (!filter.status || record.status === filter.status),
      )
      .filter(
        (record) =>
          !search ||
          record.code.toLowerCase().includes(search) ||
          record.name.toLowerCase().includes(search) ||
          (record.description ?? '').toLowerCase().includes(search),
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

function createService() {
  const repository = new MemoryEducationProgramsRepository();
  const audit = new FakeAuditService();
  return {
    repository,
    audit,
    service: new EducationProgramsService(repository, audit),
  };
}

test('education program creates normalized codes and paginated search', async () => {
  const { service } = createService();
  const orgId = '00000000-0000-4000-8000-000000000010';

  const created = await service.create({
    organizationId: orgId,
    code: '  p4  ',
    name: 'Program Pendidikan 4',
    description: 'Deskripsi program',
  });

  assert.equal(created.code, 'P4');
  assert.equal(created.organizationId, orgId);

  const list = await service.list({
    organizationId: orgId,
    search: 'pendidikan',
    page: 1,
    limit: 10,
  });
  assert.equal(list.total, 1);
  assert.equal(list.data[0].name, 'Program Pendidikan 4');
});

test('education program prevents duplicate codes in the same organization', async () => {
  const { service } = createService();
  const orgId = '00000000-0000-4000-8000-000000000020';

  await service.create({
    organizationId: orgId,
    code: 'P1',
    name: 'Program 1',
  });

  await assert.rejects(
    service.create({
      organizationId: orgId,
      code: 'p1',
      name: 'Program duplicate',
    }),
    ConflictException,
  );
});

test('education program records audit entries for create and update', async () => {
  const { service, audit } = createService();
  const orgId = '00000000-0000-4000-8000-000000000030';

  const created = await service.create({
    organizationId: orgId,
    code: 'P1',
    name: 'Initial Program',
  });

  await service.update(created.id, {
    name: 'Updated Program',
  });

  assert.equal(audit.records.length, 2);
  assert.equal(audit.records[0].action, 'education_program.created');
  assert.equal(audit.records[1].action, 'education_program.updated');
});

test('education program throws not found for missing id', async () => {
  const { service } = createService();

  await assert.rejects(
    service.findOne('00000000-0000-4000-8000-000000000999'),
    NotFoundException,
  );
});
