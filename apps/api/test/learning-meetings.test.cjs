const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  LearningMeetingsService,
} = require('../dist/learning-meetings/learning-meetings.service');
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
const CLASS_SUBJECT_2 = '55555555-5555-4000-8000-000000000002';
const CLASS_1 = '22222222-2222-4000-8000-000000000001';

function nextId(counter) {
  return `dddddddd-dddd-4ddd-8ddd-${String(counter).padStart(12, '0')}`;
}

class MemoryLearningMeetingsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.classSubjects = new Map([
      [CLASS_SUBJECT_1, { id: CLASS_SUBJECT_1, academicClassId: CLASS_1 }],
      [CLASS_SUBJECT_2, { id: CLASS_SUBJECT_2, academicClassId: CLASS_1 }],
    ]);
  }

  async create(data) {
    const record = {
      id: nextId(this.next++),
      classSubjectId: data.classSubjectId,
      sequence: data.sequence,
      title: data.title,
      description: data.description ?? null,
      plannedStartAt: data.plannedStartAt ?? null,
      plannedEndAt: data.plannedEndAt ?? null,
      status: data.status ?? 'DRAFT',
      createdAt: new Date('2026-09-24T00:00:00.000Z'),
      updatedAt: new Date('2026-09-24T00:00:00.000Z'),
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

  async findClassSubjectContext(classSubjectId) {
    return this.classSubjects.get(classSubjectId) ?? null;
  }

  async findBySequence(classSubjectId, sequence, excludeId) {
    const found =
      this.records.find(
        (record) =>
          record.classSubjectId === classSubjectId &&
          record.sequence === sequence &&
          (!excludeId || record.id !== excludeId),
      ) ?? null;
    return found
      ? {
          id: found.id,
          classSubjectId: found.classSubjectId,
          sequence: found.sequence,
          status: found.status,
        }
      : null;
  }

  async maxSequence(classSubjectId) {
    return this.records
      .filter((record) => record.classSubjectId === classSubjectId)
      .reduce((max, record) => Math.max(max, record.sequence), 0);
  }

  async listSequenceContexts(classSubjectId) {
    return this.records
      .filter((record) => record.classSubjectId === classSubjectId)
      .map((record) => ({
        id: record.id,
        classSubjectId: record.classSubjectId,
        sequence: record.sequence,
        status: record.status,
      }));
  }

  /**
   * Mirrors the SQL two-phase plan: park every meeting on a temporary sequence
   * so swaps cannot collide with the unique index, then write the final values.
   */
  async applySequencePlan(classSubjectId, orderedMeetingIds) {
    const TEMPORARY_SEQUENCE_OFFSET = 1_000_000;

    orderedMeetingIds.forEach((id, index) => {
      const record = this.records.find((r) => r.id === id);
      record.sequence = TEMPORARY_SEQUENCE_OFFSET + index + 1;
    });

    return orderedMeetingIds.map((id, index) => {
      const record = this.records.find((r) => r.id === id);
      record.sequence = index + 1;
      return record;
    });
  }
}

function buildService() {
  const repo = new MemoryLearningMeetingsRepository();
  const audit = new FakeAuditService();
  return { repo, audit, service: new LearningMeetingsService(repo, audit) };
}

test('LearningMeetingsService - assigns a deterministic sequence per class subject', async () => {
  const { audit, service } = buildService();

  const first = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 1',
  });
  assert.equal(first.sequence, 1);
  assert.equal(first.status, 'DRAFT');
  assert.equal(audit.records[0].action, 'learning_meeting.created');

  // The next meeting appends after the highest sequence.
  const second = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 2',
  });
  assert.equal(second.sequence, 2);

  // A pinned sequence is honoured.
  const pinned = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 5',
    sequence: 5,
  });
  assert.equal(pinned.sequence, 5);

  // Sequence numbering is scoped to the class subject, not global.
  const otherClass = await service.create({
    classSubjectId: CLASS_SUBJECT_2,
    title: 'Pertemuan 1 kelas lain',
  });
  assert.equal(otherClass.sequence, 1);

  // Unknown class subject is refused.
  await assert.rejects(
    () =>
      service.create({
        classSubjectId: '99999999-9999-4999-8999-999999999999',
        title: 'X',
      }),
    NotFoundException,
  );
});

test('LearningMeetingsService - duplicate sequence is rejected with 409', async () => {
  const { service } = buildService();

  const created = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 1',
    sequence: 1,
  });

  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Duplikat',
        sequence: 1,
      }),
    ConflictException,
  );

  // A different class subject may reuse sequence 1.
  const other = await service.create({
    classSubjectId: CLASS_SUBJECT_2,
    title: 'Kelas lain',
    sequence: 1,
  });
  assert.equal(other.sequence, 1);

  // Updating onto a taken sequence is refused too.
  const second = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 2',
  });
  await assert.rejects(
    () => service.update(second.id, { sequence: 1 }),
    ConflictException,
  );

  // Re-pinning a meeting to its own sequence is a no-op, not a conflict.
  const unchanged = await service.update(created.id, { sequence: 1 });
  assert.equal(unchanged.sequence, 1);
});

test('LearningMeetingsService - planned window and unknown meeting are validated', async () => {
  const { service } = buildService();

  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Rentang terbalik',
        plannedStartAt: '2026-10-02T08:00:00.000Z',
        plannedEndAt: '2026-10-01T08:00:00.000Z',
      }),
    BadRequestException,
  );

  const created = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 1',
    plannedStartAt: '2026-10-01T08:00:00.000Z',
    plannedEndAt: '2026-10-01T10:00:00.000Z',
  });
  assert.equal(created.plannedStartAt, '2026-10-01T08:00:00.000Z');

  // Moving only the start past the existing end is refused.
  await assert.rejects(
    () =>
      service.update(created.id, {
        plannedStartAt: '2026-10-02T08:00:00.000Z',
      }),
    BadRequestException,
  );

  await assert.rejects(
    () => service.findOne('99999999-9999-4999-8999-999999999999'),
    NotFoundException,
  );
});

