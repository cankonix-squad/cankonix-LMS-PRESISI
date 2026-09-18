const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { createSign, generateKeyPairSync } = require('node:crypto');
const { createApp } = require('../dist/app');
const { PermissionGuard } = require('../dist/authorization/permission.guard');
const {
  RoleAssignmentsService,
} = require('../dist/authorization/role-assignments.service');
const {
  AUTHORIZATION_PERMISSIONS,
} = require('../dist/authorization/authorization-permissions');
const { ScopeTypeDto } = require('../dist/authorization/dto/scope-type.dto');

const USER_1 = '10000000-0000-4000-8000-000000000001';
const USER_2 = '10000000-0000-4000-8000-000000000002';
const PERSON_1 = '50000000-0000-4000-8000-000000000001';
const ROLE_EDUCATOR = '20000000-0000-4000-8000-000000000002';
const ORG_LEMHENSE = '40000000-0000-4000-8000-000000000002';

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'enforcement-test-key';
const { privateKey: AUTH_PRIVATE_KEY, publicKey: AUTH_PUBLIC_KEY } =
  generateKeyPairSync('rsa', { modulusLength: 2048 });
const AUTH_PUBLIC_JWK = {
  ...AUTH_PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

function signTestToken(subject = 'enforcement-subject') {
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

class StaticJwksProvider {
  async getKeys() {
    return [AUTH_PUBLIC_JWK];
  }
}

/** Maps every token onto USER_1 so the caller identity is deterministic. */
class StubIdentityResolver {
  async findAccountByExternalAuthId(externalAuthId) {
    return {
      id: USER_1,
      personId: PERSON_1,
      externalAuthId,
      username: 'enforcement.tester',
      email: 'enforcement@polri.go.id',
      status: 'ACTIVE',
      personnelNumber: '99001133',
      fullName: 'Enforcement Tester',
    };
  }

  async findPersonById(id) {
    if (id !== PERSON_1) return null;
    return {
      id,
      personnelNumber: '99001133',
      fullName: 'Enforcement Tester',
      rank: null,
      title: null,
      email: null,
      phone: null,
      status: 'ACTIVE',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async touchLastLoginAt() {}
}

/**
 * Deterministic permission evaluator used as the composition seam for HTTP
 * tests. It only answers permission questions; it cannot bypass the guard.
 */
class StubPermissionEvaluator {
  constructor(permissions = []) {
    this.permissions = new Set(permissions);
    this.calls = [];
  }

  async hasPermission(userAccountId, permissionCode) {
    this.calls.push(permissionCode);
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

async function startApp(permissionEvaluator) {
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
    permissionEvaluator,
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  return {
    app,
    base,
    auth: { authorization: `Bearer ${signTestToken()}` },
  };
}

// ------------------------------------------------- finding 1: guard execution

test('authorization endpoints return 403 for an authenticated caller without permission', async () => {
  const evaluator = new StubPermissionEvaluator([]);
  const { app, base, auth } = await startApp(evaluator);
  try {
    const denied = [
      { method: 'GET', path: '/api/v1/authorization/roles' },
      { method: 'GET', path: '/api/v1/authorization/permissions' },
      { method: 'GET', path: '/api/v1/authorization/assignments' },
      { method: 'POST', path: '/api/v1/authorization/assignments' },
      { method: 'POST', path: '/api/v1/authorization/permissions' },
    ];

    for (const route of denied) {
      const response = await fetch(`${base}${route.path}`, {
        method: route.method,
        headers: { ...auth, 'content-type': 'application/json' },
        body:
          route.method === 'POST'
            ? JSON.stringify({
                code: 'AUDITOR',
                name: 'Auditor',
                userAccountId: USER_2,
                roleId: ROLE_EDUCATOR,
              })
            : undefined,
      });
      assert.equal(
        response.status,
        403,
        `${route.method} ${route.path} must be denied without permission`,
      );
    }

    // The guard actually consulted the evaluator rather than short-circuiting.
    assert.ok(evaluator.calls.length > 0);

    // Unauthenticated callers are still rejected at the auth boundary.
    const anonymous = await fetch(`${base}/api/v1/authorization/roles`);
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});

test('an authenticated caller holding the permission passes the authorization boundary', async () => {
  const evaluator = new StubPermissionEvaluator([
    AUTHORIZATION_PERMISSIONS.ROLE_READ,
    AUTHORIZATION_PERMISSIONS.ASSIGNMENT_READ,
  ]);
  const { app, base, auth } = await startApp(evaluator);
  try {
    const roles = await fetch(`${base}/api/v1/authorization/roles`, {
      headers: auth,
    });
    assert.notEqual(roles.status, 403);
    assert.notEqual(roles.status, 401);

    const assignments = await fetch(
      `${base}/api/v1/authorization/assignments`,
      { headers: auth },
    );
    assert.notEqual(assignments.status, 403);
    assert.notEqual(assignments.status, 401);
  } finally {
    await app.close();
  }
});

// -------------------------------------------------------- finding 2: subject

test('effective permission reads allow self-service but deny cross-user access', async () => {
  const evaluator = new StubPermissionEvaluator([]);
  const { app, base, auth } = await startApp(evaluator);
  try {
    // Self-service: the path subject equals the token's account, so no
    // permission is required.
    const self = await fetch(
      `${base}/api/v1/authorization/users/${USER_1}/effective-permissions`,
      { headers: auth },
    );
    assert.notEqual(self.status, 403);
    assert.notEqual(self.status, 401);

    // Cross-user: another account's authorization state is administrative data.
    const crossUser = await fetch(
      `${base}/api/v1/authorization/users/${USER_2}/effective-permissions`,
      { headers: auth },
    );
    assert.equal(crossUser.status, 403);

    const crossUserEvaluation = await fetch(
      `${base}/api/v1/authorization/users/${USER_2}/has-permission/academic.class.manage`,
      { headers: auth },
    );
    assert.equal(crossUserEvaluation.status, 403);

    // Unauthenticated is still 401, never 403.
    const anonymous = await fetch(
      `${base}/api/v1/authorization/users/${USER_2}/effective-permissions`,
    );
    assert.equal(anonymous.status, 401);
  } finally {
    await app.close();
  }
});

test('cross-user reads are permitted only with the administrative permission', async () => {
  const evaluator = new StubPermissionEvaluator([
    AUTHORIZATION_PERMISSIONS.EFFECTIVE_PERMISSION_READ,
  ]);
  const { app, base, auth } = await startApp(evaluator);
  try {
    const crossUser = await fetch(
      `${base}/api/v1/authorization/users/${USER_2}/effective-permissions`,
      { headers: auth },
    );
    assert.notEqual(crossUser.status, 403);
    assert.notEqual(crossUser.status, 401);
  } finally {
    await app.close();
  }
});

// -------------------------------------------------------- finding 1: fail closed

test('routes without any authorization policy are denied by the fail-closed guard', async () => {
  const evaluator = new StubPermissionEvaluator([
    AUTHORIZATION_PERMISSIONS.ROLE_READ,
  ]);
  const guard = new PermissionGuard(evaluator, new Reflector());

  const noPolicyContext = {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: { accountId: USER_1 },
        params: {},
        headers: {},
      }),
    }),
  };

  await assert.rejects(
    () => guard.canActivate(noPolicyContext),
    ForbiddenException,
  );
  assert.equal(
    evaluator.calls.length,
    0,
    'a policy-less route must not even be evaluated',
  );
});

test('the fail-closed guard denies anonymous callers before evaluating policy', async () => {
  const evaluator = new StubPermissionEvaluator([
    AUTHORIZATION_PERMISSIONS.ROLE_READ,
  ]);
  const guard = new PermissionGuard(evaluator, new Reflector());

  const anonymousContext = {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  };

  await assert.rejects(
    () => guard.canActivate(anonymousContext),
    (error) => error.getStatus() === 401,
  );
});

// ------------------------------------------------------ finding 3: scope types

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

class FakeUserAccountsService {
  async findOne(id) {
    if (id === USER_1 || id === USER_2) return { id };
    throw new NotFoundException(`User account ${id} not found`);
  }
}

class FakeAuthRepo {
  async findRoleById() {
    return {
      id: ROLE_EDUCATOR,
      code: 'EDUCATOR_ROLE',
      name: 'Educator Role',
      status: 'ACTIVE',
      isSystem: false,
    };
  }
}

class FakeOrganizationsService {
  async findOne(id) {
    if (id === ORG_LEMHENSE) return { id };
    throw new NotFoundException(`Org ${id} not found`);
  }
  async getDescendantIds() {
    return [];
  }
}

class RecordingAssignmentsRepository {
  constructor() {
    this.created = [];
  }
  async createAssignment(data, scopes = []) {
    this.created.push({ data, scopes });
    return {
      id: 'assignment-1',
      userAccountId: data.userAccountId,
      roleId: data.roleId,
      validFrom: data.validFrom,
      validUntil: data.validUntil ?? null,
      status: data.status ?? 'ACTIVE',
      scopes: scopes.map((scope, index) => ({
        id: `scope-${index + 1}`,
        assignmentId: 'assignment-1',
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        createdAt: new Date(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  async findAssignmentById() {
    return null;
  }
  async listAssignments() {
    return { data: [], total: 0 };
  }
  async updateAssignmentStatus() {
    throw new Error('not used');
  }
  async deleteAssignment() {}
  async addScopes() {
    return { added: 0, existing: 0 };
  }
  async removeScope() {
    return false;
  }
  async listScopes() {
    return [];
  }
  async findActiveAssignmentsForUser() {
    return [];
  }
}

function buildService() {
  const repository = new RecordingAssignmentsRepository();
  const audit = new FakeAuditService();
  const service = new RoleAssignmentsService(
    repository,
    new FakeAuthRepo(),
    new FakeUserAccountsService(),
    new FakeOrganizationsService(),
    audit,
  );
  return { service, repository, audit };
}

test('scope types that cannot be validated against their domain are rejected', async () => {
  const { service, repository } = buildService();

  for (const scopeType of [
    ScopeTypeDto.PROGRAM,
    ScopeTypeDto.BATCH,
    ScopeTypeDto.CLASS,
    ScopeTypeDto.CLASS_SUBJECT,
  ]) {
    await assert.rejects(
      () =>
        service.createAssignment({
          userAccountId: USER_1,
          roleId: ROLE_EDUCATOR,
          scopes: [{ scopeType, scopeId: ORG_LEMHENSE }],
        }),
      BadRequestException,
      `${scopeType} must be rejected while its domain module does not exist`,
    );
  }

  assert.equal(
    repository.created.length,
    0,
    'no assignment may be persisted with an unverifiable scope',
  );
});

test('organization scopes must exist and valid organization scopes are accepted', async () => {
  const { service, repository } = buildService();

  await assert.rejects(
    () =>
      service.createAssignment({
        userAccountId: USER_1,
        roleId: ROLE_EDUCATOR,
        scopes: [
          {
            scopeType: ScopeTypeDto.ORGANIZATION,
            scopeId: '40000000-0000-4000-8000-000000000099',
          },
        ],
      }),
    NotFoundException,
  );

  const created = await service.createAssignment({
    userAccountId: USER_1,
    roleId: ROLE_EDUCATOR,
    scopes: [{ scopeType: ScopeTypeDto.ORGANIZATION, scopeId: ORG_LEMHENSE }],
  });
  assert.equal(created.scopes.length, 1);
  assert.equal(repository.created.length, 1);
});

test('permission vocabulary is namespaced as domain.resource.action', async () => {
  const pattern =
    /^[a-z][a-z0-9_]*\.([a-z][a-z0-9_]*|\*)\.([a-z][a-z0-9_]*|\*)$/;
  for (const code of Object.values(AUTHORIZATION_PERMISSIONS)) {
    assert.match(code, pattern);
  }
});
