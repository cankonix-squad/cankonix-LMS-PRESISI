const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateEnrollment,
  validateRuleComponents,
  toNumber,
} = require('../dist/graduation/graduation-rules');
const { GraduationService } = require('../dist/graduation/graduation.service');

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
 * In-memory graduation repository.
 *
 * Mirrors the Prisma repository's observable contract: evaluations get their
 * detail rows in the same call, and `supersedeOpenEvaluations` flips prior
 * verdicts to SUPERSEDED rather than deleting them. That "never delete history"
 * behaviour is what the snapshot-integrity test asserts.
 */
class FakeGraduationRepository {
  constructor(options = {}) {
    this.rules = options.rules ?? [];
    this.context = options.context ?? new Map();
    this.evaluations = [];
    this.superseded = [];
    this.sequence = 0;
  }

  async createRule(data) {
    const rule = {
      id: `rule-${++this.sequence}`,
      educationBatchId: data.educationBatchId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      version: 1,
      status: 'DRAFT',
      publishedAt: null,
      publishedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      components: data.components.map((component, index) => ({
        id: `component-${index}`,
        graduationRuleId: 'pending',
        ...component,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    this.rules.push(rule);
    return rule;
  }

  async updateRule(id, data) {
    const rule = this.rules.find((row) => row.id === id);
    Object.assign(rule, data);
    return rule;
  }

  async findRuleById(id) {
    return this.rules.find((row) => row.id === id) ?? null;
  }

  async listRules(filter) {
    const data = this.rules.filter(
      (rule) =>
        (!filter.educationBatchId ||
          rule.educationBatchId === filter.educationBatchId) &&
        (!filter.status || rule.status === filter.status),
    );
    return { data, total: data.length };
  }

  async updateRuleStatus(id, status, publishedByUserId) {
    const rule = this.rules.find((row) => row.id === id);
    rule.status = status;
    rule.publishedByUserId = status === 'PUBLISHED' ? publishedByUserId : null;
    rule.publishedAt = status === 'PUBLISHED' ? new Date() : null;
    return rule;
  }

  async findLatestPublishedRuleForBatch(educationBatchId) {
    return (
      this.rules
        .filter(
          (rule) =>
            rule.educationBatchId === educationBatchId &&
            rule.status === 'PUBLISHED',
        )
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async listEnrollmentsForBatch(educationBatchId) {
    return [...this.context.entries()]
      .filter(([, ctx]) => ctx.educationBatchId === educationBatchId)
      .map(([enrollmentId]) => ({ enrollmentId }));
  }

  async loadEvaluationContext(enrollmentId) {
    return this.context.get(enrollmentId) ?? null;
  }

  async supersedeOpenEvaluations(enrollmentId, ruleId) {
    for (const evaluation of this.evaluations) {
      if (
        evaluation.enrollmentId === enrollmentId &&
        evaluation.graduationRuleId === ruleId &&
        evaluation.outcome !== 'SUPERSEDED'
      ) {
        this.superseded.push(evaluation.id);
        evaluation.outcome = 'SUPERSEDED';
      }
    }
  }

  async createEvaluation(data) {
    const evaluation = {
      id: `evaluation-${++this.sequence}`,
      enrollmentId: data.enrollmentId,
      graduationRuleId: data.graduationRuleId,
      outcome: data.outcome,
      evaluatedAt: new Date(),
      evaluatedByUserId: data.evaluatedByUserId ?? null,
      snapshot: data.snapshot,
      createdAt: new Date(),
      updatedAt: new Date(),
      details: data.details.map((detail, index) => ({
        id: `detail-${index}`,
        graduationEvaluationId: `evaluation-${this.sequence}`,
        ...detail,
        createdAt: new Date(),
      })),
    };
    this.evaluations.push(evaluation);
    return evaluation;
  }

  async findEvaluationById(id) {
    return this.evaluations.find((row) => row.id === id) ?? null;
  }

  async listEvaluationsForEnrollment(enrollmentId) {
    return this.evaluations.filter((row) => row.enrollmentId === enrollmentId);
  }

  async findAssessmentMaxScore(assessmentId) {
    return assessmentId === 'assessment-missing' ? null : 100;
  }
}

function publishedRule(overrides = {}) {
  return {
    id: 'rule-1',
    educationBatchId: 'batch-1',
    code: 'GRAD-2026',
    name: 'Kelulusan 2026',
    description: null,
    version: 2,
    status: 'PUBLISHED',
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    publishedByUserId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    components: [
      {
        id: 'component-attendance',
        graduationRuleId: 'rule-1',
        componentType: 'ATTENDANCE_PERCENTAGE',
        label: 'Kehadiran minimal',
        thresholdValue: 80,
        subjectId: null,
        assessmentId: null,
        required: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'component-final',
        graduationRuleId: 'rule-1',
        componentType: 'FINAL_SCORE',
        label: 'Nilai akhir minimal',
        thresholdValue: 70,
        subjectId: null,
        assessmentId: null,
        required: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    enrollmentId: 'enrollment-1',
    educationBatchId: 'batch-1',
    status: 'ACTIVE',
    attendancePercentage: 85,
    finalScoresByClassSubject: new Map([['class-1', 80]]),
    finalScoresByCurriculumSubject: new Map(),
    finalExamScoresByAssessment: new Map(),
    ...overrides,
  };
}

test('TASK-052 rule components: thresholds are validated per component type', () => {
  assert.throws(
    () =>
      validateRuleComponents([
        {
          componentType: 'ATTENDANCE_PERCENTAGE',
          label: 'Kehadiran',
          thresholdValue: null,
          subjectId: null,
          assessmentId: null,
        },
      ]),
    /requires a threshold/,
  );

  assert.throws(
    () =>
      validateRuleComponents([
        {
          componentType: 'REQUIRED_SUBJECT',
          label: 'Subjek wajib',
          thresholdValue: null,
          subjectId: null,
          assessmentId: null,
        },
      ]),
    /requires a subjectId/,
  );

  assert.throws(
    () =>
      validateRuleComponents([
        {
          componentType: 'FINAL_EXAM',
          label: 'Ujian akhir',
          thresholdValue: null,
          subjectId: null,
          assessmentId: null,
        },
      ]),
    /requires an assessmentId/,
  );

  // A threshold outside 0–100 would describe a rule nobody can satisfy.
  assert.throws(
    () =>
      validateRuleComponents([
        {
          componentType: 'FINAL_SCORE',
          label: 'Nilai akhir',
          thresholdValue: 150,
          subjectId: null,
          assessmentId: null,
        },
      ]),
    /between 0 and 100/,
  );

  assert.throws(() => validateRuleComponents([]), /at least one component/);

  assert.doesNotThrow(() =>
    validateRuleComponents([
      {
        componentType: 'FINAL_EXAM',
        label: 'Ujian akhir',
        thresholdValue: 60,
        subjectId: null,
        assessmentId: 'assessment-1',
      },
    ]),
  );
});

test('TASK-052 thresholds decide eligibility deterministically', () => {
  const rule = publishedRule();

  const eligible = evaluateEnrollment(
    rule,
    context(),
    new Date('2026-06-01T00:00:00.000Z'),
  );
  assert.equal(eligible.outcome, 'ELIGIBLE');
  assert.equal(eligible.snapshot.eligible, true);
  assert.equal(eligible.snapshot.ruleVersion, 2);

  // Attendance exactly at the threshold passes: the boundary is inclusive.
  const atBoundary = evaluateEnrollment(
    rule,
    context({ attendancePercentage: 80 }),
  );
  assert.equal(atBoundary.outcome, 'ELIGIBLE');

  // One point under fails.
  const belowAttendance = evaluateEnrollment(
    rule,
    context({ attendancePercentage: 79.99 }),
  );
  assert.equal(belowAttendance.outcome, 'NOT_ELIGIBLE');
  assert.equal(
    belowAttendance.components.find(
      (c) => c.componentType === 'ATTENDANCE_PERCENTAGE',
    ).passed,
    false,
  );

  // Final score threshold is evaluated independently of attendance.
  const belowFinal = evaluateEnrollment(
    rule,
    context({ finalScoresByClassSubject: new Map([['class-1', 69]]) }),
  );
  assert.equal(belowFinal.outcome, 'NOT_ELIGIBLE');
});

test('TASK-052 a missing observation fails rather than silently passing', () => {
  const rule = publishedRule();

  const noAttendance = evaluateEnrollment(
    rule,
    context({ attendancePercentage: null }),
  );
  assert.equal(noAttendance.outcome, 'NOT_ELIGIBLE');
  const attendanceComponent = noAttendance.components.find(
    (c) => c.componentType === 'ATTENDANCE_PERCENTAGE',
  );
  assert.equal(attendanceComponent.observedValue, null);
  assert.match(attendanceComponent.note, /No attendance record/);

  // No final grade at all must not be treated as a score of zero that happens
  // to clear a zero threshold, nor as a pass.
  const noGrade = evaluateEnrollment(
    rule,
    context({ finalScoresByClassSubject: new Map() }),
  );
  assert.equal(noGrade.outcome, 'NOT_ELIGIBLE');
  const finalComponent = noGrade.components.find(
    (c) => c.componentType === 'FINAL_SCORE',
  );
  assert.equal(finalComponent.observedValue, null);
  assert.match(finalComponent.note, /No final grade/);
});

test('TASK-052 required subjects and final exams are observed by their own thresholds', () => {
  const rule = publishedRule({
    components: [
      {
        id: 'component-subject',
        graduationRuleId: 'rule-1',
        componentType: 'REQUIRED_SUBJECT',
        label: 'Etika Profesi',
        thresholdValue: 75,
        subjectId: 'subject-1',
        assessmentId: null,
        required: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'component-exam',
        graduationRuleId: 'rule-1',
        componentType: 'FINAL_EXAM',
        label: 'Ujian Komprehensif',
        thresholdValue: 65,
        subjectId: null,
        assessmentId: 'assessment-exam',
        required: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  const passing = evaluateEnrollment(
    rule,
    context({
      finalScoresByCurriculumSubject: new Map([['subject-1', 75]]),
      finalExamScoresByAssessment: new Map([['assessment-exam', 65]]),
    }),
  );
  assert.equal(passing.outcome, 'ELIGIBLE');

  const failingExam = evaluateEnrollment(
    rule,
    context({
      finalScoresByCurriculumSubject: new Map([['subject-1', 75]]),
      finalExamScoresByAssessment: new Map([['assessment-exam', 64.99]]),
    }),
  );
  assert.equal(failingExam.outcome, 'NOT_ELIGIBLE');

  // A component that names an entity the participant has no record for fails
  // with an explanatory note rather than a generic verdict.
  const missingExam = evaluateEnrollment(
    rule,
    context({
      finalScoresByCurriculumSubject: new Map([['subject-1', 75]]),
      finalExamScoresByAssessment: new Map(),
    }),
  );
  assert.equal(missingExam.outcome, 'NOT_ELIGIBLE');
  assert.match(
    missingExam.components.find((c) => c.componentType === 'FINAL_EXAM').note,
    /No graded attempt/,
  );
});

test('TASK-052 an optional component is recorded but does not gate graduation', () => {
  const rule = publishedRule({
    components: [
      {
        id: 'component-required',
        graduationRuleId: 'rule-1',
        componentType: 'ATTENDANCE_PERCENTAGE',
        label: 'Kehadiran minimal',
        thresholdValue: 80,
        subjectId: null,
        assessmentId: null,
        required: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'component-optional',
        graduationRuleId: 'rule-1',
        componentType: 'FINAL_SCORE',
        label: 'Nilai akhir (informatif)',
        thresholdValue: 95,
        subjectId: null,
        assessmentId: null,
        required: false,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  const result = evaluateEnrollment(rule, context());
  // The optional component fails (80 < 95) but attendance passes, so the
  // participant is still eligible — and the failure is still on the record.
  assert.equal(result.outcome, 'ELIGIBLE');
  assert.equal(
    result.components.find((c) => c.componentType === 'FINAL_SCORE').passed,
    false,
  );
});

test('TASK-052 snapshot is reproducible: re-evaluating identical inputs yields identical evidence', () => {
  const rule = publishedRule();
  const fixedContext = context();

  const first = evaluateEnrollment(
    rule,
    fixedContext,
    new Date('2026-06-01T00:00:00.000Z'),
  );
  const second = evaluateEnrollment(
    rule,
    fixedContext,
    new Date('2026-06-01T00:00:00.000Z'),
  );

  assert.deepEqual(first.snapshot, second.snapshot);
  assert.deepEqual(first.components, second.components);
  assert.equal(first.outcome, second.outcome);

  // And the snapshot is JSON-safe: it survives a round-trip, which is what lets
  // it be persisted as JSONB and rendered to a reviewer unchanged.
  const roundTripped = JSON.parse(JSON.stringify(first.snapshot));
  assert.deepEqual(roundTripped, first.snapshot);
});

test('TASK-052 evaluating an enrollment supersedes the prior verdict without deleting it', async () => {
  const rule = publishedRule();
  const repo = new FakeGraduationRepository({
    rules: [rule],
    context: new Map([['enrollment-1', context()]]),
  });
  const audit = new FakeAuditService();
  const service = new GraduationService(repo, audit);

  const first = await service.evaluateEnrollment({
    enrollmentId: 'enrollment-1',
  });
  assert.equal(first.outcome, 'ELIGIBLE');

  const second = await service.evaluateEnrollment({
    enrollmentId: 'enrollment-1',
  });
  assert.equal(second.outcome, 'ELIGIBLE');

  // Two rows now exist; the earlier one is SUPERSEDED, not removed.
  const history = await service.listEvaluationsForEnrollment('enrollment-1');
  assert.equal(history.length, 2);
  const outcomes = history.map((row) => row.outcome).sort();
  assert.deepEqual(outcomes, ['ELIGIBLE', 'SUPERSEDED']);

  // The snapshot pins the exact rule version that produced the verdict.
  assert.equal(second.snapshot.ruleVersion, 2);
  assert.equal(second.snapshot.ruleCode, 'GRAD-2026');
  assert.equal(second.snapshot.enrollmentId, 'enrollment-1');
});

test('TASK-052 only a published rule can be evaluated and every run is audited', async () => {
  const draft = publishedRule({ status: 'DRAFT' });
  const repo = new FakeGraduationRepository({
    rules: [draft],
    context: new Map([['enrollment-1', context()]]),
  });
  const audit = new FakeAuditService();
  const service = new GraduationService(repo, audit);

  // A DRAFT is not resolvable because no PUBLISHED rule exists for the batch.
  await assert.rejects(
    () => service.evaluateEnrollment({ enrollmentId: 'enrollment-1' }),
    /No published graduation rule/,
  );

  draft.status = 'PUBLISHED';
  const evaluation = await service.evaluateEnrollment({
    enrollmentId: 'enrollment-1',
    evaluatedByUserId: 'user-9',
  });
  assert.equal(evaluation.outcome, 'ELIGIBLE');

  const entry = audit.entries.find(
    (row) => row.action === 'graduation_evaluation.run',
  );
  assert.ok(entry, 'evaluation run must be audited');
  assert.equal(entry.resourceType, 'graduation_evaluation');
  assert.equal(entry.metadata.enrollmentId, 'enrollment-1');
  assert.equal(entry.metadata.evaluatedByUserId, 'user-9');
});

test('TASK-052 a published rule is frozen: it cannot be edited and cannot return to DRAFT', async () => {
  const rule = publishedRule();
  const repo = new FakeGraduationRepository({ rules: [rule] });
  const service = new GraduationService(repo, new FakeAuditService());

  await assert.rejects(
    () => service.updateRule('rule-1', { name: 'Diubah' }),
    /published graduation rule cannot be updated/i,
  );

  await assert.rejects(
    () => service.changeStatus('rule-1', 'DRAFT'),
    /cannot move from PUBLISHED to DRAFT/,
  );

  // Archiving is the permitted terminal move.
  const archived = await service.changeStatus('rule-1', 'ARCHIVED', 'user-1');
  assert.equal(archived.status, 'ARCHIVED');

  // An archived rule can no longer be touched at all.
  await assert.rejects(
    () => service.changeStatus('rule-1', 'PUBLISHED', 'user-1'),
    /archived graduation rule cannot be changed/,
  );
});

test('TASK-052 batch evaluation summarises the cohort and isolates per-participant outcomes', async () => {
  const rule = publishedRule();
  const repo = new FakeGraduationRepository({
    rules: [rule],
    context: new Map([
      ['enrollment-pass', context({ enrollmentId: 'enrollment-pass' })],
      [
        'enrollment-fail',
        context({ enrollmentId: 'enrollment-fail', attendancePercentage: 50 }),
      ],
      [
        'enrollment-missing',
        context({
          enrollmentId: 'enrollment-missing',
          finalScoresByClassSubject: new Map(),
        }),
      ],
    ]),
  });
  const audit = new FakeAuditService();
  const service = new GraduationService(repo, audit);

  const summary = await service.evaluateBatch({ educationBatchId: 'batch-1' });

  assert.equal(summary.total, 3);
  assert.equal(summary.eligible, 1);
  assert.equal(summary.notEligible, 2);

  // One participant's missing data does not abort the batch.
  const outcomes = summary.results.map((row) => row.outcome).sort();
  assert.deepEqual(outcomes, ['ELIGIBLE', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE']);

  // Each participant's evaluation is audited separately.
  const runs = audit.entries.filter(
    (row) => row.action === 'graduation_evaluation.run',
  );
  assert.equal(runs.length, 3);
});

test('TASK-052 evaluation is refused when the rule belongs to a different batch', async () => {
  const rule = publishedRule({ educationBatchId: 'batch-other' });
  const repo = new FakeGraduationRepository({
    rules: [rule],
    context: new Map([['enrollment-1', context()]]),
  });
  const service = new GraduationService(repo, new FakeAuditService());

  await assert.rejects(
    () =>
      service.evaluateEnrollment({
        enrollmentId: 'enrollment-1',
        graduationRuleId: 'rule-1',
      }),
    /does not belong to the enrollment batch/,
  );
});

test('TASK-052 a rule component cannot reference an assessment that does not exist', async () => {
  const repo = new FakeGraduationRepository({});
  const service = new GraduationService(repo, new FakeAuditService());

  await assert.rejects(
    () =>
      service.createRule({
        educationBatchId: 'batch-1',
        code: 'GRAD-X',
        name: 'Aturan',
        components: [
          {
            componentType: 'FINAL_EXAM',
            label: 'Ujian akhir',
            thresholdValue: 60,
            assessmentId: 'assessment-missing',
          },
        ],
      }),
    /does not exist/,
  );
});

test('TASK-052 createRule persists a well-formed rule and audits it', async () => {
  const repo = new FakeGraduationRepository({});
  const audit = new FakeAuditService();
  const service = new GraduationService(repo, audit);

  const created = await service.createRule({
    educationBatchId: 'batch-1',
    code: 'GRAD-X',
    name: 'Aturan Kelulusan',
    components: [
      {
        componentType: 'ATTENDANCE_PERCENTAGE',
        label: 'Kehadiran',
        thresholdValue: 80,
      },
      {
        componentType: 'FINAL_EXAM',
        label: 'Ujian akhir',
        thresholdValue: 60,
        assessmentId: 'assessment-1',
      },
    ],
  });

  assert.equal(created.code, 'GRAD-X');
  assert.equal(created.components.length, 2);
  assert.equal(
    created.components[0].required,
    true,
    'components default to required',
  );

  const entry = audit.entries.find(
    (row) => row.action === 'graduation_rule.created',
  );
  assert.ok(entry);
  assert.equal(entry.resourceType, 'graduation_rule');
});

test('TASK-052 toNumber distinguishes "no value" from a real zero', () => {
  assert.equal(toNumber(null), null);
  assert.equal(toNumber(undefined), null);
  assert.equal(toNumber(0), 0);
  assert.equal(toNumber('72.5'), 72.5);
  assert.equal(toNumber({ toNumber: () => 88.25 }), 88.25);
  assert.equal(toNumber('not-a-number'), null);
});
