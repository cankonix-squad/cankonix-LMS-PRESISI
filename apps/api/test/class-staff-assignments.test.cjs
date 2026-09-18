const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} = require('@nestjs/common');
const {
  ClassStaffAssignmentsService,
} = require('../dist/class-staff-assignments/class-staff-assignments.service');
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
const CLASS_1 = '22222222-2222-4000-8000-000000000001';
const CLASS_2 = '22222222-2222-4000-8000-000000000002';
const BATCH_1 = '11111111-1111-4000-8000-000000000001';

function nextId(counter) {
  return `33333333-3333-4000-8000-${String(counter).padStart(12, '0')}`;
}

class MemoryClassStaffAssignmentsRepository {
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
    this.classes = new Map([
      [CLASS_1, { id: CLASS_1, code: 'A', educationBatchId: BATCH_1 }],
      [CLASS_2, { id: CLASS_2, code: 'B', educationBatchId: BATCH_1 }],
    ]);
  }

  async create(data) {
    const record = {
      id: nextId(this.next++),
      personId: data.personId,
      academicClassId: data.academicClassId,
      staffType: data.staffType,
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

  async findActiveDuplicate(personId, academicClassId, staffType) {
    return (
      this.records.find(
        (record) =>
          record.personId === personId &&
          record.academicClassId === academicClassId &&
          record.staffType === staffType &&
          record.status === 'ACTIVE',
      ) ?? null
    );
  }

  async findOverlapping(
    personId,
    academicClassId,
    staffType,
    validFrom,
    validUntil,
    excludeId,
  ) {
    return this.records.filter((record) => {
      if (record.personId !== personId) return false;
      if (record.academicClassId !== academicClassId) return false;
      if (record.staffType !== staffType) return false;
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
    if (filter.academicClassId) {
      filtered = filtered.filter(
        (r) => r.academicClassId === filter.academicClassId,
      );
    }
    if (filter.staffType) {
      filtered = filtered.filter((r) => r.staffType === filter.staffType);
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

  async findAcademicClassContext(academicClassId) {
    return this.classes.get(academicClassId) ?? null;
  }
}

function buildService() {
  const repo = new MemoryClassStaffAssignmentsRepository();
  const audit = new FakeAuditService();
  return {
    repo,
    audit,
    service: new ClassStaffAssignmentsService(repo, audit),
  };
}

test('ClassStaffAssignmentsService - assigns a data-driven staff type', async () => {
  const { audit, service } = buildService();

  const created = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_1,
    staffType: 'wali kelas',
    validFrom: '2026-10-01',
  });

  // The vocabulary is data: the code is normalized, not validated against a
  // hardcoded enum, so a new role needs no release.
  assert.equal(created.staffType, 'WALI_KELAS');
  assert.equal(created.status, 'ACTIVE');
  assert.equal(audit.records[0].action, 'class_staff_assignment.created');

  const custom = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_2,
    staffType: 'Koordinator Asrama',
    validFrom: '2026-10-01',
  });
  assert.equal(custom.staffType, 'KOORDINATOR_ASRAMA');
});

test('ClassStaffAssignmentsService - validates person, class, and date range', async () => {
  const { service } = buildService();

  await assert.rejects(
    () =>
      service.create({
        personId: '99999999-9999-4999-8999-999999999999',
        academicClassId: CLASS_1,
        staffType: 'WALI_KELAS',
        validFrom: '2026-10-01',
      }),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_INACTIVE,
        academicClassId: CLASS_1,
        staffType: 'WALI_KELAS',
        validFrom: '2026-10-01',
      }),
    UnprocessableEntityException,
  );

  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        academicClassId: '99999999-9999-4999-8999-999999999999',
        staffType: 'WALI_KELAS',
        validFrom: '2026-10-01',
      }),
    NotFoundException,
  );

  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        academicClassId: CLASS_1,
        staffType: 'WALI_KELAS',
        validFrom: '2026-12-31',
        validUntil: '2026-10-01',
      }),
    BadRequestException,
  );
});

test('ClassStaffAssignmentsService - duplicate and overlapping active assignments are refused', async () => {
  const { service } = buildService();

  const created = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_1,
    staffType: 'WALI_KELAS',
    validFrom: '2026-10-01',
    validUntil: '2026-10-31',
  });

  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        academicClassId: CLASS_1,
        staffType: 'wali_kelas',
        validFrom: '2026-10-01',
        validUntil: '2026-10-31',
      }),
    ConflictException,
  );

  await assert.rejects(
    () =>
      service.create({
        personId: PERSON_ACTIVE,
        academicClassId: CLASS_1,
        staffType: 'WALI_KELAS',
        validFrom: '2026-10-15',
      }),
    ConflictException,
  );

  // The same person may hold a different role in the same class.
  const admin = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_1,
    staffType: 'ADMIN_KELAS',
    validFrom: '2026-10-01',
  });
  assert.equal(admin.staffType, 'ADMIN_KELAS');

  // The same role in a different class is also allowed.
  const otherClass = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_2,
    staffType: 'WALI_KELAS',
    validFrom: '2026-10-01',
  });
  assert.equal(otherClass.academicClassId, CLASS_2);

  // A different person may hold the same role in the same class over the same
  // period: role codes such as PENGASUH are legitimately plural.
  const colleague = await service.create({
    personId: PERSON_ACTIVE_2,
    academicClassId: CLASS_1,
    staffType: 'PENGASUH',
    validFrom: '2026-10-01',
  });
  assert.equal(colleague.personId, PERSON_ACTIVE_2);

  const secondPengasuh = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_1,
    staffType: 'PENGASUH',
    validFrom: '2026-10-01',
  });
  assert.equal(secondPengasuh.staffType, 'PENGASUH');

  // Ending frees the period without deleting the row.
  const ended = await service.end(created.id, { validUntil: '2026-10-31' });
  assert.equal(ended.status, 'ENDED');
  assert.equal(ended.validUntil, '2026-10-31');

  await assert.rejects(
    () => service.end(created.id, {}),
    UnprocessableEntityException,
  );
});

test('ClassStaffAssignmentsService - update moves validity and is audited', async () => {
  const { audit, service } = buildService();

  const created = await service.create({
    personId: PERSON_ACTIVE,
    academicClassId: CLASS_1,
    staffType: 'WALI_KELAS',
    validFrom: '2026-10-01',
  });

  const updated = await service.update(created.id, {
    validUntil: '2026-12-31',
  });
  assert.equal(updated.validUntil, '2026-12-31');
  assert.equal(audit.records.at(-1).action, 'class_staff_assignment.updated');

  await assert.rejects(
    () => service.update(created.id, { validFrom: '2027-01-01' }),
    BadRequestException,
  );

  await assert.rejects(
    () => service.findOne('99999999-9999-4999-8999-999999999999'),
    NotFoundException,
  );
});

test('class staff assignment endpoints are exposed in OpenAPI under api v1', async () => {
  const app = await createApp({ docsEnabled: true });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/class-staff-assignments'].post);
    assert.ok(spec.paths['/api/v1/class-staff-assignments'].get);
    assert.ok(spec.paths['/api/v1/class-staff-assignments/{id}'].get);
    assert.ok(spec.paths['/api/v1/class-staff-assignments/{id}'].patch);
    assert.ok(spec.paths['/api/v1/class-staff-assignments/{id}/end'].patch);

    // Staff type is a free string, not a closed enum: no enum on the property.
    const schema =
      spec.components.schemas.CreateClassStaffAssignmentDto.properties
        .staffType;
    assert.equal(schema.type, 'string');
    assert.equal(schema.enum, undefined);
  } finally {
    await app.close();
  }
});
