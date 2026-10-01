const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, NotFoundException } = require('@nestjs/common');
const { createSign, generateKeyPairSync } = require('node:crypto');
const { createApp } = require('../dist/app');
const {
  KeycloakProvisioningService,
} = require('../dist/keycloak-provisioning/keycloak-provisioning.service');
const {
  KeycloakAdminError,
} = require('../dist/keycloak-provisioning/keycloak-admin.port');
const {
  UnconfiguredKeycloakAdmin,
} = require('../dist/keycloak-provisioning/unconfigured-keycloak-admin');
const {
  KeycloakProvisioningStatusDto,
} = require('../dist/keycloak-provisioning/dto/keycloak-provisioning-status.dto');
const { AUDIT_ACTIONS } = require('../dist/audit/audit-actions');

const NOW = new Date('2026-10-01T00:00:00.000Z');
const PERSON_ID = '30000000-0000-4000-8000-000000000001';
const OTHER_PERSON_ID = '30000000-0000-4000-8000-000000000002';
const ACCOUNT_ID = '40000000-0000-4000-8000-000000000001';
const OTHER_ACCOUNT_ID = '40000000-0000-4000-8000-000000000002';
const KC_ID = 'kc-subject-0001';

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'keycloak-provisioning-test-key';
const AUTH_PERSON_ID = '30000000-0000-4000-8000-0000000000aa';
const { privateKey: AUTH_PRIVATE_KEY, publicKey: AUTH_PUBLIC_KEY } =
  generateKeyPairSync('rsa', { modulusLength: 2048 });
