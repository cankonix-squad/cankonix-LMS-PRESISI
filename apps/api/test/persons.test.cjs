const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');
const { createSign, generateKeyPairSync } = require('node:crypto');
const { createApp } = require('../dist/app');
const {
  OrganizationStatusDto,
} = require('../dist/organizations/dto/organization-status.dto');
const {
  OrganizationsService,
} = require('../dist/organizations/organizations.service');
const { PersonStatusDto } = require('../dist/persons/dto/person-status.dto');
const { PersonsService } = require('../dist/persons/persons.service');
const {
  UserAccountStatusDto,
} = require('../dist/user-accounts/dto/user-account-status.dto');
const {
  UserAccountsService,
} = require('../dist/user-accounts/user-accounts.service');

const NOW = new Date('2026-09-16T00:00:00.000Z');
const LATER = new Date('2026-09-16T01:00:00.000Z');
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000999';

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'persons-test-key';
const AUTHENTICATED_PERSON_ID = '20000000-0000-4000-8000-000000000001';
const AUTH_SUBJECT = 'subject-http-test';
const { privateKey: AUTH_PRIVATE_KEY, publicKey: AUTH_PUBLIC_KEY } =
  generateKeyPairSync('rsa', { modulusLength: 2048 });
const AUTH_PUBLIC_JWK = {
  ...AUTH_PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

/** Bearer token signed exactly the way Keycloak would sign it. */
function signTestToken(subject = AUTH_SUBJECT) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: AUTH_KID }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: AUTH_ISSUER,
      aud: AUTH_AUDIENCE,
      sub: subject,
      iat: now,
      exp: now + 300,
    }),
  ).toString('base64url');
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .end()
    .sign(AUTH_PRIVATE_KEY);
  return `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
}

const AUTHORIZATION = `Bearer ${signTestToken()}`;

class StaticJwksProvider {
  async getKeys() {
    return [AUTH_PUBLIC_JWK];
  }
}

class StubIdentityResolver {
  constructor() {
    this.touchCalls = 0;
  }

  async findAccountByExternalAuthId(externalAuthId) {
    if (externalAuthId !== AUTH_SUBJECT) return null;
    return {
      id: '20000000-0000-4000-8000-0000000000aa',
      personId: AUTHENTICATED_PERSON_ID,
      externalAuthId,
      username: 'http.tester',
      email: 'http.tester@polri.go.id',
      status: UserAccountStatusDto.ACTIVE,
      lastLoginAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  async findPersonById(id) {
    if (id !== AUTHENTICATED_PERSON_ID) return null;
    return {
      id,
      personnelNumber: '87000',
      fullName: 'HTTP Tester',
      rank: null,
      title: null,
      email: null,
      phone: null,
      status: PersonStatusDto.ACTIVE,
      metadata: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  async touchLastLoginAt() {
    this.touchCalls += 1;
  }
}

/** Boots the application with a local key set so HTTP tests can authenticate. */
async function startAuthenticatedApp() {
  const app = await createApp({
    authConfig: {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
      jwksUri: `${AUTH_ISSUER}/protocol/openid-connect/certs`,
      clockSkewSeconds: 30,
      jwksCacheSeconds: 300,
      jwksRequestTimeoutMs: 5000,
      lastLoginThrottleSeconds: 300,
    },
    jwksProvider: new StaticJwksProvider(),
    identityResolver: new StubIdentityResolver(),
  });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return {
      id: `audit-${this.records.length}`,
      actorUserAccountId: null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      organizationId: input.organizationId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      metadata: input.metadata ?? null,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date().toISOString(),
    };
  }
}

class MemoryOrganizationsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: `00000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      parentId: null,
      organizationType: null,
      status: OrganizationStatusDto.ACTIVE,
      metadata: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...data,
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

  async list() {
    return { data: this.records, total: this.records.length };
  }

  async update(id, data) {
    const index = this.records.findIndex((record) => record.id === id);
    this.records[index] = { ...this.records[index], ...data };
    return this.records[index];
  }

  async findChildren(parentId) {
    return this.records.filter((record) => record.parentId === parentId);
  }
}

