const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  AssignmentsService,
} = require('../dist/assignments/assignments.service');
const {
  SubmissionsService,
} = require('../dist/assignments/submissions.service');
const {
  AssignmentLifecycleStatusDto,
} = require('../dist/assignments/dto/assignment-status.dto');
const {
  AssignmentSubmissionStatusDto,
} = require('../dist/assignments/dto/assignment-submission-status.dto');
const { createApp } = require('../dist/app');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }

  actions() {
    return this.records.map((r) => r.action);
  }
}

const CLASS_SUBJECT_1 = 'aaaaaaaa-1111-4aaa-8aaa-000000000001';
const ACADEMIC_CLASS_1 = 'bbbbbbbb-1111-4bbb-8bbb-000000000001';
const ENROLLMENT_1 = 'cccccccc-1111-4ccc-8ccc-000000000001';
const ENROLLMENT_2 = 'cccccccc-2222-4ccc-8ccc-000000000002';
const ENROLLMENT_INACTIVE = 'cccccccc-3333-4ccc-8ccc-000000000003';
const ACTIVITY_1 = 'dddddddd-1111-4ddd-8ddd-000000000001';
const PERSON_1 = 'eeeeeeee-1111-4eee-8eee-000000000001';
const PERSON_2 = 'eeeeeeee-2222-4eee-8eee-000000000002';
const PERSON_EDUCATOR = 'eeeeeeee-3333-4eee-8eee-000000000003';
const PERSON_STRANGER = 'eeeeeeee-4444-4eee-8eee-000000000004';
const FILE_OK = 'ffffffff-1111-4fff-8fff-000000000001';
const FILE_WRONG_NAMESPACE = 'ffffffff-2222-4fff-8fff-000000000002';
const FILE_PENDING = 'ffffffff-3333-4fff-8fff-000000000003';

const DUE_AT = new Date('2026-05-01T12:00:00.000Z');
const DUE_AT_ISO = DUE_AT.toISOString();
const BEFORE_DUE = new Date('2026-05-01T11:00:00.000Z');
const AFTER_DUE = new Date('2026-05-01T13:00:00.000Z');

