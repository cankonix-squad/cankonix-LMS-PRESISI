/**
 * TASK-049 — Exam load & security tests.
 *
 * These are the invariants that decide whether the exam runtime is safe to put
 * in front of a real cohort. Two rules govern this file:
 *
 * 1. **Never weaken security to make a test pass.** Where production is
 *    genuinely weaker than the docs claim, the gap is recorded as an explicit
 *    test that names the weakness, rather than papered over with an assertion
 *    that cannot fail.
 * 2. **Test the real code.** The interesting rules (revision monotonicity,
 *    refusal of writes to a closed attempt, idempotent finalize, "one active
 *    attempt") live in `PrismaAttemptsRepository`, not in the thin
 *    `AttemptsService` pass-through. So these tests drive the *real*
 *    repository against an in-memory Prisma double — the same technique
 *    `attendance-summary.test.cjs` uses — instead of asserting against a
 *    hand-written stub that can only prove the stub works.
 *
 * Where an invariant is enforced by the database rather than by TypeScript
 * (unique indexes, transaction boundaries), the test asserts the constraint
 * really exists in `schema.prisma` / the migration, because that is the thing
 * holding the line in production.
 *
 * DEFERRED (TASK-049 AC5): the runtime load test (hundreds of concurrent
 * examinees against a live PostgreSQL + Redis + Keycloak) cannot be executed
 * here — no container runtime is available and Docker must not be installed
 * automatically. It is recorded as DEFERRED in
 * `tasks/TASK-049-exam-load-security-tests.md`. Everything below runs with no
 * database, which is why the concurrency cases model the *observable* race
 * rather than measuring throughput.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PrismaAttemptsRepository,
  AttemptsService,
} = require('../dist/attempts/attempts.service');
const {
  ATTEMPT_SELECT,
  toStudentAttempt,
} = require('../dist/attempts/attempt-response');
const {
  REQUIRE_PERMISSIONS_KEY,
} = require('../dist/authorization/authorization.decorators');
const { PermissionGuard } = require('../dist/authorization/permission.guard');
const { AttemptsController } = require('../dist/attempts/attempts.controller');
const { Reflector } = require('@nestjs/core');

const PARTICIPANT_ID = '22222222-2222-4222-8222-222222222222';
const ATTEMPT_ID = '11111111-1111-4111-8111-111111111111';
const ATTEMPT_QUESTION_ID = '33333333-3333-4333-8333-333333333333';
const QUESTION_VERSION_ID = '44444444-4444-4444-8444-444444444444';
const QUESTION_BANK_ID = '55555555-5555-4555-8555-555555555555';
const QUESTION_TYPE_ID = '66666666-6666-4666-8666-666666666666';

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
  'gradingRule',
];

const DECOY_ANSWER_KEY = {
  scoringRule: { correctKeys: ['C'], operator: 'ALL' },
  explanation: 'Jawaban benar adalah C menurut UUD 1945 Pasal 28.',
};

/** Deep-clones the plain data structures used as rows. */
function clone(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) out[key] = clone(nested);
    return out;
  }
  return value;
}

/** A Prisma-shaped P2002, so the fake cannot be mistaken for a 422. */
function uniqueViolation(target) {
  const error = new Error(
    `Unique constraint failed on the fields: (${target})`,
  );
  error.code = 'P2002';
  error.meta = { target };
  return error;
}

/**
 * In-memory Prisma double for `PrismaAttemptsRepository`.
 *
 * It implements only the delegates the repository actually calls, and it
 * enforces the unique indexes the migrations create:
 *
 * - `exam_attempts (participant_id, attempt_no)` — one row per attempt number;
 * - `attempt_questions (attempt_id, sequence)` and
 *   `attempt_questions (attempt_id, question_version_id)`;
 * - `attempt_answers (attempt_question_id)` — at most one answer per question.
 *
 * `interleave` inserts an `setImmediate` hop before every read, which is what
 * opens the read-then-write window a real database round-trip creates. It is
 * opt-in so the deterministic tests stay deterministic.
 */