class MemoryPersonsRepository {
  constructor() {
    this.persons = [];
    this.placements = [];
    this.next = 1;
  }

  uid() {
    return `10000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`;
  }

  // Mirrors the real repository contract: a failure inside the transaction
  // rolls back every write performed by the callback.
  async withTransaction(work) {
    const personsSnapshot = this.persons.map((record) => ({ ...record }));
    const placementsSnapshot = this.placements.map((record) => ({ ...record }));
    try {
      return await work(this);
    } catch (error) {
      this.persons = personsSnapshot;
      this.placements = placementsSnapshot;
      throw error;
    }
  }

  async create(data) {
    const record = {
      id: this.uid(),
      rank: null,
      title: null,
      email: null,
      phone: null,
      metadata: null,
      ...data,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.persons.push(record);
    return record;
  }

  async findById(id) {
    return this.persons.find((record) => record.id === id) ?? null;
  }

  async findByPersonnelNumber(personnelNumber) {
    return (
      this.persons.find(
        (record) => record.personnelNumber === personnelNumber,
      ) ?? null
    );
  }

  async list(filter) {
    const search = filter.search?.toLowerCase();
    const data = this.persons
      .filter((record) => !filter.status || record.status === filter.status)
      .filter(
        (record) =>
          !search ||
          record.personnelNumber.toLowerCase().includes(search) ||
          record.fullName.toLowerCase().includes(search),
      )
      .sort((left, right) =>
        left.personnelNumber.localeCompare(right.personnelNumber),
      );
    const start = (filter.page - 1) * filter.limit;
    return {
      data: data.slice(start, start + filter.limit),
      total: data.length,
    };
  }

  async update(id, data) {
    const index = this.persons.findIndex((record) => record.id === id);
    if (index < 0) throw new Error('person missing');
    this.persons[index] = {
      ...this.persons[index],
      ...data,
      updatedAt: LATER,
    };
    return this.persons[index];
  }

  async createPlacement(data) {
    const record = {
      id: this.uid(),
      positionName: null,
      endDate: null,
      ...data,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.placements.push(record);
    return record;
  }

  async findPlacementById(id) {
    return this.placements.find((record) => record.id === id) ?? null;
  }

  async findPlacementsByPerson(personId) {
    return this.placements
      .filter((record) => record.personId === personId)
      .sort(
        (left, right) => right.startDate.getTime() - left.startDate.getTime(),
      );
  }

  async findActivePrimaryPlacements(personId) {
    return this.placements
      .filter(
        (record) =>
          record.personId === personId &&
          record.isPrimary === true &&
          record.endDate === null,
      )
      .sort(
        (left, right) => left.startDate.getTime() - right.startDate.getTime(),
      );
  }

  async endPlacement(id, endDate) {
    const index = this.placements.findIndex((record) => record.id === id);
    if (index < 0) throw new Error('placement missing');
    this.placements[index] = {
      ...this.placements[index],
      endDate,
      updatedAt: LATER,
    };
    return this.placements[index];
  }
}

class MemoryUserAccountsRepository {
  constructor() {
    this.records = [];
    this.next = 1;
  }

  async create(data) {
    const record = {
      id: `20000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`,
      externalAuthId: null,
      username: null,
      email: null,
      lastLoginAt: null,
      ...data,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.records.push(record);
    return record;
  }

  async findByPersonId(personId) {
    return this.records.find((record) => record.personId === personId) ?? null;
  }

  async findByExternalAuthId(externalAuthId) {
    return (
      this.records.find((record) => record.externalAuthId === externalAuthId) ??
      null
    );
  }

  async update(personId, data) {
    const index = this.records.findIndex(
      (record) => record.personId === personId,
    );
    if (index < 0) throw new Error('account missing');
    this.records[index] = {
      ...this.records[index],
      ...data,
      updatedAt: LATER,
    };
    return this.records[index];
  }
}

function createContext() {
  const audit = new FakeAuditService();
  const organizationsService = new OrganizationsService(
    new MemoryOrganizationsRepository(),
    audit,
  );
  const personsRepository = new MemoryPersonsRepository();
  const personsService = new PersonsService(
    personsRepository,
    organizationsService,
    audit,
  );
  const userAccountsService = new UserAccountsService(
    new MemoryUserAccountsRepository(),
    personsService,
    audit,
  );
  return {
    organizationsService,
    personsService,
    userAccountsService,
    personsRepository,
    audit,
  };
}

test('person service normalizes personnel numbers and rejects duplicates', async () => {
  const { personsService } = createContext();

  const person = await personsService.create({
    personnelNumber: ' 87012345 ',
    fullName: '  Budi Santoso  ',
    email: 'Budiono@Polri.go.id',
  });

  assert.equal(person.personnelNumber, '87012345');
  assert.equal(person.fullName, 'Budi Santoso');
  assert.equal(person.email, 'budiono@polri.go.id');
  assert.equal(person.status, PersonStatusDto.ACTIVE);

  await assert.rejects(
    personsService.create({
      personnelNumber: '87012345',
      fullName: 'Duplikat',
    }),
    ConflictException,
  );
  await assert.rejects(
    personsService.create({ personnelNumber: '   ', fullName: 'Kosong' }),
    BadRequestException,
  );
});

test('person list supports search, status filter and pagination', async () => {
  const { personsService } = createContext();

  await personsService.create({ personnelNumber: '87001', fullName: 'Ani' });
  await personsService.create({ personnelNumber: '87002', fullName: 'Budi' });
  const third = await personsService.create({
    personnelNumber: '87003',
    fullName: 'Candra',
  });
  await personsService.update(third.id, { status: PersonStatusDto.INACTIVE });

  const active = await personsService.list({
    status: PersonStatusDto.ACTIVE,
    page: 1,
    limit: 1,
  });
  assert.equal(active.total, 2);
  assert.equal(active.data.length, 1);
  assert.equal(active.page, 1);
  assert.equal(active.limit, 1);

  const searched = await personsService.list({ search: 'candra' });
  assert.equal(searched.total, 1);
  assert.equal(searched.data[0].personnelNumber, '87003');

  const inactive = await personsService.list({
    status: PersonStatusDto.INACTIVE,
  });
  assert.equal(inactive.total, 1);
});

test('person update rejects duplicate personnel number and deactivation preserves the record', async () => {
  const { personsService } = createContext();

  const first = await personsService.create({
    personnelNumber: '87001',
    fullName: 'Ani',
  });
  const second = await personsService.create({
    personnelNumber: '87002',
    fullName: 'Budi',
  });

  await assert.rejects(
    personsService.update(second.id, { personnelNumber: '87001' }),
    ConflictException,
  );
  // Re-submitting the person's own number must stay valid.
  await personsService.update(second.id, { personnelNumber: '87002' });

  await personsService.deactivate(first.id);
  const retained = await personsService.findOne(first.id);
  assert.equal(retained.status, PersonStatusDto.INACTIVE);
  await assert.rejects(personsService.findOne(UNKNOWN_ID), NotFoundException);
});

test('organization placement history is preserved and only one primary stays active', async () => {
  const { organizationsService, personsService } = createContext();

  const person = await personsService.create({
    personnelNumber: '87001',
    fullName: 'Ani',
  });
  const firstOrganization = await organizationsService.create({
    code: 'POLDA-A',
    name: 'Polda A',
  });
  const secondOrganization = await organizationsService.create({
    code: 'LEMDIKLAT',
    name: 'Lemdiklat',
  });

  const firstPlacement = await personsService.assignPlacement(person.id, {
    organizationId: firstOrganization.id,
    positionName: 'Kasi Binlat',
    startDate: '2024-01-01',
    isPrimary: true,
  });
  assert.equal(firstPlacement.isActive, true);
  assert.equal(firstPlacement.startDate, '2024-01-01');

  const secondPlacement = await personsService.assignPlacement(person.id, {
    organizationId: secondOrganization.id,
    startDate: '2026-01-01',
    isPrimary: true,
  });

  const history = await personsService.listPlacements(person.id);
  assert.equal(history.length, 2);

  const superseded = history.find((item) => item.id === firstPlacement.id);
  assert.equal(superseded.endDate, '2026-01-01');
  assert.equal(superseded.isActive, false);
  assert.equal(superseded.positionName, 'Kasi Binlat');

  const active = history.filter((item) => item.isActive);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, secondPlacement.id);
  assert.equal(active[0].isPrimary, true);
});

test('placement rejects unknown person, unknown organization and invalid end date', async () => {
  const { organizationsService, personsService } = createContext();

  const person = await personsService.create({
    personnelNumber: '87001',
    fullName: 'Ani',
  });
  const organization = await organizationsService.create({
    code: 'POLDA-A',
    name: 'Polda A',
  });

  await assert.rejects(
    personsService.assignPlacement(UNKNOWN_ID, {
      organizationId: organization.id,
    }),
    NotFoundException,
  );
  await assert.rejects(
    personsService.assignPlacement(person.id, { organizationId: UNKNOWN_ID }),
    NotFoundException,
  );
  await assert.rejects(
    personsService.listPlacements(UNKNOWN_ID),
    NotFoundException,
  );

  const placement = await personsService.assignPlacement(person.id, {
    organizationId: organization.id,
    startDate: '2026-05-01',
  });
  await assert.rejects(
    personsService.endPlacement(person.id, placement.id, {
      endDate: '2026-01-01',
    }),
    BadRequestException,
  );

  const ended = await personsService.endPlacement(person.id, placement.id, {
    endDate: '2026-06-01',
  });
  assert.equal(ended.endDate, '2026-06-01');
  assert.equal(ended.isActive, false);

  await assert.rejects(
    personsService.endPlacement(person.id, placement.id, {}),
    BadRequestException,
  );
  await assert.rejects(
    personsService.endPlacement(person.id, UNKNOWN_ID, {}),
    NotFoundException,
  );
});

test('a primary placement cannot start before the active primary placement', async () => {
  const { organizationsService, personsService, personsRepository } =
    createContext();

  const person = await personsService.create({
    personnelNumber: '87001',
    fullName: 'Ani',
  });
  const firstOrganization = await organizationsService.create({
    code: 'POLDA-A',
    name: 'Polda A',
  });
  const secondOrganization = await organizationsService.create({
    code: 'LEMDIKLAT',
    name: 'Lemdiklat',
  });

  await personsService.assignPlacement(person.id, {
    organizationId: firstOrganization.id,
    startDate: '2026-05-01',
    isPrimary: true,
  });

  await assert.rejects(
    personsService.assignPlacement(person.id, {
      organizationId: secondOrganization.id,
      startDate: '2026-01-01',
      isPrimary: true,
    }),
    BadRequestException,
  );

  const history = await personsService.listPlacements(person.id);
  assert.equal(history.length, 1, 'rejected assignment must not persist');
  assert.equal(history[0].isActive, true);
  assert.equal(history[0].endDate, null, 'rollback must restore history');
  assert.equal(personsRepository.placements.length, 1);
});

test('one person has at most one user account and no password surface', async () => {
  const { personsService, userAccountsService } = createContext();

  const person = await personsService.create({
    personnelNumber: '87001',
    fullName: 'Ani',
  });
  const other = await personsService.create({
    personnelNumber: '87002',
    fullName: 'Budi',
  });

  const account = await userAccountsService.create(person.id, {
    externalAuthId: 'kc-subject-1',
    username: 'ani',
    email: 'Ani@Polri.go.id',
  });

  assert.equal(account.personId, person.id);
  assert.equal(account.email, 'ani@polri.go.id');
  assert.equal(account.externalAuthId, 'kc-subject-1');
  assert.equal(account.status, UserAccountStatusDto.ACTIVE);
  assert.ok(!('password' in account));
  assert.ok(!('passwordHash' in account));

  await assert.rejects(
    userAccountsService.create(person.id, { username: 'ani-duplicate' }),
    ConflictException,
  );
  await assert.rejects(
    userAccountsService.create(other.id, { externalAuthId: 'kc-subject-1' }),
    ConflictException,
  );
  await assert.rejects(
    userAccountsService.create(UNKNOWN_ID, {}),
    NotFoundException,
  );
});

test('user account lifecycle can be read and updated', async () => {
  const { personsService, userAccountsService } = createContext();

  const person = await personsService.create({
    personnelNumber: '87001',
    fullName: 'Ani',
  });

  await assert.rejects(
    userAccountsService.findByPerson(person.id),
    NotFoundException,
  );

  await userAccountsService.create(person.id, { username: 'ani' });

  const updated = await userAccountsService.update(person.id, {
    status: UserAccountStatusDto.SUSPENDED,
    username: null,
  });
  assert.equal(updated.status, UserAccountStatusDto.SUSPENDED);
  assert.equal(updated.username, null);

  const read = await userAccountsService.findByPerson(person.id);
  assert.equal(read.status, UserAccountStatusDto.SUSPENDED);
  assert.equal(read.lastLoginAt, null);
});

test('password fields are rejected by the person and account contracts', async () => {
  const { app, base } = await startAuthenticatedApp();
  try {
    const accountResponse = await fetch(
      `${base}/api/v1/persons/${UNKNOWN_ID}/account`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: AUTHORIZATION,
        },
        body: JSON.stringify({ username: 'ani', password: 'rahasia' }),
      },
    );
    assert.equal(accountResponse.status, 400);
    assert.match(JSON.stringify(await accountResponse.json()), /password/i);

    const personResponse = await fetch(`${base}/api/v1/persons`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: AUTHORIZATION,
      },
      body: JSON.stringify({
        personnelNumber: '87001',
        fullName: 'Ani',
        passwordHash: 'rahasia',
      }),
    });
    assert.equal(personResponse.status, 400);
    assert.match(JSON.stringify(await personResponse.json()), /passwordHash/i);
  } finally {
    await app.close();
  }
});

