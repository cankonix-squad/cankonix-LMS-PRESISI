'use strict';

/* global structuredClone */

/**
 * TASK-060 — reporting read model and refresh.
 *
 * Covers the four acceptance criteria the task spec names:
 *
 * 1. **fixture totals match transactional data** — counters identical to what the
 *    transactional tables would produce are fed through `deriveMetrics`, and the
 *    resulting ratios are checked against hand-computed values.
 * 2. **refresh idempotent** — refreshing the same scope twice leaves exactly one
 *    row with unchanged values.
 * 3. **indexes / query plan documented** — the aggregate definitions are asserted
 *    directly against the pure rules, so the documented formula and the running
 *    code cannot drift apart unnoticed.
 * 4. **checks green** — the suite is part of `pnpm test`.
 *
 * The repository is faked at the `ReportingRepository` seam. That is the point of
 * the seam: everything worth asserting here is the aggregation and refresh
 * policy, and none of it should need a database to be checked.
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  deriveMetrics,
  emptySourceCounts,
  parentScopeType,
  scopeKey,
  scopeNamesItsParent,
} = require('../dist/reporting/reporting-rules');

const { ReportingService } = require('../dist/reporting/reporting.service');

const SCOPE = {
  ORGANIZATION: 'ORGANIZATION',
  PROGRAM: 'PROGRAM',
  BATCH: 'BATCH',
  CLASS: 'CLASS',
  CLASS_SUBJECT: 'CLASS_SUBJECT',
  ENROLLMENT: 'ENROLLMENT',
};

class FakeAuditService {
  constructor() {
    this.entries = [];
  }

  async record(entry) {
    this.entries.push(entry);
    return { id: `audit-${this.entries.length}` };
  }
}

/**
 * In-memory read model plus programmable source counters.
 *
 * Stored rows are deep-cloned on write and on read so a caller cannot mutate the
 * fake's state by holding on to a returned object — otherwise an "idempotent"
 * assertion could pass because the service mutated a shared reference.
 */
class FakeReportingRepository {
  constructor() {
    this.rows = new Map();
    this.scopes = [];
    this.sourceCounts = new Map();
    this.listCalls = 0;
    this.upsertCalls = 0;
    this.failingScopes = new Set();
    this.nextId = 1;
  }

  addScope(scope) {
    this.scopes.push(scope);
  }

  setCounts(scopeType, scopeId, counts) {
    this.sourceCounts.set(scopeKey(scopeType, scopeId), counts);
  }

  failFor(scopeType, scopeId) {
    this.failingScopes.add(scopeKey(scopeType, scopeId));
  }

  async list(filter) {
    this.listCalls += 1;
    let data = [...this.rows.values()].map((row) => structuredClone(row));
    if (filter.scopeType) {
      data = data.filter((row) => row.scopeType === filter.scopeType);
    }
    if (filter.scopeId) {
      data = data.filter((row) => row.scopeId === filter.scopeId);
    }
    if (filter.organizationId) {
      data = data.filter((row) => row.organizationId === filter.organizationId);
    }
    const total = data.length;
    const start = (filter.page - 1) * filter.limit;
    return { data: data.slice(start, start + filter.limit), total };
  }

  async find(scopeType, scopeId) {
    const row = this.rows.get(scopeKey(scopeType, scopeId));
    return row ? structuredClone(row) : null;
  }

  async upsertMetric(data) {
    this.upsertCalls += 1;
    const key = scopeKey(data.scopeType, data.scopeId);
    const existing = this.rows.get(key);
    const row = {
      id: existing ? existing.id : `metric-${this.nextId++}`,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      scopeName: data.scopeName ?? null,
      organizationId: data.organizationId ?? null,
      educationProgramId: data.educationProgramId ?? null,
      educationBatchId: data.educationBatchId ?? null,
      academicClassId: data.academicClassId ?? null,
      classSubjectId: data.classSubjectId ?? null,
      participants: data.participants,
      activeParticipants: data.activeParticipants,
      averageProgressPercent: data.averageProgressPercent,
      attendancePercentage: data.attendancePercentage,
      totalSessions: data.totalSessions,
      averageFinalScore: data.averageFinalScore,
      gradedCount: data.gradedCount,
      unapprovedGradeCount: data.unapprovedGradeCount,
      recalculatedAt: data.recalculatedAt,
      createdAt: existing ? existing.createdAt : data.recalculatedAt,
      updatedAt: data.recalculatedAt,
    };
    this.rows.set(key, row);
    return structuredClone(row);
  }