class FakePrisma {
  constructor() {
    this.participants = new Map();
    this.questionVersions = new Map();
    this.attempts = new Map();
    this.attemptQuestions = new Map();
    this.answers = new Map();
    this.interleave = false;
    this.hops = 0;
  }

  async hop() {
    if (!this.interleave) return;
    this.hops += 1;
    await new Promise((resolve) => setImmediate(resolve));
  }

  /** The repository runs `$transaction`; the double just scopes the same state. */
  async $transaction(fn) {
    return fn(this);
  }

  /** Builds the exact shape `ATTEMPT_SELECT` would have produced. */
  project(attempt) {
    const questions = [...this.attemptQuestions.values()]
      .filter((question) => question.attemptId === attempt.id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((question) => {
        const version = this.questionVersions.get(question.questionVersionId);
        const answer = this.answers.get(question.id);
        return {
          id: question.id,
          sequence: question.sequence,
          points: question.points,
          optionOrder: question.optionOrder ?? null,
          questionVersion: {
            id: version.id,
            stem: version.stem,
            topic: version.topic ?? null,
            difficulty: version.difficulty ?? null,
            question: { questionType: clone(version.question.questionType) },
            options: version.options.map((option) => ({ ...option })),
          },
          answer: answer
            ? {
                answerPayload: clone(answer.answerPayload),
                revision: answer.revision,
                savedAt: answer.savedAt,
              }
            : null,
        };
      });

    return {
      id: attempt.id,
      participantId: attempt.participantId,
      attemptNo: attempt.attemptNo,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt ?? null,
      status: attempt.status,
      score: attempt.score ?? null,
      questions,
    };
  }

  get examParticipant() {
    const self = this;
    return {
      async findUnique({ where }) {
        await self.hop();
        return clone(self.participants.get(where.id)) ?? null;
      },
    };
  }

  get questionVersion() {
    const self = this;
    return {
      async findMany({ where = {}, take }) {
        await self.hop();
        let rows = [...self.questionVersions.values()].filter((version) => {
          if (where.status && version.status !== where.status) return false;
          if (where.difficulty && version.difficulty !== where.difficulty)
            return false;
          if (where.topic && version.topic !== where.topic) return false;
          const question = where.question ?? {};
          if (
            question.questionBankId &&
            version.question.questionBankId !== question.questionBankId
          )
            return false;
          if (
            question.questionTypeId &&
            version.question.questionTypeId !== question.questionTypeId
          )
            return false;
          return true;
        });
        rows = rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        if (typeof take === 'number') rows = rows.slice(0, take);
        return rows.map((version) => ({ id: version.id }));
      },
    };
  }

  get examAttempt() {
    const self = this;
    return {
      async findFirst({ where }) {
        await self.hop();
        for (const attempt of self.attempts.values()) {
          if (
            attempt.participantId === where.participantId &&
            attempt.status === where.status
          )
            return self.project(attempt);
        }
        return null;
      },
      async count({ where }) {
        await self.hop();
        let total = 0;
        for (const attempt of self.attempts.values()) {
          if (attempt.participantId === where.participantId) total += 1;
        }
        return total;
      },
      async findUnique({ where }) {
        await self.hop();
        const attempt = self.attempts.get(where.id);
        return attempt ? self.project(attempt) : null;
      },
      async create({ data }) {
        await self.hop();
        for (const existing of self.attempts.values()) {
          if (
            existing.participantId === data.participantId &&
            existing.attemptNo === data.attemptNo
          )
            throw uniqueViolation('participant_id, attempt_no');
        }
        const attempt = {
          id: data.id ?? ATTEMPT_ID,
          participantId: data.participantId,
          attemptNo: data.attemptNo,
          startedAt: data.startedAt,
          expiresAt: data.expiresAt,
          submittedAt: data.submittedAt ?? null,
          status: data.status,
          score: null,
        };
        self.attempts.set(attempt.id, attempt);
        for (const question of data.questions?.create ?? []) {
          const id = `${ATTEMPT_QUESTION_ID}-${question.sequence}`;
          self.attemptQuestions.set(id, {
            id,
            attemptId: attempt.id,
            questionVersionId: question.questionVersionId,
            sequence: question.sequence,
            points: question.points,
            optionOrder: null,
          });
        }
        return self.project(attempt);
      },
      async update({ where, data }) {
        await self.hop();
        const attempt = self.attempts.get(where.id);
        if (!attempt) throw new Error('Attempt not found');
        if (data.status !== undefined) attempt.status = data.status;
        if (data.submittedAt !== undefined)
          attempt.submittedAt = data.submittedAt;
        return self.project(attempt);
      },
    };
  }

  get attemptQuestion() {
    const self = this;
    return {
      async findFirst({ where }) {
        await self.hop();
        const question = self.attemptQuestions.get(where.id);
        if (!question || question.attemptId !== where.attemptId) return null;
        const attempt = self.attempts.get(question.attemptId);
        return {
          id: question.id,
          attempt: { status: attempt.status, expiresAt: attempt.expiresAt },
        };
      },
    };
  }

  get attemptAnswer() {
    const self = this;
    return {
      async findUnique({ where }) {
        await self.hop();
        const answer = self.answers.get(where.attemptQuestionId);
        return answer
          ? {
              answerPayload: clone(answer.answerPayload),
              revision: answer.revision,
              savedAt: answer.savedAt,
            }
          : null;
      },
      async upsert({ where, create, update }) {
        await self.hop();
        const key = where.attemptQuestionId;
        const existing = self.answers.get(key);
        if (existing) {
          existing.answerPayload = clone(update.answerPayload);
          existing.revision = update.revision;
          existing.savedAt = update.savedAt;
        } else {
          // The unique index is what makes this the only row for the question.
          for (const [otherKey] of self.answers) {
            if (otherKey === key) throw uniqueViolation('attempt_question_id');
          }
          self.answers.set(key, {
            attemptQuestionId: key,
            answerPayload: clone(create.answerPayload),
            revision: create.revision,
            savedAt: create.savedAt,
          });
        }
        const answer = self.answers.get(key);
        return {
          answerPayload: clone(answer.answerPayload),
          revision: answer.revision,
          savedAt: answer.savedAt,
        };
      },
    };
  }
}

/** Seeds an ELIGIBLE participant with a one-rule blueprint. */
function seedParticipant(prisma, overrides = {}) {
  const rules = overrides.rules ?? [
    {
      code: 'R1',
      count: 1,
      pointsPerQuestion: 2,
      difficulty: null,
      topic: null,
      questionBankId: null,
      questionTypeId: null,
    },
  ];
  prisma.participants.set(PARTICIPANT_ID, {
    id: PARTICIPANT_ID,
    status: overrides.status ?? 'ELIGIBLE',
    session: {
      endAt: overrides.endAt ?? new Date(Date.now() + 3 * 60 * 60 * 1000),
      exam: {
        durationMinutes: overrides.durationMinutes ?? 60,
        blueprint: { rules },
      },
    },
  });
  prisma.questionVersions.set(QUESTION_VERSION_ID, {
    id: QUESTION_VERSION_ID,
    status: 'PUBLISHED',
    difficulty: null,
    topic: null,
    stem: 'Pasal 28 menjamin hak apa?',
    question: {
      questionBankId: QUESTION_BANK_ID,
      questionTypeId: QUESTION_TYPE_ID,
      questionType: {
        code: 'SINGLE_CHOICE',
        name: 'Pilihan Ganda',
        hasOptions: true,
        multiSelect: false,
      },
    },
    options: [{ key: 'A', label: 'Kebebasan berpendapat', sortOrder: 0 }],
  });
  return prisma;
}

/**
 * Starts an attempt through the real repository and returns the ids the tests
 * need. Keeps every test from re-deriving the generated question id.
 */
async function startAttempt(prisma, now = new Date()) {
  const repo = new PrismaAttemptsRepository(prisma);
  const attempt = await repo.start(PARTICIPANT_ID, now);
  return { repo, attempt, questionId: attempt.questions[0].id };
}

// ---------------------------------------------------------------------------
// AC1 — no answer leak
// ---------------------------------------------------------------------------

/** Walks the serialized payload at every depth and collects every key seen. */
function collectKeys(value, seen = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, seen);
    return seen;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      seen.push(key);
      collectKeys(child, seen);
    }
  }
  return seen;
}