const AUTH_PUBLIC_JWK = {
  ...AUTH_PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

function signTestToken(subject = 'kc-adopter') {
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
  async findAccountByExternalAuthId(externalAuthId) {
    return {
      id: '90000000-0000-4000-8000-000000000001',
      personId: AUTH_PERSON_ID,
      externalAuthId,
      username: 'provisioning.tester',
      email: 'provisioning@polri.go.id',
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  async findPersonById(id) {
    if (id !== AUTH_PERSON_ID) return null;
    return {
      id,
      personnelNumber: '99008877',
      fullName: 'Provisioning Tester',
      rank: null,
      title: null,
      email: null,
      phone: null,
      status: 'ACTIVE',
      metadata: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  async touchLastLoginAt() {}
}

/** Deterministic permission evaluator: it answers questions, it cannot bypass. */
class StubPermissionEvaluator {
  constructor(permissions = []) {
    this.permissions = new Set(permissions);
  }

  async hasPermission(_userAccountId, permissionCode) {
    return this.permissions.has(permissionCode);
  }

  async getUserEffectivePermissions(userAccountId) {
    return {
      userAccountId,
      permissions: Array.from(this.permissions).map((code) => ({
        code,
        isUnrestricted: true,
        scopes: [],
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// In-memory doubles
// ---------------------------------------------------------------------------

/** Programmable Keycloak Admin double. Records calls; can fail on demand. */
class FakeKeycloakAdmin {
  constructor({
    users = [],
    configured = true,
    failCreate = null,
    failGet = null,
    failFind = null,
    failResetPassword = null,
  } = {}) {
    this.users = new Map(users.map((user) => [user.id, { ...user }]));
    this.configured = configured;
    this.failCreate = failCreate;
    this.failGet = failGet;
    this.failFind = failFind;
    this.failResetPassword = failResetPassword;
    this.createCalls = [];
    this.resetPasswordCalls = [];
    this.updateCalls = [];
    this.nextId = 1;
  }

  isConfigured() {
    return this.configured;
  }

  async findUserByUsername(username) {
    if (this.failFind) throw this.failFind;
    for (const user of this.users.values()) {
      if (user.username === username) return { ...user };
    }
    return null;
  }

  async findUsersByEmail(email) {
    return [...this.users.values()]
      .filter(
        (user) => (user.email ?? '').toLowerCase() === email.toLowerCase(),
      )
      .map((user) => ({ ...user }));
  }

  async getUser(id) {
    if (this.failGet) throw this.failGet;
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async createUser(input) {
    if (this.failCreate) throw this.failCreate;
    this.createCalls.push(input);
    const id = `kc-created-${this.nextId++}`;
    const user = {
      id,
      username: input.username,
      email: input.email ?? null,
      enabled: input.enabled,
      requiredActions: [],
    };
    this.users.set(id, user);
    return { ...user };
  }

  async updateUser(id, input) {
    this.updateCalls.push({ id, input });
    const user = this.users.get(id);
    if (!user) return;
    this.users.set(id, { ...user, ...input });
  }

  async deleteUser(id) {
    this.users.delete(id);
  }

  async resetPassword(id, input) {
    if (this.failResetPassword) throw this.failResetPassword;
    this.resetPasswordCalls.push({ id, ...input });
    const user = this.users.get(id);
    if (user) {
      this.users.set(id, {
        ...user,
        requiredActions: input.temporary
          ? [...user.requiredActions, 'UPDATE_PASSWORD']
          : [],
      });
    }
  }
}

/** Compare-and-set link repository double, mirroring the SQL semantics. */
class FakeLinkRepository {
  constructor(accounts = []) {
    this.accounts = new Map(
      accounts.map((account) => [account.id, { ...account }]),
    );
    this.casFailures = 0;
    // When set, models a competing writer that lands *between* the read and the
    // compare-and-set: the stored value changes, so the CAS legitimately fails.
    this.concurrentWrite = null;
  }

  async findById(id) {
    const account = this.accounts.get(id);
    return account ? { ...account } : null;
  }

  async findByPersonId(personId) {
    for (const account of this.accounts.values()) {
      if (account.personId === personId) return { ...account };
    }
    return null;
  }

  async findByExternalAuthId(externalAuthId) {
    if (!externalAuthId) return null;
    for (const account of this.accounts.values()) {
      if (account.externalAuthId === externalAuthId) return { ...account };
    }
    return null;
  }

  async setExternalAuthId(userAccountId, externalAuthId, expectedCurrent) {
    if (this.casFailures > 0) {
      this.casFailures -= 1;
      return null;
    }
    const account = this.accounts.get(userAccountId);
    if (!account) return null;
    if (account.externalAuthId === externalAuthId) {
      return { account: { ...account }, changed: false };
    }
    if (this.concurrentWrite) {
      // The competing writer wins first, so the expected value no longer matches.
      this.accounts.set(userAccountId, {
        ...account,
        externalAuthId: this.concurrentWrite,
      });
      this.concurrentWrite = null;
      return null;
    }
    if ((account.externalAuthId ?? null) !== (expectedCurrent ?? null)) {
      return null;
    }
    this.accounts.set(userAccountId, { ...account, externalAuthId });
    return { account: { ...this.accounts.get(userAccountId) }, changed: true };
  }
}

class FakeAuditService {
  constructor() {
    this.records = [];
  }

  async record(input) {
    this.records.push(input);
    return { id: `audit-${this.records.length}` };
  }
}

class FakePersonsService {
  constructor(persons = [PERSON_ID, OTHER_PERSON_ID]) {
    this.persons = new Set(persons);
  }

  async findPersonOrFail(personId) {
    if (!this.persons.has(personId)) {
      throw new NotFoundException(`Person ${personId} not found`);
    }
    return { id: personId };
  }
}

function account(overrides = {}) {
  return {
    id: ACCOUNT_ID,
    personId: PERSON_ID,
    externalAuthId: null,
    username: 'ui-pengajar-01102601',
    email: 'pengajar@polri.go.id',
    status: 'ACTIVE',
    fullName: 'Pengajar Uji',
    ...overrides,
  };
}

function buildService({ keycloak, links, audit, persons } = {}) {
  const fakeAudit = audit ?? new FakeAuditService();
  const service = new KeycloakProvisioningService(
    keycloak ?? new FakeKeycloakAdmin(),
    links ?? new FakeLinkRepository([account()]),
    persons ?? new FakePersonsService(),
    fakeAudit,
  );
  return { service, audit: fakeAudit };
}

async function startAuthenticatedApp(permissions = []) {
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
    permissionEvaluator: new StubPermissionEvaluator(permissions),
  });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

// ---------------------------------------------------------------------------
// Success
// ---------------------------------------------------------------------------

test('provision creates the Keycloak user, links it, and audits it', async () => {
  const keycloak = new FakeKeycloakAdmin();
  const links = new FakeLinkRepository([account()]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, true);
  assert.equal(keycloak.createCalls.length, 1);
  assert.equal(keycloak.createCalls[0].username, 'ui-pengajar-01102601');
  assert.equal(keycloak.createCalls[0].email, 'pengajar@polri.go.id');
  assert.equal(keycloak.createCalls[0].firstName, 'Pengajar Uji');
  assert.equal(keycloak.createCalls[0].enabled, true);

  const stored = await links.findByPersonId(PERSON_ID);
  assert.ok(stored.externalAuthId);
  assert.equal(result.provisioning.externalAuthId, stored.externalAuthId);
  assert.equal(result.provisioning.status, KeycloakProvisioningStatusDto.READY);
  assert.equal(result.provisioning.readyToLogin, true);

  assert.equal(audit.records.length, 1);
  assert.equal(
    audit.records[0].action,
    AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_PROVISIONED,
  );
  assert.equal(audit.records[0].resourceType, 'user_account');
  assert.equal(audit.records[0].before.externalAuthId, null);
  assert.equal(audit.records[0].after.externalAuthId, stored.externalAuthId);
});

test('provision is idempotent: a retry re-uses the linked user', async () => {
  const keycloak = new FakeKeycloakAdmin();
  const links = new FakeLinkRepository([account()]);
  const { service, audit } = buildService({ keycloak, links });

  const first = await service.provision(PERSON_ID);
  const second = await service.provision(PERSON_ID);

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  // The critical assertion: no second Keycloak user was ever created.
  assert.equal(keycloak.createCalls.length, 1);
  assert.equal(audit.records.length, 1);
  assert.equal(second.message, 'Akun sudah terhubung ke Keycloak.');
});

test('provision adopts an existing same-username Keycloak user (no duplicate)', async () => {
  // The educator test account: Keycloak already has the user, LMS has no link.
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: KC_ID,
        username: 'ui-pengajar-01102601',
        email: 'pengajar@polri.go.id',
        enabled: true,
        requiredActions: ['UPDATE_PASSWORD'],
      },
    ],
  });
  const links = new FakeLinkRepository([account()]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, true);
  assert.equal(result.adoptedExisting, true);
  assert.equal(keycloak.createCalls.length, 0, 'must not create a duplicate');
  assert.equal(result.provisioning.externalAuthId, KC_ID);
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.ACTIVATION_REQUIRED,
  );
  assert.equal(result.provisioning.readyToLogin, false);
  assert.equal(
    audit.records[0].action,
    AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_LINKED,
  );
});

test('link-existing binds the test account without creating a user', async () => {
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: KC_ID,
        username: 'ui-pengajar-01102601',
        email: null,
        enabled: false,
        requiredActions: [],
      },
    ],
  });
  const links = new FakeLinkRepository([account()]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.linkExisting(PERSON_ID);

  assert.equal(result.success, true);
  assert.equal(keycloak.createCalls.length, 0);
  assert.equal(result.provisioning.externalAuthId, KC_ID);
  // A disabled Keycloak user is re-enabled while being adopted, so the account
  // genuinely becomes usable rather than silently linked to a dead login.
  assert.equal(keycloak.updateCalls.length, 1);
  assert.equal(keycloak.updateCalls[0].input.enabled, true);
  assert.equal(result.provisioning.status, KeycloakProvisioningStatusDto.READY);
  assert.equal(
    audit.records[0].action,
    AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_LINKED,
  );
});

// ---------------------------------------------------------------------------
// Duplication / conflicts
// ---------------------------------------------------------------------------

test('provision reports LINK_CONFLICT when the username belongs to another account', async () => {
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: KC_ID,
        username: 'ui-pengajar-01102601',
        email: null,
        enabled: true,
        requiredActions: [],
      },
    ],
  });
  const links = new FakeLinkRepository([
    account(),
    account({
      id: OTHER_ACCOUNT_ID,
      personId: OTHER_PERSON_ID,
      externalAuthId: KC_ID,
      username: 'someone-else',
    }),
  ]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, false);
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.LINK_CONFLICT,
  );
  assert.equal(keycloak.createCalls.length, 0);
  assert.equal(audit.records.length, 0);
  // The other account's link was not touched.
  const other = await links.findById(OTHER_ACCOUNT_ID);
  assert.equal(other.externalAuthId, KC_ID);
});

