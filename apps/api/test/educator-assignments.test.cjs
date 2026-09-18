const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  EducatorTypesService,
} = require('../dist/educator-types/educator-types.service');
const {
  EducatorAssignmentsService,
} = require('../dist/educator-assignments/educator-assignments.service');
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
const PERSON_ACTIVE_2 = '66666666-6666-4000-8000-000000000003';
const PERSON_INACTIVE = '66666666-6666-4000-8000-000000000002';
const CLASS_SUBJECT_1 = '55555555-5555-4000-8000-000000000001';
const CLASS_SUBJECT_2 = '55555555-5555-4000-8000-000000000002';

function nextId(prefix, counter) {
  return `${prefix}-4000-8000-${String(counter).padStart(12, '0')}`;
}

class MemoryEducatorTypesRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.activeAssignments = 0;
  }

  async create(data) {
    const record = {
      id: nextId('88888888-8888', this.next++),
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-22T00:00:00.000Z'),
      updatedAt: new Date('2026-09-22T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByCode(code) {
    return this.records.find((record) => record.code === code) ?? null;
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    if (filter.search) {
      const needle = filter.search.toUpperCase();
      filtered = filtered.filter(
        (r) => r.code.includes(needle) || r.name.toUpperCase().includes(needle),
      );
    }
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.records[index];
  }

  async countActiveAssignments() {
    return this.activeAssignments;
  }
}

class MemoryEducatorAssignmentsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
    this.persons = new Map([
      [
        PERSON_ACTIVE,
        { id: PERSON_ACTIVE, fullName: 'Budi', status: 'ACTIVE' },
      ],
      [
        PERSON_ACTIVE_2,
        { id: PERSON_ACTIVE_2, fullName: 'Agus', status: 'ACTIVE' },
      ],
      [
        PERSON_INACTIVE,
        { id: PERSON_INACTIVE, fullName: 'Siti', status: 'INACTIVE' },
      ],
    ]);
    this.classSubjects = new Map([
      [CLASS_SUBJECT_1, { id: CLASS_SUBJECT_1, academicClassId: 'class-1' }],
      [CLASS_SUBJECT_2, { id: CLASS_SUBJECT_2, academicClassId: 'class-2' }],
    ]);
    this.educatorTypes = new Map();
  }

  async create(data) {
    const record = {
      id: nextId('99999999-9999', this.next++),
      personId: data.personId,
      classSubjectId: data.classSubjectId,
      educatorTypeId: data.educatorTypeId,
      validFrom: data.validFrom,
      validUntil: data.validUntil ?? null,
      status: data.status ?? 'ACTIVE',
      createdAt: new Date('2026-09-22T00:00:00.000Z'),
      updatedAt: new Date('2026-09-22T00:00:00.000Z'),
    };
    this.records.push(record);
    return record;
  }

  async findById(id) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findActiveDuplicate(personId, classSubjectId, educatorTypeId) {
    return (
      this.records.find(
        (record) =>
          record.personId === personId &&
          record.classSubjectId === classSubjectId &&
          record.educatorTypeId === educatorTypeId &&
          record.status === 'ACTIVE',
      ) ?? null
    );
  }

  async findOverlapping(
    classSubjectId,
    educatorTypeId,
    validFrom,
    validUntil,
    excludeId,
  ) {
    return this.records.filter((record) => {
      if (record.classSubjectId !== classSubjectId) return false;
      if (record.educatorTypeId !== educatorTypeId) return false;
      if (record.status !== 'ACTIVE') return false;
      if (excludeId && record.id === excludeId) return false;
      if (validUntil && record.validFrom > validUntil) return false;
      if (record.validUntil && record.validUntil < validFrom) return false;
      return true;
    });
  }

  async list(filter) {
    let filtered = [...this.records];
    if (filter.personId) {
      filtered = filtered.filter((r) => r.personId === filter.personId);
    }
    if (filter.classSubjectId) {
      filtered = filtered.filter(
        (r) => r.classSubjectId === filter.classSubjectId,
      );
    }
    if (filter.educatorTypeId) {
      filtered = filtered.filter(
        (r) => r.educatorTypeId === filter.educatorTypeId,
      );
    }
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
    const start = (filter.page - 1) * filter.limit;
    return {
      data: filtered.slice(start, start + filter.limit),
      total: filtered.length,
    };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.records[index];
  }

  async findPersonContext(personId) {
    return this.persons.get(personId) ?? null;
  }

  async findClassSubjectContext(classSubjectId) {
    return this.classSubjects.get(classSubjectId) ?? null;
  }

  async findEducatorTypeContext(educatorTypeId) {
    return this.educatorTypes.get(educatorTypeId) ?? null;
  }
}