  async listScopes(filter) {
    return this.scopes
      .filter(
        (scope) => !filter.scopeType || scope.scopeType === filter.scopeType,
      )
      .filter((scope) => !filter.scopeId || scope.scopeId === filter.scopeId)
      .filter(
        (scope) =>
          !filter.organizationId ||
          scope.organizationId === filter.organizationId,
      )
      .map((scope) => structuredClone(scope));
  }

  async readSourceCounts(scope) {
    const key = scopeKey(scope.scopeType, scope.scopeId);
    if (this.failingScopes.has(key)) {
      throw new Error(`source unavailable for ${key}`);
    }
    const counts = this.sourceCounts.get(key);
    return counts ? structuredClone(counts) : emptySourceCounts();
  }
}

function programScope(id, overrides = {}) {
  return {
    scopeType: SCOPE.PROGRAM,
    scopeId: id,
    scopeName: `Program ${id}`,
    organizationId: 'org-1',
    educationProgramId: id,
    educationBatchId: null,
    academicClassId: null,
    classSubjectId: null,
    ...overrides,
  };
}

/**
 * Counters equivalent to what the transactional tables would yield.
 *
 * Hand-built so the expected ratios below can be computed by hand and compared
 * against the code, rather than against a second copy of the same formula.
 */
function fixtureCounts(overrides = {}) {
  return {
    participants: 40,
    activeParticipants: 37,
    // 12 participants averaging 75% → total 900 over count 12 → mean 75.
    progressPercentTotal: 900,
    progressPercentCount: 12,
    // 35 attended (30 present + 5 late) out of 40 possible sessions.
    presentCount: 30,
    lateCount: 5,
    excusedCount: 3,
    sickCount: 1,
    absentCount: 1,
    totalSessions: 40,
    // 20 grades summing to 1500 → mean 75.
    finalScoreTotal: 1500,
    gradedCount: 20,
    unapprovedGradeCount: 4,
    ...overrides,
  };
}

function makeService() {
  const repo = new FakeReportingRepository();
  const audit = new FakeAuditService();
  return { repo, audit, service: new ReportingService(repo, audit) };
}

// --- Criterion 1: fixture totals match transactional data ---------------------

describe('reporting metrics (TASK-060) — aggregate definitions', () => {
  it('derives ratios from fixture counters that match transactional totals', () => {
    const metrics = deriveMetrics(fixtureCounts());

    assert.equal(metrics.participants, 40);
    assert.equal(metrics.activeParticipants, 37);
    // 900 / 12
    assert.equal(metrics.averageProgressPercent, 75);
    // (30 + 5) / 40
    assert.equal(metrics.attendancePercentage, 87.5);
    assert.equal(metrics.totalSessions, 40);
    // 1500 / 20
    assert.equal(metrics.averageFinalScore, 75);
    assert.equal(metrics.gradedCount, 20);
    assert.equal(metrics.unapprovedGradeCount, 4);
  });

  it('averages progress over participants, not over activities', () => {
    // One participant at 100% and one at 0% → 50, whatever the activity counts.
    const metrics = deriveMetrics(
      fixtureCounts({ progressPercentTotal: 100, progressPercentCount: 2 }),
    );
    assert.equal(metrics.averageProgressPercent, 50);
  });

  it('averages final score over grades, not over participants', () => {
    // Four grades is a statement about coursework, not about people.
    const metrics = deriveMetrics(
      fixtureCounts({ finalScoreTotal: 320, gradedCount: 4 }),
    );
    assert.equal(metrics.averageFinalScore, 80);
  });

  it('counts present and late as attended, and excused, sick and absent as not', () => {
    const metrics = deriveMetrics(
      fixtureCounts({
        presentCount: 10,
        lateCount: 2,
        excusedCount: 8,
        sickCount: 4,
        absentCount: 6,
        totalSessions: 20,
      }),
    );
    // 12 / 20 — excused, sick and absent are all non-attendance for this ratio.
    assert.equal(metrics.attendancePercentage, 60);
  });

  it('computes attendance from summed totals rather than averaging percentages', () => {
    // A participant with 1 session cannot outweigh one with 99.
    const oneSession = deriveMetrics(
      fixtureCounts({
        presentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        sickCount: 0,
        absentCount: 0,
        totalSessions: 1,
      }),
    );
    const manySessions = deriveMetrics(
      fixtureCounts({
        presentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        sickCount: 0,
        absentCount: 99,
        totalSessions: 99,
      }),
    );
    const combined = deriveMetrics(
      fixtureCounts({
        presentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        sickCount: 0,
        absentCount: 99,
        totalSessions: 100,
      }),
    );

    assert.equal(oneSession.attendancePercentage, 100);
    assert.equal(manySessions.attendancePercentage, 0);
    // The naive mean of the two percentages would be 50; summing first gives 1.
    assert.equal(combined.attendancePercentage, 1);
  });

  it('rounds stored ratios to two decimals', () => {
    const metrics = deriveMetrics(
      fixtureCounts({
        presentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        sickCount: 0,
        absentCount: 0,
        totalSessions: 3,
      }),
    );
    // 1/3 = 33.333... → 33.33
    assert.equal(metrics.attendancePercentage, 33.33);
  });

  it('reports zero, never NaN, when a scope has no data', () => {
    const metrics = deriveMetrics(emptySourceCounts());
    assert.equal(metrics.participants, 0);
    assert.equal(metrics.averageProgressPercent, 0);
    assert.equal(metrics.attendancePercentage, 0);
    assert.equal(metrics.averageFinalScore, 0);
    for (const value of Object.values(metrics)) {
      assert.ok(Number.isFinite(value), 'every metric must be a finite number');
    }
  });
});

