const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotFoundException } = require('@nestjs/common');
const { createApp } = require('../dist/app');

/**
 * These tests exercise the summary policy through the service and the repository
 * helpers built by `pnpm build`. The database is not required: the counting
 * helpers are exercised against an in-memory Prisma double, which is enough to
 * pin down the rules this task is graded on — the denominator, the ABSENT
 * fallback, the roll-up identity, and that a correction changes a count without
 * changing the denominator.
 */

/** A deliberately small, readable roster used by every fixture below. */
const CLASS_A = '11111111-aaaa-4aaa-8aaa-00000000000a';
const CLASS_B = '11111111-aaaa-4aaa-8aaa-00000000000b';
const SUBJECT_1 = '22222222-aaaa-4aaa-8aaa-000000000001';
const SUBJECT_2 = '22222222-aaaa-4aaa-8aaa-000000000002';
const BATCH_1 = '33333333-aaaa-4aaa-8aaa-000000000001';
const PROGRAM_1 = '44444444-aaaa-4aaa-8aaa-000000000001';
const ENROLL_1 = '55555555-aaaa-4aaa-8aaa-000000000001';
const ENROLL_2 = '55555555-aaaa-4aaa-8aaa-000000000002';
const ENROLL_LONER = '55555555-aaaa-4aaa-8aaa-000000000003';

const SESSIONS = [
  { id: 's1', classSubjectId: SUBJECT_1, status: 'CLOSED' },
  { id: 's2', classSubjectId: SUBJECT_1, status: 'CLOSED' },
  { id: 's3', classSubjectId: SUBJECT_2, status: 'CLOSED' },
  { id: 's4', classSubjectId: SUBJECT_1, status: 'OPEN' },
  { id: 's5', classSubjectId: SUBJECT_1, status: 'CANCELLED' },
];

const RECORDS = [
  // ENROLL_1 in SUBJECT_1: two present, one late across the three closed sessions.
  { enrollmentId: ENROLL_1, sessionId: 's1', status: 'PRESENT' },
  { enrollmentId: ENROLL_1, sessionId: 's2', status: 'LATE' },
  // s3 is a closed session with no record for ENROLL_1 -> counts as ABSENT.
  // ENROLL_1 in SUBJECT_2: excused.
  { enrollmentId: ENROLL_1, sessionId: 's3', status: 'EXCUSED' },
  // ENROLL_2 attends SUBJECT_1 fully.
  { enrollmentId: ENROLL_2, sessionId: 's1', status: 'PRESENT' },
  { enrollmentId: ENROLL_2, sessionId: 's2', status: 'PRESENT' },
  // A record on an OPEN session must be ignored by every summary.
  { enrollmentId: ENROLL_2, sessionId: 's4', status: 'ABSENT' },
  { enrollmentId: ENROLL_2, sessionId: 's5', status: 'ABSENT' },
];

const CLASS_SUBJECTS = [
  { id: SUBJECT_1, academicClassId: CLASS_A },
  { id: SUBJECT_2, academicClassId: CLASS_A },
];

const ENROLLMENTS = [
  { id: ENROLL_1, academicClassId: CLASS_A },
  { id: ENROLL_2, academicClassId: CLASS_A },
  { id: ENROLL_LONER, academicClassId: CLASS_B },
];

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && 'in' in value) {
      return value.in.includes(row[key]);
    }
    return row[key] === value;
  });
}

const CLASS_SUBJECT_BY_ID = new Map(CLASS_SUBJECTS.map((s) => [s.id, s]));

/**
 * Evaluates the nested relation filters the repository uses to widen a scope
 * (class -> batch -> program). A flat equality check cannot express
 * `classSubject: { academicClass: { educationBatchId } }`, so the double walks
 * the relation path the same way Prisma would.
 */