class MemoryAssignmentsRepository {
  constructor() {
    this.assignments = [];
    this.submissions = [];
    this.files = [];
    this.grades = [];
    this.nextAssignment = 1;
    this.nextSubmission = 1;
    this.nextFile = 1;
    this.nextGrade = 1;

    this.activities = new Map([
      [
        ACTIVITY_1,
        {
          activityId: ACTIVITY_1,
          activityStatus: 'PUBLISHED',
          meetingId: 'meeting-1',
          meetingStatus: 'PUBLISHED',
          classSubjectId: CLASS_SUBJECT_1,
          classSubjectStatus: 'ACTIVE',
          academicClassId: ACADEMIC_CLASS_1,
          educationBatchId: 'batch-1',
        },
      ],
    ]);

    this.enrollments = new Map([
      [
        ENROLLMENT_1,
        {
          enrollmentId: ENROLLMENT_1,
          personId: PERSON_1,
          status: 'ACTIVE',
          educationBatchId: 'batch-1',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
      [
        ENROLLMENT_2,
        {
          enrollmentId: ENROLLMENT_2,
          personId: PERSON_2,
          status: 'ACTIVE',
          educationBatchId: 'batch-1',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
      [
        ENROLLMENT_INACTIVE,
        {
          enrollmentId: ENROLLMENT_INACTIVE,
          personId: PERSON_1,
          status: 'WITHDRAWN',
          educationBatchId: 'batch-1',
          academicClassId: ACADEMIC_CLASS_1,
        },
      ],
    ]);

    this.storedFiles = new Map([
      [
        FILE_OK,
        {
          id: FILE_OK,
          namespace: 'assignment-submission',
          status: 'UPLOADED',
          ownerUserId: PERSON_1,
          mimeType: 'application/pdf',
        },
      ],
      [
        FILE_WRONG_NAMESPACE,
        {
          id: FILE_WRONG_NAMESPACE,
          namespace: 'learning-content',
          status: 'UPLOADED',
          ownerUserId: PERSON_1,
          mimeType: 'application/pdf',
        },
      ],
      [
        FILE_PENDING,
        {
          id: FILE_PENDING,
          namespace: 'assignment-submission',
          status: 'PENDING',
          ownerUserId: PERSON_1,
          mimeType: 'application/pdf',
        },
      ],
    ]);

    this.educators = new Set(); // `${personId}:${classSubjectId}`
  }

  // ---- assignments -------------------------------------------------------

  async create(data) {
    const now = new Date();
    const record = {
      id: `assignment-${this.nextAssignment++}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.assignments.push(record);
    return record;
  }

  async findById(id) {
    return this.assignments.find((a) => a.id === id) ?? null;
  }

  async findByActivityId(activityId) {
    return this.assignments.find((a) => a.activityId === activityId) ?? null;
  }

  async list(filter) {
    let data = this.assignments.filter((a) => {
      if (filter.status && a.status !== filter.status) return false;
      if (filter.activityId && a.activityId !== filter.activityId) return false;
      if (filter.search) {
        if (!a.title.toLowerCase().includes(filter.search.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    data = data.sort((a, b) => b.createdAt - a.createdAt);
    const total = data.length;
    const start = (filter.page - 1) * filter.limit;
    return { data: data.slice(start, start + filter.limit), total };
  }

  async update(id, data) {
    const index = this.assignments.findIndex((a) => a.id === id);
    const updated = {
      ...this.assignments[index],
      ...data,
      updatedAt: new Date(),
    };
    this.assignments[index] = updated;
    return updated;
  }

  async findActivityContext(activityId) {
    return this.activities.get(activityId) ?? null;
  }

  async findEnrollmentContext(enrollmentId) {
    return this.enrollments.get(enrollmentId) ?? null;
  }

  async isEducatorForClassSubject(personId, classSubjectId) {
    return this.educators.has(`${personId}:${classSubjectId}`);
  }

  // ---- submissions -------------------------------------------------------

  async createSubmission(data) {
    const now = new Date();
    const record = {
      id: `submission-${this.nextSubmission++}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.submissions.push(record);
    return record;
  }

  async findSubmissionById(id) {
    return this.submissions.find((s) => s.id === id) ?? null;
  }

  async listSubmissions(filter) {
    let data = this.submissions.filter((s) => {
      if (filter.assignmentId && s.assignmentId !== filter.assignmentId) {
        return false;
      }
      if (filter.enrollmentId && s.enrollmentId !== filter.enrollmentId) {
        return false;
      }
      if (filter.status && s.status !== filter.status) return false;
      if (filter.personId) {
        const enrollment = this.enrollments.get(s.enrollmentId);
        if (!enrollment || enrollment.personId !== filter.personId)
          return false;
      }
      return true;
    });

    data = data.sort((a, b) => a.attemptNo - b.attemptNo);
    const total = data.length;
    const start = (filter.page - 1) * filter.limit;
    return { data: data.slice(start, start + filter.limit), total };
  }

  async updateSubmission(id, data) {
    const index = this.submissions.findIndex((s) => s.id === id);
    const updated = {
      ...this.submissions[index],
      ...data,
      updatedAt: new Date(),
    };
    this.submissions[index] = updated;
    return updated;
  }

  async maxAttemptNo(assignmentId, enrollmentId) {
    const attempts = this.submissions
      .filter(
        (s) =>
          s.assignmentId === assignmentId && s.enrollmentId === enrollmentId,
      )
      .map((s) => s.attemptNo);
    return attempts.length === 0 ? 0 : Math.max(...attempts);
  }

  async findSubmissionByAttempt(assignmentId, enrollmentId, attemptNo) {
    return (
      this.submissions.find(
        (s) =>
          s.assignmentId === assignmentId &&
          s.enrollmentId === enrollmentId &&
          s.attemptNo === attemptNo,
      ) ?? null
    );
  }

  async findLatestSubmission(assignmentId, enrollmentId) {
    const matches = this.submissions
      .filter(
        (s) =>
          s.assignmentId === assignmentId && s.enrollmentId === enrollmentId,
      )
      .sort((a, b) => b.attemptNo - a.attemptNo);
    return matches[0] ?? null;
  }

  // ---- files -------------------------------------------------------------

  async attachFile(submissionId, storedFileId, label) {
    const record = {
      id: `file-${this.nextFile++}`,
      submissionId,
      storedFileId,
      label,
      createdAt: new Date(),
    };
    this.files.push(record);
    return record;
  }

  async findFileLink(submissionId, storedFileId) {
    return (
      this.files.find(
        (f) =>
          f.submissionId === submissionId && f.storedFileId === storedFileId,
      ) ?? null
    );
  }

  async listFiles(submissionId) {
    return this.files
      .filter((f) => f.submissionId === submissionId)
      .map((f) => {
        const stored = this.storedFiles.get(f.storedFileId);
        return {
          ...f,
          objectKey: stored ? `key/${stored.id}` : null,
          originalName: stored ? 'document.pdf' : null,
          mimeType: stored ? stored.mimeType : null,
          sizeBytes: stored ? 1024 : null,
          storedFileStatus: stored ? stored.status : 'MISSING',
        };
      });
  }

  async detachFile(submissionId, storedFileId) {
    this.files = this.files.filter(
      (f) =>
        !(f.submissionId === submissionId && f.storedFileId === storedFileId),
    );
  }

  async findStoredFileContext(storedFileId) {
    return this.storedFiles.get(storedFileId) ?? null;
  }

  // ---- grades ------------------------------------------------------------

  async upsertGrade(submissionId, data) {
    const existing = this.grades.find((g) => g.submissionId === submissionId);
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    const record = {
      id: `grade-${this.nextGrade++}`,
      submissionId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.grades.push(record);
    return record;
  }

  async findGrade(submissionId) {
    return this.grades.find((g) => g.submissionId === submissionId) ?? null;
  }
}

function build() {
  const repo = new MemoryAssignmentsRepository();
  const audit = new FakeAuditService();
  const assignments = new AssignmentsService(repo, audit);
  const submissions = new SubmissionsService(repo, audit);
  return { repo, audit, assignments, submissions };
}

/** Creates a PUBLISHED assignment on ACTIVITY_1 with an optional deadline. */
async function seedPublishedAssignment(ctx, overrides = {}) {
  const created = await ctx.assignments.create({
    activityId: ACTIVITY_1,
    assessmentId: null,
    title: 'Essay 1',
    instructions: 'Write it up',
    dueAt: DUE_AT_ISO,
    maxScore: 100,
    attemptsAllowed: 1,
    ...overrides,
  });
  if (created.status !== AssignmentLifecycleStatusDto.PUBLISHED) {
    return await ctx.assignments.changeStatus(
      created.id,
      AssignmentLifecycleStatusDto.PUBLISHED,
    );
  }
  return created;
}

// ---------------------------------------------------------------------------
// Assignment lifecycle
// ---------------------------------------------------------------------------

test('assignment creation requires an existing, non-archived activity', async () => {
  const ctx = build();

  await assert.rejects(
    () =>
      ctx.assignments.create({
        activityId: '00000000-0000-4000-8000-000000000000',
        title: 'Ghost',
      }),
    NotFoundException,
  );

  const created = await ctx.assignments.create({
    activityId: ACTIVITY_1,
    title: '  Essay 1  ',
    dueAt: undefined,
  });
  assert.equal(created.title, 'Essay 1');
  assert.equal(created.status, AssignmentLifecycleStatusDto.DRAFT);
  assert.equal(created.attemptsAllowed, 1);
  assert.equal(created.maxScore, 100);
  assert.equal(created.dueAt, null);
  assert.deepEqual(ctx.audit.actions(), ['assignment.created']);

  // One activity owns exactly one assignment.
  await assert.rejects(
    () => ctx.assignments.create({ activityId: ACTIVITY_1, title: 'Second' }),
    ConflictException,
  );
});

test('assignment ARCHIVED is terminal and same-status writes emit no audit', async () => {
  const ctx = build();
  const created = await ctx.assignments.create({
    activityId: ACTIVITY_1,
    title: 'Essay 1',
  });

  const published = await ctx.assignments.changeStatus(
    created.id,
    AssignmentLifecycleStatusDto.PUBLISHED,
  );
  assert.equal(published.status, AssignmentLifecycleStatusDto.PUBLISHED);

  // Re-issuing the same status is a no-op: no second audit record.
  const before = ctx.audit.records.length;
  const repeat = await ctx.assignments.changeStatus(
    created.id,
    AssignmentLifecycleStatusDto.PUBLISHED,
  );
  assert.equal(repeat.status, AssignmentLifecycleStatusDto.PUBLISHED);
  assert.equal(ctx.audit.records.length, before);

  const archived = await ctx.assignments.changeStatus(
    created.id,
    AssignmentLifecycleStatusDto.ARCHIVED,
  );
  assert.equal(archived.status, AssignmentLifecycleStatusDto.ARCHIVED);

  // ARCHIVED is terminal: it cannot go back to PUBLISHED.
  await assert.rejects(
    () =>
      ctx.assignments.changeStatus(
        created.id,
        AssignmentLifecycleStatusDto.PUBLISHED,
      ),
    UnprocessableEntityException,
  );

  // Nor can an archived assignment be edited.
  await assert.rejects(
    () => ctx.assignments.update(created.id, { title: 'Nope' }),
    UnprocessableEntityException,
  );
});

test('assignment maxScore cannot drop below an existing grade', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 1 });

  const submission = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'My answer',
    BEFORE_DUE,
  );
  await ctx.submissions.grade(submission.id, PERSON_EDUCATOR, { score: 80 });

  await assert.rejects(
    () => ctx.assignments.update(assignment.id, { maxScore: 50 }),
    ConflictException,
  );

  // Raising the ceiling is fine.
  const raised = await ctx.assignments.update(assignment.id, { maxScore: 200 });
  assert.equal(raised.maxScore, 200);
});

test('assignment attemptsAllowed cannot drop below attempts already used', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 3 });

