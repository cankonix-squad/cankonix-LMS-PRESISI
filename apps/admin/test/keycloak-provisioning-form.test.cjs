'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Regression tests for the Admin Keycloak provisioning flow.
 *
 * Defect being locked down: the Keycloak panel rendered its `<form>` elements
 * INSIDE the account `<form>`. HTML forbids a nested form, so the browser dropped
 * the inner form while parsing; the `Buat akun Keycloak` submit was then handled
 * by the OUTER account form, the provisioning action never ran, the status stayed
 * `NOT_PROVISIONED`, and the console reported `A React form was unexpectedly
 * submitted`.
 *
 * The drawer now lives in the dedicated Akun Pengguna workspace, so these tests
 * compose that REAL workspace and drive the REAL server actions through
 * `tsx-harness.cjs`. They fail if the forms become nested again OR if a click
 * stops invoking provisioning and surfacing its success/error message.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  React,
  loadSrcModule,
  installDispatcher,
  renderTree,
  walk,
  hasNestedForm,
  setApiStub,
  setAccessToken,
} = require('./tsx-harness.cjs');

const dispatcher = installDispatcher();

const accountModule = loadSrcModule('features/foundation/account-management.tsx');
const actions = loadSrcModule('features/foundation/keycloak-actions.ts');
const { AccountWorkspace } = accountModule;

const PERSON_ID = 'person-01102601';

/** A `NOT_PROVISIONED` account, i.e. the reported production state. */
function notProvisioned(overrides = {}) {
  return {
    personId: PERSON_ID,
    userAccountId: 'account-1',
    status: 'NOT_PROVISIONED',
    summary: 'Belum terhubung ke Keycloak.',
    readyToLogin: false,
    availableActions: ['PROVISION', 'LINK_EXISTING'],
    externalAuthId: null,
    keycloakUsername: 'ui-pengajar-01102601',
    provisioningConfigured: true,
    ...overrides,
  };
}