function buildServices() {
  const typeRepo = new MemoryEducatorTypesRepository();
  const assignmentRepo = new MemoryEducatorAssignmentsRepository();
  const audit = new FakeAuditService();
  return {
    typeRepo,
    assignmentRepo,
    audit,
    types: new EducatorTypesService(typeRepo, audit),
    assignments: new EducatorAssignmentsService(assignmentRepo, audit),
  };
}

test('EducatorTypesService - CRUD normalizes the code and audits changes', async () => {
  const { audit, types } = buildServices();

  const created = await types.create({
    code: 'gadik',
    name: 'Guru Pendidik',
  });
  assert.equal(created.code, 'GADIK');
  assert.equal(created.status, 'ACTIVE');
  assert.equal(audit.records[0].action, 'educator_type.created');

  // The catalogue is data: a new type needs no schema change.
  const penguji = await types.create({ code: 'PENGUJI', name: 'Penguji' });
  assert.equal(penguji.code, 'PENGUJI');

  // Codes are unique.
  await assert.rejects(
    () => types.create({ code: 'gadik', name: 'Duplikat' }),
    ConflictException,
  );

  const listed = await types.list({ page: 1, limit: 20 });
  assert.equal(listed.total, 2);

  const updated = await types.update(created.id, {
    name: 'Guru Pendidik Utama',
  });
  assert.equal(updated.name, 'Guru Pendidik Utama');
  assert.equal(audit.records.at(-1).action, 'educator_type.updated');

  await assert.rejects(
    () => types.findOne('99999999-9999-4999-8999-999999999999'),
    NotFoundException,
  );
});

test('EducatorTypesService - deactivation is blocked while active assignments exist', async () => {
  const { typeRepo, types } = buildServices();

  const created = await types.create({ code: 'GADIK', name: 'Guru Pendidik' });

  typeRepo.activeAssignments = 1;
  await assert.rejects(
    () => types.update(created.id, { status: 'INACTIVE' }),
    UnprocessableEntityException,
  );

  // Ended history never blocks deactivation.
  typeRepo.activeAssignments = 0;
  const deactivated = await types.update(created.id, { status: 'INACTIVE' });
  assert.equal(deactivated.status, 'INACTIVE');
});

test('EducatorAssignmentsService - validates person, class subject, and educator type', async () => {
  const { assignmentRepo, assignments } = buildServices();

  const educatorType = {
    id: nextId('88888888-8888', 1),
    code: 'GADIK',
    status: 'ACTIVE',
  };
  assignmentRepo.educatorTypes.set(educatorType.id, educatorType);

  await assert.rejects(
    () =>
      assignments.create({
        personId: '99999999-9999-4999-8999-999999999999',
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: educatorType.id,
        validFrom: '2026-10-01',
      }),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_INACTIVE,
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: educatorType.id,
        validFrom: '2026-10-01',
      }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_ACTIVE,
        classSubjectId: '99999999-9999-4999-8999-999999999999',
        educatorTypeId: educatorType.id,
        validFrom: '2026-10-01',
      }),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_ACTIVE,
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: '99999999-9999-4999-8999-999999999999',
        validFrom: '2026-10-01',
      }),
    NotFoundException,
  );

  // An inactive educator type cannot be assigned.
  assignmentRepo.educatorTypes.set(educatorType.id, {
    ...educatorType,
    status: 'INACTIVE',
  });
  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_ACTIVE,
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: educatorType.id,
        validFrom: '2026-10-01',
      }),
    UnprocessableEntityException,
  );

  // A broken date range is a bad request.
  assignmentRepo.educatorTypes.set(educatorType.id, educatorType);
  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_ACTIVE,
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: educatorType.id,
        validFrom: '2026-12-31',
        validUntil: '2026-10-01',
      }),
    BadRequestException,
  );
});