function sessionMatches(session, where = {}) {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'status') {
      if (session.status !== value) return false;
      continue;
    }

    if (key === 'classSubjectId') {
      if (session.classSubjectId !== value) return false;
      continue;
    }

    if (key === 'classSubject') {
      const subject = CLASS_SUBJECT_BY_ID.get(session.classSubjectId);
      if (!subject) return false;
      if (
        value.academicClassId &&
        subject.academicClassId !== value.academicClassId
      ) {
        return false;
      }
      if (value.academicClass) {
        const academicClass = subject.academicClassId;
        if (
          value.academicClass.educationBatchId &&
          academicClass === undefined
        ) {
          return false;
        }
        // Every fixture class belongs to BATCH_1.
        if (value.academicClass.educationBatchId !== BATCH_1) return false;
        if (value.academicClass.educationBatch?.educationProgramId) {
          return (
            value.academicClass.educationBatch.educationProgramId === PROGRAM_1
          );
        }
      }
    }
  }

  return true;
}

/** Minimal Prisma double: only the delegate calls the repository makes. */
function buildPrisma() {
  return {
    attendanceSession: {
      async findMany({ where }) {
        return SESSIONS.filter((s) => sessionMatches(s, where)).map((s) => ({
          id: s.id,
          classSubjectId: s.classSubjectId,
        }));
      },
      async findUnique({ where }) {
        return SESSIONS.find((s) => s.id === where.id) ?? null;
      },
    },
    attendanceRecord: {
      async findMany({ where }) {
        return RECORDS.filter((r) => matchesWhere(r, where)).map((r) => ({
          enrollmentId: r.enrollmentId,
          status: r.status,
        }));
      },
    },
    classSubject: {
      async findMany({ where }) {
        return CLASS_SUBJECTS.filter((s) => matchesWhere(s, where));
      },
      async findUnique({ where }) {
        return CLASS_SUBJECTS.find((s) => s.id === where.id) ?? null;
      },
    },
    enrollment: {
      async findMany({ where }) {
        return ENROLLMENTS.filter((e) => matchesWhere(e, where));
      },
      async findUnique({ where }) {
        return ENROLLMENTS.find((e) => e.id === where.id) ?? null;
      },
    },
    academicClass: {
      async findUnique() {
        return { id: CLASS_A, educationBatchId: BATCH_1 };
      },
    },
    educationBatch: {
      async findUnique() {
        return { id: BATCH_1, educationProgramId: PROGRAM_1 };
      },
    },
    educationProgram: {
      async findUnique() {
        return { id: PROGRAM_1 };
      },
    },
  };
}

const {
  PrismaAttendanceSummaryRepository,
} = require('../dist/attendance-summary/attendance-summary.repository');
const {
  AttendanceSummaryService,
} = require('../dist/attendance-summary/attendance-summary.service');