test('LearningMeetingsService - lifecycle transitions are enforced and audited', async () => {
  const { audit, service } = buildService();

  const created = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 1',
  });

  // DRAFT -> PUBLISHED.
  const published = await service.changeStatus(created.id, {
    status: 'PUBLISHED',
    reason: 'Materi siap',
  });
  assert.equal(published.status, 'PUBLISHED');
  const statusAudit = audit.records.at(-1);
  assert.equal(statusAudit.action, 'learning_meeting.status_changed');
  assert.equal(statusAudit.metadata.from, 'DRAFT');
  assert.equal(statusAudit.metadata.to, 'PUBLISHED');
  assert.equal(statusAudit.metadata.reason, 'Materi siap');

  // Same-status change is a client error, not a silent no-op.
  await assert.rejects(
    () => service.changeStatus(created.id, { status: 'PUBLISHED' }),
    BadRequestException,
  );

  // PUBLISHED -> COMPLETED -> ARCHIVED is allowed.
  const completed = await service.changeStatus(created.id, {
    status: 'COMPLETED',
  });
  assert.equal(completed.status, 'COMPLETED');

  const archived = await service.changeStatus(created.id, {
    status: 'ARCHIVED',
  });
  assert.equal(archived.status, 'ARCHIVED');

  // ARCHIVED is terminal: reactivating would resurrect retired content.
  await assert.rejects(
    () => service.changeStatus(created.id, { status: 'PUBLISHED' }),
    UnprocessableEntityException,
  );

  // An archived meeting cannot be edited.
  await assert.rejects(
    () => service.update(created.id, { title: 'Diubah' }),
    UnprocessableEntityException,
  );
});

test('LearningMeetingsService - unpublishing is allowed but illegal jumps are not', async () => {
  const { service } = buildService();

  const created = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 1',
  });

  await service.changeStatus(created.id, { status: 'PUBLISHED' });
  const unpublished = await service.changeStatus(created.id, {
    status: 'DRAFT',
  });
  assert.equal(unpublished.status, 'DRAFT');

  // DRAFT -> COMPLETED is not a legal edge.
  await assert.rejects(
    () => service.changeStatus(created.id, { status: 'COMPLETED' }),
    UnprocessableEntityException,
  );

  // The update endpoint applies the same transition rules.
  await assert.rejects(
    () => service.update(created.id, { status: 'COMPLETED' }),
    UnprocessableEntityException,
  );
});

test('LearningMeetingsService - reorder requires the complete set and renumbers deterministically', async () => {
  const { audit, service } = buildService();

  const first = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 1',
  });
  const second = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 2',
  });
  const third = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Pertemuan 3',
  });

  // A partial list is refused: it would leave stale sequences behind.
  await assert.rejects(
    () =>
      service.reorder({
        classSubjectId: CLASS_SUBJECT_1,
        orderedMeetingIds: [third.id, first.id],
      }),
    BadRequestException,
  );

  // A meeting from another class subject is refused.
  const foreign = await service.create({
    classSubjectId: CLASS_SUBJECT_2,
    title: 'Kelas lain',
  });
  await assert.rejects(
    () =>
      service.reorder({
        classSubjectId: CLASS_SUBJECT_1,
        orderedMeetingIds: [first.id, second.id, foreign.id],
      }),
    BadRequestException,
  );

  // Duplicates are refused.
  await assert.rejects(
    () =>
      service.reorder({
        classSubjectId: CLASS_SUBJECT_1,
        orderedMeetingIds: [first.id, first.id, second.id],
      }),
    BadRequestException,
  );

  // The full plan reverses the order and renumbers 1..N. A swap like this is
  // exactly the case the two-phase SQL plan exists for.
  const reordered = await service.reorder({
    classSubjectId: CLASS_SUBJECT_1,
    orderedMeetingIds: [third.id, second.id, first.id],
  });
  assert.deepEqual(
    reordered.data.map((meeting) => [meeting.title, meeting.sequence]),
    [
      ['Pertemuan 3', 1],
      ['Pertemuan 2', 2],
      ['Pertemuan 1', 3],
    ],
  );
  assert.equal(reordered.total, 3);
  assert.equal(audit.records.at(-1).action, 'learning_meeting.reordered');

  // Listing reflects the new order.
  const listed = await service.list({ classSubjectId: CLASS_SUBJECT_1 });
  assert.deepEqual(
    listed.data.map((meeting) => meeting.sequence),
    [1, 2, 3],
  );

  // A class subject with no meetings cannot be reordered.
  await assert.rejects(
    () =>
      service.reorder({
        classSubjectId: CLASS_SUBJECT_1,
        orderedMeetingIds: [],
      }),
    BadRequestException,
  );
});

test('learning meeting endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/learning-meetings'].post);
    assert.ok(spec.paths['/api/v1/learning-meetings'].get);
    assert.ok(spec.paths['/api/v1/learning-meetings/reorder'].patch);
    assert.ok(spec.paths['/api/v1/learning-meetings/{id}'].get);
    assert.ok(spec.paths['/api/v1/learning-meetings/{id}'].patch);
    assert.ok(spec.paths['/api/v1/learning-meetings/{id}/status'].patch);
  } finally {
    await app.close();
  }
});