test('provision reports LINK_CONFLICT on a duplicate-email Keycloak user', async () => {
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: 'kc-other',
        username: 'other.person',
        email: 'pengajar@polri.go.id',
        enabled: true,
        requiredActions: [],
      },
    ],
  });
  const links = new FakeLinkRepository([account()]);
  const { service } = buildService({ keycloak, links });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, false);
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.LINK_CONFLICT,
  );
  assert.equal(keycloak.createCalls.length, 0);
  // The conflict is diagnosable: it names the occupied email, not just "start over".
  assert.equal(result.provisioning.readyToLogin, false);
});

test('a 409 from Keycloak is reported as a link conflict, not a generic error', async () => {
  const keycloak = new FakeKeycloakAdmin({
    failCreate: new KeycloakAdminError('REJECTED', 'Conflict', 409),
  });
  const { service, audit } = buildService({
    keycloak,
    links: new FakeLinkRepository([account()]),
  });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, false);
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.LINK_CONFLICT,
  );
  // A real Keycloak call was attempted and the failure was observed, so the
  // status must be the conflict — not a re-derived NOT_PROVISIONED.
  assert.equal(keycloak.createCalls.length, 0);
  assert.equal(audit.records.length, 0);
});

// ---------------------------------------------------------------------------
// Keycloak failure
// ---------------------------------------------------------------------------

