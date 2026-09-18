const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  EnrollmentsService,
} = require('../dist/enrollments/enrollments.service');
const { createApp } = require('../dist/app');

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

const PERSON_ACTIVE = '66666666-6666-4000-8000-000000000001';
const PERSON_INACTIVE = '66666666-6666-4000-8000-000000000002';
const BATCH_1 = '11111111-1111-4000-8000-000000000001';
const BATCH_2 = '11111111-1111-4000-8000-000000000002';
const CLASS_1 = '22222222-2222-4000-8000-000000000001';
const CLASS_2 = '22222222-2222-4000-8000-000000000002';
const CLASS_OTHER_BATCH = '22222222-2222-4000-8000-000000000003';

class MemoryEnrollmentsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.persons = new Map([
      [
        PERSON_ACTIVE,
        { id: PERSON_ACTIVE, fullName: 'Budi', status: 'ACTIVE' },
      ],
      [
        PERSON_INACTIVE,
        { id: PERSON_INACTIVE, fullName: 'Siti', status: 'INACTIVE' },
      ],
    ]);
    this.classes = new Map([
      [CLASS_1, { id: CLASS_1, educationBatchId: BATCH_1 }],
      [CLASS_2, { id: CLASS_2, educationBatchId: BATCH_1 }],
      [CLASS_OTHER_BATCH, { id: CLASS_OTHER_BATCH, educationBatchId: BATCH_2 }],
    ]);
  }

  async create(data) {
    const record = {
      id: `77777777-7777-4000-8000-${String(this.next++).padStart(12, '0')}`,
      personId: data.personId,
      educationBatchId: data.educationBatchId,
      academicClassId: data.academicClassId ?? null,
      enrollmentNumber: data.enrollmentNumber ?? null,
      enrolledAt: data.enrolledAt,
      status: data.status ?? 'ACTIVE',
      completedAt: data.completedAt ?? null,
      metadata: data.metadata ?? null,
      createdAt: new Date('2026-09-21T00:00:00.000Z'),
      updatedAt: new Date('2026-09-21T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByPersonAndBatch(personId, educationBatchId) {
    return (
      this.records.find(
        (record) =>
          record.personId === personId &&
          record.educationBatchId === educationBatchId,
      ) ?? null
    );
  }

  async findByEnrollmentNumber(enrollmentNumber) {
    return (
      this.records.find(
        (record) => record.enrollmentNumber === enrollmentNumber,
      ) ?? null
    );
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.personId) {
      filtered = filtered.filter((r) => r.personId === filter.personId);
    }
    if (filter.educationBatchId) {
      filtered = filtered.filter(
        (r) => r.educationBatchId === filter.educationBatchId,
      );
    }
    if (filter.academicClassId) {
      filtered = filtered.filter(
        (r) => r.academicClassId === filter.academicClassId,
      );
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error('Not found');
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.records[index];
  }

  async findClassContext(academicClassId) {
    return this.classes.get(academicClassId) ?? null;
  }

  async findPersonContext(personId) {
    return this.persons.get(personId) ?? null;
  }
}

function buildService() {
  const repo = new MemoryEnrollmentsRepository();
  const audit = new FakeAuditService();
  return { repo, audit, service: new EnrollmentsService(repo, audit) };
}

test('EnrollmentsService - rejects duplicate enrollment and invalid class/batch', async () => {
  const { service } = buildService();

  const created = await service.create({
    personId: PERSON_ACTIVE,
    educationBatchId: BATCH_1,
    academicClassId: CLASS_1,
    enrollmentNumber: 'ENR-2026-0001',
  });
  assert.equal(created.status, 'ACTIVE');
  assert.equal(created.academicClassId, CLASS_1);

  // Duplicate person + batch is rejected.
  await assert.rejects(
    () =>
      service.create({ personId: PERSON_ACTIVE, educationBatchId: BATCH_1 }),
    ConflictException,
  );

  // Duplicate enrollment number in another batch is rejected.
  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        educationBatchId: BATCH_2,
        enrollmentNumber: 'ENR-2026-0001',
      }),
    ConflictException,
  );

  // A class from a different batch is rejected.
  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        educationBatchId: BATCH_2,
        academicClassId: CLASS_1,
      }),
    BadRequestException,
  );

  // Unknown class is rejected.
  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        educationBatchId: BATCH_2,
        academicClassId: '99999999-9999-4999-8999-999999999999',
      }),
    NotFoundException,
  );
});

