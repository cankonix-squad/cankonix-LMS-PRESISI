'use strict';

/**
 * TASK-064 — graduation/pass/fail/remedial trend reporting.
 *
 * The tests stay on the reporting boundary: trend reads consume stored
 * `reporting_metrics` rows. Transactional graduation/evaluation/certificate
 * tables are read only during an explicit reporting refresh, never here.
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  GraduationTrendService,
} = require('../dist/reporting/graduation-trend.service');
const {
  buildGraduationTrends,
  graduationPeriodKey,
} = require('../dist/reporting/graduation-trend-rules');

const LEVEL = {
  ORGANIZATION: 'ORGANIZATION',
  PROGRAM: 'PROGRAM',
  BATCH: 'BATCH',
  CLASS: 'CLASS',
  CLASS_SUBJECT: 'CLASS_SUBJECT',
  ENROLLMENT: 'ENROLLMENT',
};

function metricRow(overrides = {}) {
  return {
    id: overrides.id ?? overrides.scopeId ?? 'row-1',
    scopeType: LEVEL.BATCH,
    scopeId: 'batch-1',
    scopeName: 'Batch 1',
    organizationId: 'org-1',
    educationProgramId: 'program-1',
    educationBatchId: 'batch-1',
    academicClassId: null,
    classSubjectId: null,
    participants: 10,
    activeParticipants: 10,
    averageProgressPercent: 0,
    attendancePercentage: 0,
    totalSessions: 0,
    averageFinalScore: 0,
    gradedCount: 0,
    unapprovedGradeCount: 0,
    attendedCount: 0,
    progressPercentTotal: 0,
    progressSampleCount: 0,
    finalScoreTotal: 0,
    graduationEvaluationCount: 10,
    graduationEligibleCount: 8,
    graduationApprovedCount: 7,
    graduationPassCount: 5,
    graduationFailCount: 1,
    graduationRemedialCount: 1,
    graduationWithdrawnCount: 0,
    graduatedCount: 4,
    periodStart: new Date('2026-01-01T00:00:00.000Z'),
    periodEnd: new Date('2026-06-30T00:00:00.000Z'),
    recalculatedAt: new Date('2026-09-20T00:00:00.000Z'),
    createdAt: new Date('2026-09-20T00:00:00.000Z'),
    updatedAt: new Date('2026-09-20T00:00:00.000Z'),
    ...overrides,
  };
}

class FakeReportingRepository {
  constructor(rows) {
    this.rows = rows;
    this.trendFilters = [];
    this.sourceCountCalls = 0;
    this.upsertCalls = 0;
  }

  async list() {
    throw new Error('not used');
  }

  async find() {
    throw new Error('not used');
  }

  async upsertMetric() {
    this.upsertCalls += 1;
    throw new Error('Trend reads must not write reporting metrics');
  }

  async listScopes() {
    throw new Error('Trend reads must not enumerate transactional scopes');
  }

  async readSourceCounts() {
    this.sourceCountCalls += 1;
    throw new Error('Trend reads must not read transactional source counts');
  }

  async readExecutiveSums() {
    throw new Error('not used');
  }

  async countExecutiveScopes() {
    throw new Error('not used');
  }

  async listExecutiveBreakdown() {
    throw new Error('not used');
  }

  async listKpiTrendRows(filter, limit) {
    this.trendFilters.push(filter);
    return this.filterRows(filter).slice(0, limit);
  }

  filterRows(filter) {
    return this.rows.filter((row) => {
      if (filter.level && row.scopeType !== filter.level) return false;
      const axes = [
        [filter.organizationIds, row.organizationId],
        [filter.programIds, row.educationProgramId],
        [filter.batchIds, row.educationBatchId],
        [filter.classIds, row.academicClassId],
        [filter.classSubjectIds, row.classSubjectId],
      ];
      const unrestricted = axes.every(([allowed]) => allowed === null);
      if (
        !unrestricted &&
        !axes.some(
          ([allowed, value]) => allowed !== null && allowed.includes(value),
        )
      ) {
        return false;
      }
      if (
        filter.periodFrom &&
        row.periodStart &&
        row.periodStart < filter.periodFrom
      ) {
        return false;
      }
      if (filter.periodTo && row.periodEnd && row.periodEnd > filter.periodTo) {
        return false;
      }
      return true;
    });
  }
}

class StubScopeResolver {
  constructor(grant) {
    this.grant = grant;
  }

  async resolveGrant() {
    return this.grant;
  }
}

const UNRESTRICTED_GRANT = {
  unrestricted: true,
  organizationIds: [],
  programIds: [],
  batchIds: [],
  classIds: [],
  classSubjectIds: [],
};

function scopedGrant(organizationIds) {
  return {
    unrestricted: false,
    organizationIds,
    programIds: [],
    batchIds: [],
    classIds: [],
    classSubjectIds: [],
  };
}

describe('graduation trends (TASK-064) — pure rules', () => {
  it('aggregates pass, fail and remedial counts by cohort period', () => {
    const trends = buildGraduationTrends(
      [
        metricRow({ scopeId: 'batch-a', graduationPassCount: 5 }),
        metricRow({
          scopeId: 'batch-b',
          graduationEvaluationCount: 20,
          graduationEligibleCount: 15,
          graduationApprovedCount: 10,
          graduationPassCount: 8,
          graduationFailCount: 1,
          graduationRemedialCount: 1,
          graduatedCount: 6,
        }),
      ],
      12,
      'COHORT',
    );

    assert.equal(trends.length, 1);
    assert.equal(trends[0].period, '2026-01-01/2026-06-30');
    assert.equal(trends[0].scopeCount, 2);
    assert.equal(trends[0].evaluationCount, 30);
    assert.equal(trends[0].passCount, 13);
    assert.equal(trends[0].failCount, 2);
    assert.equal(trends[0].remedialCount, 2);
    assert.equal(trends[0].passRate, 76.47);
    assert.equal(trends[0].failRate, 11.76);
    assert.equal(trends[0].remedialRate, 11.76);
    assert.equal(trends[0].certificationRate, 76.92);
  });

  it('supports month, quarter and year period granularity', () => {
    const row = metricRow({
      periodStart: new Date('2026-05-15T00:00:00.000Z'),
    });

    assert.equal(graduationPeriodKey(row, 'MONTH'), '2026-05');
    assert.equal(graduationPeriodKey(row, 'QUARTER'), '2026-Q2');
    assert.equal(graduationPeriodKey(row, 'YEAR'), '2026');
  });
});

describe('graduation trends (TASK-064) — service', () => {
  it('applies caller scope and reads only the reporting read model', async () => {
    const repo = new FakeReportingRepository([
      metricRow({ scopeId: 'batch-a', organizationId: 'org-a' }),
      metricRow({ scopeId: 'batch-b', organizationId: 'org-b' }),
    ]);
    const service = new GraduationTrendService(
      repo,
      new StubScopeResolver(scopedGrant(['org-a'])),
    );

    const response = await service.trends('account-1', {
      level: 'BATCH',
      granularity: 'YEAR',
      limit: 6,
    });

    assert.equal(response.scope.accessLevel, 'SCOPED');
    assert.equal(response.level, LEVEL.BATCH);
    assert.equal(response.granularity, 'YEAR');
    assert.equal(response.trends.length, 1);
    assert.equal(response.trends[0].scopeCount, 1);
    assert.equal(repo.trendFilters[0].level, LEVEL.BATCH);
    assert.deepEqual(repo.trendFilters[0].organizationIds, ['org-a']);
    assert.equal(repo.sourceCountCalls, 0);
    assert.equal(repo.upsertCalls, 0);
  });

  it('denies an empty grant before repository reads', async () => {
    const repo = new FakeReportingRepository([]);
    const service = new GraduationTrendService(
      repo,
      new StubScopeResolver({
        unrestricted: false,
        organizationIds: [],
        programIds: [],
        batchIds: [],
        classIds: [],
        classSubjectIds: [],
      }),
    );

    await assert.rejects(
      () => service.trends('account-1', {}),
      /no reporting scope is granted/,
    );
    assert.equal(repo.trendFilters.length, 0);
  });

  it('supports unrestricted national reads', async () => {
    const repo = new FakeReportingRepository([metricRow()]);
    const service = new GraduationTrendService(
      repo,
      new StubScopeResolver(UNRESTRICTED_GRANT),
    );

    const response = await service.trends('account-1', {});

    assert.equal(response.scope.accessLevel, 'NATIONAL');
    assert.equal(response.trends[0].approvedCount, 7);
  });
});
