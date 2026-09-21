'use strict';

/**
 * TASK-061 — executive overview API.
 *
 * Covers the four acceptance criteria the task spec names:
 *
 * 1. **scope tests** — a caller cannot reach a grain outside their grant, and
 *    the `null`/`[]` axis distinction that decides whether a query is
 *    unrestricted or matches nothing is asserted directly.
 * 2. **KPI fixture** — summed totals are turned into the reported figures by
 *    hand-computable arithmetic, and the mean-of-means shortcut is shown to give
 *    a different (wrong) answer.
 * 3. **pagination where lists** — the breakdown list is paged and the page/limit
 *    reach the repository unchanged.
 * 4. **checks green** — the suite is part of `pnpm test`.
 *
 * Everything here is asserted against the **pure** scope algebra and KPI rules,
 * plus the service driven through the same tokens the application wires. No
 * database is needed, because none of the rules under test are database rules.
 */

const assert = require('node:assert/strict');
const { describe, it, test } = require('node:test');

const {
  collectExecutiveScopeGrant,
  emptyExecutiveScopeGrant,
  executiveAccessLevel,
  expandOrganizationDescendants,
  isEmptyExecutiveScopeGrant,
  matchesPermissionPattern,
  narrowExecutiveScope,
  toExecutiveMetricFilter,
} = require('../dist/reporting/executive-scope');

const {
  EXECUTIVE_AGGREGATE_LEVELS,
  emptyExecutiveSums,
  isExecutiveAggregateLevel,
  sumMetricRows,
  toExecutiveKpis,
} = require('../dist/reporting/executive-kpis');

const {
  ExecutiveReportingService,
} = require('../dist/reporting/executive-reporting.service');

const {
  ExecutiveOverviewScopeDto,
} = require('../dist/reporting/dto/executive-overview-query.dto');

const {
  deriveMetricFields,
  emptySourceCounts,
} = require('../dist/reporting/reporting-rules');

const {
  REPORTING_PERMISSIONS,
} = require('../dist/reporting/reporting-permissions');

const LEVEL = {
  ORGANIZATION: 'ORGANIZATION',
  PROGRAM: 'PROGRAM',
  BATCH: 'BATCH',
  CLASS: 'CLASS',
  CLASS_SUBJECT: 'CLASS_SUBJECT',
  ENROLLMENT: 'ENROLLMENT',
};

const EXECUTIVE_READ = REPORTING_PERMISSIONS.EXECUTIVE_READ;

/**
 * One stored metric row.
 *
 * Only the fields a roll-up reads are present, so a test that accidentally starts
 * depending on something else fails loudly instead of silently reading
 * `undefined` into a sum.
 */