const person = {
  id: PERSON_ID,
  personnelNumber: '01102601',
  fullName: 'Ui Pengajar',
  rank: null,
  title: null,
  email: 'ui.pengajar@example.id',
  phone: null,
  status: 'ACTIVE',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const row = {
  account: {
    id: 'account-1',
    personId: PERSON_ID,
    person,
    username: 'ui-pengajar-01102601',
    email: 'ui.pengajar@example.id',
    externalAuthId: null,
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  keycloak: notProvisioned(),
};

/**
 * Render the real workspace with the edit drawer already open.
 *
 * `AccountWorkspace`'s single `useState` is the drawer state; queueing it makes
 * `AccountForm` mount, which is where the nested form defect lived.
 */
function renderAccountDrawer(target = row) {
  dispatcher.reset();
  dispatcher.queueState({ kind: 'edit', row: target });
  return renderTree(
    React.createElement(AccountWorkspace, {
      result: { data: { data: [target.account], total: 1 }, error: null },
      filters: { page: 1, limit: 25 },
      rows: [target],
      personOptions: [],
    }),
  );
}

/** Find the form whose submit button carries the given label. */
function formWithButton(tree, label) {
  for (const node of walk(tree)) {
    if (node.type !== 'form') continue;
    for (const child of walk(node)) {
      if (child.type === 'button' && child.props?.children === label) {
        return node;
      }
    }
  }
  return null;
}

test('Akun Pengguna drawer never nests a form (regression)', () => {
  const tree = renderAccountDrawer();

  const accountForm = formWithButton(tree, 'Simpan Akun Pengguna');
  const provisioningForm = formWithButton(tree, 'Buat akun Keycloak');

  assert.ok(accountForm, 'the account form must render');
  assert.ok(provisioningForm, 'the provisioning form must render');

  // Before the fix the provisioning form lived inside the account form, so the
  // browser discarded it and the button submitted the account form instead.
  assert.notEqual(
    accountForm,
    provisioningForm,
    'provisioning must be a sibling form, not the account form',
  );
  assert.equal(
    hasNestedForm(accountForm),
    false,
    'the account form must not contain another form',
  );
  assert.equal(
    hasNestedForm(tree),
    false,
    'no form in the drawer may contain another form',
  );
  assert.equal(
    provisioningForm.props.action,
    actions.provisionKeycloakUserAction,
  );
});

test('every drawer form posts to its own action', () => {
  const tree = renderAccountDrawer();
  const labelToAction = new Map();
  for (const label of [
    'Simpan Akun Pengguna',
    'Buat akun Keycloak',
    'Muat ulang status login',
  ]) {
    const form = formWithButton(tree, label);
    labelToAction.set(label, form && form.props.action);
  }

  assert.equal(
    labelToAction.get('Simpan Akun Pengguna').name,
    'updatePersonAccountAction',
  );
  assert.equal(
    labelToAction.get('Buat akun Keycloak').name,
    'provisionKeycloakUserAction',
  );
  assert.equal(
    labelToAction.get('Muat ulang status login').name,
    'refreshKeycloakStatusAction',
  );
});

test('clicking Buat akun Keycloak calls provisioning and shows the API success', async () => {
  setAccessToken('access-token');
  let calls = 0;
  setApiStub({
    persons: {
      async provisionKeycloakUser(personId) {
        calls += 1;
        assert.equal(personId, PERSON_ID);
        return {
          ok: true,
          data: {
            success: true,
            message: 'User Keycloak berhasil dibuat dan dihubungkan.',
            provisioning: notProvisioned({
              status: 'ACTIVATION_REQUIRED',
              readyToLogin: false,
              externalAuthId: 'kc-subject-1',
              availableActions: ['SET_PASSWORD'],
            }),
          },
        };
      },
    },
  });

  const form = formWithButton(renderAccountDrawer(), 'Buat akun Keycloak');
  const formData = new FormData();
  formData.set('personId', PERSON_ID);

  const state = await form.props.action({ ok: false, message: null }, formData);

  assert.equal(calls, 1, 'provisioning must be called exactly once');
  assert.equal(state.ok, true);
  assert.equal(state.message, 'User Keycloak berhasil dibuat dan dihubungkan.');
  assert.equal(state.result.success, true);
  assert.equal(state.result.provisioning.status, 'ACTIVATION_REQUIRED');
  assert.equal(state.result.provisioning.externalAuthId, 'kc-subject-1');
});

test('a failed provisioning API call surfaces an error message, not silent success', async () => {
  setAccessToken('access-token');
  setApiStub({
    persons: {
      async provisionKeycloakUser() {
        return { ok: false, status: 409, message: 'Username sudah digunakan.' };
      },
    },
  });

  const form = formWithButton(renderAccountDrawer(), 'Buat akun Keycloak');
  const formData = new FormData();
  formData.set('personId', PERSON_ID);

  const state = await form.props.action({ ok: false, message: null }, formData);

  assert.equal(state.ok, false);
  assert.equal(state.message, 'Username sudah digunakan.');
  assert.equal(state.result, null);
});

test('an expired session blocks provisioning before any API call', async () => {
  setAccessToken(null);
  let calls = 0;
  setApiStub({
    persons: {
      async provisionKeycloakUser() {
        calls += 1;
        return { ok: true, data: {} };
      },
    },
  });

  const formData = new FormData();
  formData.set('personId', PERSON_ID);
  const state = await actions.provisionKeycloakUserAction(
    { ok: false, message: null, result: null },
    formData,
  );

  assert.equal(calls, 0, 'no provisioning request without a session');
  assert.equal(state.ok, false);
  assert.match(state.message, /Sesi berakhir/);
});

test('a missing personId is rejected before any API call', async () => {
  setAccessToken('access-token');
  let calls = 0;
  setApiStub({
    persons: {
      async provisionKeycloakUser() {
        calls += 1;
        return { ok: true, data: {} };
      },
    },
  });

  const state = await actions.provisionKeycloakUserAction(
    { ok: false, message: null, result: null },
    new FormData(),
  );

  assert.equal(calls, 0);
  assert.equal(state.ok, false);
  assert.match(state.message, /wajib dipilih/);
});
