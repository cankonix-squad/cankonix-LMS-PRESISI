const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, NotFoundException } = require('@nestjs/common');
const { createSign, generateKeyPairSync } = require('node:crypto');
const { createApp } = require('../dist/app');
const {
  RoleAssignmentsService,
} = require('../dist/authorization/role-assignments.service');
const {
  ScopeTypeDto,
  UserRoleAssignmentStatusDto,
} = require('../dist/authorization/dto/scope-type.dto');
const {
  AUTHORIZATION_PERMISSIONS,
} = require('../dist/authorization/authorization-permissions');

const NOW = new Date('2026-09-16T00:00:00.000Z');
const EARLIER = new Date('2026-09-15T00:00:00.000Z');
const LATER = new Date('2026-09-17T00:00:00.000Z');

const USER_1 = '10000000-0000-4000-8000-000000000001';
const USER_2 = '10000000-0000-4000-8000-000000000002';
const SCOPE_PERSON_1 = '50000000-0000-4000-8000-000000000001';
const ROLE_ADMIN = '20000000-0000-4000-8000-000000000001';
const ROLE_EDUCATOR = '20000000-0000-4000-8000-000000000002';
const ROLE_INACTIVE = '20000000-0000-4000-8000-000000000003';
const PERM_PROG_READ = '30000000-0000-4000-8000-000000000001';
const PERM_CLASS_MANAGE = '30000000-0000-4000-8000-000000000002';
const PERM_WILDCARD = '30000000-0000-4000-8000-000000000003';

const ORG_ROOT = '40000000-0000-4000-8000-000000000001';
const ORG_LEMHENSE = '40000000-0000-4000-8000-000000000002';
const ORG_AKPOL = '40000000-0000-4000-8000-000000000003';
const ORG_OTHER = '40000000-0000-4000-8000-000000000099';

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'scope-test-key';
const { privateKey: AUTH_PRIVATE_KEY, publicKey: AUTH_PUBLIC_KEY } =
  generateKeyPairSync('rsa', { modulusLength: 2048 });