  await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer one',
    BEFORE_DUE,
  );
  await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer two',
    BEFORE_DUE,
  );

  await assert.rejects(
    () => ctx.assignments.update(assignment.id, { attemptsAllowed: 1 }),
    ConflictException,
  );
});

// ---------------------------------------------------------------------------
// Deadline & attempts
// ---------------------------------------------------------------------------

test('submitting before the deadline is not late, after it is late', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });

  const onTime = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'First',
    BEFORE_DUE,
  );
  assert.equal(onTime.isLate, false);
  assert.equal(onTime.attemptsUsed, 1);
  assert.equal(onTime.attemptsRemaining, 4);
  assert.equal(onTime.status, AssignmentSubmissionStatusDto.SUBMITTED);

  const late = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Second',
    AFTER_DUE,
  );
  assert.equal(late.isLate, true);
  assert.equal(late.attemptsUsed, 2);
});

test('a resubmission appends a new attempt and preserves the previous one', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 3 });

  const first = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Original answer',
    BEFORE_DUE,
  );
  assert.equal(first.attemptNo, 1);

  const second = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Corrected answer',
    BEFORE_DUE,
  );
  assert.equal(second.attemptNo, 2);

  // History is intact: two distinct rows, not one overwritten row.
  const attempts = await ctx.submissions.listAttempts(
    assignment.id,
    ENROLLMENT_1,
  );
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].attemptNo, 2);
  assert.equal(attempts[1].attemptNo, 1);
  assert.equal(attempts[1].textAnswer, 'Original answer');
  assert.equal(attempts[0].textAnswer, 'Corrected answer');
});

