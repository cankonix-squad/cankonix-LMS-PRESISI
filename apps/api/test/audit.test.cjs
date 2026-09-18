const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotFoundException } = require('@nestjs/common');
const { AuditService } = require('../dist/audit/audit.service');
const { AuditContextService } = require('../dist/audit/audit-context.service');
const {
  REDACTED_VALUE,
  redactAuditValue,
  isRedactedFieldName,
} = require('../dist/audit/audit-redaction');
const {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
} = require('../dist/audit/audit-actions');

const ACTOR_ID = '10000000-0000-4000-8000-000000000001';
const RESOURCE_ID = '20000000-0000-4000-8000-000000000001';
const ORG_ID = '30000000-0000-4000-8000-000000000001';

class MemoryAuditLogRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async append(data) {
    const record = {
      id: `40000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      actorUserAccountId: data.actorUserAccountId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      organizationId: data.organizationId,
      before: data.before ?? null,
      after: data.after ?? null,
      metadata: data.metadata ?? null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt:
        data.createdAt ??
        new Date(`2026-09-16T00:00:0${this.records.length}.000Z`),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async search(filter) {
    const search = filter.search?.toLowerCase();
    const data = this.records
      .filter(
        (record) =>
          !filter.actorUserAccountId ||
          record.actorUserAccountId === filter.actorUserAccountId,
      )
      .filter((record) => !filter.action || record.action === filter.action)
      .filter(
        (record) =>
          !filter.resourceType || record.resourceType === filter.resourceType,
      )
      .filter(
        (record) =>
          !filter.resourceId || record.resourceId === filter.resourceId,
      )
      .filter(
        (record) =>
          !filter.organizationId ||
          record.organizationId === filter.organizationId,
      )
      .filter((record) => !filter.from || record.createdAt >= filter.from)
      .filter((record) => !filter.to || record.createdAt <= filter.to)
      .filter(
        (record) =>
          !search ||
          record.action.toLowerCase().includes(search) ||
          record.resourceType.toLowerCase().includes(search) ||
          (record.resourceId ?? '').toLowerCase().includes(search),
      )
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.id.localeCompare(left.id),
      );
    const start = (filter.page - 1) * filter.limit;
    return {
      data: data.slice(start, start + filter.limit),
      total: data.length,
    };
  }
}

function buildAuditService() {
  const repository = new MemoryAuditLogRepository();
  const context = new AuditContextService();
  return {
    repository,
    context,
    service: new AuditService(repository, context),
  };
}

test('audit redaction masks secret-looking fields recursively before storage', () => {
  assert.equal(isRedactedFieldName('password'), true);
  assert.equal(isRedactedFieldName('api_key'), true);
  assert.equal(isRedactedFieldName('tokenType'), false);

  const redacted = redactAuditValue({
    username: 'admin',
    password: 'plain-text',
    nested: {
      access_token: 'jwt',
      tokenType: 'Bearer',
      values: [{ clientSecret: 'secret' }],
    },
  });

  assert.deepEqual(redacted, {
    username: 'admin',
    password: REDACTED_VALUE,
    nested: {
      access_token: REDACTED_VALUE,
      tokenType: 'Bearer',
      values: [{ clientSecret: REDACTED_VALUE }],
    },
  });
});

test('audit service appends redacted entry with actor and request provenance', async () => {
  const { repository, context, service } = buildAuditService();

  const created = await context.run(
    {
      actor: { userAccountId: ACTOR_ID },
      ipAddress: '10.0.0.10',
      userAgent: 'node-test',
    },
    () =>
      service.record({
        action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_CREATED,
        resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT,
        resourceId: RESOURCE_ID,
        organizationId: ORG_ID,
        before: null,
        after: { roleId: 'role-1', password: 'must-not-store' },
        metadata: { authorization: 'Bearer abc', reason: 'bootstrap' },
      }),
  );

  assert.equal(created.actorUserAccountId, ACTOR_ID);
  assert.equal(created.ipAddress, '10.0.0.10');
  assert.equal(created.userAgent, 'node-test');
  assert.equal(created.after.password, REDACTED_VALUE);
  assert.equal(created.metadata.authorization, REDACTED_VALUE);
  assert.equal(repository.records[0].after.password, REDACTED_VALUE);
});

test('audit search filters by actor, resource, action, date, and search term', async () => {
  const { repository, service } = buildAuditService();
  await repository.append({
    actorUserAccountId: ACTOR_ID,
    action: AUDIT_ACTIONS.ROLE_ASSIGNMENT_CREATED,
    resourceType: AUDIT_RESOURCE_TYPES.ROLE_ASSIGNMENT,
    resourceId: RESOURCE_ID,
    organizationId: ORG_ID,
    before: null,
    after: { roleId: 'role-1' },
    metadata: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2026-09-16T00:00:00.000Z'),
  });
  await repository.append({
    actorUserAccountId: null,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
    resourceType: AUDIT_RESOURCE_TYPES.ORGANIZATION,
    resourceId: ORG_ID,
    organizationId: ORG_ID,
    before: { secret: 'legacy-secret' },
    after: { code: 'LEMDIKLAT' },
    metadata: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2026-09-16T01:00:00.000Z'),
  });

  const byActor = await service.search({
    actorUserAccountId: ACTOR_ID,
    page: 1,
    limit: 20,
  });
  assert.equal(byActor.total, 1);
  assert.equal(byActor.data[0].resourceId, RESOURCE_ID);

  const byResourceAndDate = await service.search({
    resourceType: AUDIT_RESOURCE_TYPES.ORGANIZATION,
    resourceId: ORG_ID,
    from: '2026-09-16T00:30:00.000Z',
    to: '2026-09-16T01:30:00.000Z',
    search: 'organization',
    page: 1,
    limit: 20,
  });
  assert.equal(byResourceAndDate.total, 1);
  assert.equal(byResourceAndDate.data[0].before.secret, REDACTED_VALUE);
});

test('audit service has read-only lookup semantics', async () => {
  const { repository, service } = buildAuditService();
  assert.equal(typeof repository.append, 'function');
  assert.equal(repository.update, undefined);
  assert.equal(repository.delete, undefined);

  await assert.rejects(
    () => service.findOne('40000000-0000-4000-8000-000000000999'),
    NotFoundException,
  );
});
