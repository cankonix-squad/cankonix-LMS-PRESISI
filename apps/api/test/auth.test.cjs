const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSign, generateKeyPairSync, randomUUID } = require('node:crypto');
const { createApp } = require('../dist/app');
const { JwtAuthGuard } = require('../dist/auth/auth.guard');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtVerifier } = require('../dist/auth/jwt-verifier.service');
const { KeycloakJwksProvider } = require('../dist/auth/jwks.provider');

const ISSUER = 'https://keycloak.test/realms/lemdiklat';
const AUDIENCE = 'lemdiklat-api';
const KID = 'test-key-1';
const JWKS_URI =
  'https://keycloak.test/realms/lemdiklat/protocol/openid-connect/certs';
const NOW = new Date('2026-09-16T00:00:00.000Z');

const PERSON_ACTIVE = '10000000-0000-4000-8000-000000000001';
const PERSON_INACTIVE = '10000000-0000-4000-8000-000000000002';
const PERSON_ORPHAN = '10000000-0000-4000-8000-000000000003';

/**
 * A real RSA key pair stands in for Keycloak: tokens are genuinely signed and
 * genuinely verified, so the test exercises the production verification path.
 */
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

const PUBLIC_JWK = {
  ...publicKey.export({ format: 'jwk' }),
  kid: KID,
  use: 'sig',
  alg: 'RS256',
};
function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signToken(claims, options = {}) {
  const header = {
    alg: options.alg ?? 'RS256',
    typ: 'JWT',
    kid: options.kid ?? KID,
  };
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  const payload = {
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + 300,
    ...claims,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;

  if (options.signature !== undefined) {
    return `${signingInput}.${options.signature}`;
  }

  const signature = createSign(options.hash ?? 'RSA-SHA256')
    .update(signingInput)
    .end()
    .sign(privateKey);
  return `${signingInput}.${Buffer.from(signature).toString('base64url')}`;
}

function authConfig(overrides = {}) {
  return {
    issuer: ISSUER,
    audience: AUDIENCE,
    jwksUri: JWKS_URI,
    clockSkewSeconds: 30,
    jwksCacheSeconds: 300,
    jwksRequestTimeoutMs: 5000,
    lastLoginThrottleSeconds: 300,
    ...overrides,
  };
}

class FakeJwksProvider {
  constructor(keys = [PUBLIC_JWK]) {
    this.keys = keys;
    this.calls = 0;
    this.forceRefreshes = 0;
  }

  async getKeys(options = {}) {
    this.calls += 1;
    if (options.forceRefresh) this.forceRefreshes += 1;
    return this.keys;
  }
}

class FakeIdentityResolver {
  constructor(accounts, persons) {
    this.accounts = accounts;
    this.persons = persons;
    this.touchCalls = [];
  }

  async findAccountByExternalAuthId(externalAuthId) {
    return this.accounts.get(externalAuthId) ?? null;
  }

  async findPersonById(id) {
    return this.persons.get(id) ?? null;
  }

  async touchLastLoginAt(personId, at) {
    this.touchCalls.push({ personId, at });
  }
}

function account(overrides = {}) {
  return {
    id: randomUUID(),
    personId: PERSON_ACTIVE,
    externalAuthId: 'subject-active',
    username: 'budi.santoso',
    email: 'budi.santoso@polri.go.id',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function person(overrides = {}) {
  return {
    id: PERSON_ACTIVE,
    personnelNumber: '87001',
    fullName: 'Budi Santoso',
    rank: null,
    title: null,
    email: null,
    phone: null,
    status: 'ACTIVE',
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function buildResolver(accounts, persons) {
  return new FakeIdentityResolver(accounts, persons);
}

// ---------------------------------------------------------------- unit: verifier

test('verifier accepts a well-formed Keycloak access token', async () => {
  const verifier = new JwtVerifier(authConfig(), new FakeJwksProvider());
  const claims = await verifier.verify(signToken({ sub: 'subject-active' }));

  assert.equal(claims.subject, 'subject-active');
  assert.equal(claims.issuer, ISSUER);
  assert.deepEqual(claims.audience, [AUDIENCE]);
});

test('verifier rejects tokens with an untrusted issuer, audience or expiry', async () => {
  const verifier = new JwtVerifier(authConfig(), new FakeJwksProvider());

  await assert.rejects(
    verifier.verify(signToken({ sub: 's', iss: 'https://evil.test/realms/x' })),
    /issuer/,
  );
  await assert.rejects(
    verifier.verify(signToken({ sub: 's', aud: 'another-api' })),
    /audience/,
  );

  const past = Date.now() - 3_600_000;
  await assert.rejects(
    verifier.verify(signToken({ sub: 's' }, { now: past })),
    /expired/,
  );

  const future = Date.now() + 3_600_000;
  await assert.rejects(
    verifier.verify(signToken({ sub: 's', nbf: Math.floor(future / 1000) })),
    /not valid yet/,
  );
});

test('verifier rejects tampered signatures and unsigned algorithms', async () => {
  const verifier = new JwtVerifier(authConfig(), new FakeJwksProvider());
  const valid = signToken({ sub: 'subject-active' });
  const [header, payload] = valid.split('.');

  // Flip the payload while keeping the original signature.
  const tampered = `${header}.${base64url(
    JSON.stringify({
      iss: ISSUER,
      aud: AUDIENCE,
      sub: 'someone-else',
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  )}.${valid.split('.')[2]}`;
  await assert.rejects(verifier.verify(tampered), /signature/);
  assert.equal(payload.length > 0, true);

  // `alg: none` and the HMAC family must never be accepted.
  await assert.rejects(
    verifier.verify(
      signToken({ sub: 's' }, { alg: 'none', signature: 'AAAA' }),
    ),
    /algorithm/,
  );
  await assert.rejects(
    verifier.verify(signToken({ sub: 's' }, { alg: 'HS256' })),
    /algorithm/,
  );

  await assert.rejects(verifier.verify('not-a-token'), /compact JWS/);
  await assert.rejects(verifier.verify(`${header}.${payload}.`), /compact JWS/);
});

test('verifier refreshes the key set once when the token key id is unknown', async () => {
  const jwks = new FakeJwksProvider([]);
  const verifier = new JwtVerifier(authConfig(), jwks);

  await assert.rejects(
    verifier.verify(signToken({ sub: 's' })),
    /No signing key matches/,
  );
  assert.equal(jwks.calls, 2);
  assert.equal(jwks.forceRefreshes, 1);

  // A known key id is served from cache without a forced refresh.
  jwks.keys = [PUBLIC_JWK];
  await verifier.verify(signToken({ sub: 's' }));
  assert.equal(jwks.forceRefreshes, 1);
});

// ------------------------------------------------------- unit: JWKS provider

test('JWKS provider fetches once, caches, and refreshes only when asked', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({ keys: [PUBLIC_JWK] }),
    };
  };

  try {
    const provider = new KeycloakJwksProvider(authConfig());
    assert.equal((await provider.getKeys()).length, 1);
    assert.equal((await provider.getKeys()).length, 1);
    assert.equal(requests, 1, 'second read must be served from cache');

    await provider.getKeys({ forceRefresh: true });
    assert.equal(requests, 2, 'forced refresh must refetch');

    // An expired cache entry triggers a fetch on its own.
    const expiring = new KeycloakJwksProvider(
      authConfig({ jwksCacheSeconds: 0 }),
    );
    await expiring.getKeys();
    await expiring.getKeys();
    assert.equal(requests, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ------------------------------------------------------ unit: AuthService

test('auth service maps an active account to a principal and records activity', async () => {
  const accounts = new Map([['subject-active', account()]]);
  const persons = new Map([[PERSON_ACTIVE, person()]]);
  const resolver = buildResolver(accounts, persons);
  const service = new AuthService(
    authConfig(),
    new JwtVerifier(authConfig(), new FakeJwksProvider()),
    resolver,
  );

  const principal = await service.authenticate(
    signToken({ sub: 'subject-active' }),
  );

  assert.equal(principal.personnelNumber, '87001');
  assert.equal(principal.fullName, 'Budi Santoso');
  assert.equal(principal.accountStatus, 'ACTIVE');
  assert.equal(principal.personId, PERSON_ACTIVE);
  assert.equal(resolver.touchCalls.length, 1);
  assert.equal(resolver.touchCalls[0].personId, PERSON_ACTIVE);
});

test('auth service rejects unmapped, suspended and inactive identities', async () => {
  const accounts = new Map([
    ['subject-active', account()],
    ['subject-suspended', account({ status: 'SUSPENDED' })],
    ['subject-inactive-account', account({ status: 'INACTIVE' })],
    [
      'subject-inactive-person',
      account({
        externalAuthId: 'subject-inactive-person',
        personId: PERSON_INACTIVE,
      }),
    ],
    [
      'subject-orphan',
      account({ externalAuthId: 'subject-orphan', personId: PERSON_ORPHAN }),
    ],
  ]);
  const persons = new Map([
    [PERSON_ACTIVE, person()],
    [PERSON_INACTIVE, person({ id: PERSON_INACTIVE, status: 'INACTIVE' })],
  ]);
  const service = new AuthService(
    authConfig(),
    new JwtVerifier(authConfig(), new FakeJwksProvider()),
    buildResolver(accounts, persons),
  );

  // Valid signature, but no LMS account is linked to the subject.
  await assert.rejects(
    service.authenticate(signToken({ sub: 'never-linked' })),
    (error) => error.getStatus() === 401,
  );
  // Account lifecycle blocks the caller.
  await assert.rejects(
    service.authenticate(signToken({ sub: 'subject-suspended' })),
    (error) => error.getStatus() === 403,
  );
  await assert.rejects(
    service.authenticate(signToken({ sub: 'subject-inactive-account' })),
    (error) => error.getStatus() === 403,
  );
  // Person lifecycle blocks the caller.
  await assert.rejects(
    service.authenticate(signToken({ sub: 'subject-inactive-person' })),
    (error) => error.getStatus() === 403,
  );
  // Dangling account must not authenticate.
  await assert.rejects(
    service.authenticate(signToken({ sub: 'subject-orphan' })),
    (error) => error.getStatus() === 401,
  );
});

test('auth service throttles last-login bookkeeping and fails closed without config', async () => {
  const recent = new Date(Date.now() - 10_000);
  const accounts = new Map([
    ['subject-active', account({ lastLoginAt: recent })],
  ]);
  const resolver = buildResolver(
    accounts,
    new Map([[PERSON_ACTIVE, person()]]),
  );
  const service = new AuthService(
    authConfig({ lastLoginThrottleSeconds: 300 }),
    new JwtVerifier(authConfig(), new FakeJwksProvider()),
    resolver,
  );
  await service.authenticate(signToken({ sub: 'subject-active' }));
  assert.equal(
    resolver.touchCalls.length,
    0,
    'recent activity must not re-write',
  );

  const unconfigured = new AuthService(
    null,
    new JwtVerifier(null, new FakeJwksProvider()),
    resolver,
  );
  await assert.rejects(
    unconfigured.authenticate(signToken({ sub: 'subject-active' })),
    (error) => error.getStatus() === 401,
  );
});

// ------------------------------------------------------------- configuration

test('auth configuration is derived, validated and never silently partial', () => {
  const { loadAuthConfig } = require('../dist/auth/auth.config');

  // Nothing configured: authentication is simply absent, not misconfigured.
  assert.deepEqual(loadAuthConfig({}), { config: null, errors: [] });

  // The JWKS endpoint is derived from the issuer.
  const derived = loadAuthConfig({
    KEYCLOAK_ISSUER: `${ISSUER}/`,
    KEYCLOAK_AUDIENCE: AUDIENCE,
  });
  assert.deepEqual(derived.errors, []);
  assert.equal(derived.config.jwksUri, JWKS_URI);
  assert.equal(derived.config.clockSkewSeconds, 30);
  assert.equal(derived.config.jwksCacheSeconds, 300);
  assert.equal(derived.config.lastLoginThrottleSeconds, 300);

  // An explicit JWKS URI wins, and numeric overrides are honoured.
  const explicit = loadAuthConfig({
    KEYCLOAK_ISSUER: ISSUER,
    KEYCLOAK_AUDIENCE: AUDIENCE,
    KEYCLOAK_JWKS_URI: 'https://keys.test/certs',
    AUTH_CLOCK_SKEW_SECONDS: '60',
    AUTH_LAST_LOGIN_THROTTLE_SECONDS: '0',
  });
  assert.equal(explicit.config.jwksUri, 'https://keys.test/certs');
  assert.equal(explicit.config.clockSkewSeconds, 60);
  assert.equal(explicit.config.lastLoginThrottleSeconds, 0);

  // Partial or malformed configuration is reported, never half-applied.
  const missingAudience = loadAuthConfig({ KEYCLOAK_ISSUER: ISSUER });
  assert.equal(missingAudience.config, null);
  assert.match(missingAudience.errors.join(' '), /KEYCLOAK_AUDIENCE/);

  const notAUrl = loadAuthConfig({
    KEYCLOAK_ISSUER: 'keycloak.local',
    KEYCLOAK_AUDIENCE: AUDIENCE,
  });
  assert.equal(notAUrl.config, null);
  assert.match(notAUrl.errors.join(' '), /absolute http\(s\) URL/);

  const badNumber = loadAuthConfig({
    KEYCLOAK_ISSUER: ISSUER,
    KEYCLOAK_AUDIENCE: AUDIENCE,
    AUTH_CLOCK_SKEW_SECONDS: '-5',
  });
  assert.equal(badNumber.config, null);
  assert.match(badNumber.errors.join(' '), /AUTH_CLOCK_SKEW_SECONDS/);
});

test('a production instance refuses to start without authentication configuration', async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_AUDIENCE: process.env.KEYCLOAK_AUDIENCE,
  };

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.KEYCLOAK_ISSUER;
    delete process.env.KEYCLOAK_AUDIENCE;
    await assert.rejects(createApp({ docsEnabled: false }), /authentication/i);

    // Half-configured is rejected too.
    process.env.KEYCLOAK_ISSUER = ISSUER;
    await assert.rejects(
      createApp({ docsEnabled: false }),
      /KEYCLOAK_AUDIENCE/,
    );
  } finally {
    if (previous.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.NODE_ENV;
    if (previous.KEYCLOAK_ISSUER === undefined)
      delete process.env.KEYCLOAK_ISSUER;
    else process.env.KEYCLOAK_ISSUER = previous.KEYCLOAK_ISSUER;
    if (previous.KEYCLOAK_AUDIENCE === undefined)
      delete process.env.KEYCLOAK_AUDIENCE;
    else process.env.KEYCLOAK_AUDIENCE = previous.KEYCLOAK_AUDIENCE;
  }
});

// ------------------------------------------------------------- HTTP boundary

async function startApp({ accounts, persons, authOverrides } = {}) {
  const accountMap = accounts ?? new Map([['subject-active', account()]]);
  const personMap = persons ?? new Map([[PERSON_ACTIVE, person()]]);
  const jwks = new FakeJwksProvider();
  const resolver = buildResolver(accountMap, personMap);

  const app = await createApp({
    authConfig: authConfig(authOverrides),
    jwksProvider: jwks,
    identityResolver: resolver,
  });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl(), resolver };
}

test('protected routes require a bearer token and reject invalid ones', async () => {
  const { app, base } = await startApp();
  try {
    const anonymous = await fetch(`${base}/api/v1/persons`);
    assert.equal(anonymous.status, 401);

    const wrongScheme = await fetch(`${base}/api/v1/persons`, {
      headers: {
        authorization: `Basic ${Buffer.from('a:b').toString('base64')}`,
      },
    });
    assert.equal(wrongScheme.status, 401);

    const expired = await fetch(`${base}/api/v1/persons`, {
      headers: {
        authorization: `Bearer ${signToken({ sub: 'subject-active' }, { now: Date.now() - 3_600_000 })}`,
      },
    });
    assert.equal(expired.status, 401);

    const forged = await fetch(`${base}/api/v1/persons`, {
      headers: {
        authorization: `Bearer ${signToken({ sub: 'subject-active' }, { alg: 'HS256' })}`,
      },
    });
    assert.equal(forged.status, 401);

    const unmapped = await fetch(`${base}/api/v1/persons`, {
      headers: {
        authorization: `Bearer ${signToken({ sub: 'no-such-subject' })}`,
      },
    });
    assert.equal(unmapped.status, 401);
  } finally {
    await app.close();
  }
});

test('GET /api/v1/me returns the current user context and leaves health public', async () => {
  const { app, base, resolver } = await startApp();
  try {
    assert.equal((await fetch(`${base}/api/v1/health`)).status, 200);

    const response = await fetch(`${base}/api/v1/me`, {
      headers: {
        authorization: `Bearer ${signToken({ sub: 'subject-active' })}`,
      },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, {
      accountId: body.accountId,
      personId: PERSON_ACTIVE,
      personnelNumber: '87001',
      fullName: 'Budi Santoso',
      username: 'budi.santoso',
      email: 'budi.santoso@polri.go.id',
      accountStatus: 'ACTIVE',
    });
    assert.equal(typeof body.accountId, 'string');
    // Identity only: permissions remain an LMS concern in later tasks.
    assert.equal('permissions' in body, false);
    assert.equal('roles' in body, false);

    const anonymous = await fetch(`${base}/api/v1/me`);
    assert.equal(anonymous.status, 401);
    assert.equal(resolver.touchCalls.length, 1);
  } finally {
    await app.close();
  }
});

test('suspended and inactive persons are rejected over HTTP with 403', async () => {
  const accounts = new Map([
    [
      'subject-suspended',
      account({ externalAuthId: 'subject-suspended', status: 'SUSPENDED' }),
    ],
    [
      'subject-inactive-person',
      account({
        externalAuthId: 'subject-inactive-person',
        personId: PERSON_INACTIVE,
      }),
    ],
  ]);
  const persons = new Map([
    [PERSON_ACTIVE, person()],
    [PERSON_INACTIVE, person({ id: PERSON_INACTIVE, status: 'INACTIVE' })],
  ]);
  const { app, base } = await startApp({ accounts, persons });
  try {
    for (const subject of ['subject-suspended', 'subject-inactive-person']) {
      const response = await fetch(`${base}/api/v1/me`, {
        headers: { authorization: `Bearer ${signToken({ sub: subject })}` },
      });
      assert.equal(response.status, 403, `${subject} must be forbidden`);
    }
  } finally {
    await app.close();
  }
});

test('auth endpoints are documented and no credential storage is exposed', async () => {
  const { app, base } = await startApp();
  try {
    const spec = await (await fetch(`${base}/api/v1/docs-json`)).json();
    assert.ok(spec.paths['/api/v1/me'].get);
    assert.ok(spec.paths['/api/v1/health'].get);
    assert.ok(spec.components.securitySchemes.bearer);

    const meSchema = spec.components.schemas.CurrentUserResponseDto;
    assert.ok(!('permissions' in meSchema.properties));
    assert.ok(!('password' in meSchema.properties));

    const response = await fetch(`${base}/api/v1/me`, {
      headers: {
        authorization: `Bearer ${signToken({ sub: 'subject-active' }, { kid: 'rotated-key' })}`,
      },
    });
    assert.equal(response.status, 401);
  } finally {
    await app.close();
  }
});

test('guard wiring is exported for reuse by later modules', async () => {
  assert.equal(typeof JwtAuthGuard, 'function');
  const { createApp: create } = require('../dist/app');
  const app = await create({
    authConfig: null,
    jwksProvider: new FakeJwksProvider(),
    identityResolver: buildResolver(new Map(), new Map()),
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  try {
    // Unconfigured authentication must fail closed, never fall open.
    assert.equal((await fetch(`${base}/api/v1/persons`)).status, 401);
    assert.equal((await fetch(`${base}/api/v1/health`)).status, 200);
  } finally {
    await app.close();
  }
});
