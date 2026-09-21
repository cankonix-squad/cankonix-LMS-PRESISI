const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  canCorrect,
  canTransition,
  evaluationIsDecidable,
} = require('../dist/graduation-decisions/graduation-decision-rules');
const {
  GraduationDecisionService,
} = require('../dist/graduation-decisions/graduation-decision.service');

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
 * In-memory graduation decision repository.
 *
 * Mirrors the Prisma repository's observable contract. In particular it keeps
 * every row it is given: a correction mutates the existing row and a revocation
 * only moves `status`, so the tests can prove nothing is ever deleted.
 */
class FakeGraduationDecisionRepository {
  constructor(options = {}) {
    this.evaluations = options.evaluations ?? new Map();
    this.decisions = [];
    this.sequence = 0;
  }

  /**
   * Prisma returns a fresh object per query, so the service's `existing` and the
   * row it later mutates are different objects. Returning the stored reference
   * would let a mutation retroactively change an earlier read — which is exactly
   * the bug the audit `before`/`after` assertions are meant to catch.
   */
  clone(row) {
    return row ? { ...row } : null;
  }

  async findEvaluationContext(evaluationId) {
    const evaluation = this.evaluations.get(evaluationId);
    return evaluation ? { ...evaluation } : null;
  }

  async findByEvaluationId(evaluationId) {
    return this.clone(
      this.decisions.find(
        (row) => row.graduationEvaluationId === evaluationId,
      ) ?? null,
    );
  }

  async findById(id) {
    return this.clone(this.decisions.find((row) => row.id === id) ?? null);
  }

  async list(filter) {
    const data = this.decisions.filter(
      (row) =>
        (!filter.status || row.status === filter.status) &&
        (!filter.decision || row.decision === filter.decision),
    );
    return { data, total: data.length };
  }

  async create(data) {
    const evaluation = this.evaluations.get(data.graduationEvaluationId);
    const decision = {
      id: `decision-${++this.sequence}`,
      graduationEvaluationId: data.graduationEvaluationId,
      decision: data.decision,
      status: 'DRAFT',
      decidedByUserId: data.decidedByUserId ?? null,
      decidedAt: new Date(),
      approvedByUserId: null,
      approvedAt: null,
      revokedByUserId: null,
      revokedAt: null,
      revokedReason: null,
      note: data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      evaluationOutcome: evaluation.outcome,
      evaluationEnrollmentId: evaluation.enrollmentId,
      evaluationGraduationRuleId: evaluation.graduationRuleId,
      evaluationEvaluatedAt: evaluation.evaluatedAt,
      evaluationSnapshot: evaluation.snapshot,
    };
    this.decisions.push(decision);
    return this.clone(decision);
  }

  async approve(id, data) {
    const decision = this.decisions.find((row) => row.id === id);
    decision.status = 'APPROVED';
    decision.approvedByUserId = data.approvedByUserId ?? null;
    decision.approvedAt = new Date();
    return this.clone(decision);
  }

  async revoke(id, data) {
    const decision = this.decisions.find((row) => row.id === id);
    decision.status = 'REVOKED';
    decision.revokedByUserId = data.revokedByUserId ?? null;
    decision.revokedAt = new Date();
    decision.revokedReason = data.revokedReason;
    return this.clone(decision);
  }

  async correct(id, data) {
    const decision = this.decisions.find((row) => row.id === id);
    decision.decision = data.decision;
    decision.note = data.note;
    return this.clone(decision);
  }
}

function evaluationContext(overrides = {}) {
  return {
    id: 'evaluation-1',
    enrollmentId: 'enrollment-1',
    graduationRuleId: 'rule-1',
    outcome: 'ELIGIBLE',
    evaluatedAt: new Date('2026-02-01T00:00:00.000Z'),
    snapshot: { ruleCode: 'GRAD-2026', ruleVersion: 2, eligible: true },
    ...overrides,
  };
}

function setup(options = {}) {
  const evaluations = new Map([
    ['evaluation-1', evaluationContext(options.evaluation ?? {})],
  ]);
  const repo = new FakeGraduationDecisionRepository({ evaluations });
  const audit = new FakeAuditService();
  const service = new GraduationDecisionService(repo, audit);
  return { repo, audit, service };
}

