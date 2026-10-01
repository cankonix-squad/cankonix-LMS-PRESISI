'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSrcModule } = require('./tsx-harness.cjs');

const { GET } = loadSrcModule('app/api/auth/logout/route.ts');

test('logout clears local session and redirects through Keycloak SSO', async () => {
  const previousIssuer = process.env.LMS_OIDC_ISSUER;
  const previousClientId = process.env.LMS_OIDC_CLIENT_ID;
  process.env.LMS_OIDC_ISSUER = 'https://auth.example.test/realms/lemdiklat';
  process.env.LMS_OIDC_CLIENT_ID = 'lms-admin';
  try {
    const response = await GET(
      new Request('http://0.0.0.0:3000/api/auth/logout', {
        headers: {
          'x-forwarded-host': 'admin.example.test',
          'x-forwarded-proto': 'https',
        },
      }),
    );
    const location = new URL(response.headers.get('location'));
    assert.equal(
      location.origin + location.pathname,
      'https://auth.example.test/realms/lemdiklat/protocol/openid-connect/logout',
    );
    assert.equal(location.searchParams.get('client_id'), 'lms-admin');
    assert.equal(
      location.searchParams.get('post_logout_redirect_uri'),
      'https://admin.example.test/login',
    );
    const cookies = response.headers.getSetCookie().join(' ');
    for (const name of [
      'lms_access_token',
      'lms_refresh_token',
      'lms_oidc_state',
    ]) {
      assert.match(cookies, new RegExp(`${name}=;`));
    }
  } finally {
    if (previousIssuer === undefined) delete process.env.LMS_OIDC_ISSUER;
    else process.env.LMS_OIDC_ISSUER = previousIssuer;
    if (previousClientId === undefined) delete process.env.LMS_OIDC_CLIENT_ID;
    else process.env.LMS_OIDC_CLIENT_ID = previousClientId;
  }
});

test('logout still clears the local session when SSO is not configured', async () => {
  const previousIssuer = process.env.LMS_OIDC_ISSUER;
  const previousClientId = process.env.LMS_OIDC_CLIENT_ID;
  delete process.env.LMS_OIDC_ISSUER;
  delete process.env.LMS_OIDC_CLIENT_ID;
  try {
    const response = await GET(
      new Request('http://0.0.0.0:3000/api/auth/logout', {
        headers: {
          'x-forwarded-host': 'admin.example.test',
          'x-forwarded-proto': 'https',
        },
      }),
    );
    assert.equal(
      response.headers.get('location'),
      'https://admin.example.test/login',
    );
    assert.match(
      response.headers.getSetCookie().join(' '),
      /lms_access_token=;/,
    );
  } finally {
    if (previousIssuer === undefined) delete process.env.LMS_OIDC_ISSUER;
    else process.env.LMS_OIDC_ISSUER = previousIssuer;
    if (previousClientId === undefined) delete process.env.LMS_OIDC_CLIENT_ID;
    else process.env.LMS_OIDC_CLIENT_ID = previousClientId;
  }
});
