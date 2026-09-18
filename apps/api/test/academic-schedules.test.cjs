const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');
const {
  AcademicSchedulesService,
} = require('../dist/academic-schedules/academic-schedules.service');
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
const BATCH_1 = '11111111-1111-4000-8000-000000000001';

function nextId(counter) {
  return `abcabcab-abca-4bca-8bca-${String(counter).padStart(12, '0')}`;
}

class MemoryAcademicSchedulesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.classSubjects = new Map([
      [
        CLASS_SUBJECT_1,
        {
          id: CLASS_SUBJECT_1,
          academicClassId: CLASS_1,
          academicClass: { id: CLASS_1, educationBatchId: BATCH_1 },
        },
      ],
      [
        CLASS_SUBJECT_2,
        {
          id: CLASS_SUBJECT_2,
          academicClassId: CLASS_1,
          academicClass: { id: CLASS_1, educationBatchId: BATCH_1 },
        },
      ],
    ]);
  }

  async create(data) {
    const record = {
      id: nextId(this.next++),
      classSubjectId: data.classSubjectId,
      title: data.title,
      description: data.description ?? null,
      startAt: data.startAt,
      endAt: data.endAt,
      mode: data.mode ?? 'FACE_TO_FACE',
      location: data.location ?? null,
      url: data.url ?? null,
      status: data.status ?? 'SCHEDULED',
      metadata: data.metadata ?? null,
      createdAt: new Date('2026-09-23T00:00:00.000Z'),
      updatedAt: new Date('2026-09-23T00:00:00.000Z'),
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
    if (filter.mode) {
      filtered = filtered.filter((r) => r.mode === filter.mode);
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    // Overlap semantics: start <= window end AND end >= window start.
    if (filter.to) {
      filtered = filtered.filter((r) => r.startAt <= filter.to);
    }
    if (filter.from) {
      filtered = filtered.filter((r) => r.endAt >= filter.from);
    }
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

  async findConflicts(classSubjectId, startAt, endAt, excludeId) {
    return this.records
      .filter((record) => {
        if (record.classSubjectId !== classSubjectId) return false;
        if (record.status === 'CANCELLED') return false;
        if (excludeId && record.id === excludeId) return false;
        // Strict overlap: back-to-back sessions do not conflict.
        return record.startAt < endAt && record.endAt > startAt;
      })
      .map((record) => ({
        id: record.id,
        classSubjectId: record.classSubjectId,
        title: record.title,
        startAt: record.startAt,
        endAt: record.endAt,
        status: record.status,
      }));
  }
}

function buildService() {
  const repo = new MemoryAcademicSchedulesRepository();
  const audit = new FakeAuditService();
  return { repo, audit, service: new AcademicSchedulesService(repo, audit) };
}

test('AcademicSchedulesService - creates a schedule and audits it', async () => {
  const { audit, service } = buildService();

  const created = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: '  Sesi 1 — Pengantar  ',
    startAt: '2026-10-01T08:00:00.000Z',
    endAt: '2026-10-01T10:00:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang A-101',
  });

  assert.equal(created.title, 'Sesi 1 — Pengantar');
  assert.equal(created.mode, 'FACE_TO_FACE');
  assert.equal(created.status, 'SCHEDULED');
  assert.equal(created.startAt, '2026-10-01T08:00:00.000Z');
  assert.equal(audit.records[0].action, 'academic_schedule.created');

  // Unknown class subject is refused.
  await assert.rejects(
    () =>
      service.create({
        classSubjectId: '99999999-9999-4999-8999-999999999999',
        title: 'X',
        startAt: '2026-10-01T08:00:00.000Z',
        endAt: '2026-10-01T09:00:00.000Z',
        mode: 'FACE_TO_FACE',
        location: 'Ruang B',
      }),
    NotFoundException,
  );
});

test('AcademicSchedulesService - rejects invalid time ranges', async () => {
  const { service } = buildService();

  // End before start.
  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Inverted',
        startAt: '2026-10-01T10:00:00.000Z',
        endAt: '2026-10-01T08:00:00.000Z',
        mode: 'FACE_TO_FACE',
        location: 'Ruang A',
      }),
    BadRequestException,
  );

  // Zero-length activity is not representable.
  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Instant',
        startAt: '2026-10-01T08:00:00.000Z',
        endAt: '2026-10-01T08:00:00.000Z',
        mode: 'FACE_TO_FACE',
        location: 'Ruang A',
      }),
    BadRequestException,
  );

  // A list window with to < from is a client error.
  await assert.rejects(
    () =>
      service.list({
        from: '2026-10-31T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
      }),
    BadRequestException,
  );
});

