const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  LearningProgressService,
} = require('../dist/learning-progress/learning-progress.service');
const {
  LearningProgressStatusDto,
} = require('../dist/learning-progress/dto/learning-progress-status.dto');
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

const CLASS_SUBJECT_1 = 'aaaaaaaa-1111-4aaa-8aaa-000000000001';
const ACADEMIC_CLASS_1 = 'bbbbbbbb-1111-4bbb-8bbb-000000000001';
const ACADEMIC_CLASS_OTHER = 'bbbbbbbb-2222-4bbb-8bbb-000000000002';
const ENROLLMENT_1 = 'cccccccc-1111-4ccc-8ccc-000000000001';
const ENROLLMENT_OTHER_CLASS = 'cccccccc-2222-4ccc-8ccc-000000000002';
const ACTIVITY_1 = 'dddddddd-1111-4ddd-8ddd-000000000001';
const ACTIVITY_REQUIRED = 'dddddddd-2222-4ddd-8ddd-000000000002';
const ACTIVITY_DRAFT = 'dddddddd-3333-4ddd-8ddd-000000000003';

class MemoryLearningProgressRepository {
  constructor() {
    this.records = [];
    this.aggregates = [];
    this.next = 1;
    this.nextAgg = 1;

    // Default seeded contexts for test setup
    this.activities = new Map([
      [
        ACTIVITY_1,
        {
          activityId: ACTIVITY_1,
          activityStatus: 'PUBLISHED',
          activityRequired: false,
          meetingId: 'meeting-1',
          meetingStatus: 'PUBLISHED',
          classSubjectId: CLASS_SUBJECT_1,
          classSubjectStatus: 'ACTIVE',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
      [
        ACTIVITY_REQUIRED,
        {
          activityId: ACTIVITY_REQUIRED,
          activityStatus: 'PUBLISHED',
          activityRequired: true,
          meetingId: 'meeting-1',
          meetingStatus: 'PUBLISHED',
          classSubjectId: CLASS_SUBJECT_1,
          classSubjectStatus: 'ACTIVE',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
      [
        ACTIVITY_DRAFT,
        {
          activityId: ACTIVITY_DRAFT,
          activityStatus: 'DRAFT',
          activityRequired: false,
          meetingId: 'meeting-1',
          meetingStatus: 'PUBLISHED',
          classSubjectId: CLASS_SUBJECT_1,
          classSubjectStatus: 'ACTIVE',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
    ]);

    this.enrollments = new Map([
      [
        ENROLLMENT_1,
        {
          enrollmentId: ENROLLMENT_1,
          personId: 'person-1',
          status: 'ACTIVE',
          educationBatchId: 'batch-1',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
      [
        ENROLLMENT_OTHER_CLASS,
        {
          enrollmentId: ENROLLMENT_OTHER_CLASS,
          personId: 'person-2',
          status: 'ACTIVE',
          educationBatchId: 'batch-1',
          academicClassId: ACADEMIC_CLASS_OTHER,
        },
      ],
    ]);
  }

  async upsert(data, updateData) {
    const existingIndex = this.records.findIndex(
      (r) =>
        r.enrollmentId === data.enrollmentId &&
        r.activityId === data.activityId,
    );
    const now = new Date();

    if (existingIndex >= 0) {
      const existing = this.records[existingIndex];
      this.records[existingIndex] = {
        ...existing,
        ...updateData,
        updatedAt: now,
      };
      return this.records[existingIndex];
    }

    const record = {
      id: `eeeeeeee-eeee-4eee-8eee-${String(this.next++).padStart(12, '0')}`,
      enrollmentId: data.enrollmentId,
      activityId: data.activityId,
      status: data.status,
      progressPercent: data.progressPercent,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      lastAccessedAt: data.lastAccessedAt,
      metadata: data.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByEnrollmentAndActivity(enrollmentId, activityId) {
    return (
      this.records.find(
        (r) => r.enrollmentId === enrollmentId && r.activityId === activityId,
      ) ?? null
    );
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.enrollmentId) {
      filtered = filtered.filter((r) => r.enrollmentId === filter.enrollmentId);
    }
    if (filter.activityId) {
      filtered = filtered.filter((r) => r.activityId === filter.activityId);
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async findActivityContext(activityId) {
    return this.activities.get(activityId) ?? null;
  }

  async findEnrollmentContext(enrollmentId) {
    return this.enrollments.get(enrollmentId) ?? null;
  }

  async getClassSubjectActivityCounts(classSubjectId) {
    const pub = Array.from(this.activities.values()).filter(
      (a) =>
        a.classSubjectId === classSubjectId && a.activityStatus === 'PUBLISHED',
    );
    return {
      classSubjectId,
      totalActivities: pub.length,
      requiredActivities: pub.filter((a) => a.activityRequired).length,
    };
  }

  async getEnrollmentProgressCounts(classSubjectId, enrollmentId) {
    const matching = this.records.filter((r) => {
      const act = this.activities.get(r.activityId);
      return (
        r.enrollmentId === enrollmentId &&
        act &&
        act.classSubjectId === classSubjectId &&
        act.activityStatus === 'PUBLISHED'
      );
    });

    const completed = matching.filter(
      (r) => r.status === LearningProgressStatusDto.COMPLETED,
    );

    let lastActivityAt = null;
    for (const r of matching) {
      const ts = r.completedAt ?? r.lastAccessedAt;
      if (ts && (!lastActivityAt || ts > lastActivityAt)) {
        lastActivityAt = ts;
      }
    }

    return {
      completedActivities: completed.length,
      completedRequiredActivities: completed.filter((r) => {
        const act = this.activities.get(r.activityId);
        return act && act.activityRequired;
      }).length,
      lastActivityAt,
    };
  }

  async upsertAggregate(
    classSubjectId,
    enrollmentId,
    totalActivities,
    completedActivities,
    requiredActivities,
    completedRequiredActivities,
    progressPercent,
    lastActivityAt,
  ) {
    const idx = this.aggregates.findIndex(
      (a) =>
        a.classSubjectId === classSubjectId && a.enrollmentId === enrollmentId,
    );
    const now = new Date();

    if (idx >= 0) {
      this.aggregates[idx] = {
        ...this.aggregates[idx],
        totalActivities,
        completedActivities,
        requiredActivities,
        completedRequiredActivities,
        progressPercent,
        lastActivityAt,
        recalculatedAt: now,
        updatedAt: now,
      };
      return this.aggregates[idx];
    }

    const rec = {
      id: `agg-${String(this.nextAgg++).padStart(8, '0')}`,
      classSubjectId,
      enrollmentId,
      totalActivities,
      completedActivities,
      requiredActivities,
      completedRequiredActivities,
      progressPercent,
      lastActivityAt,
      recalculatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.aggregates.push(rec);
    return rec;
  }

  async findAggregate(classSubjectId, enrollmentId) {
    return (
      this.aggregates.find(
        (a) =>
          a.classSubjectId === classSubjectId &&
          a.enrollmentId === enrollmentId,
      ) ?? null
    );
  }

  async listAggregatesByClassSubject(classSubjectId, page, limit) {
    const filtered = this.aggregates.filter(
      (a) => a.classSubjectId === classSubjectId,
    );
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
    };
  }
}

function build() {
  const repo = new MemoryLearningProgressRepository();
  const audit = new FakeAuditService();
  const service = new LearningProgressService(repo, audit);
  return { repo, audit, service };
}

test('records and updates activity progress incrementally with status-percent consistency', async () => {
  const ctx = build();

  // 1. Initial access -> IN_PROGRESS, 50%
  const first = await ctx.service.recordProgress({
    enrollmentId: ENROLLMENT_1,
    activityId: ACTIVITY_1,
    progressPercent: 50,
  });

  assert.equal(first.status, 'IN_PROGRESS');
  assert.equal(first.progressPercent, 50);
  assert.ok(first.startedAt);
  assert.equal(first.completedAt, null);
  assert.equal(ctx.audit.records.length, 1);
  assert.equal(ctx.audit.records[0].action, 'learning_progress.started');

  // 2. Mark complete -> 100%, COMPLETED
  const completed = await ctx.service.recordProgress({
    enrollmentId: ENROLLMENT_1,
    activityId: ACTIVITY_1,
    status: 'COMPLETED',
  });

  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.progressPercent, 100);
  assert.ok(completed.completedAt);
  assert.equal(ctx.audit.records.length, 2);
  assert.equal(ctx.audit.records[1].action, 'learning_progress.completed');
});

test('completion is idempotent and avoids redundant audit noise on re-calls', async () => {
  const ctx = build();

  // First completion call
  await ctx.service.recordProgress({
    enrollmentId: ENROLLMENT_1,
    activityId: ACTIVITY_1,
    status: 'COMPLETED',
  });

  assert.equal(ctx.audit.records.length, 1);

  // Redundant second completion call with same 100% state
  await ctx.service.recordProgress({
    enrollmentId: ENROLLMENT_1,
    activityId: ACTIVITY_1,
    status: 'COMPLETED',
    progressPercent: 100,
  });

  // Saved record remains completed; audit count does NOT increment because state didn't transition
  const record = await ctx.service.findOne(ENROLLMENT_1, ACTIVITY_1);
  assert.equal(record.status, 'COMPLETED');
  assert.equal(ctx.audit.records.length, 1);
});

test('refuses progress updates when enrollment status is not ACTIVE', async () => {
  const ctx = build();
  ctx.repo.enrollments.get(ENROLLMENT_1).status = 'WITHDRAWN';

  await assert.rejects(
    () =>
      ctx.service.recordProgress({
        enrollmentId: ENROLLMENT_1,
        activityId: ACTIVITY_1,
        progressPercent: 50,
      }),
    UnprocessableEntityException,
  );
});

test('refuses progress updates when activity is in DRAFT status', async () => {
  const ctx = build();

  await assert.rejects(
    () =>
      ctx.service.recordProgress({
        enrollmentId: ENROLLMENT_1,
        activityId: ACTIVITY_DRAFT,
        progressPercent: 10,
      }),
    UnprocessableEntityException,
  );
});

test('refuses progress updates when participant class does not match activity class', async () => {
  const ctx = build();

  await assert.rejects(
    () =>
      ctx.service.recordProgress({
        enrollmentId: ENROLLMENT_OTHER_CLASS,
        activityId: ACTIVITY_1,
        progressPercent: 20,
      }),
    ConflictException,
  );
});

test('enforces consistent status and progressPercent pair', async () => {
  const ctx = build();

  // Contradictory pairs are rejected with BadRequestException
  await assert.rejects(
    () =>
      ctx.service.recordProgress({
        enrollmentId: ENROLLMENT_1,
        activityId: ACTIVITY_1,
        status: 'COMPLETED',
        progressPercent: 50,
      }),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      ctx.service.recordProgress({
        enrollmentId: ENROLLMENT_1,
        activityId: ACTIVITY_1,
        status: 'NOT_STARTED',
        progressPercent: 80,
      }),
    BadRequestException,
  );
});

test('maintains class-subject aggregate incrementally without scanning entire history on dashboard read', async () => {
  const ctx = build();

  // Complete activity 1 (optional)
  await ctx.service.recordProgress({
    enrollmentId: ENROLLMENT_1,
    activityId: ACTIVITY_1,
    status: 'COMPLETED',
  });

  // Complete activity 2 (required)
  await ctx.service.recordProgress({
    enrollmentId: ENROLLMENT_1,
    activityId: ACTIVITY_REQUIRED,
    status: 'COMPLETED',
  });

  const summary = await ctx.service.getParticipantSummary(
    CLASS_SUBJECT_1,
    ENROLLMENT_1,
  );

  assert.equal(summary.classSubject.totalActivities, 2);
  assert.equal(summary.classSubject.completedActivities, 2);
  assert.equal(summary.classSubject.requiredActivities, 1);
  assert.equal(summary.classSubject.completedRequiredActivities, 1);
  assert.equal(summary.classSubject.progressPercent, 100);
  assert.ok(summary.classSubject.lastActivityAt);

  // Listing summaries for the class subject returns pre-aggregated items
  const list = await ctx.service.listClassSubjectSummaries(CLASS_SUBJECT_1);
  assert.equal(list.total, 1);
  assert.equal(list.data[0].progressPercent, 100);
});

test('learning progress endpoints are exposed in OpenAPI and require authentication', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/learning-progress'].post);
    assert.ok(spec.paths['/api/v1/learning-progress'].get);
    assert.ok(
      spec.paths[
        '/api/v1/learning-progress/summary/class-subjects/{classSubjectId}'
      ].get,
    );
    assert.ok(
      spec.paths[
        '/api/v1/learning-progress/summary/class-subjects/{classSubjectId}/enrollments/{enrollmentId}'
      ].get,
    );
    assert.ok(
      spec.paths[
        '/api/v1/learning-progress/enrollments/{enrollmentId}/activities/{activityId}'
      ].get,
    );

    const anonymous = await fetch(`${base}/api/v1/learning-progress`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});