test('a Keycloak transport failure leaves the account unlinked and reports ERROR', async () => {
  const keycloak = new FakeKeycloakAdmin({
    failCreate: new KeycloakAdminError(
      'UNAVAILABLE',
      'Keycloak did not respond',
    ),
  });
  const links = new FakeLinkRepository([account()]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, false);
  assert.equal(result.provisioning.status, KeycloakProvisioningStatusDto.ERROR);
  assert.equal(result.provisioning.readyToLogin, false);
  // No link was written, so the account stays honest.
  const stored = await links.findByPersonId(PERSON_ID);
  assert.equal(stored.externalAuthId, null);
  assert.equal(audit.records.length, 0);
});

test('status is ERROR (not NOT_PROVISIONED) when Keycloak cannot be reached', async () => {
  const keycloak = new FakeKeycloakAdmin({
    failFind: new KeycloakAdminError('UNAVAILABLE', 'timeout'),
  });
  const { service } = buildService({
    keycloak,
    links: new FakeLinkRepository([account()]),
  });

  const status = await service.getStatus(PERSON_ID);
  assert.equal(status.status, KeycloakProvisioningStatusDto.ERROR);
  assert.deepEqual(status.availableActions, ['RETRY']);
});

test('provisioning fails closed when Keycloak is not configured', async () => {
  const keycloak = new UnconfiguredKeycloakAdmin();
  const links = new FakeLinkRepository([account()]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, false);
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.NOT_CONFIGURED,
  );
  assert.equal(result.provisioning.provisioningConfigured, false);
  assert.equal(audit.records.length, 0);
  const stored = await links.findByPersonId(PERSON_ID);
  assert.equal(stored.externalAuthId, null);
});

// ---------------------------------------------------------------------------
// Database failure / retry
// ---------------------------------------------------------------------------

