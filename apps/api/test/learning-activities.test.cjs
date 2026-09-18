const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  LearningActivityTypesService,
} = require('../dist/learning-activity-types/learning-activity-types.service');
const {
  LearningActivitiesService,
} = require('../dist/learning-activities/learning-activities.service');
const {
  LearningContentsService,
} = require('../dist/learning-activities/learning-contents.service');
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

const MEETING_1 = '11111111-1111-4111-8111-000000000001';
const MEETING_2 = '11111111-1111-4111-8111-000000000002';
const CLASS_SUBJECT_1 = '55555555-5555-4000-8000-000000000001';

function nextId(prefix, counter) {
  return `${prefix}-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

class MemoryActivityTypesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.activityCounts = new Map();
  }

  async create(data) {
    const record = {
      id: nextId('aaaaaaa1', this.next++),
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      requiresContent: data.requiresContent,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-25T00:00:00.000Z'),
      updatedAt: new Date('2026-09-25T00:00:00.000Z'),
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

  async countActivities(activityTypeId) {
    return this.activityCounts.get(activityTypeId) ?? 0;
  }
}

class MemoryActivitiesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.contents = [];
    this.meetings = new Map([
      [
        MEETING_1,
        {
          id: MEETING_1,
          classSubjectId: CLASS_SUBJECT_1,
          sequence: 1,
          status: 'PUBLISHED',
        },
      ],
      [
        MEETING_2,
        {
          id: MEETING_2,
          classSubjectId: CLASS_SUBJECT_1,
          sequence: 2,
          status: 'ARCHIVED',
        },
      ],
    ]);
    this.types = new Map();
  }

  async create(data) {
    const record = {
      id: nextId('aaaaaaa2', this.next++),
      meetingId: data.meetingId,
      activityTypeId: data.activityTypeId,
      sequence: data.sequence,
      title: data.title,
      instructions: data.instructions ?? null,
      required: data.required ?? false,
      availableFrom: data.availableFrom ?? null,
      availableUntil: data.availableUntil ?? null,
      status: data.status ?? 'DRAFT',
      createdAt: new Date('2026-09-25T00:00:00.000Z'),
      updatedAt: new Date('2026-09-25T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.meetingId) {
      filtered = filtered.filter((r) => r.meetingId === filter.meetingId);
    }
    if (filter.activityTypeId) {
      filtered = filtered.filter(
        (r) => r.activityTypeId === filter.activityTypeId,
      );
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      filtered = filtered.filter((r) => r.title.toLowerCase().includes(needle));
    }
    filtered.sort((a, b) => a.sequence - b.sequence);
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

  async findMeetingContext(meetingId) {
    return this.meetings.get(meetingId) ?? null;
  }

  async findActivityTypeContext(activityTypeId) {
    return this.types.get(activityTypeId) ?? null;
  }

  async findBySequence(meetingId, sequence, excludeId) {
    const found =
      this.records.find(
        (record) =>
          record.meetingId === meetingId &&
          record.sequence === sequence &&
          (!excludeId || record.id !== excludeId),
      ) ?? null;
    return found
      ? {
          id: found.id,
          meetingId: found.meetingId,
          sequence: found.sequence,
          status: found.status,
        }
      : null;
  }

  async maxSequence(meetingId) {
    return this.records
      .filter((record) => record.meetingId === meetingId)
      .reduce((max, record) => Math.max(max, record.sequence), 0);
  }

  async listSequenceContexts(meetingId) {
    return this.records
      .filter((record) => record.meetingId === meetingId)
      .map((record) => ({
        id: record.id,
        meetingId: record.meetingId,
        sequence: record.sequence,
        status: record.status,
      }));
  }

  /**
   * Mirrors the SQL two-phase plan: park every activity on a temporary sequence
   * so a swap cannot collide with the unique index, then write the final values.
   */
  async applySequencePlan(meetingId, orderedActivityIds) {
    const TEMPORARY_SEQUENCE_OFFSET = 1_000_000;

    orderedActivityIds.forEach((id, index) => {
      const record = this.records.find((r) => r.id === id);
      record.sequence = TEMPORARY_SEQUENCE_OFFSET + index + 1;
    });

    return orderedActivityIds.map((id, index) => {
      const record = this.records.find((r) => r.id === id);
      record.sequence = index + 1;
      return record;
    });
  }

  async countPublishedContents(activityId) {
    return this.contents.filter(
      (c) => c.activityId === activityId && c.status === 'PUBLISHED',
    ).length;
  }

  async countContents(activityId) {
    return this.contents.filter((c) => c.activityId === activityId).length;
  }
}

class MemoryContentsRepository {
  constructor(activities) {
    this.activities = activities;
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: nextId('aaaaaaa3', this.next++),
      activityId: data.activityId,
      versionGroupId: data.versionGroupId,
      contentType: data.contentType,
      title: data.title,
      objectKey: data.objectKey ?? null,
      externalUrl: data.externalUrl ?? null,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      version: data.version ?? 1,
      status: data.status ?? 'DRAFT',
      createdAt: new Date('2026-09-25T00:00:00.000Z'),
      updatedAt: new Date('2026-09-25T00:00:00.000Z'),
    };
    this.records.push(record);
    this.activities.contents.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async list(filter) {
    let filtered = this.records.filter(
      (r) => r.activityId === filter.activityId,
    );
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    } else if (!filter.includeSuperseded) {
      filtered = filtered.filter((r) => r.status !== 'SUPERSEDED');
    }
    filtered.sort((a, b) => b.version - a.version);
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
    const shared = this.activities.contents.find((c) => c.id === id);
    if (shared) {
      Object.assign(shared, this.records[index]);
    }
    return this.records[index];
  }

  async findVersionState(versionGroupId) {
    const group = this.records.filter(
      (r) => r.versionGroupId === versionGroupId,
    );
    return {
      versionGroupId,
      maxVersion: group.reduce((max, r) => Math.max(max, r.version), 0),
      publishedCount: group.filter((r) => r.status === 'PUBLISHED').length,
    };
  }

  async findPublishedInGroup(versionGroupId) {
    return (
      this.records
        .filter(
          (r) =>
            r.versionGroupId === versionGroupId && r.status === 'PUBLISHED',
        )
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async supersedeAndCreate(supersededId, data) {
    const superseded = await this.update(supersededId, {
      status: 'SUPERSEDED',
    });
    const content = await this.create(data);
    return { content, superseded };
  }
}

function build() {
  const typesRepo = new MemoryActivityTypesRepository();
  const activitiesRepo = new MemoryActivitiesRepository();
  const contentsRepo = new MemoryContentsRepository(activitiesRepo);
  const audit = new FakeAuditService();

  const typesService = new LearningActivityTypesService(typesRepo, audit);
  const activitiesService = new LearningActivitiesService(
    activitiesRepo,
    audit,
  );
  const contentsService = new LearningContentsService(
    contentsRepo,
    activitiesRepo,
    audit,
  );

  return {
    typesRepo,
    activitiesRepo,
    contentsRepo,
    audit,
    typesService,
    activitiesService,
    contentsService,
  };
}

async function seedType(ctx, overrides = {}) {
  const type = await ctx.typesService.create({
    code: overrides.code ?? 'READING',
    name: overrides.name ?? 'Bacaan',
    requiresContent: overrides.requiresContent ?? true,
  });
  ctx.activitiesRepo.types.set(type.id, {
    id: type.id,
    code: type.code,
    requiresContent: type.requiresContent,
    status: type.status,
  });
  return type;
}

test('learning activity types are data-driven and carry the publish rule', async () => {
  const ctx = build();

  const reading = await ctx.typesService.create({
    code: 'reading',
    name: 'Bacaan',
  });
  assert.equal(reading.code, 'READING');
  assert.equal(reading.requiresContent, true);
  assert.equal(reading.status, 'ACTIVE');
  assert.equal(
    ctx.audit.records.at(-1).action,
    'learning_activity_type.created',
  );

  const discussion = await ctx.typesService.create({
    code: 'group discussion',
    name: 'Diskusi Kelompok',
    requiresContent: false,
  });
  assert.equal(discussion.code, 'GROUP_DISCUSSION');
  assert.equal(discussion.requiresContent, false);

  await assert.rejects(
    () => ctx.typesService.create({ code: 'reading', name: 'Duplikat' }),
    ConflictException,
  );

  const listed = await ctx.typesService.list({ search: 'disk' });
  assert.deepEqual(
    listed.data.map((type) => type.code),
    ['GROUP_DISCUSSION'],
  );

  await assert.rejects(
    () => ctx.typesService.findOne('99999999-9999-4999-8999-999999999999'),
    NotFoundException,
  );
});

test('deactivating an activity type is blocked only by live activities', async () => {
  const ctx = build();
  const type = await seedType(ctx, { code: 'READING' });

  ctx.typesRepo.activityCounts.set(type.id, 2);
  await assert.rejects(
    () => ctx.typesService.update(type.id, { status: 'INACTIVE' }),
    UnprocessableEntityException,
  );

  ctx.typesRepo.activityCounts.set(type.id, 0);
  const deactivated = await ctx.typesService.update(type.id, {
    status: 'INACTIVE',
  });
  assert.equal(deactivated.status, 'INACTIVE');
  assert.equal(
    ctx.audit.records.at(-1).action,
    'learning_activity_type.updated',
  );
});

test('activities are ordered per meeting and reject a taken sequence', async () => {
  const ctx = build();
  const type = await seedType(ctx);

  const first = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: type.id,
    title: 'Aktivitas 1',
  });
  assert.equal(first.sequence, 1);
  assert.equal(first.status, 'DRAFT');

  const second = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: type.id,
    title: 'Aktivitas 2',
  });
  assert.equal(second.sequence, 2);

  // Sequence numbering is scoped to the meeting.
  const otherMeeting = await ctx.activitiesService.create({
    meetingId: MEETING_2,
    activityTypeId: type.id,
    title: 'Aktivitas pertemuan lain',
  });
  assert.equal(otherMeeting.sequence, 1);

  await assert.rejects(
    () =>
      ctx.activitiesService.create({
        meetingId: MEETING_1,
        activityTypeId: type.id,
        title: 'Duplikat',
        sequence: 1,
      }),
    ConflictException,
  );

  await assert.rejects(
    () =>
      ctx.activitiesService.create({
        meetingId: '99999999-9999-4999-8999-999999999999',
        activityTypeId: type.id,
        title: 'Pertemuan tidak dikenal',
      }),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      ctx.activitiesService.create({
        meetingId: MEETING_1,
        activityTypeId: '99999999-9999-4999-8999-999999999998',
        title: 'Tipe tidak dikenal',
      }),
    NotFoundException,
  );
});

test('inactive activity types and inverted availability windows are refused', async () => {
  const ctx = build();
  const type = await seedType(ctx);

  await assert.rejects(
    () =>
      ctx.activitiesService.create({
        meetingId: MEETING_1,
        activityTypeId: type.id,
        title: 'Rentang terbalik',
        availableFrom: '2026-10-02T08:00:00.000Z',
        availableUntil: '2026-10-01T08:00:00.000Z',
      }),
    BadRequestException,
  );

  const inactiveType = await seedType(ctx, {
    code: 'INACTIVE_TYPE',
    requiresContent: false,
  });
  ctx.activitiesRepo.types.set(inactiveType.id, {
    id: inactiveType.id,
    code: inactiveType.code,
    requiresContent: false,
    status: 'INACTIVE',
  });

  await assert.rejects(
    () =>
      ctx.activitiesService.create({
        meetingId: MEETING_1,
        activityTypeId: inactiveType.id,
        title: 'Tipe nonaktif',
      }),
    UnprocessableEntityException,
  );
});

test('publish validation is driven by requiresContent and meeting state', async () => {
  const ctx = build();
  const reading = await seedType(ctx, {
    code: 'READING',
    requiresContent: true,
  });
  const discussion = await seedType(ctx, {
    code: 'DISCUSSION',
    requiresContent: false,
  });

  const readingActivity = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: reading.id,
    title: 'Bacaan modul 1',
  });

  // requiresContent=true and no published content yet.
  await assert.rejects(
    () =>
      ctx.activitiesService.changeStatus(readingActivity.id, {
        status: 'PUBLISHED',
      }),
    UnprocessableEntityException,
  );

  const draft = await ctx.contentsService.create(readingActivity.id, {
    contentType: 'LINK',
    title: 'Modul 1',
    externalUrl: 'https://contoh.go.id/modul-1.pdf',
  });
  assert.equal(draft.version, 1);

  await assert.rejects(
    () =>
      ctx.activitiesService.changeStatus(readingActivity.id, {
        status: 'PUBLISHED',
      }),
    UnprocessableEntityException,
  );

  const publishedContent = await ctx.contentsService.update(draft.id, {
    status: 'PUBLISHED',
  });
  assert.equal(publishedContent.status, 'PUBLISHED');

  const published = await ctx.activitiesService.changeStatus(
    readingActivity.id,
    {
      status: 'PUBLISHED',
      reason: 'Materi lengkap',
    },
  );
  assert.equal(published.status, 'PUBLISHED');
  const statusAudit = ctx.audit.records.at(-1);
  assert.equal(statusAudit.action, 'learning_activity.status_changed');
  assert.equal(statusAudit.metadata.from, 'DRAFT');
  assert.equal(statusAudit.metadata.to, 'PUBLISHED');
  assert.equal(statusAudit.metadata.reason, 'Materi lengkap');

  // requiresContent=false can publish without any content.
  const discussionActivity = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: discussion.id,
    title: 'Diskusi kelompok',
  });
  const discussionPublished = await ctx.activitiesService.changeStatus(
    discussionActivity.id,
    { status: 'PUBLISHED' },
  );
  assert.equal(discussionPublished.status, 'PUBLISHED');

  // A meeting that is archived cannot host published activities.
  const inArchivedMeeting = await ctx.activitiesService.create({
    meetingId: MEETING_2,
    activityTypeId: discussion.id,
    title: 'Di pertemuan arsip',
  });
  await assert.rejects(
    () =>
      ctx.activitiesService.changeStatus(inArchivedMeeting.id, {
        status: 'PUBLISHED',
      }),
    UnprocessableEntityException,
  );

  // Same-status and illegal transitions are refused.
  await assert.rejects(
    () =>
      ctx.activitiesService.changeStatus(published.id, { status: 'PUBLISHED' }),
    BadRequestException,
  );
  await assert.rejects(
    () =>
      ctx.activitiesService
        .changeStatus(published.id, { status: 'DRAFT' })
        .then(() =>
          ctx.activitiesService
            .changeStatus(published.id, { status: 'ARCHIVED' })
            .then(() =>
              ctx.activitiesService.changeStatus(published.id, {
                status: 'PUBLISHED',
              }),
            ),
        ),
    UnprocessableEntityException,
  );
});

test('archived activities are immutable and reorder renumbers deterministically', async () => {
  const ctx = build();
  const type = await seedType(ctx, {
    code: 'DISCUSSION',
    requiresContent: false,
  });

  const first = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: type.id,
    title: 'Aktivitas 1',
  });
  const second = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: type.id,
    title: 'Aktivitas 2',
  });
  const third = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: type.id,
    title: 'Aktivitas 3',
  });

  await assert.rejects(
    () =>
      ctx.activitiesService.reorder({
        meetingId: MEETING_1,
        orderedActivityIds: [third.id, first.id],
      }),
    BadRequestException,
  );

  const reordered = await ctx.activitiesService.reorder({
    meetingId: MEETING_1,
    orderedActivityIds: [third.id, second.id, first.id],
  });
  assert.deepEqual(
    reordered.data.map((activity) => [activity.title, activity.sequence]),
    [
      ['Aktivitas 3', 1],
      ['Aktivitas 2', 2],
      ['Aktivitas 1', 3],
    ],
  );
  assert.equal(ctx.audit.records.at(-1).action, 'learning_activity.reordered');

  await ctx.activitiesService.changeStatus(second.id, { status: 'ARCHIVED' });
  await assert.rejects(
    () => ctx.activitiesService.update(second.id, { title: 'Diubah' }),
    UnprocessableEntityException,
  );
});

test('content is metadata only and versions are preserved for published use', async () => {
  const ctx = build();
  const type = await seedType(ctx, { code: 'READING', requiresContent: true });

  const activity = await ctx.activitiesService.create({
    meetingId: MEETING_1,
    activityTypeId: type.id,
    title: 'Bacaan modul 1',
  });

  // No binary surface: FILE needs a server-produced key, LINK needs a URL.
  await assert.rejects(
    () =>
      ctx.contentsService.create(activity.id, {
        contentType: 'FILE',
        title: 'Tanpa key',
      }),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      ctx.contentsService.create(activity.id, {
        contentType: 'LINK',
        title: 'Skema salah',
        externalUrl: 'ftp://contoh.go.id/modul.pdf',
      }),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      ctx.contentsService.create(activity.id, {
        contentType: 'LINK',
        title: 'Langsung publish',
        externalUrl: 'https://contoh.go.id/modul.pdf',
        status: 'PUBLISHED',
      }),
    BadRequestException,
  );

  const file = await ctx.contentsService.create(activity.id, {
    contentType: 'FILE',
    title: 'Modul 1',
    objectKey: 'learning/2026/09/modul-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  });
  assert.equal(file.version, 1);
  assert.equal(file.objectKey, 'learning/2026/09/modul-1.pdf');
  assert.equal(ctx.audit.records.at(-1).action, 'learning_content.created');

  const published = await ctx.contentsService.update(file.id, {
    status: 'PUBLISHED',
  });
  assert.equal(published.status, 'PUBLISHED');

  // Re-sending the same status is a no-op, not a second live row.
  const republished = await ctx.contentsService.update(file.id, {
    status: 'PUBLISHED',
  });
  assert.equal(republished.status, 'PUBLISHED');
  assert.equal(
    (await ctx.contentsRepo.findVersionState(file.versionGroupId))
      .publishedCount,
    1,
  );

  // A separate material starts its own version group and publishes on its own.
  const second = await ctx.contentsService.create(activity.id, {
    contentType: 'LINK',
    title: 'Modul 1 (revisi)',
    externalUrl: 'https://contoh.go.id/modul-1-rev.pdf',
  });
  const secondPublished = await ctx.contentsService.update(second.id, {
    status: 'PUBLISHED',
  });
  assert.equal(secondPublished.status, 'PUBLISHED');

  const version = await ctx.contentsService.createVersion(file.id, {
    objectKey: 'learning/2026/09/modul-1-v2.pdf',
    sizeBytes: 4096,
  });
  assert.equal(version.content.version, 2);
  assert.equal(version.content.status, 'PUBLISHED');
  assert.equal(version.superseded.id, file.id);
  assert.equal(version.superseded.status, 'SUPERSEDED');
  assert.equal(
    ctx.audit.records.at(-1).action,
    'learning_content.version_created',
  );
  // Versioning keeps exactly one published row inside the group.
  assert.equal(
    (await ctx.contentsRepo.findVersionState(file.versionGroupId))
      .publishedCount,
    1,
  );

  // Superseded history is hidden by default and available on request.
  const visible = await ctx.contentsService.list(activity.id, {});
  assert.deepEqual(
    visible.data.map((row) => [row.version, row.status]),
    [
      [2, 'PUBLISHED'],
      [1, 'PUBLISHED'],
    ],
  );

  const withHistory = await ctx.contentsService.list(activity.id, {
    includeSuperseded: true,
  });
  assert.equal(withHistory.total, 3);

  await assert.rejects(
    () => ctx.contentsService.update(file.id, { title: 'Histori diubah' }),
    UnprocessableEntityException,
  );

  // A new version must point somewhere new.
  await assert.rejects(
    () => ctx.contentsService.createVersion(second.id, {}),
    BadRequestException,
  );
});

test('learning activity and content endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();

    assert.ok(spec.paths['/api/v1/learning-activity-types'].post);
    assert.ok(spec.paths['/api/v1/learning-activity-types'].get);
    assert.ok(spec.paths['/api/v1/learning-activity-types/{id}'].get);
    assert.ok(spec.paths['/api/v1/learning-activity-types/{id}'].patch);

    assert.ok(spec.paths['/api/v1/learning-activities'].post);
    assert.ok(spec.paths['/api/v1/learning-activities'].get);
    assert.ok(spec.paths['/api/v1/learning-activities/reorder'].patch);
    assert.ok(spec.paths['/api/v1/learning-activities/{id}'].get);
    assert.ok(spec.paths['/api/v1/learning-activities/{id}'].patch);
    assert.ok(spec.paths['/api/v1/learning-activities/{id}/status'].patch);
    assert.ok(spec.paths['/api/v1/learning-activities/{id}/contents'].post);
    assert.ok(spec.paths['/api/v1/learning-activities/{id}/contents'].get);

    assert.ok(spec.paths['/api/v1/learning-contents/{id}'].get);
    assert.ok(spec.paths['/api/v1/learning-contents/{id}'].patch);
    assert.ok(spec.paths['/api/v1/learning-contents/{id}/versions'].post);
  } finally {
    await app.close();
  }
});