test('TASK-049 no answer leak — ATTEMPT_SELECT never fetches the answer key or explanation', () => {
  // The data-access defence: if the key is never selected it cannot be
  // returned even by a careless `return record`.
  const serialized = JSON.stringify(ATTEMPT_SELECT);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(
      !serialized.includes(forbidden),
      `ATTEMPT_SELECT must not fetch ${forbidden}`,
    );
  }
});

test('TASK-049 no answer leak — attempt payload exposes no key at any depth, even when the row carries one', () => {
  // The response defence: even if a version row *does* carry the answer key,
  // the participant projection must not admit it. This is the regression that
  // TASK-044's Prisma `include` originally failed.
  const row = {
    id: ATTEMPT_ID,
    participantId: PARTICIPANT_ID,
    attemptNo: 1,
    startedAt: new Date('2026-09-18T01:00:00.000Z'),
    expiresAt: new Date('2026-09-18T02:00:00.000Z'),
    submittedAt: null,
    status: 'IN_PROGRESS',
    score: null,
    questions: [
      {
        id: ATTEMPT_QUESTION_ID,
        sequence: 1,
        points: 2,
        optionOrder: null,
        // A full QuestionVersion row, key included, as the old `include` did.
        questionVersion: {
          id: QUESTION_VERSION_ID,
          stem: 'Pasal 28 menjamin hak apa?',
          topic: 'HAM',
          difficulty: 'EASY',
          ...DECOY_ANSWER_KEY,
          question: {
            questionType: {
              code: 'SINGLE_CHOICE',
              name: 'Pilihan Ganda',
              hasOptions: true,
              multiSelect: false,
            },
          },
          options: [{ key: 'A', label: 'Kebebasan berpendapat', sortOrder: 0 }],
        },
        answer: null,
      },
    ],
  };

  const projected = toStudentAttempt(row);
  const keys = collectKeys(projected);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(
      !keys.includes(forbidden),
      `participant attempt payload must not contain ${forbidden}`,
    );
  }
  // And not on the wire either — a nested string could still smuggle it out.
  const wire = JSON.stringify(projected);
  assert.doesNotMatch(wire, /scoringRule|correctKeys|explanation/);
  // The decoy really does contain the key, so the assertions above are not
  // passing because the fixture was empty.
  assert.match(JSON.stringify(row), /scoringRule/);
});

