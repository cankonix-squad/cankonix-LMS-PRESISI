const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');
const { createApp } = require('../dist/app');
const {
  OrganizationStatusDto,
} = require('../dist/organizations/dto/organization-status.dto');
const {
  OrganizationsService,
} = require('../dist/organizations/organizations.service');

class MemoryOrganizationsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const now = new Date('2026-09-16T00:00:00.000Z');
    const record = {
      id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      parentId: null,
      organizationType: null,
      status: OrganizationStatusDto.ACTIVE,
      metadata: null,
      createdAt: now,
      updatedAt: now,
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
    const data = this.records
      .filter((record) => !filter.status || record.status === filter.status)
      .filter(
        (record) => !filter.parentId || record.parentId === filter.parentId,
      )
      .filter(
        (record) =>
          !search ||
          record.code.toLowerCase().includes(search) ||
          record.name.toLowerCase().includes(search),
      )
      .sort((left, right) => left.code.localeCompare(right.code));
    const start = (filter.page - 1) * filter.limit;
    return {
      data: data.slice(start, start + filter.limit),
      total: data.length,
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

  async findChildren(parentId) {
    return this.records
      .filter((record) => record.parentId === parentId)
      .sort((left, right) => left.code.localeCompare(right.code));
  }
}

function createService() {
  const repository = new MemoryOrganizationsRepository();
  return { repository, service: new OrganizationsService(repository) };
}

test('organization service creates normalized codes and paginated searchable list', async () => {
  const { service } = createService();
  const root = await service.create({ code: ' lemdiklat ', name: 'Lemdiklat' });
  await service.create({
    code: 'polda-a',
    name: 'Polda A',
    parentId: root.id,
    organizationType: 'regional',
  });

  assert.equal(root.code, 'LEMDIKLAT');
  const list = await service.list({ search: 'polda', page: 1, limit: 10 });
  assert.equal(list.total, 1);
  assert.equal(list.data[0].code, 'POLDA-A');
});

test('organization service rejects duplicate code and invalid parent', async () => {
  const { service } = createService();
  await service.create({ code: 'LEMDIKLAT', name: 'Lemdiklat' });

  await assert.rejects(
    service.create({ code: ' lemdiklat ', name: 'Duplicate' }),
    ConflictException,
  );
  await assert.rejects(
    service.create({
      code: 'CHILD',
      name: 'Child',
      parentId: '00000000-0000-4000-8000-000000000999',
    }),
    NotFoundException,
  );
});

test('organization service rejects self-parent and indirect hierarchy cycle', async () => {
  const { service } = createService();
  const root = await service.create({ code: 'ROOT', name: 'Root' });
  const child = await service.create({
    code: 'CHILD',
    name: 'Child',
    parentId: root.id,
  });
  const grandchild = await service.create({
    code: 'GRANDCHILD',
    name: 'Grandchild',
    parentId: child.id,
  });

  await assert.rejects(
    service.update(root.id, { parentId: root.id }),
    BadRequestException,
  );
  await assert.rejects(
    service.update(root.id, { parentId: grandchild.id }),
    BadRequestException,
  );
});

test('organization service returns children, tree, and descendant ids', async () => {
  const { service } = createService();
  const root = await service.create({ code: 'ROOT', name: 'Root' });
  const child = await service.create({
    code: 'CHILD',
    name: 'Child',
    parentId: root.id,
  });
  const grandchild = await service.create({
    code: 'GRANDCHILD',
    name: 'Grandchild',
    parentId: child.id,
  });

  assert.deepEqual(
    (await service.children(root.id)).map((item) => item.id),
    [child.id],
  );
  const tree = await service.tree(root.id);
  assert.equal(tree.children[0].children[0].id, grandchild.id);
  assert.deepEqual(await service.getDescendantIds(root.id), [
    child.id,
    grandchild.id,
  ]);
});

test('organization endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/organizations'].post);
    assert.ok(spec.paths['/api/v1/organizations'].get);
    assert.ok(spec.paths['/api/v1/organizations/{id}'].get);
    assert.ok(spec.paths['/api/v1/organizations/{id}'].patch);
    assert.ok(spec.paths['/api/v1/organizations/{id}/children'].get);
    assert.ok(spec.paths['/api/v1/organizations/{id}/tree'].get);
  } finally {
    await app.close();
  }
});