test('EducatorAssignmentsService - one person can teach across institutions and types', async () => {
  const { assignmentRepo, audit, assignments } = buildServices();

  const gadik = {
    id: nextId('88888888-8888', 1),
    code: 'GADIK',
    status: 'ACTIVE',
  };
  const penguji = {
    id: nextId('88888888-8888', 2),
    code: 'PENGUJI',
    status: 'ACTIVE',
  };
  assignmentRepo.educatorTypes.set(gadik.id, gadik);
  assignmentRepo.educatorTypes.set(penguji.id, penguji);

  // Same person, same class subject, different educator type: allowed.
  const first = await assignments.create({
    personId: PERSON_ACTIVE,
    classSubjectId: CLASS_SUBJECT_1,
    educatorTypeId: gadik.id,
    validFrom: '2026-10-01',
  });
  const second = await assignments.create({
    personId: PERSON_ACTIVE,
    classSubjectId: CLASS_SUBJECT_1,
    educatorTypeId: penguji.id,
    validFrom: '2026-10-01',
  });
  assert.notEqual(first.id, second.id);

  // Same person, same educator type, a different class subject: allowed.
  const third = await assignments.create({
    personId: PERSON_ACTIVE,
    classSubjectId: CLASS_SUBJECT_2,
    educatorTypeId: gadik.id,
    validFrom: '2026-10-01',
  });
  assert.equal(third.classSubjectId, CLASS_SUBJECT_2);

  assert.equal(audit.records.at(-1).action, 'educator_assignment.created');
});

test('EducatorAssignmentsService - duplicate active assignment and overlapping windows are refused', async () => {
  const { assignmentRepo, assignments } = buildServices();

  const gadik = {
    id: nextId('88888888-8888', 1),
    code: 'GADIK',
    status: 'ACTIVE',
  };
  assignmentRepo.educatorTypes.set(gadik.id, gadik);

  const created = await assignments.create({
    personId: PERSON_ACTIVE,
    classSubjectId: CLASS_SUBJECT_1,
    educatorTypeId: gadik.id,
    validFrom: '2026-10-01',
    validUntil: '2026-10-31',
  });

  // The same person may not hold two active assignments of the same type for
  // the same class subject.
  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_ACTIVE,
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: gadik.id,
        validFrom: '2027-01-01',
      }),
    ConflictException,
  );

  // A second educator of the same type covering an overlapping period is a
  // double booking, even though it is a different person.
  await assert.rejects(
    () =>
      assignments.create({
        personId: PERSON_ACTIVE_2,
        classSubjectId: CLASS_SUBJECT_1,
        educatorTypeId: gadik.id,
        validFrom: '2026-10-15',
        validUntil: '2026-11-15',
      }),
    ConflictException,
  );

  // A disjoint window is accepted: consecutive educators are a real scenario.
  const later = await assignments.create({
    personId: PERSON_ACTIVE_2,
    classSubjectId: CLASS_SUBJECT_1,
    educatorTypeId: gadik.id,
    validFrom: '2026-11-01',
  });
  assert.equal(later.status, 'ACTIVE');

  // Ending the first assignment preserves the row and frees the period.
  const ended = await assignments.end(created.id, { validUntil: '2026-10-31' });
  assert.equal(ended.status, 'ENDED');
  assert.equal(ended.validUntil, '2026-10-31');

  await assert.rejects(
    () => assignments.end(created.id, {}),
    UnprocessableEntityException,
  );
});

test('EducatorAssignmentsService - update can move validity and is audited', async () => {
  const { assignmentRepo, audit, assignments } = buildServices();

  const gadik = {
    id: nextId('88888888-8888', 1),
    code: 'GADIK',
    status: 'ACTIVE',
  };
  assignmentRepo.educatorTypes.set(gadik.id, gadik);

  const created = await assignments.create({
    personId: PERSON_ACTIVE,
    classSubjectId: CLASS_SUBJECT_1,
    educatorTypeId: gadik.id,
    validFrom: '2026-10-01',
  });

  const updated = await assignments.update(created.id, {
    validUntil: '2026-11-30',
  });
  assert.equal(updated.validUntil, '2026-11-30');
  assert.equal(audit.records.at(-1).action, 'educator_assignment.updated');
});

test('educator assignment endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/educator-types'].post);
    assert.ok(spec.paths['/api/v1/educator-types'].get);
    assert.ok(spec.paths['/api/v1/educator-types/{id}'].get);
    assert.ok(spec.paths['/api/v1/educator-types/{id}'].patch);
    assert.ok(spec.paths['/api/v1/educator-assignments'].post);
    assert.ok(spec.paths['/api/v1/educator-assignments'].get);
    assert.ok(spec.paths['/api/v1/educator-assignments/{id}'].get);
    assert.ok(spec.paths['/api/v1/educator-assignments/{id}'].patch);
    assert.ok(spec.paths['/api/v1/educator-assignments/{id}/end'].patch);
  } finally {
    await app.close();
  }
});