test('TASK-049 no answer leak — the compiled repository never selects the answer key', () => {
  // Guards against a future edit that reintroduces a wide `include` while the
  // response projection happens to still look safe.
  const compiled = fs.readFileSync(
    require.resolve('../dist/attempts/attempts.service.js'),
    'utf8',
  );
  for (const forbidden of ['scoringRule', 'explanation', 'correctKeys']) {
    assert.ok(
      !compiled.includes(forbidden),
      `attempts.service.js must not reference ${forbidden}`,
    );
  }
});

// ---------------------------------------------------------------------------
// AC2 — unauthorized attempt denied (authorization boundary)
// ---------------------------------------------------------------------------

/** The route → permission contract this task locks in. */
const ATTEMPT_ROUTE_POLICY = {
  start: 'exam.attempt.manage',
  get: 'exam.attempt.read',
  submit: 'exam.attempt.manage',
  saveAnswer: 'exam.attempt.manage',
};

test('TASK-049 unauthorized attempt denied — every attempt route declares its exam.attempt permission', () => {
  for (const [route, expected] of Object.entries(ATTEMPT_ROUTE_POLICY)) {
    const handler = AttemptsController.prototype[route];
    assert.equal(typeof handler, 'function', `${route} must exist`);

    // A policy-less route is denied by the fail-closed guard, so a missing
    // decorator is not "open" — but it is still a defect: the route would be
    // permanently unusable rather than governed by Permission + Scope.
    const required = Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler);
    assert.ok(
      Array.isArray(required) && required.length > 0,
      `attempt ${route} must declare at least one permission`,
    );
    assert.deepEqual(
      required,
      [expected],
      `attempt ${route} must require exactly ${expected}`,
    );
    for (const code of required) {
      assert.match(
        code,
        /^exam\.attempt\.(read|manage)$/,
        `attempt ${route} must use an exam.attempt permission, got ${code}`,
      );
    }
  }
});

