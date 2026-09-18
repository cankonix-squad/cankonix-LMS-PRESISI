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
  AuthorizationService,
} = require('../dist/authorization/authorization.service');
const { RoleStatusDto } = require('../dist/authorization/dto/role-status.dto');
const {
  PermissionResponseDto,
} = require('../dist/authorization/dto/authorization-response.dto');
const {
  isValidPermissionCode,
  PERMISSION_CODE_PATTERN,
} = require('../dist/authorization/permission-code');
const {
  AUTHORIZATION_PERMISSIONS,
} = require('../dist/authorization/authorization-permissions');
const { PersonStatusDto } = require('../dist/persons/dto/person-status.dto');
const {
  UserAccountStatusDto,
} = require('../dist/user-accounts/dto/user-account-status.dto');

const NOW = new Date('2026-09-16T00:00:00.000Z');
const LATER = new Date('2026-09-16T01:00:00.000Z');
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000999';

const AUTH_ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUTH_AUDIENCE = 'lemdiklat-api';
const AUTH_KID = 'authorization-test-key';
const AUTHENTICATED_PERSON_ID = '20000000-0000-4000-8000-000000000001';
const AUTH_SUBJECT = 'subject-authorization-test';
const { privateKey: AUTH_PRIVATE_KEY, publicKey: AUTH_PUBLIC_KEY } =
  generateKeyPairSync('rsa', { modulusLength: 2048 });