test('AcademicSchedulesService - enforces the delivery target per mode', async () => {
  const { service } = buildService();

  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Online tanpa link',
        startAt: '2026-10-02T08:00:00.000Z',
        endAt: '2026-10-02T09:00:00.000Z',
        mode: 'ONLINE',
      }),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Tatap muka tanpa ruang',
        startAt: '2026-10-02T08:00:00.000Z',
        endAt: '2026-10-02T09:00:00.000Z',
        mode: 'FACE_TO_FACE',
      }),
    BadRequestException,
  );

  const online = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Sesi daring',
    startAt: '2026-10-02T08:00:00.000Z',
    endAt: '2026-10-02T09:00:00.000Z',
    mode: 'ONLINE',
    url: 'https://meet.example.id/kelas-a',
  });
  assert.equal(online.url, 'https://meet.example.id/kelas-a');
});

test('AcademicSchedulesService - detects slot conflicts but allows back-to-back', async () => {
  const { audit, service } = buildService();

  await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Sesi 1',
    startAt: '2026-10-01T08:00:00.000Z',
    endAt: '2026-10-01T10:00:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang A',
  });

  // A partially overlapping session is a conflict.
  await assert.rejects(
    () =>
      service.create({
        classSubjectId: CLASS_SUBJECT_1,
        title: 'Overlap',
        startAt: '2026-10-01T09:00:00.000Z',
        endAt: '2026-10-01T11:00:00.000Z',
        mode: 'FACE_TO_FACE',
        location: 'Ruang A',
      }),
    (error) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse();
      assert.equal(response.conflicts.length, 1);
      assert.equal(response.conflicts[0].title, 'Sesi 1');
      return true;
    },
  );

  // Back-to-back is fine: the next session may start exactly when one ends.
  const next = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Sesi 2',
    startAt: '2026-10-01T10:00:00.000Z',
    endAt: '2026-10-01T12:00:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang A',
  });
  assert.equal(next.title, 'Sesi 2');

  // A different class subject does not conflict.
  const other = await service.create({
    classSubjectId: CLASS_SUBJECT_2,
    title: 'Sesi lain',
    startAt: '2026-10-01T09:00:00.000Z',
    endAt: '2026-10-01T11:00:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang B',
  });
  assert.equal(other.classSubjectId, CLASS_SUBJECT_2);

  assert.ok(
    audit.records.some((r) => r.action === 'academic_schedule.created'),
  );
});

test('AcademicSchedulesService - cancellation frees the slot and is audited', async () => {
  const { audit, service } = buildService();

  const created = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Sesi 1',
    startAt: '2026-10-01T08:00:00.000Z',
    endAt: '2026-10-01T10:00:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang A',
  });

  const cancelled = await service.cancel(created.id);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(audit.records.at(-1).action, 'academic_schedule.cancelled');

  // A cancelled entry is kept but no longer occupies the slot.
  const history = await service.list({ status: 'CANCELLED' });
  assert.equal(history.total, 1);

  const replacement = await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Sesi pengganti',
    startAt: '2026-10-01T09:00:00.000Z',
    endAt: '2026-10-01T10:30:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang A',
  });
  assert.equal(replacement.title, 'Sesi pengganti');

  await assert.rejects(() => service.cancel(created.id), BadRequestException);
});

test('AcademicSchedulesService - calendar window uses overlap semantics', async () => {
  const { service } = buildService();

  await service.create({
    classSubjectId: CLASS_SUBJECT_1,
    title: 'Menyeberang bulan',
    startAt: '2026-09-30T22:00:00.000Z',
    endAt: '2026-10-01T02:00:00.000Z',
    mode: 'FACE_TO_FACE',
    location: 'Ruang A',
  });

  const october = await service.list({
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-31T23:59:59.000Z',
  });
  assert.equal(october.total, 1, 'a straddling session appears in both months');

  const august = await service.list({
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-31T23:59:59.000Z',
  });
  assert.equal(august.total, 0);
});

test('academic schedule endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/academic-schedules'].post);
    assert.ok(spec.paths['/api/v1/academic-schedules'].get);
    assert.ok(spec.paths['/api/v1/academic-schedules/{id}'].get);
    assert.ok(spec.paths['/api/v1/academic-schedules/{id}'].patch);
    assert.ok(spec.paths['/api/v1/academic-schedules/{id}/cancel'].patch);
  } finally {
    await app.close();
  }
});