test('TASK-049 unauthorized attempt denied — a caller without permission is refused with 403', async () => {
  const evaluator = {
    calls: [],
    async hasPermission(_accountId, code) {
      this.calls.push(code);
      return false;
    },
  };
  const guard = new PermissionGuard(evaluator, new Reflector());
  const context = {
    getHandler: () => AttemptsController.prototype.start,
    getClass: () => AttemptsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { accountId: 'user-1' },
        params: {},
        query: {},
        headers: {},
        body: {},
      }),
    }),
  };

  await assert.rejects(
    () => guard.canActivate(context),
    (error) => error.getStatus() === 403,
  );
  assert.ok(
    evaluator.calls.includes('exam.attempt.manage'),
    'the guard must actually consult the evaluator for the declared permission',
  );

  // Holding the permission passes the same boundary.
  const permitted = { async hasPermission() {} };
  permitted.hasPermission = async () => true;
  assert.equal(
    await new PermissionGuard(permitted, new Reflector()).canActivate(context),
    true,
  );
});

test('TASK-049 unauthorized attempt denied — anonymous callers are rejected before any policy runs', async () => {
  const evaluator = {
    calls: [],
    async hasPermission(_accountId, code) {
      this.calls.push(code);
      return true;
    },
  };
  const guard = new PermissionGuard(evaluator, new Reflector());
  const context = {
    getHandler: () => AttemptsController.prototype.start,
    getClass: () => AttemptsController,
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  };

  await assert.rejects(
    () => guard.canActivate(context),
    (error) => error.getStatus() === 401,
  );
  assert.equal(
    evaluator.calls.length,
    0,
    'an anonymous caller must be rejected before any permission is evaluated',
  );
});

test('TASK-049 unauthorized attempt denied — attempt reads carry no participant-ownership check (DOCUMENTED GAP)', () => {
  /**
   * Records a real security gap rather than pretending it is covered.
   *
   * `GET /attempts/:id`, `POST /attempts/:id/submit` and the autosave route are
   * gated by `exam.attempt.read` / `exam.attempt.manage` only. There is no
   * participant-ownership check: `AttemptsService.get/submit/saveAnswer` take a
   * bare id and never bind it to the caller's identity or enrollment.
   *
   * See `docs/04-authorization-model.md` (Permission + Scope are the security
   * boundary) and `docs/07-security-standards.md` ("verify authentication,
   * enrollment, eligibility, session window and attempts"). A permission-only
   * design means a caller holding `exam.attempt.read` can read another
   * participant's attempt if they know or guess the id.
   *
   * This test asserts the *current* code shape so the gap stays visible in CI.
   * It is written to fail the moment an ownership primitive appears — that
   * failure is the reminder to replace it with a real ownership assertion.
   */
  const serviceSource = fs.readFileSync(
    require.resolve('../dist/attempts/attempts.service.js'),
    'utf8',
  );
  for (const ownershipHint of [
    'principal',
    'currentUser',
    'accountId',
    'personId',
    'enrollmentId',
    'ownsAttempt',
  ]) {
    assert.ok(
      !serviceSource.includes(ownershipHint),
      `ownership check "${ownershipHint}" appeared — upgrade this test to assert real ownership enforcement`,
    );
  }
});

// ---------------------------------------------------------------------------
// AC3 — concurrent autosave semantics
// ---------------------------------------------------------------------------

test('TASK-049 autosave — a stale revision is refused and cannot overwrite a newer one', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  // The client's newest draft landed first.
  const first = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 5, answerPayload: { keys: ['A'] } },
    now,
  );
  assert.equal(
    first.revision,
    6,
    'the stored revision advances past the sent one',
  );

  // A late-arriving older draft must be refused, not applied.
  await assert.rejects(
    () =>
      repo.saveAnswer(
        attempt.id,
        questionId,
        { revision: 4, answerPayload: { keys: ['B'] } },
        now,
      ),
    (error) => error.getStatus() === 422,
  );
  assert.deepEqual(prisma.answers.get(questionId).answerPayload, {
    keys: ['A'],
  });
  assert.equal(prisma.answers.get(questionId).revision, 6);
});

