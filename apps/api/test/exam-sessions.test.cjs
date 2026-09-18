const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  ExamSessionsService,
} = require('../dist/exam-sessions/exam-sessions.service');
const session = (status = 'DRAFT') => ({
  id: '11111111-1111-4111-8111-111111111111',
  status,
  startAt: new Date('2026-10-05T08:00:00Z'),
  endAt: new Date('2026-10-05T10:00:00Z'),
});
class Repo {
  constructor(record = session()) {
    this.record = record;
    this.duplicate = false;
  }
  async create(dto) {
    return { ...session(), ...dto };
  }
  async find() {
    return this.record;
  }
  async updateStatus(_, status) {
    return { ...this.record, status };
  }
  async addParticipant() {
    if (this.duplicate) {
      const error = new Error();
      error.code = 'P2002';
      throw error;
    }
    return { id: 'p1' };
  }
}
test('TASK-043 rejects an inverted session window', async () => {
  await assert.rejects(
    () =>
      new ExamSessionsService(new Repo()).create({
        startAt: '2026-10-05T10:00:00Z',
        endAt: '2026-10-05T08:00:00Z',
      }),
    (e) => e instanceof BadRequestException,
  );
});
test('TASK-043 enforces session lifecycle', async () => {
  await assert.rejects(
    () =>
      new ExamSessionsService(new Repo(session('CLOSED'))).status(
        session().id,
        { status: 'OPEN' },
      ),
    (e) => e instanceof UnprocessableEntityException,
  );
});
test('TASK-043 blocks duplicate participant assignment', async () => {
  const repo = new Repo();
  repo.duplicate = true;
  await assert.rejects(
    () =>
      new ExamSessionsService(repo).addParticipant(repo.record.id, {
        enrollmentId: '22222222-2222-4222-8222-222222222222',
      }),
    (e) => e instanceof ConflictException,
  );
});