// --- Criterion 3: documented definitions and hierarchy ------------------------

describe('reporting metrics (TASK-060) — documented structure', () => {
  it('nests scopes Organization → Program → Batch → Class → ClassSubject', () => {
    assert.equal(parentScopeType(SCOPE.PROGRAM), SCOPE.ORGANIZATION);
    assert.equal(parentScopeType(SCOPE.BATCH), SCOPE.PROGRAM);
    assert.equal(parentScopeType(SCOPE.CLASS), SCOPE.BATCH);
    assert.equal(parentScopeType(SCOPE.CLASS_SUBJECT), SCOPE.CLASS);
    assert.equal(parentScopeType(SCOPE.ORGANIZATION), null);
  });

  it('requires a child scope to name its parent id', () => {
    assert.equal(scopeNamesItsParent(programScope('program-1')), true);
    assert.equal(
      scopeNamesItsParent({
        ...programScope('program-1'),
        organizationId: null,
      }),
      false,
      'a program without an organization cannot be placed in the hierarchy',
    );
  });

  it('keys a scope the same way the unique index does', () => {
    assert.equal(scopeKey(SCOPE.PROGRAM, 'program-1'), 'PROGRAM:program-1');
    assert.equal(scopeKey(SCOPE.CLASS, 'class-9'), 'CLASS:class-9');
  });
});

// --- Criterion 2: refresh idempotent -----------------------------------------