test('person endpoints require an authenticated caller', async () => {
  const { app, base } = await startAuthenticatedApp();
  try {
    const anonymous = await fetch(`${base}/api/v1/persons`);
    assert.equal(anonymous.status, 401);

    // With a valid token the guard accepts the caller. The request then reaches
    // the repository, which cannot answer without a PostgreSQL runtime in this
    // environment; the point here is that authentication no longer rejects it.
    const authorized = await fetch(`${base}/api/v1/persons`, {
      headers: { authorization: AUTHORIZATION },
    });
    assert.notEqual(authorized.status, 401);
  } finally {
    await app.close();
  }
});

test('person and user account endpoints are exposed in OpenAPI under api v1', async () => {
  const { app, base } = await startAuthenticatedApp();
  try {
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();

    assert.ok(spec.paths['/api/v1/persons'].post);
    assert.ok(spec.paths['/api/v1/persons'].get);
    assert.ok(spec.paths['/api/v1/persons/{id}'].get);
    assert.ok(spec.paths['/api/v1/persons/{id}'].patch);
    assert.ok(spec.paths['/api/v1/persons/{id}'].delete);
    assert.ok(spec.paths['/api/v1/persons/{id}/organizations'].get);
    assert.ok(spec.paths['/api/v1/persons/{id}/organizations'].post);
    assert.ok(
      spec.paths['/api/v1/persons/{id}/organizations/{placementId}/end'].patch,
    );
    assert.ok(spec.paths['/api/v1/persons/{personId}/account'].get);
    assert.ok(spec.paths['/api/v1/persons/{personId}/account'].post);
    assert.ok(spec.paths['/api/v1/persons/{personId}/account'].patch);

    const accountSchema = spec.components.schemas.CreateUserAccountDto;
    assert.ok(!('password' in accountSchema.properties));
    assert.ok(!('passwordHash' in accountSchema.properties));
  } finally {
    await app.close();
  }
});