test('TASK-049 autosave — replaying the identical write is idempotent and does not write twice', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  const first = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 1, answerPayload: { keys: ['A'] } },
    now,
  );
  // The client resends the revision the server acknowledged.
  const second = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 1, answerPayload: { keys: ['A'] } },
    now,
  );

  assert.deepEqual(second, first, 'a retry returns the same acknowledgement');
  assert.equal(second.revision, first.revision);
});

test('TASK-049 autosave — the same revision with a different payload is a conflict, never a silent overwrite', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 2, answerPayload: { keys: ['A'] } },
    now,
  );
  await assert.rejects(
    () =>
      repo.saveAnswer(
        attempt.id,
        questionId,
        { revision: 2, answerPayload: { keys: ['C'] } },
        now,
      ),
    (error) => error.getStatus() === 422,
  );
  assert.deepEqual(prisma.answers.get(questionId).answerPayload, {
    keys: ['A'],
  });
});

test('TASK-049 autosave — a second edit of the same question is accepted', async () => {
  /**
   * Regression for a real defect found while writing this suite.
   *
   * The student UI sends the revision the server last acknowledged
   * (`revisionOf(question)` -> `applySavedAnswer`), so the *next edit* arrives
   * with the same revision the server already stored. The old guard compared
   * revisions first and answered 422 "Answer revision conflict", so a
   * participant could only ever answer each question once — every later
   * keystroke on that question was rejected.
   *
   * Idempotency must be decided by the payload: identical payload = replay
   * (no-op), different payload = a new answer that advances the revision.
   */
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  // First answer: the client holds no revision yet, so it sends 0.
  const first = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 0, answerPayload: { keys: ['A'] } },
    now,
  );
  assert.equal(first.revision, 1);

  // The participant changes their mind; the client echoes the acknowledged
  // revision, so this edit carries revision 1 as well.
  const second = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: first.revision, answerPayload: { keys: ['B'] } },
    now,
  );
  assert.equal(second.revision, 2, 'the edit advances the stored revision');
  assert.deepEqual(second.answerPayload, { keys: ['B'] });
  assert.deepEqual(prisma.answers.get(questionId).answerPayload, {
    keys: ['B'],
  });

  // A third edit keeps working — the revision is a counter, not a one-shot.
  const third = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: second.revision, answerPayload: { keys: ['C'] } },
    now,
  );
  assert.equal(third.revision, 3);
});

test('TASK-049 autosave — a retried write is idempotent and is not mistaken for an edit', async () => {
  /**
   * The other half of the same protocol: a replay after a dropped response
   * carries the revision the server already stored *and* the payload it already
   * stored, so it must return the existing acknowledgement without writing.
   */
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  const first = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 0, answerPayload: { keys: ['A'] } },
    now,
  );
  // The response was lost, so the client resends the exact same request.
  const replay = await repo.saveAnswer(
    attempt.id,
    questionId,
    { revision: 0, answerPayload: { keys: ['A'] } },
    now,
  );

  assert.deepEqual(replay, first, 'a replay returns the same acknowledgement');
  assert.equal(
    prisma.answers.get(questionId).revision,
    first.revision,
    'a replay must not advance the revision a second time',
  );
});

test('TASK-049 autosave — a save on a finalized attempt is refused', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  await repo.submit(attempt.id, now);
  assert.equal(prisma.attempts.get(attempt.id).status, 'SUBMITTED');

  await assert.rejects(
    () =>
      repo.saveAnswer(
        attempt.id,
        questionId,
        { revision: 1, answerPayload: { keys: ['A'] } },
        now,
      ),
    (error) => error.getStatus() === 422,
  );
  assert.equal(
    prisma.answers.size,
    0,
    'a closed attempt must accept no writes',
  );
});