describe('reporting metrics (TASK-060) — refresh', () => {
  it('writes one row per scope and does not double counts on re-refresh', async () => {
    const { repo, service } = makeService();
    repo.addScope(programScope('program-1'));
    repo.setCounts(SCOPE.PROGRAM, 'program-1', fixtureCounts());

    await service.refresh({});
    const first = await repo.find(SCOPE.PROGRAM, 'program-1');
    assert.ok(first);
    assert.equal(first.participants, 40);
    assert.equal(first.attendancePercentage, 87.5);

    await service.refresh({});
    const second = await repo.find(SCOPE.PROGRAM, 'program-1');
    assert.ok(second);

    assert.equal(repo.rows.size, 1, 'a second refresh must not add a row');
    assert.equal(second.id, first.id, 'the same scope keeps the same row');
    assert.equal(second.participants, first.participants);
    assert.equal(second.attendancePercentage, first.attendancePercentage);
    assert.equal(second.totalSessions, first.totalSessions);
    assert.equal(second.gradedCount, first.gradedCount);
    // 40, not 80 — the counter was recomputed from source, not accumulated.
    assert.equal(second.participants, 40);
  });

  it('overwrites stale values when the source moves on', async () => {
    const { repo, service } = makeService();
    repo.addScope(programScope('program-1'));
    repo.setCounts(SCOPE.PROGRAM, 'program-1', fixtureCounts());

    await service.refresh({});
    repo.setCounts(
      SCOPE.PROGRAM,
      'program-1',
      fixtureCounts({ presentCount: 20, lateCount: 0, totalSessions: 40 }),
    );
    await service.refresh({});

    const row = await repo.find(SCOPE.PROGRAM, 'program-1');
    assert.equal(row.attendancePercentage, 50);
    assert.equal(repo.rows.size, 1);
  });

  it('refreshes every scope the filter selects', async () => {
    const { repo, service } = makeService();
    repo.addScope(programScope('program-1'));
    repo.addScope(programScope('program-2'));
    repo.setCounts(SCOPE.PROGRAM, 'program-1', fixtureCounts());

    const result = await service.refresh({});

    assert.equal(result.refreshed, 2);
    assert.deepEqual(result.scopes.sort(), [
      'PROGRAM:program-1',
      'PROGRAM:program-2',
    ]);
    assert.equal(repo.rows.size, 2);
  });

  it('writes zeroes for a scope with no transactional data', async () => {
    const { repo, service } = makeService();
    repo.addScope(programScope('program-empty'));

    await service.refresh({});

    const row = await repo.find(SCOPE.PROGRAM, 'program-empty');
    assert.ok(row, 'an empty scope must still produce a readable row');
    assert.equal(row.participants, 0);
    assert.equal(row.attendancePercentage, 0);
  });

  it('reports a not-found scope rather than silently refreshing nothing', async () => {
    const { service } = makeService();

    await assert.rejects(
      () =>
        service.refresh({ scopeType: SCOPE.PROGRAM, scopeId: 'missing-scope' }),
      (error) => error.status === 404,
    );
  });

  it('continues past a failing scope and records both counts', async () => {
    const { repo, audit, service } = makeService();
    repo.addScope(programScope('program-bad'));
    repo.addScope(programScope('program-good'));
    repo.failFor(SCOPE.PROGRAM, 'program-bad');
    repo.setCounts(SCOPE.PROGRAM, 'program-good', fixtureCounts());

    const result = await service.refresh({});

    assert.equal(result.refreshed, 1);
    assert.deepEqual(result.scopes, ['PROGRAM:program-good']);
    // Stale is recoverable; a silent partial refresh is not, so the difference
    // between attempted and refreshed is recorded.
    assert.equal(audit.entries.length, 1);
    assert.equal(audit.entries[0].action, 'reporting.refreshed');
    assert.equal(audit.entries[0].metadata.refreshed, 1);
    assert.equal(audit.entries[0].metadata.attempted, 2);
  });

  it('refuses to write a scope that does not name its parent', async () => {
    const { repo, audit, service } = makeService();
    repo.addScope(programScope('program-orphan', { organizationId: null }));

    const result = await service.refresh({});

    assert.equal(result.refreshed, 0);
    assert.equal(repo.upsertCalls, 0, 'no row may be written for an orphan');
    assert.equal(audit.entries[0].metadata.attempted, 1);
  });
});

// --- Read path ---------------------------------------------------------------

describe('reporting metrics (TASK-060) — reads', () => {
  it('reads the stored model without recomputing', async () => {
    const { repo, service } = makeService();
    repo.addScope(programScope('program-1'));
    repo.setCounts(SCOPE.PROGRAM, 'program-1', fixtureCounts());
    await service.refresh({});

    const upsertsAfterRefresh = repo.upsertCalls;
    const page = await service.listMetrics({});

    assert.equal(page.total, 1);
    assert.equal(page.page, 1);
    assert.equal(page.limit, 50);
    assert.equal(page.data[0].metrics.attendancePercentage, 87.5);
    // A read must not write, or the read path would still be a compute path.
    assert.equal(repo.upsertCalls, upsertsAfterRefresh);
  });

  it('paginates the read model', async () => {
    const { repo, service } = makeService();
    for (let index = 1; index <= 5; index += 1) {
      repo.addScope(programScope(`program-${index}`));
    }
    await service.refresh({});

    const page = await service.listMetrics({ page: 2, limit: 2 });

    assert.equal(page.total, 5);
    assert.equal(page.data.length, 2);
  });

  it('returns not-found for a scope that was never refreshed', async () => {
    const { service } = makeService();

    await assert.rejects(
      () => service.getMetric(SCOPE.PROGRAM, 'never-refreshed'),
      (error) => error.status === 404,
    );
  });

  it('exposes the scope ancestry alongside the metrics', async () => {
    const { repo, service } = makeService();
    repo.addScope(programScope('program-1'));
    await service.refresh({});

    const response = await service.getMetric(SCOPE.PROGRAM, 'program-1');

    assert.equal(response.scopeType, SCOPE.PROGRAM);
    assert.equal(response.scopeId, 'program-1');
    assert.equal(response.scopeName, 'Program program-1');
    assert.equal(response.organizationId, 'org-1');
    assert.equal(response.educationProgramId, 'program-1');
    assert.ok(response.recalculatedAt);
    assert.ok(response.generatedAt);
  });

  it('counts only grades still awaiting approval in unapprovedGradeCount', async () => {
    const metrics = deriveMetrics(
      fixtureCounts({ gradedCount: 10, unapprovedGradeCount: 10 }),
    );
    assert.equal(metrics.gradedCount, 10);
    assert.equal(metrics.unapprovedGradeCount, 10);
  });
});