// ---------------------------------------------------------------------------
// Pure lifecycle rules
// ---------------------------------------------------------------------------

test('TASK-053 lifecycle rules: the status machine moves forward only', () => {
  assert.equal(canTransition('DRAFT', 'APPROVED'), true);
  assert.equal(canTransition('APPROVED', 'REVOKED'), true);

  // No re-approval, no un-revoking, and no skipping straight to revoked.
  assert.equal(canTransition('DRAFT', 'REVOKED'), false);
  assert.equal(canTransition('APPROVED', 'APPROVED'), false);
  assert.equal(canTransition('REVOKED', 'APPROVED'), false);
  assert.equal(canTransition('REVOKED', 'REVOKED'), false);

  assert.equal(canCorrect('APPROVED'), true);
  assert.equal(canCorrect('DRAFT'), false);
  assert.equal(canCorrect('REVOKED'), false);
});

test('TASK-053 lifecycle rules: superseded and pending evaluations cannot be decided', () => {
  assert.equal(evaluationIsDecidable('ELIGIBLE'), true);
  assert.equal(evaluationIsDecidable('NOT_ELIGIBLE'), true);
  assert.equal(evaluationIsDecidable('SUPERSEDED'), false);
  assert.equal(evaluationIsDecidable('PENDING'), false);
});

// ---------------------------------------------------------------------------
// No decision without evaluation
// ---------------------------------------------------------------------------

test('TASK-053: a decision cannot be recorded without an existing evaluation', async () => {
  const { service, audit } = setup();

  await assert.rejects(
    () =>
      service.create({
        graduationEvaluationId: 'evaluation-does-not-exist',
        decision: 'PASS',
      }),
    /evaluation not found/i,
  );

  assert.equal(audit.entries.length, 0);
});

test('TASK-053: a decision cannot rest on a superseded evaluation', async () => {
  const { service } = setup({ evaluation: { outcome: 'SUPERSEDED' } });

  await assert.rejects(
    () =>
      service.create({
        graduationEvaluationId: 'evaluation-1',
        decision: 'PASS',
      }),
    /superseded/i,
  );
});

test('TASK-053: a decision cannot rest on a pending evaluation', async () => {
  const { service } = setup({ evaluation: { outcome: 'PENDING' } });

  await assert.rejects(
    () =>
      service.create({
        graduationEvaluationId: 'evaluation-1',
        decision: 'PASS',
      }),
    /not produced an outcome yet/i,
  );
});

test('TASK-053: one evaluation carries at most one decision', async () => {
  const { service } = setup();

  await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });

  await assert.rejects(
    () =>
      service.create({
        graduationEvaluationId: 'evaluation-1',
        decision: 'FAIL',
      }),
    /already exists/i,
  );
});

// ---------------------------------------------------------------------------
// Lifecycle through the service, with audit
// ---------------------------------------------------------------------------

test('TASK-053: recording a decision starts as DRAFT and is audited', async () => {
  const { service, audit } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
    note: 'Memenuhi seluruh komponen',
    decidedByUserId: 'user-1',
  });

  assert.equal(created.status, 'DRAFT');
  assert.equal(created.decision, 'PASS');
  assert.equal(created.graduationEvaluationId, 'evaluation-1');

  assert.equal(audit.entries.length, 1);
  assert.equal(audit.entries[0].action, 'graduation_decision.created');
  assert.equal(audit.entries[0].resourceType, 'graduation_decision');
  assert.equal(
    audit.entries[0].metadata.graduationEvaluationId,
    'evaluation-1',
  );
});

test('TASK-053: approving puts a draft decision in force exactly once', async () => {
  const { service, audit } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });

  const approved = await service.approve(created.id, 'user-2');
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.approvedByUserId, 'user-2');

  assert.equal(audit.entries.at(-1).action, 'graduation_decision.approved');

  // A second approval is refused rather than silently accepted, so the trail
  // records one approval act per decision.
  await assert.rejects(
    () => service.approve(created.id, 'user-2'),
    /cannot move to APPROVED/i,
  );
});

