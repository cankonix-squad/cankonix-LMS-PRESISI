const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AttemptsService } = require('../dist/attempts/attempts.service');
const attempt = (expiresAt = new Date(Date.now() + 60000)) => ({
  id: '11111111-1111-4111-8111-111111111111',
  participantId: '22222222-2222-4222-8222-222222222222',
  attemptNo: 1,
  startedAt: new Date(),
  expiresAt,
  submittedAt: null,
  status: 'IN_PROGRESS',
  score: null,
  questions: [],
});
class Repo {
  constructor() {
    this.current = null;
    this.starts = 0;
  }
  async start() {
    this.starts += 1;
    // Mirror the real repository: an active attempt is returned as-is.
    this.current ??= attempt();
    return this.current;
  }
  async find() {
    return this.current;
  }
  async expiresAt() {
    return this.current?.expiresAt ?? null;
  }
  async statusOf() {
    return this.current?.status ?? null;
  }
  async submit(_, now) {
    // Re-submitting a finalized attempt is an idempotent no-op.
    if (this.current.status !== 'IN_PROGRESS') return this.current;
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

/**
 * Regression: the attempt read used to return the whole `QuestionVersion` row
 * through a Prisma `include`, which carried `scoringRule` (the answer key) and
 * `explanation` straight to the examinee. TASK-044 claimed "no answer leak" but
 * had no test behind it.
 *
 * These assertions walk the full serialized payload at every depth, so a future
 * field added to `QuestionVersion` cannot quietly rejoin the participant
 * contract.
 */
const FORBIDDEN_KEYS = [
  'scoringRule',
  'scoring_rule',
  'explanation',
  'isCorrect',
  'is_correct',
  'correctKeys',
  'correct_keys',
  'maxScore',
  'max_score',
];

function collectKeys(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found);
    return found;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      found.push(key);
      collectKeys(nested, found);
    }
  }
  return found;
}

test('TASK-044 participant attempt payload never exposes an answer key', () => {
  const { toStudentAttempt } = require('../dist/attempts/attempt-response');
  const leakedRow = {
    id: 'attempt-1',
    participantId: 'participant-1',
    attemptNo: 1,
    startedAt: new Date('2026-09-18T00:00:00.000Z'),
    expiresAt: new Date('2026-09-18T01:00:00.000Z'),
    submittedAt: null,
    status: 'IN_PROGRESS',
    score: null,
    questions: [
      {
        id: 'question-1',
        sequence: 1,
        points: 2,
        optionOrder: ['B', 'A'],
        questionVersion: {
          id: 'version-1',
          stem: 'Sebutkan dasar hukum',
          topic: 'TWK',
          difficulty: 'EASY',
          question: {
            questionType: {
              hasOptions: true,
              multiSelect: false,
            },
          },
          // A real Prisma `include` would have returned these too.
          scoringRule: { correctKeys: ['A'] },
          explanation: 'Pasal 1',
          maxScore: 2,
          options: [
            { key: 'A', label: 'UUD 1945', sortOrder: 0, isCorrect: true },
            { key: 'B', label: 'Pancasila', sortOrder: 1, isCorrect: false },
          ],
        },
        answer: {
          answerPayload: { keys: ['A'] },
          revision: 3,
          savedAt: new Date('2026-09-18T00:30:00.000Z'),
        },
      },
    ],
  };

  const projected = toStudentAttempt(leakedRow);

  // The safe fields survive...
  assert.equal(projected.questions[0].stem, 'Sebutkan dasar hukum');
  assert.deepEqual(projected.questions[0].options, [
    { key: 'A', label: 'UUD 1945', sortOrder: 0 },
    { key: 'B', label: 'Pancasila', sortOrder: 1 },
  ]);
  // ...including the participant's own saved answer, so refresh/resume works.
  assert.deepEqual(projected.questions[0].answer, {
    answerPayload: { keys: ['A'] },
    revision: 3,
    savedAt: '2026-09-18T00:30:00.000Z',
  });

  // ...and the answer key is gone, at every depth, including on the wire.
  const keys = collectKeys(projected);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(
      !keys.includes(forbidden),
      `participant attempt payload must not contain ${forbidden}`,
    );
  }
  assert.doesNotMatch(JSON.stringify(projected), /scoringRule|correctKeys/);
});

test('TASK-044 repository select never fetches the answer key', () => {
  const { ATTEMPT_SELECT } = require('../dist/attempts/attempt-response');
  const serialized = JSON.stringify(ATTEMPT_SELECT);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(
      !serialized.includes(forbidden),
      `ATTEMPT_SELECT must not fetch ${forbidden}`,
    );
  }
});
