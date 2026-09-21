const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  FinalGradesService,
} = require('../dist/final-grades/final-grades.service');

class FakeAuditService {
  async record(input) {
    this.last = input;
    return { ok: true };
  }
}

class FakeFinalGradeRepository {
  constructor() {
    this.grades = new Map();
  }

  async findSchemeById(id) {
    if (id !== 'scheme-1') return null;
    return {
      id: 'scheme-1',
      classSubjectId: 'class-1',
      components: [
        { assessmentId: 'a-1', name: 'Kuis', weight: 60, required: true },
        { assessmentId: 'a-2', name: 'UTS', weight: 40, required: true },
      ],
    };
  }

  async listAssessmentScores(enrollmentId, classSubjectId) {
    if (enrollmentId !== 'enrollment-1' || classSubjectId !== 'class-1') {
      return [];
    }
    return [
      { assessmentId: 'a-1', score: 90 },
      { assessmentId: 'a-2', score: 80 },
    ];
  }

  async findByEnrollmentClassSubject(enrollmentId, classSubjectId) {
    const key = `${enrollmentId}:${classSubjectId}`;
    return this.grades.get(key) ?? null;
  }

  async findById(id) {
    for (const row of this.grades.values()) {
      if (row.id === id) return row;
    }
    return null;
  }

  async updateStatus(id, data) {
    const key = [...this.grades.keys()].find((entryKey) => {
      const row = this.grades.get(entryKey);
      return row && row.id === id;
    });
    if (!key) throw new Error('Final grade not found');
    const row = this.grades.get(key);
    const updated = {
      ...row,
      status: data.status,
      approvedByUserId: data.approvedByUserId ?? row.approvedByUserId ?? null,
      approvedAt: data.approvedAt ?? row.approvedAt ?? null,
    };
    this.grades.set(key, updated);
    return updated;
  }

  async upsertGrade(data) {
    const key = `${data.enrollmentId}:${data.classSubjectId}`;
    const row = { ...data, id: data.id ?? `grade-${this.grades.size + 1}` };
    this.grades.set(key, row);
    return row;
  }
}

test('TASK-051 final grade — deterministic weighted calculation', async () => {
  const repo = new FakeFinalGradeRepository();
  const service = new FinalGradesService(repo, new FakeAuditService());

  const result = await service.calculate({
    enrollmentId: 'enrollment-1',
    classSubjectId: 'class-1',
    gradingSchemeId: 'scheme-1',
  });

  assert.equal(result.numericScore, 86);
  assert.equal(result.gradeCode, 'B');
  assert.equal(result.status, 'CALCULATED');
});

test('TASK-051 final grade — missing required component is rejected explicitly', async () => {
  const repo = new FakeFinalGradeRepository();
  repo.listAssessmentScores = async () => [{ assessmentId: 'a-1', score: 90 }];
  const service = new FinalGradesService(repo, new FakeAuditService());

  await assert.rejects(
    () =>
      service.calculate({
        enrollmentId: 'enrollment-1',
        classSubjectId: 'class-1',
        gradingSchemeId: 'scheme-1',
      }),
    (error) => error.message.includes('required') || error.status === 400,
  );
});

test('TASK-051 final grade — approval is audited and cannot silently change an approved grade', async () => {
  const repo = new FakeFinalGradeRepository();
  const service = new FinalGradesService(repo, new FakeAuditService());

  const calculated = await service.calculate({
    enrollmentId: 'enrollment-1',
    classSubjectId: 'class-1',
    gradingSchemeId: 'scheme-1',
  });

  const approved = await service.approve(calculated.id, {
    approvedByUserId: 'user-1',
  });
  assert.equal(approved.status, 'APPROVED');

  await assert.rejects(
    () =>
      service.recalculate({
        enrollmentId: 'enrollment-1',
        classSubjectId: 'class-1',
        gradingSchemeId: 'scheme-1',
      }),
    (error) => error.message.includes('approved') || error.status === 409,
  );
});