const AUTH_PUBLIC_JWK = {
  ...AUTH_PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

function signTestToken(subject = 'scope-test-subject') {
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

class StubIdentityResolver {
  async findAccountByExternalAuthId(externalAuthId) {
    return {
      id: USER_1,
      personId: SCOPE_PERSON_1,
      externalAuthId,
      username: 'scope.tester',
      email: 'scope@polri.go.id',
      status: 'ACTIVE',
      personnelNumber: '99001122',
      fullName: 'Scope Tester',
    };
  }

  async findPersonById(id) {
    if (id !== SCOPE_PERSON_1) return null;
    return {
      id,
      personnelNumber: '99001122',
      fullName: 'Scope Tester',
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

class InMemoryRoleAssignmentsRepository {
  constructor() {
    this.assignments = new Map();
    this.scopes = new Map();
    this.roles = new Map([
      [
        ROLE_ADMIN,
        {
          id: ROLE_ADMIN,
          code: 'ADMIN_SUPER',
          name: 'Super Admin',
          status: 'ACTIVE',
          isSystem: true,
          permissions: [
            {
              permission: {
                id: PERM_WILDCARD,
                code: 'academic.*.manage',
                name: 'Academic Wildcard Manage',
              },
            },
            {
              permission: {
                id: PERM_PROG_READ,
                code: 'academic.program.read',
                name: 'Read Program',
              },
            },
          ],
        },
      ],
      [
        ROLE_EDUCATOR,
        {
          id: ROLE_EDUCATOR,
          code: 'EDUCATOR_ROLE',
          name: 'Educator Role',
          status: 'ACTIVE',
          isSystem: false,
          permissions: [
            {
              permission: {
                id: PERM_CLASS_MANAGE,
                code: 'academic.class.manage',
                name: 'Manage Class',
              },
            },
          ],
        },
      ],
      [
        ROLE_INACTIVE,
        {
          id: ROLE_INACTIVE,
          code: 'INACTIVE_ROLE',
          name: 'Inactive Role',
          status: 'INACTIVE',
          isSystem: false,
          permissions: [],
        },
      ],
    ]);
  }

  async createAssignment(data, scopes = []) {
    const id = `assignment-${this.assignments.size + 1}`;
    const record = {
      id,
      userAccountId: data.userAccountId,
      roleId: data.roleId,
      role: this.roles.get(data.roleId),
      validFrom: data.validFrom || new Date(),
      validUntil: data.validUntil || null,
      status: data.status || 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(id, record);

    const assignmentScopes = scopes.map((s, idx) => ({
      id: `scope-${id}-${idx + 1}`,
      assignmentId: id,
      scopeType: s.scopeType,
      scopeId: s.scopeId,
      createdAt: new Date(),
    }));
    this.scopes.set(id, assignmentScopes);

    return {
      ...record,
      scopes: assignmentScopes,
    };
  }

  async findAssignmentById(id) {
    const record = this.assignments.get(id);
    if (!record) return null;
    return {
      ...record,
      scopes: this.scopes.get(id) || [],
    };
  }

  async listAssignments(filter) {
    let list = Array.from(this.assignments.values());
    if (filter.userAccountId)
      list = list.filter((a) => a.userAccountId === filter.userAccountId);
    if (filter.roleId) list = list.filter((a) => a.roleId === filter.roleId);
    if (filter.status) list = list.filter((a) => a.status === filter.status);

    const total = list.length;
    const start = (filter.page - 1) * filter.limit;
    const data = list.slice(start, start + filter.limit).map((a) => ({
      ...a,
      scopes: this.scopes.get(a.id) || [],
    }));

    return { data, total };
  }

  async updateAssignmentStatus(id, status) {
    const record = this.assignments.get(id);
    if (!record) throw new Error('Not found');
    record.status = status;
    record.updatedAt = new Date();
    return {
      ...record,
      scopes: this.scopes.get(id) || [],
    };
  }

  async deleteAssignment(id) {
    this.assignments.delete(id);
    this.scopes.delete(id);
  }

  async addScopes(assignmentId, scopes) {
    const existing = this.scopes.get(assignmentId) || [];
    const existingKeys = new Set(
      existing.map((s) => `${s.scopeType}:${s.scopeId}`),
    );
    let added = 0;
    for (const s of scopes) {
      if (!existingKeys.has(`${s.scopeType}:${s.scopeId}`)) {
        existing.push({
          id: `scope-${assignmentId}-${existing.length + 1}`,
          assignmentId,
          scopeType: s.scopeType,
          scopeId: s.scopeId,
          createdAt: new Date(),
        });
        existingKeys.add(`${s.scopeType}:${s.scopeId}`);
        added++;
      }
    }
    this.scopes.set(assignmentId, existing);
    return { added, existing: scopes.length - added };
  }

  async removeScope(assignmentId, scopeId) {
    const existing = this.scopes.get(assignmentId) || [];
    const initialLen = existing.length;
    const filtered = existing.filter(
      (s) => s.id !== scopeId && s.scopeId !== scopeId,
    );
    this.scopes.set(assignmentId, filtered);
    return filtered.length < initialLen;
  }

  async listScopes(assignmentId) {
    return this.scopes.get(assignmentId) || [];
  }

  async findActiveAssignmentsForUser(userAccountId, atTime) {
    const active = [];
    const checkTime = atTime ? new Date(atTime) : new Date();
    for (const a of this.assignments.values()) {
      if (a.userAccountId !== userAccountId) continue;
      if (a.status !== 'ACTIVE') continue;
      if (a.validFrom > checkTime) continue;
      if (a.validUntil && a.validUntil < checkTime) continue;

      const role = this.roles.get(a.roleId);
      if (!role || role.status !== 'ACTIVE') continue;

      active.push({
        id: a.id,
        roleId: a.roleId,
        role,
        validFrom: a.validFrom,
        validUntil: a.validUntil,
        status: a.status,
        scopes: this.scopes.get(a.id) || [],
      });
    }
    return active;
  }
}

class FakeAuthRepo {
  constructor(rolesMap) {
    this.roles = rolesMap;
  }
  async findRoleById(id) {
    return this.roles.get(id) || null;
  }
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

class FakeUserAccountsService {
  async findOne(id) {
    if (id === USER_1 || id === USER_2) return { id };
    throw new NotFoundException(`User account ${id} not found`);
  }
}

class FakeOrganizationsService {
  constructor() {
    this.descendants = new Map([
      [ORG_ROOT, [ORG_LEMHENSE, ORG_AKPOL]],
      [ORG_LEMHENSE, []],
      [ORG_AKPOL, []],
    ]);
  }
  async findOne(id) {
    if (this.descendants.has(id)) return { id };
    throw new NotFoundException(`Org ${id} not found`);
  }
  async getDescendantIds(id) {
    return this.descendants.get(id) || [];
  }
}

/**
 * Deterministic `PermissionEvaluator` for HTTP tests.
 *
 * It only answers permission questions — it cannot make the fail-closed
 * `PermissionGuard` skip a check.
 */
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

function buildService() {
  const repo = new InMemoryRoleAssignmentsRepository();
  const authRepo = new FakeAuthRepo(repo.roles);
  const userAccounts = new FakeUserAccountsService();
  const orgs = new FakeOrganizationsService();
  const audit = new FakeAuditService();
  const service = new RoleAssignmentsService(
    repo,
    authRepo,
    userAccounts,
    orgs,
    audit,
  );
  return { service, repo, orgs, audit };
}

test('role assignments support creation, status lifecycle, multiple scopes, and listing', async () => {
  const { service } = buildService();

  const created = await service.createAssignment({
    userAccountId: USER_1,
    roleId: ROLE_EDUCATOR,
    scopes: [{ scopeType: ScopeTypeDto.ORGANIZATION, scopeId: ORG_LEMHENSE }],
  });

  assert.equal(created.userAccountId, USER_1);
  assert.equal(created.roleId, ROLE_EDUCATOR);
  assert.equal(created.scopes.length, 1);
  assert.equal(created.scopes[0].scopeId, ORG_LEMHENSE);
  assert.equal(created.status, UserRoleAssignmentStatusDto.ACTIVE);

  // Add another scope
  const withExtraScope = await service.addScopes(created.id, {
    scopes: [{ scopeType: ScopeTypeDto.ORGANIZATION, scopeId: ORG_AKPOL }],
  });
  assert.equal(withExtraScope.scopes.length, 2);

  // Listing with filter
  const list = await service.listAssignments({ userAccountId: USER_1 });
  assert.equal(list.total, 1);
  assert.equal(list.data[0].id, created.id);

  // Deactivate
  const deactivated = await service.updateStatus(created.id, {
    status: UserRoleAssignmentStatusDto.INACTIVE,
  });
  assert.equal(deactivated.status, UserRoleAssignmentStatusDto.INACTIVE);

  // Delete
  await service.deleteAssignment(created.id);
  await assert.rejects(
    () => service.findAssignment(created.id),
    NotFoundException,
  );
});

test('creation validates validUntil > validFrom and rejects inactive roles', async () => {
  const { service } = buildService();

  await assert.rejects(
    () =>
      service.createAssignment({
        userAccountId: USER_1,
        roleId: ROLE_INACTIVE,
      }),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      service.createAssignment({
        userAccountId: USER_1,
        roleId: ROLE_EDUCATOR,
        validFrom: LATER.toISOString(),
        validUntil: EARLIER.toISOString(),
      }),
    BadRequestException,
  );
});

test('effective permission resolver resolves permissions, unrestricted flags and active scopes', async () => {
  const { service } = buildService();

  // Create unrestricted super admin assignment
  await service.createAssignment({
    userAccountId: USER_1,
    roleId: ROLE_ADMIN,
    validFrom: EARLIER.toISOString(),
    scopes: [], // Unrestricted (National)
  });

  const effective = await service.getUserEffectivePermissions(USER_1, NOW);
  assert.equal(effective.userAccountId, USER_1);
  assert.equal(effective.permissions.length, 2);

  const progRead = effective.permissions.find(
    (p) => p.code === 'academic.program.read',
  );
  assert.ok(progRead);
  assert.equal(progRead.isUnrestricted, true);
  assert.equal(progRead.scopes.length, 0);

  // Evaluates permission
  const allowedUnrestricted = await service.hasPermission(
    USER_1,
    'academic.program.read',
    ScopeTypeDto.ORGANIZATION,
    ORG_LEMHENSE,
  );
  assert.equal(allowedUnrestricted, true);

  // Wildcard permission match (academic.*.manage matches academic.curriculum.manage)
  const allowedWildcard = await service.hasPermission(
    USER_1,
    'academic.curriculum.manage',
  );
  assert.equal(allowedWildcard, true);
});

test('descendant organization scope hierarchy grants access to child organizations', async () => {
  const { service } = buildService();

  // Scoped to ORG_ROOT (Lemdiklat Pusat)
  await service.createAssignment({
    userAccountId: USER_1,
    roleId: ROLE_EDUCATOR,
    scopes: [{ scopeType: ScopeTypeDto.ORGANIZATION, scopeId: ORG_ROOT }],
  });

  // Direct org match
  assert.equal(
    await service.hasPermission(
      USER_1,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_ROOT,
    ),
    true,
  );

  // Child org match (descendant inheritance)
  assert.equal(
    await service.hasPermission(
      USER_1,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_LEMHENSE,
    ),
    true,
  );
  assert.equal(
    await service.hasPermission(
      USER_1,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_AKPOL,
    ),
    true,
  );

  // Unrelated org denial
  assert.equal(
    await service.hasPermission(
      USER_1,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_OTHER,
    ),
    false,
  );
});

test('expired and revoked assignments are denied by effective resolver', async () => {
  const { service } = buildService();

  // Assignment valid only in past
  await service.createAssignment({
    userAccountId: USER_1,
    roleId: ROLE_EDUCATOR,
    validFrom: EARLIER.toISOString(),
    validUntil: NOW.toISOString(),
    scopes: [{ scopeType: ScopeTypeDto.ORGANIZATION, scopeId: ORG_LEMHENSE }],
  });

  // At LATER time, expired
  assert.equal(
    await service.hasPermission(
      USER_1,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_LEMHENSE,
      LATER,
    ),
    false,
  );

  // Revoke active assignment
  const activeAssignment = await service.createAssignment({
    userAccountId: USER_2,
    roleId: ROLE_EDUCATOR,
    validFrom: NOW.toISOString(),
    scopes: [{ scopeType: ScopeTypeDto.ORGANIZATION, scopeId: ORG_LEMHENSE }],
  });

  assert.equal(
    await service.hasPermission(
      USER_2,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_LEMHENSE,
      LATER,
    ),
    true,
  );

  await service.updateStatus(activeAssignment.id, {
    status: UserRoleAssignmentStatusDto.REVOKED,
  });

  assert.equal(
    await service.hasPermission(
      USER_2,
      'academic.class.manage',
      ScopeTypeDto.ORGANIZATION,
      ORG_LEMHENSE,
      LATER,
    ),
    false,
  );
});

test('no role-name branching exists and endpoint returns 401 when unauthenticated', async () => {
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
    // Deterministic evaluator: the global PermissionGuard is fail-closed, so
    // every route must resolve a permission decision without a database.
    permissionEvaluator: new StubPermissionEvaluator([
      AUTHORIZATION_PERMISSIONS.ASSIGNMENT_READ,
      AUTHORIZATION_PERMISSIONS.ASSIGNMENT_MANAGE,
      AUTHORIZATION_PERMISSIONS.ROLE_READ,
      AUTHORIZATION_PERMISSIONS.PERMISSION_READ,
      AUTHORIZATION_PERMISSIONS.EFFECTIVE_PERMISSION_READ,
    ]),
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();

  try {
    const unauthRes = await fetch(`${base}/api/v1/authorization/assignments`);
    assert.equal(unauthRes.status, 401);

    const authRes = await fetch(`${base}/api/v1/authorization/assignments`, {
      headers: {
        authorization: `Bearer ${signTestToken()}`,
      },
    });
    // Authenticated and authorized: the request reaches the business layer.
    assert.notEqual(authRes.status, 401);
    assert.notEqual(authRes.status, 403);

    // A permission the caller does not hold is refused, not merely unchecked.
    const deniedRes = await fetch(
      `${base}/api/v1/authorization/roles/${ROLE_ADMIN}`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${signTestToken()}` },
      },
    );
    assert.equal(deniedRes.status, 403);

    const docRes = await fetch(`${base}/api/v1/docs-json`);
    assert.equal(docRes.status, 200);
    const doc = await docRes.json();
    assert.ok(doc.paths['/api/v1/authorization/assignments']);
    assert.ok(
      doc.paths[
        '/api/v1/authorization/users/{userAccountId}/effective-permissions'
      ],
    );
    assert.ok(
      doc.paths[
        '/api/v1/authorization/users/{userAccountId}/has-permission/{permissionCode}'
      ],
    );
  } finally {
    await app.close();
  }
});