const AUTH_PUBLIC_JWK = {
  ...AUTH_PUBLIC_KEY.export({ format: 'jwk' }),
  kid: AUTH_KID,
  use: 'sig',
  alg: 'RS256',
};

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
  async findAccountByExternalAuthId(externalAuthId) {
    if (externalAuthId !== AUTH_SUBJECT) return null;
    return {
      id: '20000000-0000-4000-8000-0000000000aa',
      personId: AUTHENTICATED_PERSON_ID,
      externalAuthId,
      username: 'rbac.tester',
      email: 'rbac.tester@polri.go.id',
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
      fullName: 'RBAC Tester',
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

  async touchLastLoginAt() {}
}

/**
 * Deterministic `PermissionEvaluator` for HTTP tests.
 *
 * The global `PermissionGuard` is fail-closed, so every route must resolve a
 * permission decision. This seam answers those questions without a PostgreSQL
 * runtime and cannot make the guard skip a check.
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

/**
 * In-memory RBAC catalogue.
 *
 * Mirrors the guarantees the Prisma repository gets from the database: unique
 * role/permission codes and an idempotent, composite-keyed grant table.
 */

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

class MemoryAuthorizationRepository {
  constructor() {
    this.roles = [];
    this.permissions = [];
    this.grants = [];
    this.next = 1;
  }

  uid(prefix) {
    return `${prefix}000000-0000-4000-8000-${String(this.next++).padStart(12, '0')}`;
  }

  async createRole(data, permissionIds = []) {
    const role = {
      id: this.uid('a'),
      description: null,
      isSystem: false,
      ...data,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.roles.push(role);
    for (const permissionId of permissionIds) {
      await this.grantPermissionToRole(role.id, permissionId);
    }
    return role;
  }

  async findRoleById(id) {
    return this.roles.find((role) => role.id === id) ?? null;
  }

  async findRoleByCode(code) {
    return this.roles.find((role) => role.code === code) ?? null;
  }

  async findRolesByCodes(codes) {
    return this.roles.filter((role) => codes.includes(role.code));
  }

  async listRoles(filter) {
    const search = filter.search?.toLowerCase();
    const data = this.roles
      .filter((role) => !filter.status || role.status === filter.status)
      .filter(
        (role) =>
          !search ||
          role.code.toLowerCase().includes(search) ||
          role.name.toLowerCase().includes(search),
      )
      .sort((left, right) => left.code.localeCompare(right.code));
    const start = (filter.page - 1) * filter.limit;
    return {
      data: data.slice(start, start + filter.limit),
      total: data.length,
    };
  }

  async updateRole(id, data) {
    const index = this.roles.findIndex((role) => role.id === id);
    this.roles[index] = { ...this.roles[index], ...data, updatedAt: LATER };
    return this.roles[index];
  }

  async deleteRole(id) {
    this.roles = this.roles.filter((role) => role.id !== id);
  }

  async createPermission(data) {
    const permission = {
      id: this.uid('b'),
      description: null,
      ...data,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.permissions.push(permission);
    return permission;
  }

  async findPermissionById(id) {
    return this.permissions.find((permission) => permission.id === id) ?? null;
  }

  async findPermissionByCode(code) {
    return (
      this.permissions.find((permission) => permission.code === code) ?? null
    );
  }

  async listPermissions(filter) {
    const search = filter.search?.toLowerCase();
    const data = this.permissions
      .filter(
        (permission) =>
          !search ||
          permission.code.toLowerCase().includes(search) ||
          permission.name.toLowerCase().includes(search),
      )
      .sort((left, right) => left.code.localeCompare(right.code));
    const start = (filter.page - 1) * filter.limit;
    return {
      data: data.slice(start, start + filter.limit),
      total: data.length,
    };
  }

  async listRolePermissions(roleId) {
    const ids = this.grants
      .filter((grant) => grant.roleId === roleId)
      .map((grant) => grant.permissionId);
    return this.permissions
      .filter((permission) => ids.includes(permission.id))
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  async grantPermissionToRole(roleId, permissionId) {
    const exists = this.grants.some(
      (grant) => grant.roleId === roleId && grant.permissionId === permissionId,
    );
    if (exists) return false;
    this.grants.push({ roleId, permissionId, createdAt: NOW });
    return true;
  }

  async revokePermissionFromRole(roleId, permissionId) {
    const before = this.grants.length;
    this.grants = this.grants.filter(
      (grant) =>
        !(grant.roleId === roleId && grant.permissionId === permissionId),
    );
    return this.grants.length < before;
  }

  async grantPermissionToRoles(roleIds, permissionId) {
    let created = 0;
    for (const roleId of roleIds) {
      if (await this.grantPermissionToRole(roleId, permissionId)) created += 1;
    }
    return created;
  }
}

function createService() {
  const repository = new MemoryAuthorizationRepository();
  const audit = new FakeAuditService();
  return {
    repository,
    audit,
    service: new AuthorizationService(repository, audit),
  };
}

async function seedPermission(service, code, name = code) {
  return service.createPermission({ code, name });
}

test('role codes are unique and stored normalized', async () => {
  const { service } = createService();

  const role = await service.createRole({
    code: ' akademik_admin ',
    name: '  Administrator Akademik  ',
  });

  assert.equal(role.code, 'AKADEMIK_ADMIN');
  assert.equal(role.name, 'Administrator Akademik');
  assert.equal(role.isSystem, false);
  assert.equal(role.status, RoleStatusDto.ACTIVE);
  assert.deepEqual(role.permissions, []);

  await assert.rejects(
    service.createRole({ code: 'akademik_admin', name: 'Duplikat' }),
    ConflictException,
  );
});

test('permission codes follow the domain.resource.action vocabulary', async () => {
  const { service } = createService();

  assert.equal(isValidPermissionCode('academic.program.read'), true);
  assert.equal(isValidPermissionCode('foundation.role.manage'), true);
  assert.equal(isValidPermissionCode('assessment.grade.*'), true);
  assert.equal(isValidPermissionCode('academic.class_subject.manage'), true);
  assert.equal(isValidPermissionCode('portal.*.access'), true);
  assert.equal(isValidPermissionCode('academic.program'), false);
  assert.equal(isValidPermissionCode('Academic.Program.Read'), false);
  assert.equal(isValidPermissionCode('academic..read'), false);
  assert.equal(
    PERMISSION_CODE_PATTERN.test('academic.class_subject.manage'),
    true,
  );

  const permission = await seedPermission(
    service,
    'academic.program.read',
    'Lihat Program',
  );
  assert.equal(permission.code, 'academic.program.read');

  await assert.rejects(
    service.createPermission({
      code: 'academic.program.read',
      name: 'Duplikat',
    }),
    ConflictException,
  );
});

test('granting the same permission twice is idempotent', async () => {
  const { service, repository } = createService();
  const role = await service.createRole({ code: 'GADIK', name: 'Gadik' });
  const permission = await seedPermission(service, 'learning.content.create');

  const first = await service.grantPermission(role.id, permission.id);
  assert.equal(first.outcome, 'granted');

  const second = await service.grantPermission(role.id, permission.id);
  assert.equal(second.outcome, 'already_granted');

  assert.equal(repository.grants.length, 1, 'no duplicate grant rows');

  const permissions = await service.listRolePermissions(role.id);
  assert.equal(permissions.length, 1);
  assert.equal(permissions[0].code, 'learning.content.create');

  const removed = await service.revokePermission(role.id, permission.id);
  assert.equal(removed.outcome, 'removed');
  const removedAgain = await service.revokePermission(role.id, permission.id);
  assert.equal(removedAgain.outcome, 'already_removed');
  assert.equal(repository.grants.length, 0);
});

test('permissions supplied at creation are attached atomically', async () => {
  const { service } = createService();
  const read = await seedPermission(service, 'academic.program.read');
  const manage = await seedPermission(service, 'academic.program.manage');

  const role = await service.createRole({
    code: 'AKADEMIK_ADMIN',
    name: 'Administrator Akademik',
    permissionIds: [read.id, manage.id],
  });

  assert.equal(role.permissions.length, 2);
  assert.deepEqual(
    role.permissions.map((permission) => permission.code),
    ['academic.program.manage', 'academic.program.read'],
  );

  await assert.rejects(
    service.createRole({
      code: 'BROKEN',
      name: 'Broken',
      permissionIds: [read.id, UNKNOWN_ID],
    }),
    NotFoundException,
  );
});

test('system roles are protected from deletion, deactivation and code changes', async () => {
  const { repository, service } = createService();
  const systemRole = await repository.createRole({
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    status: RoleStatusDto.ACTIVE,
    isSystem: true,
  });
  const ordinaryRole = await service.createRole({
    code: 'GADIK',
    name: 'Gadik',
  });

  await assert.rejects(service.deleteRole(systemRole.id), ConflictException);
  await assert.rejects(
    service.updateRole(systemRole.id, { status: RoleStatusDto.INACTIVE }),
    ConflictException,
  );
  await assert.rejects(
    service.updateRole(systemRole.id, { code: 'SYSTEM_ADMIN_2' }),
    ConflictException,
  );

  const renamed = await service.updateRole(systemRole.id, {
    name: 'Administrator Sistem',
  });
  assert.equal(renamed.name, 'Administrator Sistem');
  assert.equal(renamed.isSystem, true);

  await service.deleteRole(ordinaryRole.id);
  assert.equal(await repository.findRoleById(ordinaryRole.id), null);
});

test('wildcard permissions may only be attached to a system role', async () => {
  const { repository, service } = createService();
  const wildcard = await seedPermission(service, 'portal.*.access');
  const ordinaryRole = await service.createRole({
    code: 'GADIK',
    name: 'Gadik',
  });
  const systemRole = await repository.createRole({
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    status: RoleStatusDto.ACTIVE,
    isSystem: true,
  });

  await assert.rejects(
    service.grantPermission(ordinaryRole.id, wildcard.id),
    BadRequestException,
  );
  assert.equal(
    (await service.listRolePermissions(ordinaryRole.id)).length,
    0,
    'rejected grant must not persist',
  );

  const granted = await service.grantPermission(systemRole.id, wildcard.id);
  assert.equal(granted.outcome, 'granted');
});

test('role updates enforce code uniqueness and validate the role exists', async () => {
  const { service } = createService();
  const first = await service.createRole({ code: 'GADIK', name: 'Gadik' });
  await service.createRole({ code: 'PENGUJI', name: 'Penguji' });

  await assert.rejects(
    service.updateRole(first.id, { code: 'PENGUJI' }),
    ConflictException,
  );
  await assert.rejects(
    service.updateRole(first.id, { code: 'Not A Code' }),
    BadRequestException,
  );
  await assert.rejects(
    service.updateRole(UNKNOWN_ID, { name: 'Hilang' }),
    NotFoundException,
  );
  await assert.rejects(
    service.listRolePermissions(UNKNOWN_ID),
    NotFoundException,
  );
  await assert.rejects(
    service.grantPermission(UNKNOWN_ID, UNKNOWN_ID),
    NotFoundException,
  );
  await assert.rejects(
    service.revokePermission(first.id, UNKNOWN_ID),
    NotFoundException,
  );

  const updated = await service.updateRole(first.id, {
    code: 'gadik_utama',
    status: RoleStatusDto.INACTIVE,
  });
  assert.equal(updated.code, 'GADIK_UTAMA');
  assert.equal(updated.status, RoleStatusDto.INACTIVE);
});

test('role and permission listing support search, filter and pagination', async () => {
  const { service } = createService();
  await service.createRole({ code: 'GADIK', name: 'Gadik' });
  await service.createRole({ code: 'PENGUJI', name: 'Penguji' });
  const inactive = await service.createRole({
    code: 'WALI_KELAS',
    name: 'Wali Kelas',
  });
  await service.updateRole(inactive.id, { status: RoleStatusDto.INACTIVE });

  const active = await service.listRoles({
    status: RoleStatusDto.ACTIVE,
    page: 1,
    limit: 1,
  });
  assert.equal(active.total, 2);
  assert.equal(active.data.length, 1);
  assert.equal(active.page, 1);
  assert.equal(active.limit, 1);

  const searched = await service.listRoles({ search: 'wali' });
  assert.equal(searched.total, 1);
  assert.equal(searched.data[0].code, 'WALI_KELAS');

  await seedPermission(service, 'attendance.record.manage', 'Kelola Kehadiran');
  await seedPermission(service, 'assessment.exam.manage', 'Kelola Ujian');
  const permissions = await service.listPermissions({ search: 'exam' });
  assert.equal(permissions.total, 1);
  assert.equal(permissions.data[0].code, 'assessment.exam.manage');

  const paged = await service.listPermissions({ page: 2, limit: 1 });
  assert.equal(paged.total, 2);
  assert.equal(paged.data.length, 1);
  assert.equal(paged.data[0].code, 'attendance.record.manage');
});

test('seeding a permission is idempotent and never invents roles', async () => {
  const { repository, service } = createService();
  await repository.createRole({
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    status: RoleStatusDto.ACTIVE,
    isSystem: true,
  });

  const first = await service.seedPermission({
    code: 'foundation.role.manage',
    name: 'Kelola Role',
    grantToRoleCodes: ['SYSTEM_ADMIN', 'BELUM_ADA'],
  });

  assert.equal(first.permission.code, 'foundation.role.manage');
  assert.deepEqual(first.grantedToRoles, ['SYSTEM_ADMIN']);
  assert.deepEqual(first.skippedRoleCodes, ['BELUM_ADA']);
  assert.equal(repository.roles.length, 1, 'seed must not create roles');
  assert.equal(repository.permissions.length, 1);
  assert.equal(repository.grants.length, 1);

  const second = await service.seedPermission({
    code: 'foundation.role.manage',
    name: 'Nama Berbeda Tidak Menimpa',
    grantToRoleCodes: ['system_admin'],
  });
  assert.equal(second.permission.id, first.permission.id);
  assert.equal(second.permission.name, 'Kelola Role');
  assert.deepEqual(second.skippedRoleCodes, [], 'codes are normalized');
  assert.equal(repository.permissions.length, 1, 'no duplicate permission');
  assert.equal(repository.grants.length, 1, 'no duplicate grant');
});

test('no authorization decision is made from a role code string', async () => {
  const { service } = createService();
  const role = await service.createRole({
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
  });

  // The only surface the service exposes for authorization questions is the
  // permission list. There is no role-name check and no permission-name check.
  for (const method of [
    'hasRole',
    'hasPermission',
    'can',
    'isAdmin',
    'checkAccess',
  ]) {
    assert.equal(
      typeof service[method],
      'undefined',
      `${method} must not exist: authorization belongs to permission + scope evaluation`,
    );
  }

  const permissions = await service.listRolePermissions(role.id);
  assert.deepEqual(permissions, []);
});

test('authorization endpoints require an authenticated caller', async () => {
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
    // The global PermissionGuard is fail-closed, so the catalogue needs a
    // deterministic permission decision without a PostgreSQL runtime.
    permissionEvaluator: new StubPermissionEvaluator(),
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  try {
    const anonymous = await fetch(`${base}/api/v1/authorization/roles`);
    assert.equal(anonymous.status, 401);

    // Authenticated but unauthorized: RBAC management is never authentication-only.
    const unprivileged = await fetch(`${base}/api/v1/authorization/roles`, {
      headers: { authorization: AUTHORIZATION },
    });
    assert.equal(unprivileged.status, 403);
  } finally {
    await app.close();
  }
});

test('authorization endpoints pass the boundary with the matching permission', async () => {
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
    permissionEvaluator: new StubPermissionEvaluator([
      AUTHORIZATION_PERMISSIONS.ROLE_READ,
      AUTHORIZATION_PERMISSIONS.ROLE_MANAGE,
      AUTHORIZATION_PERMISSIONS.PERMISSION_READ,
      AUTHORIZATION_PERMISSIONS.PERMISSION_MANAGE,
    ]),
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  try {
    const authorized = await fetch(`${base}/api/v1/authorization/roles`, {
      headers: { authorization: AUTHORIZATION },
    });
    assert.notEqual(authorized.status, 401);
    assert.notEqual(authorized.status, 403);
  } finally {
    await app.close();
  }
});

test('role and permission payloads are validated and expose no role branching', async () => {
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
    // DTO validation is what is under test here: grant the catalogue
    // permissions so the authorization boundary does not mask 400 responses.
    permissionEvaluator: new StubPermissionEvaluator([
      AUTHORIZATION_PERMISSIONS.ROLE_READ,
      AUTHORIZATION_PERMISSIONS.ROLE_MANAGE,
      AUTHORIZATION_PERMISSIONS.PERMISSION_READ,
      AUTHORIZATION_PERMISSIONS.PERMISSION_MANAGE,
    ]),
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const headers = {
    'content-type': 'application/json',
    authorization: AUTHORIZATION,
  };
  try {
    const invalidRole = await fetch(`${base}/api/v1/authorization/roles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'bad code!', name: 'Rusak' }),
    });
    assert.equal(invalidRole.status, 400);

    const invalidPermission = await fetch(
      `${base}/api/v1/authorization/permissions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: 'exam.manage', name: 'Rusak' }),
      },
    );
    assert.equal(invalidPermission.status, 400);
    assert.match(
      JSON.stringify(await invalidPermission.json()),
      /domain.*resource.*action/i,
    );

    const unknownField = await fetch(`${base}/api/v1/authorization/roles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'GADIK',
        name: 'Gadik',
        role: 'admin',
      }),
    });
    assert.equal(unknownField.status, 400);

    const badUuid = await fetch(
      `${base}/api/v1/authorization/roles/not-a-uuid/permissions`,
      { headers: { authorization: AUTHORIZATION } },
    );
    assert.equal(badUuid.status, 400);

    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/authorization/roles'].get);
    assert.ok(spec.paths['/api/v1/authorization/roles'].post);
    assert.ok(spec.paths['/api/v1/authorization/roles/{id}'].get);
    assert.ok(spec.paths['/api/v1/authorization/roles/{id}'].post);
    assert.ok(spec.paths['/api/v1/authorization/roles/{id}'].delete);
    assert.ok(spec.paths['/api/v1/authorization/roles/{id}/permissions'].get);
    assert.ok(
      spec.paths[
        '/api/v1/authorization/roles/{roleId}/permissions/{permissionId}'
      ].post,
    );
    assert.ok(
      spec.paths[
        '/api/v1/authorization/roles/{roleId}/permissions/{permissionId}'
      ].delete,
    );
    assert.ok(spec.paths['/api/v1/authorization/permissions'].get);
    assert.ok(spec.paths['/api/v1/authorization/permissions'].post);
    assert.ok(spec.paths['/api/v1/authorization/permissions/seed'].post);

    const roleSchema = spec.components.schemas.CreateRoleDto;
    assert.ok(!('isSystem' in roleSchema.properties));
    assert.ok(!('role' in roleSchema.properties));

    const roleResponse = spec.components.schemas.RoleDetailResponseDto;
    assert.ok('isSystem' in roleResponse.properties);
    assert.ok('permissions' in roleResponse.properties);

    assert.equal(typeof PermissionResponseDto, 'function');
  } finally {
    await app.close();
  }
});
