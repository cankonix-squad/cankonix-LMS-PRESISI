const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  AttendanceCorrectionsService,
} = require('../dist/attendance-corrections/attendance-corrections.service');
const { createApp } = require('../dist/app');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(entry) {
    this.records.push(entry);
    return { id: `audit-${this.records.length}` };
  }
}

/**
 * Stand-in for AttendanceSummaryService. Corrections must refresh the derived
 * summaries, but the refresh itself is TASK-033's concern — here we only assert
 * the call happens for the session that was corrected.
 */
class FakeSummaryService {
  constructor() {
    this.refreshedSessions = [];
  }

  async refreshForSession(sessionId) {
    this.refreshedSessions.push(sessionId);
  }

  async refreshForClassSubject() {}
}

const RECORD_1 = '11111111-aaaa-4aaa-8aaa-000000000001';
const RECORD_CANCELLED = '11111111-aaaa-4aaa-8aaa-000000000002';
const RECORD_MISSING = '11111111-aaaa-4aaa-8aaa-000000000099';
const ACTOR_ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const ACTOR_PERSON = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
const PARTICIPANT_PERSON = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002';

/**
 * In-memory repository. Note it models the append-only semantics honestly: the
 * correction list only ever grows, and `applyCorrection` returns BOTH the new
 * log row and the mutated record so the service cannot silently skip the write.
 */
class MemoryCorrectionsRepository {
  constructor() {
    this.corrections = [];
    this.seq = 1;
    this.records = new Map([
      [
        RECORD_1,
        {
          id: RECORD_1,
          sessionId: 'session-1',
          enrollmentId: 'enrollment-1',
          status: 'ABSENT',
          checkInAt: null,
          note: null,
          recordedByUserId: ACTOR_ACCOUNT,
          updatedAt: new Date('2026-09-20T10:00:00.000Z'),
          sessionStatus: 'CLOSED',
          enrollmentPersonId: PARTICIPANT_PERSON,
        },
      ],
      [
        RECORD_CANCELLED,
        {
          id: RECORD_CANCELLED,
          sessionId: 'session-2',
          enrollmentId: 'enrollment-2',
          status: 'ABSENT',
          checkInAt: null,
          note: null,
          recordedByUserId: ACTOR_ACCOUNT,
          updatedAt: new Date('2026-09-20T10:00:00.000Z'),
          sessionStatus: 'CANCELLED',
          enrollmentPersonId: PARTICIPANT_PERSON,
        },
      ],
    ]);
  }

  async findTargetRecord(recordId) {
    const record = this.records.get(recordId);
    return record ? { ...record } : null;
  }

  async applyCorrection(data) {
    const correction = {
      id: `correction-${this.seq++}`,
      attendanceRecordId: data.attendanceRecordId,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      reason: data.reason,
      requestedByUserId: data.actorUserId,
      approvedByUserId: data.actorUserId,
      approvedAt: new Date('2026-09-21T08:00:00.000Z'),
      status: 'APPLIED',
      createdAt: new Date('2026-09-21T08:00:00.000Z'),
    };
    this.corrections.push(correction);

    const record = this.records.get(data.attendanceRecordId);
    record.status = data.newStatus;
    if (data.checkInAt !== undefined) record.checkInAt = data.checkInAt;
    if (data.note !== undefined) record.note = data.note;
    record.updatedAt = new Date('2026-09-21T08:00:00.000Z');

    return { correction, record: { ...record } };
  }

  async findCorrectionById(id) {
    return this.corrections.find((c) => c.id === id) || null;
  }

  async listByRecord(recordId, page, limit) {
    const list = this.corrections.filter(
      (c) => c.attendanceRecordId === recordId,
    );
    return {
      data: list.slice((page - 1) * limit, (page - 1) * limit + limit),
      total: list.length,
    };
  }

  async list(filter) {
    let list = [...this.corrections];
    if (filter.recordId) {
      list = list.filter((c) => c.attendanceRecordId === filter.recordId);
    }
    if (filter.requestedByUserId) {
      list = list.filter(
        (c) => c.requestedByUserId === filter.requestedByUserId,
      );
    }
    if (filter.status) {
      list = list.filter((c) => c.status === filter.status);
    }
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    return {
      data: list.slice((page - 1) * limit, (page - 1) * limit + limit),
      total: list.length,
    };
  }
}

function buildService() {
  const repo = new MemoryCorrectionsRepository();
  const audit = new FakeAuditService();
  const summaries = new FakeSummaryService();
  const service = new AttendanceCorrectionsService(repo, audit, summaries);
  return { repo, audit, summaries, service };
}

const ACTOR = { accountId: ACTOR_ACCOUNT, personId: ACTOR_PERSON };