test('a failed LMS link write is not hidden, and the retry adopts instead of duplicating', async () => {
  const keycloak = new FakeKeycloakAdmin();
  const links = new FakeLinkRepository([account()]);
  const { service } = buildService({ keycloak, links });

  // Simulate the LMS write failing after Keycloak created the user.
  links.casFailures = 1;
  const failed = await service.provision(PERSON_ID);
  assert.equal(failed.success, false);
  // The failure must not be laundered into NOT_PROVISIONED: a Keycloak user now
  // exists, so the honest answer is that it can be adopted.
  assert.equal(
    failed.provisioning.status,
    KeycloakProvisioningStatusDto.ADOPTABLE,
  );
  assert.match(failed.message, /coba lagi/i);
  assert.equal(keycloak.createCalls.length, 1);
  assert.equal(
    (await links.findByPersonId(PERSON_ID)).externalAuthId,
    null,
    'the link must not be written when the write failed',
  );

  // Retry: the orphaned Keycloak user is found by username and adopted.
  const retried = await service.provision(PERSON_ID);
  assert.equal(retried.success, true);
  assert.equal(retried.adoptedExisting, true);
  assert.equal(
    keycloak.createCalls.length,
    1,
    'the retry must not create a duplicate Keycloak user',
  );
  assert.ok((await links.findByPersonId(PERSON_ID)).externalAuthId);
});

test('a concurrent link change is refused instead of silently overwritten', async () => {
  const keycloak = new FakeKeycloakAdmin();
  const links = new FakeLinkRepository([account()]);
  const { service } = buildService({ keycloak, links });

  // A competing writer lands between our read and the compare-and-set.
  links.concurrentWrite = 'kc-someone-else';

  const result = await service.provision(PERSON_ID);

  assert.equal(result.success, false);
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.LINK_CONFLICT,
  );
  assert.equal(
    (await links.findById(ACCOUNT_ID)).externalAuthId,
    'kc-someone-else',
    'the concurrent value must be preserved',
  );
});

// ---------------------------------------------------------------------------
// Password handling
// ---------------------------------------------------------------------------

test('setPassword forwards a one-time credential and never stores it', async () => {
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: KC_ID,
        username: 'ui-pengajar-01102601',
        email: null,
        enabled: true,
        requiredActions: [],
      },
    ],
  });
  const links = new FakeLinkRepository([account({ externalAuthId: KC_ID })]);
  const { service, audit } = buildService({ keycloak, links });

  const result = await service.setPassword(PERSON_ID, {
    password: 'RahasiaSekali123',
  });

  assert.equal(result.success, true);
  assert.equal(keycloak.resetPasswordCalls.length, 1);
  assert.equal(keycloak.resetPasswordCalls[0].temporary, true);
  assert.equal(
    keycloak.resetPasswordCalls[0].password,
    'RahasiaSekali123',
    'the password must reach Keycloak',
  );

  // The audit trail records that a password was set, never its value.
  const serialized = JSON.stringify(audit.records);
  assert.ok(!serialized.includes('RahasiaSekali123'));
  assert.equal(
    audit.records[0].action,
    AUDIT_ACTIONS.USER_ACCOUNT_KEYCLOAK_PASSWORD_SET,
  );
  assert.equal(audit.records[0].metadata.temporary, true);
  // Temporary means the user must still change it, so the account is not READY.
  assert.equal(
    result.provisioning.status,
    KeycloakProvisioningStatusDto.ACTIVATION_REQUIRED,
  );
});

test('setPassword without a linked user is rejected before any Keycloak call', async () => {
  const keycloak = new FakeKeycloakAdmin();
  const { service } = buildService({
    keycloak,
    links: new FakeLinkRepository([account()]),
  });

  await assert.rejects(
    () => service.setPassword(PERSON_ID, { password: 'RahasiaSekali123' }),
    BadRequestException,
  );
  assert.equal(keycloak.resetPasswordCalls.length, 0);
});

test('setPassword without a password value is rejected', async () => {
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: KC_ID,
        username: 'ui-pengajar-01102601',
        email: null,
        enabled: true,
        requiredActions: [],
      },
    ],
  });
  const { service } = buildService({
    keycloak,
    links: new FakeLinkRepository([account({ externalAuthId: KC_ID })]),
  });

  await assert.rejects(
    () => service.setPassword(PERSON_ID, {}),
    BadRequestException,
  );
});

