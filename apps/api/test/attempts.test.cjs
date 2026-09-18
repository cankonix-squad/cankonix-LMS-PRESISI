const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AttemptsService } = require('../dist/attempts/attempts.service');
const attempt = (expiresAt = new Date(Date.now() + 60000)) => ({
  id: '11111111-1111-4111-8111-111111111111',
  participantId: '22222222-2222-4222-8222-222222222222',
  startedAt: new Date(),
  expiresAt,
  status: 'IN_PROGRESS',
  questions: [],
});
class Repo {
  constructor() {
    this.current = null;
    this.starts = 0;
  }
  async start() {
    this.starts += 1;
    this.current ??= attempt();
    return this.current;
  }
  async find() {
    return this.current;
  }
  async submit(_, now) {
    this.current = {
      ...this.current,
      status: now >= this.current.expiresAt ? 'EXPIRED' : 'SUBMITTED',
      submittedAt: now,
    };
    return this.current;
  }
}
test('TASK-044 start is idempotent for an active participant attempt', async () => {
  const repo = new Repo();
  const service = new AttemptsService(repo);
  const first = await service.start({ participantId: attempt().participantId });
  const second = await service.start({
    participantId: attempt().participantId,
  });
  assert.equal(first.id, second.id);
  assert.equal(repo.starts, 2);
});
test('TASK-044 uses server deadline and expires overdue attempts', async () => {
  const repo = new Repo();
  repo.current = attempt(new Date(Date.now() - 1));
  const result = await new AttemptsService(repo).submit(repo.current.id);
  assert.equal(result.status, 'EXPIRED');
});
test('TASK-044 finalizes active attempts before deadline', async () => {
  const repo = new Repo();
  const result = await new AttemptsService(repo).submit(
    (await repo.start('p')).id,
  );
  assert.equal(result.status, 'SUBMITTED');
});