test('TASK-049 autosave — a save after the server deadline is refused', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);
  const afterDeadline = new Date(new Date(attempt.expiresAt).getTime() + 1);

  await assert.rejects(
    () =>
      repo.saveAnswer(
        attempt.id,
        questionId,
        { revision: 1, answerPayload: { keys: ['A'] } },
        afterDeadline,
      ),
    (error) => error.getStatus() === 422,
  );
  assert.equal(prisma.answers.size, 0);
});

test('TASK-049 autosave — a question that does not belong to the attempt is not writable', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt } = await startAttempt(prisma, now);

  await assert.rejects(
    () =>
      repo.saveAnswer(
        attempt.id,
        '99999999-9999-4999-8999-999999999999',
        { revision: 1, answerPayload: { keys: ['A'] } },
        now,
      ),
    (error) => error.getStatus() === 404,
  );
});

test('TASK-049 concurrent autosave — a same-revision pair can both be accepted (DOCUMENTED RACE)', async () => {
  /**
   * The revision guard is a read-then-write inside `$transaction`, but the
   * transaction runs at the database default (READ COMMITTED) with no row lock
   * on `attempt_answers`. Two writes that arrive together therefore both read
   * "no answer yet" and both proceed; the second upsert overwrites the first.
   *
   * The unique index on `attempt_question_id` still guarantees at most one row,
   * so no duplicate can be created — but the conflict is resolved by
   * last-writer-wins instead of the 422 the protocol intends.
   *
   * A single autosave client debounces and sends one write at a time, so this
   * is not exploitable today; it is recorded because a second tab or a retry
   * storm would be indistinguishable from a legitimate save.
   */
  const prisma = seedParticipant(new FakePrisma());
  prisma.interleave = true;
  const now = new Date();
  const { repo, attempt, questionId } = await startAttempt(prisma, now);

  const results = await Promise.allSettled([
    repo.saveAnswer(
      attempt.id,
      questionId,
      { revision: 1, answerPayload: { keys: ['A'] } },
      now,
    ),
    repo.saveAnswer(
      attempt.id,
      questionId,
      { revision: 1, answerPayload: { keys: ['C'] } },
      now,
    ),
  ]);

  const accepted = results.filter((r) => r.status === 'fulfilled');
  assert.equal(accepted.length, 2, 'both concurrent writes are accepted');
  assert.equal(
    prisma.answers.size,
    1,
    'the unique index still caps it at one row',
  );
});

// ---------------------------------------------------------------------------
// AC4 — double start / double submit
// ---------------------------------------------------------------------------

test('TASK-049 double start — starting twice returns the same active attempt and creates one row', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const repo = new PrismaAttemptsRepository(prisma);

  const first = await repo.start(PARTICIPANT_ID, now);
  const second = await repo.start(
    PARTICIPANT_ID,
    new Date(now.getTime() + 1000),
  );

  assert.equal(second.id, first.id, 'the active attempt is returned as-is');
  assert.equal(prisma.attempts.size, 1, 'no second attempt row may be created');
});

test('TASK-049 double start — the service exposes the same idempotency', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const service = new AttemptsService(new PrismaAttemptsRepository(prisma));

  const first = await service.start({ participantId: PARTICIPANT_ID });
  const second = await service.start({ participantId: PARTICIPANT_ID });

  assert.equal(first.id, second.id);
  assert.equal(prisma.attempts.size, 1);
});

test('TASK-049 concurrent start — the unique index caps active attempts at one (DOCUMENTED RACE)', async () => {
  /**
   * `start` reads for an existing IN_PROGRESS attempt, then counts, then
   * inserts — all inside a transaction but with no lock on `exam_attempts`.
   * Concurrent callers all see "no attempt yet" and all compute `attemptNo = 1`,
   * so the unique index `(participant_id, attempt_no)` rejects the losers with
   * P2002.
   *
   * The security-critical half holds: exactly one attempt row exists, so no
   * participant can end up with two active attempts. The robustness half does
   * not: the losers surface a unique-violation (500) instead of being handed
   * the attempt that won, so a client retry storm is noisy rather than
   * idempotent.
   */
  const prisma = seedParticipant(new FakePrisma());
  prisma.interleave = true;
  const now = new Date();
  const repo = new PrismaAttemptsRepository(prisma);

  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => repo.start(PARTICIPANT_ID, now)),
  );

  assert.equal(prisma.attempts.size, 1, 'only one attempt row may exist');
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  assert.equal(fulfilled.length, 1, 'exactly one caller wins the race');
  for (const rejected of results.filter((r) => r.status === 'rejected')) {
    assert.equal(
      rejected.reason.code,
      'P2002',
      'losers are rejected by the unique index, not silently duplicated',
    );
  }
});