function metricRow(overrides = {}) {
  return {
    scopeType: LEVEL.ORGANIZATION,
    scopeId: 'scope-1',
    scopeName: 'Scope 1',
    participants: 0,
    activeParticipants: 0,
    attendedCount: 0,
    totalSessions: 0,
    progressPercentTotal: 0,
    progressSampleCount: 0,
    finalScoreTotal: 0,
    gradedCount: 0,
    unapprovedGradeCount: 0,
    graduationEvaluationCount: 0,
    graduationEligibleCount: 0,
    graduationApprovedCount: 0,
    graduatedCount: 0,
    recalculatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** A grant that reaches one organization. */
function scopedGrant(organizationIds) {
  return {
    unrestricted: false,
    organizationIds: [...organizationIds],
    programIds: [],
    batchIds: [],
    classIds: [],
    classSubjectIds: [],
  };
}

const UNRESTRICTED_GRANT = {
  unrestricted: true,
  organizationIds: [],
  programIds: [],
  batchIds: [],
  classIds: [],
  classSubjectIds: [],
};

/**
 * In-memory read model for the executive path.
 *
 * Records the filters it is asked for, because "the caller was denied" and "the
 * caller was allowed but the query was unscoped" are the same response body and
 * different facts. Asserting on the recorded filter is what tells them apart.
 */
class FakeReportingRepository {
  constructor() {
    this.rows = new Map();
    this.sumFilters = [];
    this.countFilters = [];
    this.listFilters = [];
    this.pageArgs = [];
    this.sums = emptyExecutiveSums();
    this.counts = {
      institutions: 0,
      programs: 0,
      batches: 0,
      classes: 0,
    };
    this.breakdown = { data: [], total: 0 };
  }

  setSums(sums) {
    this.sums = sums;
  }

  setCounts(counts) {
    this.counts = counts;
  }

  setBreakdown(data, total = data.length) {
    this.breakdown = { data, total };
  }

  addRow(row) {
    this.rows.set(`${row.scopeType}:${row.scopeId}`, row);
  }

  async readExecutiveSums(filter) {
    this.sumFilters.push(filter);
    return this.sums;
  }

  async countExecutiveScopes(filter) {
    this.countFilters.push(filter);
    return this.counts;
  }

  async listExecutiveBreakdown(filter, page, limit) {
    this.listFilters.push(filter);
    this.pageArgs.push({ page, limit });
    const start = (page - 1) * limit;
    return {
      data: this.breakdown.data.slice(start, start + limit),
      total: this.breakdown.total,
    };
  }

  async find(scopeType, scopeId) {
    return this.rows.get(`${scopeType}:${scopeId}`) ?? null;
  }
}

/** A resolver that states a grant directly, without the permission tables. */
class StubScopeGrantResolver {
  constructor(grant) {
    this.grant = grant;
    this.calls = [];
  }

  async resolveGrant(userAccountId) {
    this.calls.push(userAccountId);
    return this.grant;
  }
}

function makeService(grant) {
  const repo = new FakeReportingRepository();
  const resolver = new StubScopeGrantResolver(grant);
  const service = new ExecutiveReportingService(repo, resolver);
  return { repo, resolver, service };
}

// --- Criterion 1: scope tests -------------------------------------------------

describe('executive scope (TASK-061) — reach comes from the grant, not the request', () => {
  it('reads an unrestricted grant as national access', () => {
    const grant = collectExecutiveScopeGrant(
      [{ code: EXECUTIVE_READ, isUnrestricted: true, scopes: [] }],
      EXECUTIVE_READ,
    );

    assert.equal(grant.unrestricted, true);
    assert.equal(isEmptyExecutiveScopeGrant(grant), false);
    assert.equal(executiveAccessLevel(grant), 'NATIONAL');
  });

  it('reads a scoped grant as scoped access', () => {
    const grant = collectExecutiveScopeGrant(
      [
        {
          code: EXECUTIVE_READ,
          isUnrestricted: false,
          scopes: [{ scopeType: 'ORGANIZATION', scopeId: 'org-1' }],
        },
      ],
      EXECUTIVE_READ,
    );

    assert.equal(grant.unrestricted, false);
    assert.deepEqual(grant.organizationIds, ['org-1']);
    assert.equal(executiveAccessLevel(grant), 'SCOPED');
  });

  it('treats a permission the caller does not hold as an empty grant', () => {
    const grant = collectExecutiveScopeGrant(
      [{ code: 'reporting.metric.read', isUnrestricted: true, scopes: [] }],
      EXECUTIVE_READ,
    );

    assert.equal(grant.unrestricted, false);
    assert.equal(isEmptyExecutiveScopeGrant(grant), true);
    // An empty grant must never read as unrestricted: that is the leak.
    assert.equal(executiveAccessLevel(grant), 'SCOPED');
  });

  it('honours wildcard permission codes without widening segment counts', () => {
    assert.equal(
      matchesPermissionPattern('reporting.*.read', 'reporting.executive.read'),
      true,
    );
    assert.equal(
      matchesPermissionPattern('reporting.executive.*', EXECUTIVE_READ),
      true,
    );
    assert.equal(
      matchesPermissionPattern(
        'reporting.*.read',
        'reporting.executive.detail.read',
      ),
      false,
    );
    assert.equal(
      matchesPermissionPattern('reporting.metric.read', EXECUTIVE_READ),
      false,
    );
  });

  it('expands an organization grant to its descendants', () => {
    const expanded = expandOrganizationDescendants(
      scopedGrant(['org-1']),
      (organizationId) =>
        organizationId === 'org-1' ? ['org-1-1', 'org-1-2'] : [],
    );

    assert.deepEqual(expanded.organizationIds, ['org-1', 'org-1-1', 'org-1-2']);
  });

  it('leaves an unrestricted grant alone when expanding', () => {
    const expanded = expandOrganizationDescendants(UNRESTRICTED_GRANT, () => [
      'org-should-not-be-added',
    ]);
    assert.equal(expanded.unrestricted, true);
    assert.deepEqual(expanded.organizationIds, []);
  });

  it('denies a NATIONAL request that also carries a scope id', () => {
    assert.equal(
      narrowExecutiveScope(UNRESTRICTED_GRANT, 'NATIONAL', 'org-1'),
      null,
    );
  });

  it('allows a NATIONAL request without a scope id, even for a scoped caller', () => {
    // The grant still bounds the result; the grain only says how to group it.
    const narrowed = narrowExecutiveScope(
      scopedGrant(['org-1']),
      'NATIONAL',
      undefined,
    );
    assert.notEqual(narrowed, null);
    assert.deepEqual(narrowed.organizationIds, ['org-1']);
  });

  it('denies an organization outside the grant', () => {
    assert.equal(
      narrowExecutiveScope(scopedGrant(['org-1']), 'ORGANIZATION', 'org-2'),
      null,
    );
  });

  it('allows an organization inside the grant and narrows away other axes', () => {
    const narrowed = narrowExecutiveScope(
      scopedGrant(['org-1']),
      'ORGANIZATION',
      'org-1',
    );
    assert.deepEqual(narrowed.organizationIds, ['org-1']);
    assert.deepEqual(narrowed.programIds, []);
  });

  it('denies an unknown grain rather than ignoring it', () => {
    assert.equal(
      narrowExecutiveScope(UNRESTRICTED_GRANT, 'CONTINENT', undefined),
      null,
    );
  });

  it('distinguishes an unrestricted axis from an empty one', () => {
    const unrestricted = toExecutiveMetricFilter(
      UNRESTRICTED_GRANT,
      LEVEL.ORGANIZATION,
      { from: null, to: null },
    );
    // `null` means "no restriction on this axis".
    assert.equal(unrestricted.organizationIds, null);

    const empty = toExecutiveMetricFilter(
      emptyExecutiveScopeGrant(),
      LEVEL.ORGANIZATION,
      { from: null, to: null },
    );
    // `[]` means "nothing on this axis", which matches nothing.
    assert.deepEqual(empty.organizationIds, []);
  });

  it('carries the period through to the filter unchanged', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-03-31T23:59:59.999Z');
    const filter = toExecutiveMetricFilter(
      UNRESTRICTED_GRANT,
      LEVEL.ORGANIZATION,
      { from, to },
    );
    assert.equal(filter.periodFrom, from);
    assert.equal(filter.periodTo, to);
  });

  it('keeps the DTO grain enum and the pure grain set from drifting apart', () => {
    assert.deepEqual(
      Object.values(ExecutiveOverviewScopeDto).sort(),
      ['BATCH', 'NATIONAL', 'ORGANIZATION', 'PROGRAM'].sort(),
    );
  });
});

// --- Criterion 2: KPI fixture -------------------------------------------------

describe('executive KPIs (TASK-061) — totals are summed, never averaged', () => {
  /**
   * A small institution and a large one.
   *
   * The small one is doing better on every measure. If the roll-up averaged the
   * stored per-scope means, it would report 55% progress and 55 score; the honest
   * figure weights each participant once.
   */
  const SMALL = metricRow({
    scopeId: 'org-small',
    participants: 8,
    activeParticipants: 8,
    attendedCount: 8,
    totalSessions: 8,
    progressPercentTotal: 800,
    progressSampleCount: 8,
    finalScoreTotal: 800,
    gradedCount: 8,
    graduationApprovedCount: 6,
    graduatedCount: 6,
  });

  const LARGE = metricRow({
    scopeId: 'org-large',
    participants: 400,
    activeParticipants: 380,
    attendedCount: 200,
    totalSessions: 400,
    progressPercentTotal: 4000,
    progressSampleCount: 400,
    finalScoreTotal: 4000,
    gradedCount: 400,
    graduationApprovedCount: 4,
    graduatedCount: 1,
  });

  it('produces hand-computable figures from the summed totals', () => {
    const kpis = toExecutiveKpis(sumMetricRows([SMALL, LARGE]));

    assert.equal(kpis.participants, 408);
    assert.equal(kpis.activeParticipants, 388);
    // (800 + 4000) / (8 + 400) = 4800 / 408
    assert.equal(kpis.averageProgressPercent, 11.76);
    // (8 + 200) / (8 + 400) = 208 / 408
    assert.equal(kpis.attendancePercentage, 50.98);
    assert.equal(kpis.totalSessions, 408);
    // (800 + 4000) / (8 + 400)
    assert.equal(kpis.averageFinalScore, 11.76);
    assert.equal(kpis.gradedCount, 408);
    // (6 + 1) / (6 + 4) = 7 / 10
    assert.equal(kpis.certificationRate, 70);
  });

  it('gives a different answer from the mean of the stored means', () => {
    const kpis = toExecutiveKpis(sumMetricRows([SMALL, LARGE]));

    // What averaging the averages would have reported, i.e. the bug this file
    // exists to prevent. Both are plausible-looking percentages, which is why
    // the difference has to be asserted rather than reasoned about.
    const naive =
      (SMALL.progressPercentTotal / SMALL.progressSampleCount +
        LARGE.progressPercentTotal / LARGE.progressSampleCount) /
      2;
    assert.equal(naive, 55);
    assert.notEqual(kpis.averageProgressPercent, naive);
  });

  it('reports zero, not NaN, when a denominator is empty', () => {
    const kpis = toExecutiveKpis(emptyExecutiveSums());

    assert.equal(kpis.averageProgressPercent, 0);
    assert.equal(kpis.attendancePercentage, 0);
    assert.equal(kpis.averageFinalScore, 0);
    assert.equal(kpis.certificationRate, 0);
    assert.equal(Number.isNaN(kpis.certificationRate), false);
  });

  it('reports a certification rate of zero when nothing was approved', () => {
    const kpis = toExecutiveKpis(
      sumMetricRows([metricRow({ graduatedCount: 0 })]),
    );
    assert.equal(kpis.certificationRate, 0);
  });

  it('counts only disjoint levels in a roll-up', () => {
    assert.deepEqual(
      [...EXECUTIVE_AGGREGATE_LEVELS].sort(),
      [LEVEL.BATCH, LEVEL.CLASS, LEVEL.ORGANIZATION, LEVEL.PROGRAM].sort(),
    );

    // A class subject repeats the class roster once per subject, so summing
    // participants across subjects would count the same person several times.
    assert.equal(isExecutiveAggregateLevel(LEVEL.CLASS_SUBJECT), false);
    assert.equal(isExecutiveAggregateLevel(LEVEL.ENROLLMENT), false);
    assert.equal(isExecutiveAggregateLevel(LEVEL.CLASS), true);
  });
});

// --- Criterion 3 + the service behaviour -------------------------------------

describe('executive overview service (TASK-061) — denial, narrowing and paging', () => {
  it('denies a caller with no granted scope', async () => {
    const { repo, service } = makeService(emptyExecutiveScopeGrant());

    await assert.rejects(
      () => service.overview('user-1', {}),
      (error) => error.status === 403,
    );
    // Nothing may be read before the decision: a denial that has already
    // queried the read model is a denial that already leaked.
    assert.equal(repo.sumFilters.length, 0);
  });

  it('denies a grain outside the grant', async () => {
    const { repo, service } = makeService(scopedGrant(['org-1']));

    await assert.rejects(
      () =>
        service.overview('user-1', {
          scope: ExecutiveOverviewScopeDto.ORGANIZATION,
          scopeId: 'org-2',
        }),
      (error) => error.status === 403,
    );
    assert.equal(repo.sumFilters.length, 0);
  });

  it('confines a scoped caller asking for NATIONAL to their own scope', async () => {
    const { repo, service } = makeService(scopedGrant(['org-1']));
    repo.setCounts({ institutions: 1, programs: 2, batches: 3, classes: 4 });

    const response = await service.overview('user-1', {
      scope: ExecutiveOverviewScopeDto.NATIONAL,
    });

    // The response says what it is: the caller is told the figures are scoped,
    // not national.
    assert.equal(response.scope.accessLevel, 'SCOPED');
    assert.equal(response.scope.institutionCount, 1);
    assert.deepEqual(repo.sumFilters[0].organizationIds, ['org-1']);
    assert.equal(response.kpis.institutions, 1);
    assert.equal(response.kpis.programs, 2);
  });

  it('reports NATIONAL access level for an unrestricted caller', async () => {
    const { repo, service } = makeService(UNRESTRICTED_GRANT);

    const response = await service.overview('user-1', {});

    assert.equal(response.scope.accessLevel, 'NATIONAL');
    assert.equal(response.scope.institutionCount, 0);
    assert.equal(response.scope.scope, ExecutiveOverviewScopeDto.NATIONAL);
    // Unrestricted means no predicate at all, not an empty id list.
    assert.equal(repo.sumFilters[0].organizationIds, null);
    assert.equal(repo.countFilters[0].organizationIds, null);
  });

  it('sums organizations for NATIONAL and programs for a program grain', async () => {
    const { repo, service } = makeService(UNRESTRICTED_GRANT);

    await service.overview('user-1', {});
    await service.overview('user-1', {
      scope: ExecutiveOverviewScopeDto.PROGRAM,
      scopeId: 'program-1',
    });

    assert.equal(repo.sumFilters[0].level, LEVEL.ORGANIZATION);
    assert.equal(repo.sumFilters[1].level, LEVEL.PROGRAM);
    assert.deepEqual(repo.sumFilters[1].programIds, ['program-1']);
  });

  it('pages the breakdown list and echoes the page it used', async () => {
    const { repo, service } = makeService(UNRESTRICTED_GRANT);
    repo.setBreakdown(
      [
        metricRow({ scopeId: 'org-1', scopeName: 'Org 1' }),
        metricRow({ scopeId: 'org-2', scopeName: 'Org 2' }),
        metricRow({ scopeId: 'org-3', scopeName: 'Org 3' }),
      ],
      3,
    );

    const response = await service.overview('user-1', { page: 2, limit: 2 });

    assert.deepEqual(repo.pageArgs[0], { page: 2, limit: 2 });
    assert.equal(response.breakdown.page, 2);
    assert.equal(response.breakdown.limit, 2);
    assert.equal(response.breakdown.total, 3);
    assert.equal(response.breakdown.data.length, 1);
    assert.equal(response.breakdown.data[0].scopeId, 'org-3');
  });

  it('defaults to the first page and a bounded page size', async () => {
    const { repo, service } = makeService(UNRESTRICTED_GRANT);

    const response = await service.overview('user-1', {});

    assert.deepEqual(repo.pageArgs[0], { page: 1, limit: 25 });
    assert.equal(response.breakdown.page, 1);
    assert.equal(response.breakdown.limit, 25);
  });

  it('widens periodTo to the end of its day so the last day is included', async () => {
    const { repo, service } = makeService(UNRESTRICTED_GRANT);

    const response = await service.overview('user-1', {
      periodFrom: '2026-01-01',
      periodTo: '2026-03-31',
    });

    assert.equal(
      repo.sumFilters[0].periodTo.toISOString(),
      '2026-03-31T23:59:59.999Z',
    );
    assert.equal(response.scope.periodTo, '2026-03-31T23:59:59.999Z');
  });

  it('denies an institution detail outside the grant before reading', async () => {
    const { repo, service } = makeService(scopedGrant(['org-1']));
    repo.addRow(metricRow({ scopeId: 'org-2' }));

    await assert.rejects(
      () => service.institutionDetail('user-1', 'org-2'),
      (error) => error.status === 403,
    );
  });

  it('returns the stored row for an institution inside the grant', async () => {
    const repo = new FakeReportingRepository();
    repo.addRow(
      metricRow({
        scopeId: 'org-1',
        scopeName: 'Lembaga Satu',
        participants: 12,
        recalculatedAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
    );
    const scoped = new ExecutiveReportingService(
      repo,
      new StubScopeGrantResolver(scopedGrant(['org-1'])),
    );

    const detail = await scoped.institutionDetail('user-1', 'org-1');

    assert.equal(detail.scopeId, 'org-1');
    assert.equal(detail.scopeName, 'Lembaga Satu');
    assert.equal(detail.metrics.participants, 12);
    assert.equal(detail.recalculatedAt, '2026-09-01T00:00:00.000Z');
  });

  it('returns not-found for an institution that has never been refreshed', async () => {
    const { service } = makeService(UNRESTRICTED_GRANT);

    await assert.rejects(
      () => service.institutionDetail('user-1', 'org-never-refreshed'),
      (error) => error.status === 404,
    );
  });

  it('denies an unrestricted-looking caller who actually holds nothing', async () => {
    const { repo, service } = makeService(emptyExecutiveScopeGrant());

    await assert.rejects(
      () => service.institutionDetail('user-1', 'org-1'),
      (error) => error.status === 403,
    );
    assert.equal(repo.sumFilters.length, 0);
  });

  it('resolves the grant from the account id it was given', async () => {
    const { resolver, service } = makeService(UNRESTRICTED_GRANT);

    await service.overview('account-42', {});

    assert.deepEqual(resolver.calls, ['account-42']);
  });
});

// --- What the refresh has to store for a roll-up to be possible --------------

describe('reporting rows store totals, not only averages (TASK-061)', () => {
  const counts = {
    ...emptySourceCounts(),
    participants: 40,
    activeParticipants: 37,
    presentCount: 30,
    lateCount: 5,
    totalSessions: 40,
    progressPercentTotal: 900,
    progressPercentCount: 12,
    finalScoreTotal: 1500,
    gradedCount: 20,
    unapprovedGradeCount: 4,
    graduationEvaluationCount: 41,
    graduationEligibleCount: 38,
    graduationApprovedCount: 36,
    graduatedCount: 30,
  };

  it('zips attendedCount from present + late', () => {
    const fields = deriveMetricFields(counts);
    // `present + late` count as attended; `excused`, `sick` and `absent` do not.
    assert.equal(fields.attendedCount, 35);
  });

  it('stores the denominators the averages were divided by', () => {
    const fields = deriveMetricFields(counts);
    // Without these the stored mean is all a roll-up could ever see, and it
    // would have to average the averages.
    assert.equal(fields.progressPercentTotal, 900);
    assert.equal(fields.progressSampleCount, 12);
    assert.equal(fields.finalScoreTotal, 1500);
    assert.equal(fields.gradedCount, 20);
  });

  it('round-trips: totals stored now give the same mean a roll-up can re-derive', () => {
    const fields = deriveMetricFields(counts);
    const kpis = toExecutiveKpis({
      ...emptyExecutiveSums(),
      progressPercentTotal: fields.progressPercentTotal,
      progressSampleCount: fields.progressSampleCount,
      finalScoreTotal: fields.finalScoreTotal,
      gradedCount: fields.gradedCount,
      attendedCount: fields.attendedCount,
      totalSessions: fields.totalSessions,
    });

    assert.equal(kpis.averageProgressPercent, fields.averageProgressPercent);
    assert.equal(kpis.averageFinalScore, fields.averageFinalScore);
    assert.equal(kpis.attendancePercentage, fields.attendancePercentage);
  });

  it('carries the period bounds onto the stored row', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-06-30T00:00:00.000Z');
    const fields = deriveMetricFields({
      ...counts,
      periodStart: start,
      periodEnd: end,
    });

    assert.equal(fields.periodStart, start);
    assert.equal(fields.periodEnd, end);
  });

  it('stores a null period when the scope has no batch period', () => {
    const fields = deriveMetricFields(emptySourceCounts());
    assert.equal(fields.periodStart, null);
    assert.equal(fields.periodEnd, null);
  });
});

// --- The HTTP boundary, over the real module wiring --------------------------
/**
 * These go through `createApp`, so they exercise the actual composition root:
 * the global guards, the DTO pipe, and the `ReportingModule.register()` bindings
 * that TASK-061 added. Nothing here is stubbed except the two seams the app
 * already exposes for tests.
 */

const { createApp } = require('../dist/app');
const { createSign, generateKeyPairSync } = require('node:crypto');

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'reporting-executive-test-key';
const ACCOUNT_ID = '30000000-0000-4000-8000-0000000000e1';
const PERSON_ID = '30000000-0000-4000-8000-0000000000e2';

const { privateKey: PRIVATE_KEY, publicKey: PUBLIC_KEY } = generateKeyPairSync(
  'rsa',
  { modulusLength: 2048 },
);
const PUBLIC_JWK = {
  ...PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

function signTestToken(subject = 'executive-overview-subject') {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: AUTH_KID }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: AUTH_ISSUER,
      aud: AUTH_AUDIENCE,
      sub: subject,
      iat: now,
      exp: now + 300,
    }),
  ).toString('base64url');
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .end()
    .sign(PRIVATE_KEY);
  return `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
}

class StaticJwksProvider {
  async getKeys() {
    return [PUBLIC_JWK];
  }
}

class StubIdentityResolver {
  async findAccountByExternalAuthId(externalAuthId) {
    return {
      id: ACCOUNT_ID,
      personId: PERSON_ID,
      externalAuthId,
      username: 'executive.tester',
      email: 'executive.tester@polri.go.id',
      status: 'ACTIVE',
    };
  }

  async findPersonById(id) {
    if (id !== PERSON_ID) return null;
    return {
      id,
      personnelNumber: '88112244',
      fullName: 'Executive Tester',
      rank: null,
      title: null,
      email: null,
      phone: null,
      status: 'ACTIVE',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async touchLastLoginAt() {}
}

class StubPermissionEvaluator {
  constructor(permissions = []) {
    this.permissions = new Set(permissions);
  }

  async hasPermission(_userAccountId, permissionCode) {
    return this.permissions.has(permissionCode);
  }

  async getUserEffectivePermissions(userAccountId) {
    return {
      userAccountId,
      permissions: Array.from(this.permissions).map((code) => ({
        code,
        isUnrestricted: true,
        scopes: [],
      })),
    };
  }
}

const AUTH_CONFIG = {
  issuer: AUTH_ISSUER,
  audience: AUTH_AUDIENCE,
  jwksUri: `${AUTH_ISSUER}/protocol/openid-connect/certs`,
  clockSkewSeconds: 30,
  jwksCacheSeconds: 300,
  jwksRequestTimeoutMs: 5000,
  lastLoginThrottleSeconds: 300,
};

async function startApp(options = {}) {
  const app = await createApp({
    authConfig: AUTH_CONFIG,
    jwksProvider: new StaticJwksProvider(),
    identityResolver: new StubIdentityResolver(),
    ...options,
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  return {
    app,
    base,
    auth: { authorization: `Bearer ${signTestToken()}` },
  };
}

test('executive overview is denied without the executive permission', async () => {
  // Holds the metric read but not the executive read: the two are separate
  // disclosures, and one must not imply the other.
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([
      REPORTING_PERMISSIONS.READ,
    ]),
    executiveScopeGrantResolver: new StubScopeGrantResolver(UNRESTRICTED_GRANT),
  });
  try {
    const denied = await fetch(`${base}/api/v1/reporting/executive/overview`, {
      headers: auth,
    });
    assert.equal(denied.status, 403);

    const detailDenied = await fetch(
      `${base}/api/v1/reporting/executive/institutions/00000000-0000-4000-8000-000000000001`,
      { headers: auth },
    );
    assert.equal(detailDenied.status, 403);

    const anonymous = await fetch(
      `${base}/api/v1/reporting/executive/overview`,
    );
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});

test('executive overview validates its query and denies an empty grant', async () => {
  const resolver = new StubScopeGrantResolver(emptyExecutiveScopeGrant());
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([EXECUTIVE_READ]),
    executiveScopeGrantResolver: resolver,
  });
  try {
    // An unvalidated `limit` would let a caller turn the dashboard into a
    // full-table read, so the DTO bound is part of the boundary.
    const tooLarge = await fetch(
      `${base}/api/v1/reporting/executive/overview?limit=500`,
      { headers: auth },
    );
    assert.equal(tooLarge.status, 400);

    const unknownGrain = await fetch(
      `${base}/api/v1/reporting/executive/overview?scope=CONTINENT`,
      { headers: auth },
    );
    assert.equal(unknownGrain.status, 400);

    const badPeriod = await fetch(
      `${base}/api/v1/reporting/executive/overview?periodFrom=not-a-date`,
      { headers: auth },
    );
    assert.equal(badPeriod.status, 400);

    // A caller holding the permission but no scope is denied, and the resolver
    // was consulted — so the denial came from the grant, not from a stub that
    // was never reached.
    const empty = await fetch(`${base}/api/v1/reporting/executive/overview`, {
      headers: auth,
    });
    assert.equal(empty.status, 403);
    assert.ok(resolver.calls.length > 0);
    assert.equal(resolver.calls[0], ACCOUNT_ID);
  } finally {
    await app.close();
  }
});

test('executive routes reject a malformed organization id', async () => {
  const { app, base, auth } = await startApp({
    permissionEvaluator: new StubPermissionEvaluator([EXECUTIVE_READ]),
    executiveScopeGrantResolver: new StubScopeGrantResolver(UNRESTRICTED_GRANT),
  });
  try {
    const response = await fetch(
      `${base}/api/v1/reporting/executive/institutions/not-a-uuid`,
      { headers: auth },
    );
    assert.equal(response.status, 400);
  } finally {
    await app.close();
  }
});
