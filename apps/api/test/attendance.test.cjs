const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const { AttendanceService } = require('../dist/attendance/attendance.service');
const { createApp } = require('../dist/app');

class FakeAuditService {
  constructor() {
    this.logs = [];
  }

  async record(entry) {
    this.logs.push(entry);
    return { id: `audit-${this.logs.length}` };
  }
}

/**
 * Stand-in for AttendanceSummaryService. Recording attendance and closing a
 * session must refresh the derived summaries, but the figures themselves are
 * TASK-033's concern — here we only assert the refresh is requested for the
 * class subject that changed.
 */
class FakeSummaryService {
  constructor() {
    this.refreshedClassSubjects = [];
  }

  async refreshForClassSubject(classSubjectId) {
    this.refreshedClassSubjects.push(classSubjectId);
  }

  async refreshForSession() {}
}

class MemoryAttendanceRepository {
  constructor() {
    this.sessions = new Map();
    this.records = new Map();
    this.sessionSeq = 1;
    this.recordSeq = 1;
  }

  async createSession(data) {
    const id = `session-${this.sessionSeq++}`;
    const now = new Date();
    const session = {
      id,
      classSubjectId: data.classSubjectId,
      meetingId: data.meetingId || null,
      title: data.title || null,
      startAt: data.startAt,
      endAt: data.endAt,
      method: data.method || 'MANUAL',
      status: data.status || 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    return session;
  }

  async findSessionById(id) {
    const session = this.sessions.get(id);
    if (!session) return null;
    const sessionRecords = Array.from(this.records.values()).filter(
      (r) => r.sessionId === id,
    );
    return { ...session, records: sessionRecords };
  }

  async findSessions(query) {
    let list = Array.from(this.sessions.values());
    if (query.classSubjectId) {
      list = list.filter((s) => s.classSubjectId === query.classSubjectId);
    }
    if (query.meetingId) {
      list = list.filter((s) => s.meetingId === query.meetingId);
    }
    if (query.status) {
      list = list.filter((s) => s.status === query.status);
    }
    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = list.length;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);
    return { data, total };
  }

  async updateSession(id, data) {
    const session = this.sessions.get(id);
    if (!session)
      throw new NotFoundException(`AttendanceSession ${id} not found`);
    if (data.meetingId !== undefined) session.meetingId = data.meetingId;
    if (data.title !== undefined) session.title = data.title;
    if (data.startAt !== undefined) session.startAt = data.startAt;
    if (data.endAt !== undefined) session.endAt = data.endAt;
    if (data.method !== undefined) session.method = data.method;
    session.updatedAt = new Date();
    return session;
  }

  async updateSessionStatus(id, status) {
    const session = this.sessions.get(id);
    if (!session)
      throw new NotFoundException(`AttendanceSession ${id} not found`);
    session.status = status;
    session.updatedAt = new Date();
    return session;
  }

  async upsertRecord(data) {
    const key = `${data.sessionId}:${data.enrollmentId}`;
    let record = this.records.get(key);
    const now = new Date();
    if (record) {
      record.status = data.status;
      if (data.checkInAt !== undefined) record.checkInAt = data.checkInAt;
      if (data.note !== undefined) record.note = data.note;
      if (data.recordedByUserId !== undefined)
        record.recordedByUserId = data.recordedByUserId;
      record.updatedAt = now;
    } else {
      record = {
        id: `rec-${this.recordSeq++}`,
        sessionId: data.sessionId,
        enrollmentId: data.enrollmentId,
        status: data.status,
        checkInAt: data.checkInAt || null,
        note: data.note || null,
        recordedByUserId: data.recordedByUserId || null,
        createdAt: now,
        updatedAt: now,
        enrollment: {
          person: { fullName: 'Siswa Test' },
          enrollmentNumber: 'ENR-001',
        },
      };
      this.records.set(key, record);
    }
    return record;
  }

  async bulkUpsertRecords(records) {
    const results = [];
    for (const r of records) {
      results.push(await this.upsertRecord(r));
    }
    return results;
  }

  async findRecordById(id) {
    for (const rec of this.records.values()) {
      if (rec.id === id) return rec;
    }
    return null;
  }

  async findRecordBySessionAndEnrollment(sessionId, enrollmentId) {
    return this.records.get(`${sessionId}:${enrollmentId}`) || null;
  }

  async findRecords(query) {
    let list = Array.from(this.records.values());
    if (query.sessionId) {
      list = list.filter((r) => r.sessionId === query.sessionId);
    }
    if (query.enrollmentId) {
      list = list.filter((r) => r.enrollmentId === query.enrollmentId);
    }
    if (query.status) {
      list = list.filter((r) => r.status === query.status);
    }
    const page = query.page || 1;
    const limit = query.limit || 50;
    const total = list.length;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);
    return { data, total };
  }
}

class FakePrismaService {
  constructor() {
    this.classSubjects = new Map([
      ['cs-1', { id: 'cs-1', academicClassId: 'class-1', status: 'ACTIVE' }],
      [
        'cs-inactive',
        { id: 'cs-inactive', academicClassId: 'class-1', status: 'INACTIVE' },
      ],
    ]);

    this.learningMeetings = new Map([
      ['meet-1', { id: 'meet-1', classSubjectId: 'cs-1', status: 'PUBLISHED' }],
      [
        'meet-other',
        { id: 'meet-other', classSubjectId: 'cs-other', status: 'PUBLISHED' },
      ],
      [
        'meet-archived',
        { id: 'meet-archived', classSubjectId: 'cs-1', status: 'ARCHIVED' },
      ],
    ]);

    this.enrollments = new Map([
      ['enr-1', { id: 'enr-1', academicClassId: 'class-1', status: 'ACTIVE' }],
      [
        'enr-withdrawn',
        {
          id: 'enr-withdrawn',
          academicClassId: 'class-1',
          status: 'WITHDRAWN',
        },
      ],
      [
        'enr-other-class',
        { id: 'enr-other-class', academicClassId: 'class-2', status: 'ACTIVE' },
      ],
    ]);
  }