test('attemptsAllowed is enforced against the server-side count', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 2 });

  await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'One',
    BEFORE_DUE,
  );
  await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Two',
    BEFORE_DUE,
  );

  await assert.rejects(
    () =>
      ctx.submissions.submit(
        assignment.id,
        ENROLLMENT_1,
        PERSON_1,
        'Three',
        BEFORE_DUE,
      ),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.match(error.message, /attempt/i);
      return true;
    },
  );
});

test('only a PUBLISHED assignment accepts submissions', async () => {
  const ctx = build();
  const draft = await ctx.assignments.create({
    activityId: ACTIVITY_1,
    title: 'Draft assignment',
    attemptsAllowed: 1,
  });
  assert.equal(draft.status, AssignmentLifecycleStatusDto.DRAFT);

  await assert.rejects(
    () => ctx.submissions.submit(draft.id, ENROLLMENT_1, PERSON_1, 'Too early'),
    UnprocessableEntityException,
  );
});

test('a participant can only submit through their own enrollment', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });

  // PERSON_2 trying to submit through PERSON_1's enrollment is rejected.
  await assert.rejects(
    () =>
      ctx.submissions.submit(assignment.id, ENROLLMENT_1, PERSON_2, 'Stolen'),
    UnprocessableEntityException,
  );

  // Nor may a non-ACTIVE enrollment submit.
  await assert.rejects(
    () =>
      ctx.submissions.submit(
        assignment.id,
        ENROLLMENT_INACTIVE,
        PERSON_1,
        'Withdrawn',
      ),
    UnprocessableEntityException,
  );
});