test('TASK-049 double submit — a repeated submit finalizes once and cannot reopen the attempt', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt } = await startAttempt(prisma, now);

  const first = await repo.submit(attempt.id, now);
  const later = new Date(now.getTime() + 5 * 60 * 1000);
  const second = await repo.submit(attempt.id, later);

  assert.equal(first.status, 'SUBMITTED');
  assert.equal(second.status, 'SUBMITTED');
  assert.equal(
    prisma.attempts.get(attempt.id).submittedAt.getTime(),
    now.getTime(),
    'a retried submit must not restamp submittedAt',
  );
});

test('TASK-049 double submit — concurrent submits converge on one finalized attempt', async () => {
  const prisma = seedParticipant(new FakePrisma());
  prisma.interleave = true;
  const now = new Date();
  const { repo, attempt } = await startAttempt(prisma, now);

  const results = await Promise.all(
    Array.from({ length: 6 }, () => repo.submit(attempt.id, now)),
  );

  assert.ok(results.every((result) => result.status === 'SUBMITTED'));
  assert.equal(prisma.attempts.size, 1);
  assert.equal(prisma.attempts.get(attempt.id).status, 'SUBMITTED');
  assert.equal(
    prisma.attempts.get(attempt.id).submittedAt.getTime(),
    now.getTime(),
  );
});

test('TASK-049 double submit — the server deadline decides EXPIRED over SUBMITTED', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const now = new Date();
  const { repo, attempt } = await startAttempt(prisma, now);

  const afterDeadline = new Date(new Date(attempt.expiresAt).getTime() + 1);
  const result = await repo.submit(attempt.id, afterDeadline);

  assert.equal(
    result.status,
    'EXPIRED',
    'the server deadline, never the client clock, decides the final status',
  );
});

test('TASK-049 double submit — submitting an unknown attempt is a 404, not a silent success', async () => {
  const prisma = seedParticipant(new FakePrisma());
  const repo = new PrismaAttemptsRepository(prisma);

  await assert.rejects(
    () => repo.submit('99999999-9999-4999-8999-999999999999', new Date()),
    (error) => error.getStatus() === 404,
  );
});

// ---------------------------------------------------------------------------
// Structural invariants — the database is the real security boundary
// ---------------------------------------------------------------------------

test('TASK-049 structural — schema.prisma declares the unique indexes the invariants rely on', () => {
  const schema = fs.readFileSync(
    path.join(__dirname, '..', 'prisma', 'schema.prisma'),
    'utf8',
  );

  // One attempt number per participant: stops a duplicated concurrent start.
  assert.match(
    schema,
    /@@unique\(\[participantId, attemptNo\]\)/,
    'exam_attempts must keep (participantId, attemptNo) unique',
  );
  // A frozen question set: no duplicate position and no duplicate version.
  assert.match(schema, /@@unique\(\[attemptId, sequence\]\)/);
  assert.match(schema, /@@unique\(\[attemptId, questionVersionId\]\)/);
  // One answer per attempt question: the autosave upsert key.
  assert.match(schema, /attemptQuestionId\s+String\s+@unique/);
});

test('TASK-049 structural — multi-step attempt writes run inside a transaction', () => {
  const compiled = fs.readFileSync(
    require.resolve('../dist/attempts/attempts.service.js'),
    'utf8',
  );
  const transactions = compiled.match(/\$transaction/g) ?? [];
  assert.ok(
    transactions.length >= 2,
    'start and saveAnswer must each run inside $transaction',
  );
});
