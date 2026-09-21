'use strict';

/**
 * TASK-063 — attendance, learning and performance KPI detail.
 *
 * The tests stay on the reporting boundary: KPI reads consume stored
 * `reporting_metrics` rows and pure functions. No transactional attendance,
 * progress or grade table is needed to prove the formulas.
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { KpiService } = require('../dist/reporting/kpi.service');
const {
  buildAttentionList,
  buildKpiDistribution,
  buildKpiTrends,
  buildRemedialRiskDistribution,
} = require('../dist/reporting/kpi-rules');
const { sumMetricRows } = require('../dist/reporting/executive-kpis');

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
    scopeType: LEVEL.CLASS,
    scopeId: 'scope-1',
    scopeName: 'Scope 1',
    organizationId: 'org-1',
    educationProgramId: 'program-1',
    educationBatchId: 'batch-1',
    academicClassId: 'class-1',
    classSubjectId: null,
    participants: 10,
    activeParticipants: 9,
    averageProgressPercent: 80,
    attendancePercentage: 90,
    totalSessions: 100,
    averageFinalScore: 82,
    gradedCount: 10,
    unapprovedGradeCount: 0,
    attendedCount: 90,
    progressPercentTotal: 800,
    progressSampleCount: 10,
    finalScoreTotal: 820,
    graduationEvaluationCount: 0,
    graduationEligibleCount: 0,
    graduationApprovedCount: 0,
    graduatedCount: 0,
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
    this.sumFilters = [];
    this.countFilters = [];
    this.listFilters = [];
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
    throw new Error('KPI reads must not write reporting metrics');
  }

  async listScopes() {
    throw new Error('KPI reads must not enumerate transactional scopes');
  }

  async readSourceCounts() {
    this.sourceCountCalls += 1;
    throw new Error('KPI reads must not read transactional source counts');
  }

  async readExecutiveSums(filter) {
    this.sumFilters.push(filter);
    return sumMetricRows(this.filterRows(filter));
  }

  async countExecutiveScopes(filter) {
    this.countFilters.push(filter);
    const matching = this.filterRows({ ...filter, level: undefined });
    return {
      institutions: unique(matching, 'organizationId').length,
      programs: unique(matching, 'educationProgramId').length,
      batches: unique(matching, 'educationBatchId').length,
      classes: unique(matching, 'academicClassId').length,
    };
  }

  async listExecutiveBreakdown(filter, page, limit) {
    this.listFilters.push(filter);
    const rows = this.filterRows(filter);
    return {
      data: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
    };
  }

  async listKpiTrendRows(filter, limit) {
    this.trendFilters.push(filter);
    return this.filterRows(filter).slice(0, limit);
  }

  filterRows(filter) {
    return this.rows.filter((row) => {
      if (filter.level && row.scopeType !== filter.level) return false;
      if (
        filter.organizationIds !== null &&
        !filter.organizationIds.includes(row.organizationId)
      ) {
        return false;
      }
      if (
        filter.programIds !== null &&
        row.educationProgramId &&
        filter.programIds.length > 0 &&
        !filter.programIds.includes(row.educationProgramId)
      ) {
        return false;
      }
      if (
        filter.batchIds !== null &&
        row.educationBatchId &&
        filter.batchIds.length > 0 &&
        !filter.batchIds.includes(row.educationBatchId)
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
    this.calls = [];
  }

  async resolveGrant(userAccountId) {
    this.calls.push(userAccountId);
    return this.grant;
  }
}

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

describe('reporting KPIs (TASK-063) — formulas', () => {
  it('builds attendance, progress, score and remedial distributions from stored rows', () => {
    const rows = [
      metricRow({
        scopeId: 'weak',
        participants: 7,
        attendancePercentage: 55,
        averageProgressPercent: 91,
        averageFinalScore: 88,
      }),
      metricRow({
        scopeId: 'middle',
        participants: 11,
        attendancePercentage: 78,
        averageProgressPercent: 68,
        averageFinalScore: 71,
      }),
      metricRow({
        scopeId: 'strong',
        participants: 13,
        attendancePercentage: 96,
        averageProgressPercent: 94,
        averageFinalScore: 95,
      }),
    ];

    const attendance = buildKpiDistribution(rows, 'attendancePercentage');
    assert.deepEqual(
      attendance.map((bucket) => [
        bucket.label,
        bucket.count,
        bucket.participants,
      ]),
      [
        ['0-59.99', 1, 7],
        ['60-69.99', 0, 0],
        ['70-79.99', 1, 11],
        ['80-89.99', 0, 0],
        ['90-100', 1, 13],
      ],
    );

    const remedial = buildRemedialRiskDistribution(rows);
    assert.equal(remedial[0].count, 1);
    assert.equal(remedial[1].count, 1);
    assert.equal(remedial[4].count, 1);
  });

  it('orders the attention list by severity and keeps the exact reasons', () => {
    const rows = [
      metricRow({
        scopeId: 'unapproved',
        scopeName: 'Unapproved',
        unapprovedGradeCount: 5,
      }),
      metricRow({
        scopeId: 'low',
        scopeName: 'Low',
        attendancePercentage: 40,
        averageProgressPercent: 50,
        averageFinalScore: 60,
      }),
    ];

    const attention = buildAttentionList(rows, 10);
    assert.equal(attention[0].row.scopeId, 'low');
    assert.deepEqual(attention[0].reasons, [
      'attendance_below_75',
      'progress_below_70',
      'score_below_70',
    ]);
    assert.deepEqual(attention[1].reasons, ['unapproved_grades']);
  });

  it('turns cohort periods into weighted trend points', () => {
    const rows = [
      metricRow({
        scopeId: 'p1-a',
        participants: 10,
        attendedCount: 70,
        totalSessions: 100,
        progressPercentTotal: 700,
        progressSampleCount: 10,
        finalScoreTotal: 800,
        gradedCount: 10,
      }),
      metricRow({
        scopeId: 'p1-b',
        participants: 30,
        attendedCount: 270,
        totalSessions: 300,
        progressPercentTotal: 2700,
        progressSampleCount: 30,
        finalScoreTotal: 2100,
        gradedCount: 30,
      }),
      metricRow({
        scopeId: 'p2',
        periodStart: new Date('2026-07-01T00:00:00.000Z'),
        periodEnd: new Date('2026-12-31T00:00:00.000Z'),
        participants: 20,
        attendedCount: 100,
        totalSessions: 200,
        progressPercentTotal: 1000,
        progressSampleCount: 20,
        finalScoreTotal: 1200,
        gradedCount: 20,
      }),
    ];

    const trends = buildKpiTrends(rows, 12);
    assert.equal(trends.length, 2);
    assert.equal(trends[0].period, '2026-01-01/2026-06-30');
    assert.equal(trends[0].scopeCount, 2);
    assert.equal(trends[0].kpis.attendancePercentage, 85);
    assert.equal(trends[0].kpis.averageProgressPercent, 85);
    assert.equal(trends[1].kpis.averageFinalScore, 60);
  });
});

describe('reporting KPIs (TASK-063) — service', () => {
  it('applies caller scope, filters period and reads only the reporting read model', async () => {
    const rows = [
      metricRow({
        scopeType: LEVEL.ORGANIZATION,
        scopeId: 'org-a-row',
        organizationId: 'org-a',
        participants: 100,
      }),
      metricRow({
        scopeType: LEVEL.CLASS,
        scopeId: 'class-a',
        organizationId: 'org-a',
        participants: 20,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-05-31T00:00:00.000Z'),
      }),
      metricRow({
        scopeType: LEVEL.CLASS,
        scopeId: 'class-b',
        organizationId: 'org-b',
        participants: 999,
      }),
    ];
    const repo = new FakeReportingRepository(rows);
    const service = new KpiService(
      repo,
      new StubScopeResolver(scopedGrant(['org-a'])),
    );

    const response = await service.detail('account-1', {
      level: 'CLASS',
      periodFrom: '2026-01-01',
      periodTo: '2026-06-30',
      limit: 10,
    });

    assert.equal(response.total, 1);
    assert.equal(response.distributions.attendance[4].count, 1);
    assert.equal(repo.sourceCountCalls, 0);
    assert.equal(repo.upsertCalls, 0);
    assert.equal(repo.sumFilters[0].level, LEVEL.ORGANIZATION);
    assert.deepEqual(repo.sumFilters[0].organizationIds, ['org-a']);
    assert.equal(repo.listFilters[0].level, LEVEL.CLASS);
    assert.deepEqual(repo.listFilters[0].organizationIds, ['org-a']);
    assert.equal(response.scope.accessLevel, 'SCOPED');
  });

  it('denies an empty grant before repository reads', async () => {
    const repo = new FakeReportingRepository([]);
    const service = new KpiService(
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
      () => service.detail('account-1', {}),
      /no reporting scope is granted/,
    );
    assert.equal(repo.sumFilters.length, 0);
  });
});

function unique(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))];
}