test('TASK-053: a decision cannot be revoked before it is approved', async () => {
  const { service } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'FAIL',
  });

  await assert.rejects(
    () => service.revoke(created.id, { revokedReason: 'salah entri' }),
    /cannot move to REVOKED/i,
  );
});

test('TASK-053: revocation requires a reason and keeps the row readable', async () => {
  const { service, repo, audit } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });
  await service.approve(created.id, 'user-2');

  await assert.rejects(
    () => service.revoke(created.id, { revokedReason: '   ' }),
    /reason is required/i,
  );

  const revoked = await service.revoke(created.id, {
    revokedReason: 'Dokumen pendukung tidak sah',
    revokedByUserId: 'user-3',
  });

  assert.equal(revoked.status, 'REVOKED');
  assert.equal(revoked.revokedReason, 'Dokumen pendukung tidak sah');

  // The row still exists — revocation is a status, never a deletion.
  assert.equal(repo.decisions.length, 1);
  assert.equal(repo.decisions[0].id, created.id);
  assert.equal(audit.entries.at(-1).action, 'graduation_decision.revoked');
});

test('TASK-053: a revoked decision is final and cannot be changed', async () => {
  const { service } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });
  await service.approve(created.id, 'user-2');
  await service.revoke(created.id, { revokedReason: 'dibatalkan' });

  await assert.rejects(
    () => service.correct(created.id, { decision: 'FAIL', note: 'ubah' }),
    /final/i,
  );
  await assert.rejects(() => service.approve(created.id, 'user-2'), /final/i);
});

test('TASK-053: correcting an in-force decision changes the verdict and audits both states', async () => {
  const { service, audit } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });
  await service.approve(created.id, 'user-2');
  audit.entries.length = 0;

  const corrected = await service.correct(created.id, {
    decision: 'REMEDIAL',
    note: 'Nilai akhir di bawah ambang setelah verifikasi',
  });

  assert.equal(corrected.status, 'APPROVED');
  assert.equal(corrected.decision, 'REMEDIAL');
  assert.equal(
    corrected.note,
    'Nilai akhir di bawah ambang setelah verifikasi',
  );

  assert.equal(audit.entries.length, 1);
  assert.equal(audit.entries[0].action, 'graduation_decision.corrected');
  // The prior verdict survives in `before`, so the correction is reconstructible.
  assert.equal(audit.entries[0].before.decision, 'PASS');
  assert.equal(audit.entries[0].after.decision, 'REMEDIAL');
});

test('TASK-053: only an approved decision can be corrected', async () => {
  const { service } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });

  await assert.rejects(
    () => service.correct(created.id, { decision: 'FAIL', note: 'ubah' }),
    /only an approved/i,
  );
});

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

test('TASK-053: reading a decision returns the evidence it rests on', async () => {
  const { service } = setup();

  const created = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });

  const found = await service.findOne(created.id);
  assert.equal(found.evaluation.id, 'evaluation-1');
  assert.equal(found.evaluation.enrollmentId, 'enrollment-1');
  assert.equal(found.evaluation.outcome, 'ELIGIBLE');
  assert.equal(found.evaluation.snapshot.ruleCode, 'GRAD-2026');
});

test('TASK-053: listing filters by status and decision, and paginates', async () => {
  const { service } = setup();

  const first = await service.create({
    graduationEvaluationId: 'evaluation-1',
    decision: 'PASS',
  });
  await service.approve(first.id, 'user-2');

  const approved = await service.list({ status: 'APPROVED' });
  assert.equal(approved.total, 1);
  assert.equal(approved.data[0].id, first.id);

  const drafts = await service.list({ status: 'DRAFT' });
  assert.equal(drafts.total, 0);

  const fails = await service.list({ decision: 'FAIL' });
  assert.equal(fails.total, 0);

  const page = await service.list({ page: 2, limit: 1 });
  assert.equal(page.page, 2);
  assert.equal(page.limit, 1);
});

test('TASK-053: an unknown decision id is reported as not found', async () => {
  const { service } = setup();
  await assert.rejects(() => service.findOne('decision-missing'), /not found/i);
});