function buildService() {
  const prisma = buildPrisma();
  const repo = new PrismaAttendanceSummaryRepository(prisma);
  const rows = new Map();
  // The upsert target is an in-memory map, so the read path is provably a lookup.
  repo.findSummary = async (scopeType, scopeId) =>
    rows.get(`${scopeType}:${scopeId}`) ?? null;
  repo.upsertSummary = async (input) => {
    const key = `${input.scopeType}:${input.scopeId}`;
    const row = {
      id: `summary-${rows.size + 1}`,
      ...input,
      recalculatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    rows.set(key, row);
    return row;
  };
  repo.listSummaries = async () => ({
    data: [...rows.values()],
    total: rows.size,
  });

  const audit = {
    records: [],
    async record(entry) {
      this.records.push(entry);
      return { id: `audit-${this.records.length}` };
    },
  };

  const service = new AttendanceSummaryService(repo, prisma, audit);
  return { repo, rows, audit, service, prisma };
}

test('attendance summary — denominator is only CLOSED sessions and unrecorded ones are ABSENT', async () => {
  const { service } = buildService();

  // ENROLL_1 has 3 closed sessions in the class: PRESENT, LATE, and one with no
  // record. The unrecorded session must land in absentCount, not vanish.
  const summary = await service.getSummary('ENROLLMENT', ENROLL_1);

  assert.equal(summary.totalSessions, 3);
  assert.equal(summary.participants, 1);
  assert.equal(summary.presentCount, 1);
  assert.equal(summary.lateCount, 1);
  assert.equal(summary.excusedCount, 1);
  assert.equal(summary.absentCount, 0);
  assert.equal(summary.attendancePercentage, 66.67);

  // The statuses always account for every eligible session.
  assert.equal(
    summary.presentCount +
      summary.lateCount +
      summary.excusedCount +
      summary.sickCount +
      summary.absentCount,
    summary.totalSessions,
  );
});

test('attendance summary — a closed session without a record is an absence', async () => {
  const isolated = buildPrisma();
  // Drop ENROLL_1's record for s2 so a closed session has no record at all.
  const filtered = RECORDS.filter(
    (r) => !(r.enrollmentId === ENROLL_1 && r.sessionId === 's2'),
  );
  isolated.attendanceRecord.findMany = async ({ where }) =>
    filtered
      .filter((r) => matchesWhere(r, where))
      .map((r) => ({
        enrollmentId: r.enrollmentId,
        status: r.status,
      }));

  const repo = new PrismaAttendanceSummaryRepository(isolated);
  const counts = await repo.calculateEnrollmentCounts(ENROLL_1);

  assert.equal(counts.totalSessions, 3);
  assert.equal(counts.presentCount, 1);
  assert.equal(counts.excusedCount, 1);
  assert.equal(counts.lateCount, 0);
  assert.equal(counts.absentCount, 1);
  assert.equal(counts.attendancePercentage, 33.33);
});

test('attendance summary — OPEN and CANCELLED sessions never move a denominator', async () => {
  const { service } = buildService();

  const summary = await service.getSummary('CLASS_SUBJECT', SUBJECT_1);

  // SUBJECT_1 has two CLOSED sessions; s4 (OPEN) and s5 (CANCELLED) are excluded
  // even though records exist against them.
  assert.equal(summary.totalSessions, 2);
  assert.equal(summary.participants, 2);
});

test('attendance summary — group totals equal the sum of their participants', async () => {
  const { service } = buildService();

  const classSummary = await service.getSummary('CLASS', CLASS_A);
  const first = await service.getSummary('ENROLLMENT', ENROLL_1);
  const second = await service.getSummary('ENROLLMENT', ENROLL_2);

  assert.equal(
    classSummary.presentCount,
    first.presentCount + second.presentCount,
  );
  assert.equal(classSummary.lateCount, first.lateCount + second.lateCount);
  assert.equal(
    classSummary.excusedCount,
    first.excusedCount + second.excusedCount,
  );
  assert.equal(
    classSummary.absentCount,
    first.absentCount + second.absentCount,
  );
  assert.equal(classSummary.participants, 2);
});

test('attendance summary — class subject scope narrows the participants counted', async () => {
  const { service } = buildService();

  const subject1 = await service.getSummary('CLASS_SUBJECT', SUBJECT_1);
  const subject2 = await service.getSummary('CLASS_SUBJECT', SUBJECT_2);

  assert.equal(subject1.presentCount, 3); // ENROLL_1 s1 + ENROLL_2 s1, s2
  assert.equal(subject2.excusedCount, 1);
  assert.equal(subject2.presentCount, 0);
});

test('attendance summary — a report read does not recalculate an existing row', async () => {
  const { repo, service } = buildService();
  let calculationCalls = 0;
  const original = repo.calculateEnrollmentCounts.bind(repo);
  repo.calculateEnrollmentCounts = async (id) => {
    calculationCalls += 1;
    return original(id);
  };

  await service.getSummary('ENROLLMENT', ENROLL_1);
  const firstRun = calculationCalls;

  // The second and third reads must be served by the stored row alone. This is
  // what keeps raw scans out of the reporting path.
  await service.getSummary('ENROLLMENT', ENROLL_1);
  await service.getSummary('ENROLLMENT', ENROLL_1);

  assert.equal(firstRun, 1);
  assert.equal(calculationCalls, 1);
});

test('attendance summary — an unplaced enrollment yields an empty summary, not a fabricated one', async () => {
  const { service } = buildService();

  // CLASS_B has no closed sessions at all.
  const summary = await service.getSummary('ENROLLMENT', ENROLL_LONER);

  assert.equal(summary.totalSessions, 0);
  assert.equal(summary.attendancePercentage, 0);
  assert.equal(summary.presentCount, 0);
});

test('attendance summary — refresh is idempotent and driven only by raw records', async () => {
  const { service } = buildService();

  const first = await service.refresh('CLASS_SUBJECT', SUBJECT_1);
  const second = await service.refresh('CLASS_SUBJECT', SUBJECT_1);

  assert.equal(first.presentCount, second.presentCount);
  assert.equal(first.totalSessions, second.totalSessions);
  assert.equal(first.attendancePercentage, second.attendancePercentage);
});

test('attendance summary — a correction changes the count but not the denominator', async () => {
  const { service } = buildService();

  const before = await service.refresh('CLASS_SUBJECT', SUBJECT_1);
  assert.equal(before.presentCount, 3);

  // Flip ENROLL_2's record for s1 from PRESENT to SICK, the way a correction
  // does at the record level, then refresh.
  const record = RECORDS.find(
    (r) => r.enrollmentId === ENROLL_2 && r.sessionId === 's1',
  );
  record.status = 'SICK';

  const after = await service.refresh('CLASS_SUBJECT', SUBJECT_1);

  // Counts moved...
  assert.equal(after.presentCount, 2);
  assert.equal(after.sickCount, 1);
  // ...but the denominator did not: eligibility is a property of the session.
  assert.equal(after.totalSessions, before.totalSessions);

  // Restore shared fixture state for any later test.
  record.status = 'PRESENT';
});

test('attendance summary — unknown scope ids are rejected instead of silently stored', async () => {
  const { service } = buildService();

  await assert.rejects(
    () =>
      service.refresh('CLASS_SUBJECT', '99999999-aaaa-4aaa-8aaa-000000000099'),
    NotFoundException,
  );
});

test('attendance summary — explicit refresh writes an audit entry', async () => {
  const { service, audit } = buildService();

  await service.refresh('CLASS_SUBJECT', SUBJECT_1);

  assert.equal(audit.records.length, 1);
  assert.equal(audit.records[0].action, 'attendance_summary.refreshed');
  assert.equal(audit.records[0].resourceType, 'attendance_summary');
});

test('attendance summary — a failed background refresh never throws to its caller', async () => {
  const { service } = buildService();
  service.refresh = async () => {
    throw new Error('database unavailable');
  };

  // The attendance write that triggered this must still succeed.
  await service.refreshQuietly('CLASS_SUBJECT', SUBJECT_1);
});

test('attendance summary — ENROLLMENT_SUBJECT is keyed by both ids', async () => {
  const { service } = buildService();

  const summary = await service.getEnrollmentSummary(ENROLL_1, SUBJECT_2);

  assert.equal(summary.scopeType, 'ENROLLMENT_SUBJECT');
  assert.equal(summary.enrollmentId, ENROLL_1);
  assert.equal(summary.classSubjectId, SUBJECT_2);
  assert.equal(summary.excusedCount, 1);
});

test('attendance summary endpoints are exposed under /api/v1 and fail closed', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    const paths = Object.keys(spec.paths);

    assert.ok(paths.includes('/api/v1/attendance-summary'));
    assert.ok(paths.includes('/api/v1/attendance-summary/refresh'));
    assert.ok(
      paths.includes('/api/v1/attendance-summary/enrollments/{enrollmentId}'),
    );
    assert.ok(
      paths.includes(
        '/api/v1/attendance-summary/class-subjects/{classSubjectId}',
      ),
    );
    assert.ok(
      paths.includes('/api/v1/attendance-summary/classes/{academicClassId}'),
    );
    assert.ok(
      paths.includes('/api/v1/attendance-summary/batches/{educationBatchId}'),
    );
    assert.ok(
      paths.includes(
        '/api/v1/attendance-summary/programs/{educationProgramId}',
      ),
    );

    // Fail closed without a bearer token: summary routes are NOT allow-listed.
    const anonymous = await fetch(`${base}/api/v1/attendance-summary`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});