test('a submission with neither text nor a file is rejected', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });

  await assert.rejects(
    () => ctx.submissions.submit(assignment.id, ENROLLMENT_1, PERSON_1, '   '),
    BadRequestException,
  );

  // A draft plus one attached file satisfies the requirement without text.
  const draft = await ctx.submissions.saveDraft(
    assignment.id,
    ENROLLMENT_1,
    null,
  );
  await ctx.submissions.attachFile(draft.id, { storedFileId: FILE_OK });
  const submitted = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    null,
    BEFORE_DUE,
  );
  assert.equal(submitted.status, AssignmentSubmissionStatusDto.SUBMITTED);
  assert.equal(submitted.attemptNo, 1);
  assert.equal(submitted.files.length, 1);
});

// ---------------------------------------------------------------------------
// File relation
// ---------------------------------------------------------------------------

test('attachments must live in the assignment-submission namespace and be confirmed', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });
  const submission = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer',
    BEFORE_DUE,
  );

  await assert.rejects(
    () =>
      ctx.submissions.attachFile(submission.id, {
        storedFileId: FILE_WRONG_NAMESPACE,
      }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    () =>
      ctx.submissions.attachFile(submission.id, { storedFileId: FILE_PENDING }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    () =>
      ctx.submissions.attachFile(submission.id, {
        storedFileId: '00000000-0000-4000-8000-000000000000',
      }),
    NotFoundException,
  );

  const attached = await ctx.submissions.attachFile(submission.id, {
    storedFileId: FILE_OK,
    label: '  Draft  ',
  });
  assert.equal(attached.files.length, 1);
  assert.equal(attached.files[0].label, 'Draft');
  assert.equal(attached.files[0].storedFileId, FILE_OK);
  assert.equal(attached.files[0].mimeType, 'application/pdf');

  // The same file cannot be linked twice.
  await assert.rejects(
    () => ctx.submissions.attachFile(submission.id, { storedFileId: FILE_OK }),
    ConflictException,
  );
});

test('attachments can be detached, and are frozen once graded', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });
  const submission = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer',
    BEFORE_DUE,
  );
  await ctx.submissions.attachFile(submission.id, { storedFileId: FILE_OK });

  const detached = await ctx.submissions.detachFile(submission.id, FILE_OK);
  assert.equal(detached.files.length, 0);

  await assert.rejects(
    () => ctx.submissions.detachFile(submission.id, FILE_OK),
    NotFoundException,
  );

  // Re-attach, grade, then prove the attachment is frozen.
  await ctx.submissions.attachFile(submission.id, { storedFileId: FILE_OK });
  await ctx.submissions.grade(submission.id, PERSON_EDUCATOR, { score: 90 });

  await assert.rejects(
    () =>
      ctx.submissions.attachFile(submission.id, {
        storedFileId: FILE_WRONG_NAMESPACE,
      }),
    UnprocessableEntityException,
  );
  await assert.rejects(
    () => ctx.submissions.detachFile(submission.id, FILE_OK),
    UnprocessableEntityException,
  );
});

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

test('grades are validated against 0..maxScore', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, {
    attemptsAllowed: 5,
    maxScore: 75,
  });
  const submission = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer',
    BEFORE_DUE,
  );

  await assert.rejects(
    () => ctx.submissions.grade(submission.id, PERSON_EDUCATOR, { score: 76 }),
    BadRequestException,
  );
  await assert.rejects(
    () => ctx.submissions.grade(submission.id, PERSON_EDUCATOR, { score: -1 }),
    BadRequestException,
  );

  const graded = await ctx.submissions.grade(submission.id, PERSON_EDUCATOR, {
    score: 75,
    feedback: '  Nicely done  ',
  });
  assert.equal(graded.status, AssignmentSubmissionStatusDto.GRADED);
  assert.equal(graded.grade.score, 75);
  assert.equal(graded.grade.graderPersonId, PERSON_EDUCATOR);
  // Feedback is withheld until the grade is released.
  assert.equal(graded.grade.feedback, null);

  const returned = await ctx.submissions.returnToParticipant(submission.id);
  assert.equal(returned.status, AssignmentSubmissionStatusDto.RETURNED);
  assert.equal(returned.grade.feedback, 'Nicely done');
});