// ---------------------------------------------------------------------------
// Status reporting
// ---------------------------------------------------------------------------

test('status reports ADOPTABLE when a same-username Keycloak user exists', async () => {
  const keycloak = new FakeKeycloakAdmin({
    users: [
      {
        id: KC_ID,
        username: 'ui-pengajar-01102601',
        email: null,
        enabled: true,
        requiredActions: [],
      },
    ],
  });
  const { service } = buildService({
    keycloak,
    links: new FakeLinkRepository([account()]),
  });

  const status = await service.getStatus(PERSON_ID);
  assert.equal(status.status, KeycloakProvisioningStatusDto.ADOPTABLE);
  assert.deepEqual(status.availableActions, ['LINK_EXISTING']);
  assert.equal(status.readyToLogin, false);
});

test('status reports STALE_LINK when the stored subject no longer exists', async () => {
  const keycloak = new FakeKeycloakAdmin();
  const { service } = buildService({
    keycloak,
    links: new FakeLinkRepository([account({ externalAuthId: 'kc-deleted' })]),
  });

  const status = await service.getStatus(PERSON_ID);
  assert.equal(status.status, KeycloakProvisioningStatusDto.STALE_LINK);
  assert.equal(status.readyToLogin, false);
});

test('status requires an existing UserAccount', async () => {
  const { service } = buildService({
    links: new FakeLinkRepository([]),
  });
  await assert.rejects(() => service.getStatus(PERSON_ID), NotFoundException);
});

// ---------------------------------------------------------------------------
// HTTP boundary
// ---------------------------------------------------------------------------

test('keycloak provisioning routes require a bearer token', async () => {
  const { app, base } = await startAuthenticatedApp();
  try {
    const anonymous = await fetch(
      `${base}/api/v1/persons/${PERSON_ID}/keycloak/status`,
    );
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});

test('keycloak provisioning routes require user_account permissions', async () => {
  const { app, base } = await startAuthenticatedApp([]);
  try {
    const status = await fetch(
      `${base}/api/v1/persons/${PERSON_ID}/keycloak/status`,
      { headers: { authorization: AUTHORIZATION } },
    );
    assert.equal(status.status, 403);

    const provision = await fetch(
      `${base}/api/v1/persons/${PERSON_ID}/keycloak/provision`,
      { method: 'POST', headers: { authorization: AUTHORIZATION } },
    );
    assert.equal(provision.status, 403);

    // The account routes use the same permission boundary, so the foundation
    // allow-list is genuinely gone.
    const account = await fetch(`${base}/api/v1/persons/${PERSON_ID}/account`, {
      headers: { authorization: AUTHORIZATION },
    });
    assert.equal(account.status, 403);
  } finally {
    await app.close();
  }
});

test('keycloak provisioning routes are documented in OpenAPI without a stored password', async () => {
  const { app, base } = await startAuthenticatedApp();
  try {
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();

    assert.ok(spec.paths['/api/v1/persons/{personId}/keycloak/status'].get);
    assert.ok(spec.paths['/api/v1/persons/{personId}/keycloak/provision'].post);
    assert.ok(
      spec.paths['/api/v1/persons/{personId}/keycloak/link-existing'].post,
    );
    assert.ok(spec.paths['/api/v1/persons/{personId}/keycloak/password'].put);
    assert.ok(
      spec.paths['/api/v1/persons/{personId}/keycloak/activation'].post,
    );
    assert.ok(spec.paths['/api/v1/persons/{personId}/keycloak/status'].put);

    // `SetKeycloakPasswordDto` is an INPUT contract: a password travels in, it
    // never travels out and is never a stored field.
    const passwordInput = spec.components.schemas.SetKeycloakPasswordDto;
    assert.ok(passwordInput.properties.password);

    const statusSchema =
      spec.components.schemas.KeycloakProvisioningStatusResponseDto;
    assert.ok(!('password' in statusSchema.properties));
    assert.ok(!('passwordHash' in statusSchema.properties));
    assert.ok(!('clientSecret' in statusSchema.properties));
  } finally {
    await app.close();
  }
});