test('AttendanceCorrectionsService — applies correction and preserves history', async () => {
  const { repo, audit, service } = buildService();

  const result = await service.applyCorrection(
    RECORD_1,
    {
      newStatus: 'EXCUSED',
      reason: 'Surat keterangan sakit diterima setelah sesi ditutup.',
    },
    ACTOR,
  );

  // The record's current status moved...
  assert.equal(result.record.status, 'EXCUSED');
  // ...and the previous value is preserved in the immutable log row.
  assert.equal(result.correction.previousStatus, 'ABSENT');
  assert.equal(result.correction.newStatus, 'EXCUSED');
  assert.equal(result.correction.requestedByUserId, ACTOR_ACCOUNT);
  assert.equal(result.correction.approvedByUserId, ACTOR_ACCOUNT);
  assert.equal(result.correction.status, 'APPLIED');
  assert.ok(result.correction.approvedAt);

  // A CLOSED session does not block a correction — that is the point of TASK-031.
  assert.equal(repo.records.get(RECORD_1).status, 'EXCUSED');

  // The audit trail was written with before/after and the reason.
  assert.equal(audit.records.length, 1);
  assert.equal(audit.records[0].action, 'attendance_correction.applied');
  assert.equal(audit.records[0].before.status, 'ABSENT');
  assert.equal(audit.records[0].after.status, 'EXCUSED');
  assert.match(audit.records[0].metadata.reason, /Surat keterangan/);

  // History is queryable for the record, oldest first.
  const history = await service.listByRecord(RECORD_1, {
    page: 1,
    limit: 20,
  });
  assert.equal(history.meta.total, 1);
  assert.equal(history.data[0].previousStatus, 'ABSENT');
});

test('AttendanceCorrectionsService — refreshes the derived summaries of the corrected session', async () => {
  const { summaries, service } = buildService();

  await service.applyCorrection(
    RECORD_1,
    { newStatus: 'EXCUSED', reason: 'Surat keterangan menyusul.' },
    ACTOR,
  );

  // TASK-033: a correction changes a current status without touching session
  // history, so the session's derived summaries must be recalculated.
  assert.deepEqual(summaries.refreshedSessions, ['session-1']);
});

test('AttendanceCorrectionsService — chains multiple corrections without losing history', async () => {
  const { service } = buildService();

  await service.applyCorrection(
    RECORD_1,
    { newStatus: 'SICK', reason: 'Keterangan dokter diterima.' },
    ACTOR,
  );
  await service.applyCorrection(
    RECORD_1,
    { newStatus: 'EXCUSED', reason: 'Dokter menyatakan bukan sakit.' },
    ACTOR,
  );
  const third = await service.applyCorrection(
    RECORD_1,
    { newStatus: 'PRESENT', reason: 'Bukti kehadiran diverifikasi.' },
    ACTOR,
  );

  assert.equal(third.record.status, 'PRESENT');
  assert.equal(third.correction.previousStatus, 'EXCUSED');

  const history = await service.listByRecord(RECORD_1, { page: 1, limit: 20 });
  assert.equal(history.meta.total, 3);
  assert.deepEqual(
    history.data.map((c) => [c.previousStatus, c.newStatus]),
    [
      ['ABSENT', 'SICK'],
      ['SICK', 'EXCUSED'],
      ['EXCUSED', 'PRESENT'],
    ],
  );
});

test('AttendanceCorrectionsService — unauthorized and invalid corrections are denied', async () => {
  const { service, audit } = buildService();

  // 1. No actor identity -> fail closed.
  await assert.rejects(
    service.applyCorrection(RECORD_1, {
      newStatus: 'EXCUSED',
      reason: 'Alasan yang cukup panjang.',
    }),
    ForbiddenException,
  );
  await assert.rejects(
    service.applyCorrection(
      RECORD_1,
      { newStatus: 'EXCUSED', reason: 'Alasan yang cukup panjang.' },
      { accountId: ACTOR_ACCOUNT, personId: '' },
    ),
    ForbiddenException,
  );

  // 2. Participant correcting their own record -> denied (segregation of duties).
  await assert.rejects(
    service.applyCorrection(
      RECORD_1,
      { newStatus: 'EXCUSED', reason: 'Alasan yang cukup panjang.' },
      { accountId: ACTOR_ACCOUNT, personId: PARTICIPANT_PERSON },
    ),
    ForbiddenException,
  );

  // 3. Record not found -> 404.
  await assert.rejects(
    service.applyCorrection(
      RECORD_MISSING,
      { newStatus: 'EXCUSED', reason: 'Alasan yang cukup panjang.' },
      ACTOR,
    ),
    NotFoundException,
  );

  // 4. Blank reason -> 400 even though the DTO normally blocks it first.
  await assert.rejects(
    service.applyCorrection(
      RECORD_1,
      { newStatus: 'EXCUSED', reason: '     ' },
      ACTOR,
    ),
    BadRequestException,
  );

  // 5. CANCELLED session -> 422.
  await assert.rejects(
    service.applyCorrection(
      RECORD_CANCELLED,
      { newStatus: 'EXCUSED', reason: 'Alasan yang cukup panjang.' },
      ACTOR,
    ),
    UnprocessableEntityException,
  );

  // 6. Same-status correction -> 409, no history row, no audit entry.
  await assert.rejects(
    service.applyCorrection(
      RECORD_1,
      { newStatus: 'ABSENT', reason: 'Alasan yang cukup panjang.' },
      ACTOR,
    ),
    ConflictException,
  );

  // Nothing above wrote history or audit: denials are side-effect free.
  assert.equal(audit.records.length, 0);
  const history = await service.listByRecord(RECORD_1, { page: 1, limit: 20 });
  assert.equal(history.meta.total, 0);
});

test('attendance correction endpoints require permission and are exposed in OpenAPI', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/attendance-corrections'].get);
    assert.ok(spec.paths['/api/v1/attendance-corrections/{id}'].get);
    assert.ok(
      spec.paths['/api/v1/attendance-corrections/records/{recordId}'].post,
    );
    assert.ok(
      spec.paths['/api/v1/attendance-corrections/records/{recordId}'].get,
    );

    // Fail closed without a bearer token: correction routes are NOT allow-listed.
    const anonymous = await fetch(`${base}/api/v1/attendance-corrections`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});