test('EnrollmentsService - inactive person and unknown person are refused', async () => {
  const { service } = buildService();

  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_INACTIVE,
        educationBatchId: BATCH_1,
      }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    () =>
      service.create({
        personId: '99999999-9999-4999-8999-999999999999',
        educationBatchId: BATCH_1,
      }),
    NotFoundException,
  );
});

test('EnrollmentsService - lifecycle transitions preserve history and are audited', async () => {
  const { audit, service } = buildService();

  const enrollment = await service.create({
    personId: PERSON_ACTIVE,
    educationBatchId: BATCH_1,
    academicClassId: CLASS_1,
  });
  assert.equal(audit.records.length, 1);
  assert.equal(audit.records[0].action, 'enrollment.created');

  // Withdraw keeps the row and records before/after.
  const withdrawn = await service.changeStatus(enrollment.id, {
    status: 'WITHDRAWN',
    reason: 'Mengundurkan diri',
  });
  assert.equal(withdrawn.status, 'WITHDRAWN');
  assert.equal(audit.records[1].action, 'enrollment.status_changed');
  assert.equal(audit.records[1].metadata.reason, 'Mengundurkan diri');

  // The record is still readable: history is not deleted.
  const history = await service.listByPerson(PERSON_ACTIVE);
  assert.equal(history.length, 1);

  // Duplicate status change is rejected.
  await assert.rejects(
    () => service.changeStatus(enrollment.id, { status: 'WITHDRAWN' }),
    BadRequestException,
  );
});

test('EnrollmentsService - class transfer stays inside the batch and requires active status', async () => {
  const { audit, service } = buildService();

  const enrollment = await service.create({
    personId: PERSON_ACTIVE,
    educationBatchId: BATCH_1,
    academicClassId: CLASS_1,
  });

  const transferred = await service.transferClass(enrollment.id, {
    academicClassId: CLASS_2,
    reason: 'Penyeimbangan kelas',
  });
  assert.equal(transferred.academicClassId, CLASS_2);
  assert.equal(audit.records[1].action, 'enrollment.class_transferred');

  // Moving into a class of another batch is refused.
  await assert.rejects(
    () =>
      service.transferClass(enrollment.id, {
        academicClassId: CLASS_OTHER_BATCH,
      }),
    BadRequestException,
  );

  // Moving to the same class is refused.
  await assert.rejects(
    () => service.transferClass(enrollment.id, { academicClassId: CLASS_2 }),
    BadRequestException,
  );

  // A completed enrollment cannot be moved.
  await service.changeStatus(enrollment.id, { status: 'COMPLETED' });
  await assert.rejects(
    () => service.transferClass(enrollment.id, { academicClassId: CLASS_1 }),
    UnprocessableEntityException,
  );

  const completed = await service.findOne(enrollment.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt, 'completedAt is set on completion');
});

test('EnrollmentsService - completion can be reopened and clears completedAt', async () => {
  const { service } = buildService();

  const enrollment = await service.create({
    personId: PERSON_ACTIVE,
    educationBatchId: BATCH_1,
  });

  await service.changeStatus(enrollment.id, { status: 'COMPLETED' });
  const reopened = await service.changeStatus(enrollment.id, {
    status: 'ACTIVE',
  });

  assert.equal(reopened.status, 'ACTIVE');
  assert.equal(reopened.completedAt, null);
});

test('enrollment endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/enrollments'].post);
    assert.ok(spec.paths['/api/v1/enrollments'].get);
    assert.ok(spec.paths['/api/v1/enrollments/{id}'].get);
    assert.ok(spec.paths['/api/v1/enrollments/{id}/status'].patch);
    assert.ok(spec.paths['/api/v1/enrollments/{id}/class'].patch);
    assert.ok(spec.paths['/api/v1/enrollments/persons/{personId}'].get);
  } finally {
    await app.close();
  }
});
