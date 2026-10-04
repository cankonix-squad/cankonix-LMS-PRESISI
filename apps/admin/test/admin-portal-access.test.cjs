'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * TASK-009AO — Admin portal access boundary.
 *
 * Before this task the Admin portal had NO backend authorization boundary: the
 * gate was `hasAdminSession()`, which only asked "is there a cookie?". Any
 * Keycloak identity — an educator with an ACTIVE PENGAJAR assignment, for
 * example — holds a perfectly valid token and would therefore open the Admin UI;
 * only the per-page domain permissions stopped them, and `/` stopped nobody.
 *
 * The replacement asks the LMS, on every request, whether the account holds
 * `portal.admin.access`. These tests lock down the parts a regression would
 * silently break: the LMS is the decider, the removal of the cookie gate, the
 * distinction between a page gate (navigates) and an in-component gate (returns a
 * state), and the seeded permission/grant contract.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadSrcModule, setSessionCookie } = require('./tsx-harness.cjs');

const api = loadSrcModule('lib/api.ts');

const SRC_ROOT = path.join(__dirname, '..', 'src');

/** Pages that gate themselves and then redirect. */
const GATED_PAGES = [
  'app/page.tsx',
  'app/akun-pengguna/page.tsx',
  'app/data-individu/page.tsx',
  'app/peran-hak-akses/page.tsx',
  'app/penugasan/page.tsx',
  'app/sertifikat/page.tsx',
  'app/system-health/page.tsx',
  'app/template-sertifikat/page.tsx',
  'app/tugas/page.tsx',
];

/** Catch the redirect sentinel Next throws, so a gate can be asserted. */
async function captureRedirect(fn) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error && error.digest
      ? error.digest
      : String(error && error.message);
  }
}

test('the portal boundary is a permission code, not a role name', () => {
  // Whether a portal boundary is `<domain>.<resource>.<action>` compiled in as
  // data, or a role name checked in a branch, is the difference between
  // Permission + Scope and role-string authorization. This pins the former.
  assert.equal(api.ADMIN_PORTAL_PERMISSION, 'portal.admin.access');
});

test('an absent session is a state for the in-component gate, never a throw', async () => {
  // dashboard.tsx renders `<LoginRequiredState />` in this situation. A throw
  // here would replace that fallback with an unhandled navigation.
  setSessionCookie(undefined);
  assert.equal(await api.hasAdminPortalAccess(), false);
});

test('an absent session navigates the page gate to login', async () => {
  setSessionCookie(undefined);
  const digest = await captureRedirect(() => api.requireAdminPortalAccess());
  assert.ok(digest, 'the page gate must navigate when there is no session');
  assert.match(digest, /\/login/);
});

test('a refusal is routed by reason, never silently bounced to login', () => {
  // "Not signed in" and "signed in but not an Admin" are different problems and
  // must not be conflated, or an unauthorized operator would loop on login.
  assert.equal(api.denialRedirect('NO_SESSION'), '/login');
  assert.equal(api.denialRedirect('UNAUTHENTICATED'), '/login');
  assert.equal(api.denialRedirect('DENIED'), '/akses-ditolak?reason=denied');
  assert.equal(
    api.denialRedirect('UNAVAILABLE'),
    '/akses-ditolak?reason=unavailable',
  );
});

test('an untrusted ?reason= cannot invent a denial state', () => {
  assert.equal(api.toDenialReason('denied'), 'DENIED');
  assert.equal(api.toDenialReason('no_session'), 'NO_SESSION');
  assert.equal(api.toDenialReason('unavailable'), 'UNAVAILABLE');
  // Anything else narrows to the honest default.
  assert.equal(api.toDenialReason('<script>'), 'DENIED');
  assert.equal(api.toDenialReason(undefined), 'DENIED');
  assert.equal(api.toDenialReason(['denied', 'no_session']), 'DENIED');
});

test('every gated page asks the LMS, and none still tests for a cookie', () => {
  for (const relative of GATED_PAGES) {
    const source = fs.readFileSync(path.join(SRC_ROOT, relative), 'utf8');
    assert.match(
      source,
      /await requireAdminPortalAccess\(\)/,
      `${relative} must call the portal gate`,
    );
    assert.doesNotMatch(
      source,
      /hasAdminSession/,
      `${relative} must not fall back to the cookie-presence check`,
    );
    assert.doesNotMatch(
      source,
      /from 'next\/navigation'/,
      `${relative} must not keep an unused redirect import after the gate change`,
    );
  }
});

test('the dashboard uses the non-navigating gate', () => {
  // Regression guard for the subtle one: the dashboard branches in-component to
  // render LoginRequiredState, so it must NOT CALL the redirecting gate. Only
  // the call is asserted (the source may still mention the name in a comment).
  const source = fs.readFileSync(
    path.join(SRC_ROOT, 'features/foundation/dashboard.tsx'),
    'utf8',
  );
  assert.match(source, /await hasAdminPortalAccess\(\)/);
  assert.doesNotMatch(source, /await requireAdminPortalAccess\(/);
  assert.doesNotMatch(source, /hasAdminSession/);
});

test('the Admin gate and the backend catalogue name the same permission', () => {
  // Two files hold this code: the Admin app asks about it, the backend seeds it.
  // A silent divergence would make the portal permanently unreachable. The
  // backend migration/catalogue contract itself is asserted in the API suite.
  const backend = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      'api',
      'src',
      'authorization',
      'portal-permissions.ts',
    ),
    'utf8',
  );
  assert.match(backend, /'portal\.admin\.access'/);
  assert.match(backend, /PORTAL_PERMISSIONS/);
});