test('grading honours returnToParticipant and audits the release distinctly', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });
  const submission = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer',
    BEFORE_DUE,
  );

  const graded = await ctx.submissions.grade(submission.id, PERSON_EDUCATOR, {
    score: 60,
    returnToParticipant: true,
  });
  assert.equal(graded.status, AssignmentSubmissionStatusDto.RETURNED);
  assert.ok(ctx.audit.actions().includes('assignment.grade_returned'));
});

test('a DRAFT attempt cannot be graded', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });
  const draft = await ctx.submissions.saveDraft(
    assignment.id,
    ENROLLMENT_1,
    'WIP',
  );

  await assert.rejects(
    () => ctx.submissions.grade(draft.id, PERSON_EDUCATOR, { score: 10 }),
    UnprocessableEntityException,
  );
});

test('only an assigned educator of the class subject may grade', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 5 });
  const submission = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Answer',
    BEFORE_DUE,
  );

  await assert.rejects(
    () =>
      ctx.assignments.assertEducatorAuthorityBySubmission(
        submission.id,
        PERSON_STRANGER,
      ),
    UnprocessableEntityException,
  );

  ctx.repo.educators.add(`${PERSON_EDUCATOR}:${CLASS_SUBJECT_1}`);
  const authorized = await ctx.assignments.assertEducatorAuthorityBySubmission(
    submission.id,
    PERSON_EDUCATOR,
  );
  assert.equal(authorized.id, assignment.id);
});

test('each attempt carries its own grade', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 3 });

  const first = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Attempt one',
    BEFORE_DUE,
  );
  const second = await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Attempt two',
    BEFORE_DUE,
  );

  await ctx.submissions.grade(first.id, PERSON_EDUCATOR, { score: 40 });
  await ctx.submissions.grade(second.id, PERSON_EDUCATOR, { score: 90 });

  const firstGrade = await ctx.submissions.findGrade(first.id);
  const secondGrade = await ctx.submissions.findGrade(second.id);
  assert.equal(firstGrade.score, 40);
  assert.equal(secondGrade.score, 90);
});

test('submissions can be scoped to one participant', async () => {
  const ctx = build();
  const assignment = await seedPublishedAssignment(ctx, { attemptsAllowed: 2 });

  await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_1,
    PERSON_1,
    'Person one',
    BEFORE_DUE,
  );
  await ctx.submissions.submit(
    assignment.id,
    ENROLLMENT_2,
    PERSON_2,
    'Person two',
    BEFORE_DUE,
  );

  const mine = await ctx.submissions.list(
    { assignmentId: assignment.id },
    PERSON_1,
  );
  assert.equal(mine.total, 1);
  assert.equal(mine.data[0].enrollmentId, ENROLLMENT_1);

  const everyone = await ctx.submissions.list({ assignmentId: assignment.id });
  assert.equal(everyone.total, 2);
});

// ---------------------------------------------------------------------------
// HTTP surface
// ---------------------------------------------------------------------------

test('assignment endpoints are exposed in OpenAPI and require authentication', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();

    assert.ok(spec.paths['/api/v1/assignments'].post);
    assert.ok(spec.paths['/api/v1/assignments'].get);
    assert.ok(spec.paths['/api/v1/assignments/{id}'].get);
    assert.ok(spec.paths['/api/v1/assignments/{id}'].patch);
    assert.ok(spec.paths['/api/v1/assignments/{id}/status'].patch);

    assert.ok(spec.paths['/api/v1/assignment-submissions'].post);
    assert.ok(spec.paths['/api/v1/assignment-submissions'].get);
    assert.ok(spec.paths['/api/v1/assignment-submissions/{id}'].get);
    assert.ok(spec.paths['/api/v1/assignment-submissions/{id}'].patch);
    assert.ok(spec.paths['/api/v1/assignment-submissions/{id}/files'].post);
    assert.ok(
      spec.paths['/api/v1/assignment-submissions/{id}/files/{storedFileId}']
        .delete,
    );
    assert.ok(spec.paths['/api/v1/assignment-submissions/{id}/grade'].post);
    assert.ok(spec.paths['/api/v1/assignment-submissions/{id}/return'].post);

    const anonymous = await fetch(`${base}/api/v1/assignments`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});