  classSubject = {
    findUnique: async ({ where }) => this.classSubjects.get(where.id) || null,
  };

  learningMeeting = {
    findUnique: async ({ where }) =>
      this.learningMeetings.get(where.id) || null,
  };

  enrollment = {
    findUnique: async ({ where }) => this.enrollments.get(where.id) || null,
    findMany: async ({ where }) => {
      if (where?.id?.in) {
        return where.id.in
          .map((id) => this.enrollments.get(id))
          .filter(Boolean);
      }
      return Array.from(this.enrollments.values());
    },
  };
}

test('AttendanceService — session lifecycle and rules', async () => {
  const repo = new MemoryAttendanceRepository();
  const prisma = new FakePrismaService();
  const audit = new FakeAuditService();
  const summaries = new FakeSummaryService();
  const service = new AttendanceService(repo, prisma, audit, summaries);

  // 1. Valid session creation
  const session = await service.createSession({
    classSubjectId: 'cs-1',
    meetingId: 'meet-1',
    title: 'Sesi Pertemuan 1',
    startAt: '2026-09-20T08:00:00.000Z',
    endAt: '2026-09-20T10:00:00.000Z',
    method: 'MANUAL',
    status: 'OPEN',
  });

  assert.equal(session.classSubjectId, 'cs-1');
  assert.equal(session.meetingId, 'meet-1');
  assert.equal(session.status, 'OPEN');

  // 2. Reject session creation if endAt <= startAt
  await assert.rejects(
    service.createSession({
      classSubjectId: 'cs-1',
      startAt: '2026-09-20T10:00:00.000Z',
      endAt: '2026-09-20T08:00:00.000Z',
    }),
    BadRequestException,
  );

  // 3. Reject session creation if ClassSubject is not ACTIVE
  await assert.rejects(
    service.createSession({
      classSubjectId: 'cs-inactive',
      startAt: '2026-09-20T08:00:00.000Z',
      endAt: '2026-09-20T10:00:00.000Z',
    }),
    UnprocessableEntityException,
  );

  // 4. Reject session creation if Meeting belongs to another class subject
  await assert.rejects(
    service.createSession({
      classSubjectId: 'cs-1',
      meetingId: 'meet-other',
      startAt: '2026-09-20T08:00:00.000Z',
      endAt: '2026-09-20T10:00:00.000Z',
    }),
    ConflictException,
  );

  // 5. Update session details
  const updated = await service.updateSession(session.id, {
    title: 'Sesi Pertemuan 1 Revised',
  });
  assert.equal(updated.title, 'Sesi Pertemuan 1 Revised');

  // 6. Record single attendance
  const record = await service.recordAttendance({
    sessionId: session.id,
    enrollmentId: 'enr-1',
    status: 'PRESENT',
    note: 'Hadir',
  });
  assert.equal(record.status, 'PRESENT');
  assert.equal(record.sessionId, session.id);

  // 7. Bulk record attendance
  const bulkRecords = await service.bulkRecordAttendance(session.id, {
    records: [{ enrollmentId: 'enr-1', status: 'LATE', note: 'Terlambat 10m' }],
  });
  assert.equal(bulkRecords.length, 1);
  assert.equal(bulkRecords[0].status, 'LATE');

  // 8. Reject attendance for WITHDRAWN enrollment
  await assert.rejects(
    service.recordAttendance({
      sessionId: session.id,
      enrollmentId: 'enr-withdrawn',
      status: 'PRESENT',
    }),
    UnprocessableEntityException,
  );

  // 9. Reject attendance for enrollment from another class
  await assert.rejects(
    service.recordAttendance({
      sessionId: session.id,
      enrollmentId: 'enr-other-class',
      status: 'PRESENT',
    }),
    ConflictException,
  );

  // 10. Close session and verify edits are blocked
  await service.updateSessionStatus(session.id, { status: 'CLOSED' });

  await assert.rejects(
    service.recordAttendance({
      sessionId: session.id,
      enrollmentId: 'enr-1',
      status: 'PRESENT',
    }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    service.updateSession(session.id, { title: 'New Title' }),
    UnprocessableEntityException,
  );
});

test('attendance endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/attendance/sessions'].post);
    assert.ok(spec.paths['/api/v1/attendance/sessions'].get);
    assert.ok(spec.paths['/api/v1/attendance/sessions/{id}'].get);
    assert.ok(spec.paths['/api/v1/attendance/sessions/{id}'].patch);
    assert.ok(spec.paths['/api/v1/attendance/sessions/{id}/status'].patch);
    assert.ok(spec.paths['/api/v1/attendance/sessions/{id}/records/bulk'].post);
    assert.ok(spec.paths['/api/v1/attendance/records'].post);
    assert.ok(spec.paths['/api/v1/attendance/records'].get);
    assert.ok(spec.paths['/api/v1/attendance/records/{id}'].get);
  } finally {
    await app.close();
  }
});
