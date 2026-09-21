const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  scoreObjective,
  boundedScore,
  GradingService,
} = require('../dist/grading/grading.service');

class FakeAuditService {
  async record() {
    return { id: 'audit-1' };
  }
}

class FakeGradingRepository {
  constructor() {
    this.schemes = [];
    this.components = [];
  }

  async listSchemes() {
    return this.schemes;
  }

  async createScheme(data) {
    const scheme = { id: 'scheme-1', ...data };
    this.schemes.push(scheme);
    return scheme;
  }

  async createComponent(data) {
    const component = { id: 'component-1', ...data };
    this.components.push(component);
    return component;
  }

  async getScheme(id) {
    return this.schemes.find((row) => row.id === id) ?? null;
  }

  async getAssessment(id) {
    return id === 'assessment-1'
      ? { id: 'assessment-1', classSubjectId: 'class-1' }
      : { id, classSubjectId: 'class-2' };
  }

  async findComponentByAssessment(schemeId, assessmentId) {
    return this.components.find(
      (row) => row.schemeId === schemeId && row.assessmentId === assessmentId,
    );
  }

  async getSchemeComponents(schemeId) {
    return this.components.filter((row) => row.schemeId === schemeId);
  }
}

test('TASK-046 scores exact objective answers only', () => {
  const rule = { correctKeys: ['A', 'C'] };
  assert.equal(scoreObjective(rule, { keys: ['C', 'A'] }, 2), 2);
  assert.equal(scoreObjective(rule, { keys: ['A'] }, 2), 0);
  assert.equal(scoreObjective(rule, { keys: ['A', 'B'] }, 2), 0);
});

test('TASK-046 bounds manual scores to frozen question points', () => {
  assert.equal(boundedScore(1.25, 2), 1.25);
  assert.throws(() => boundedScore(-0.01, 2), /between/);
  assert.throws(() => boundedScore(2.01, 2), /between/);
});

test('TASK-050 grading scheme weights must total 100 and an assessment cannot cross class subject', async () => {
  const repo = new FakeGradingRepository();
  const service = new GradingService(repo, new FakeAuditService());

  await assert.rejects(
    () =>
      service.createScheme({ classSubjectId: 'class-1', name: 'Semester 1' }),
    /must total 100/i,
  );

  await service.createScheme({
    classSubjectId: 'class-1',
    name: 'Semester 1',
    components: [
      {
        assessmentId: 'assessment-1',
        name: 'Kuis',
        weight: 60,
        required: true,
      },
      { assessmentId: 'assessment-2', name: 'UTS', weight: 40, required: true },
    ],
  });

  await assert.rejects(
    () =>
      service.createComponent('scheme-1', {
        assessmentId: 'assessment-3',
        name: 'UAS',
        weight: 20,
        required: true,
      }),
    /same class subject/i,
  );
});
