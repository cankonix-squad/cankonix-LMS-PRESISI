const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UnprocessableEntityException } = require('@nestjs/common');
const { ExamsService } = require('../dist/exams/exams.service');

const exam = (status = 'DRAFT', rules = [{ code: 'r1', count: 2 }]) => ({
  id: '11111111-1111-4111-8111-111111111111',
  status,
  assessmentId: '22222222-2222-4222-8222-222222222222',
  assessment: {
    classSubject: {
      curriculumSubjectId: '33333333-3333-4333-8333-333333333333',
    },
  },
  blueprint: { rules },
});
class Repo {
  constructor(record) {
    this.record = record;
    this.pool = 2;
  }
  async find() {
    return this.record;
  }
  async countPool() {
    return this.pool;
  }
  async updateStatus(_, status) {
    return { ...this.record, status };
  }
}
class Audit {
  async record() {}
}

test('TASK-042 rejects validation when a rule pool is insufficient', async () => {
  const repo = new Repo(exam());
  repo.pool = 1;
  await assert.rejects(
    () =>
      new ExamsService(repo, new Audit()).status(exam().id, {
        status: 'VALIDATED',
      }),
    (error) => error instanceof UnprocessableEntityException,
  );
});
test('TASK-042 validates a sufficient pool and transitions the exam', async () => {
  const repo = new Repo(exam());
  const result = await new ExamsService(repo, new Audit()).status(exam().id, {
    status: 'VALIDATED',
  });
  assert.equal(result.status, 'VALIDATED');
});
test('TASK-042 rejects mutation after scheduling', async () => {
  const repo = new Repo(exam('SCHEDULED'));
  await assert.rejects(
    () =>
      new ExamsService(repo, new Audit()).update(exam().id, {
        title: 'changed',
      }),
    (error) => error instanceof UnprocessableEntityException,
  );
});
