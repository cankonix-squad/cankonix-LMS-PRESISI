'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Regression tests for the Data Individu / Akun Pengguna separation.
 *
 * The two screens used to be one page ("Personel") where a person form also
 * carried login fields and an account could only be created as a side effect of
 * creating a person. These tests lock down the properties that make the split
 * real and not just cosmetic:
 *
 * - creating a person cannot create a login (no account fields in that form),
 * - an account form never re-types identity (it selects an existing person),
 * - the two statuses are independent and never inferred from each other,
 * - an identity audit reports ambiguity instead of merging anybody.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  React,
  loadSrcModule,
  installDispatcher,
  renderTree,
  walk,
  allForms,
} = require('./tsx-harness.cjs');

const dispatcher = installDispatcher();

const personModule = loadSrcModule('features/foundation/person-management.tsx');
const accountModule = loadSrcModule(
  'features/foundation/account-management.tsx',
);
const display = loadSrcModule('features/foundation/display.ts');
const { PersonWorkspace } = personModule;
const { AccountWorkspace } = accountModule;

const PERSON_ID = '10000000-0000-4000-8000-000000000001';

const person = {
  id: PERSON_ID,
  personnelNumber: '87001',
  fullName: 'Ani Wijaya',
  rank: null,
  title: null,
  email: 'ani@polri.go.id',
  phone: null,
  status: 'ACTIVE',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const account = {
  id: 'account-1',
  personId: PERSON_ID,
  person,
  username: 'ani',
  email: 'ani@polri.go.id',
  externalAuthId: null,
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function renderPersonWorkspace(overrides = {}) {
  dispatcher.reset();
  return renderTree(
    React.createElement(PersonWorkspace, {
      result: { data: { data: [person], total: 1 }, error: null },
      filters: { page: 1, limit: 25 },
      rows: [
        {
          person,
          account: null,
          accountError: null,
          placements: [],
        },
      ],
      audit: {
        data: {
          totalPersons: 1,
          personsWithAccount: 0,
          personsWithoutAccount: 1,
          orphanedAccounts: 0,
          personsWithMultipleAccounts: 0,
          ambiguities: [],
        },
        error: null,
      },
      ...overrides,
    }),
  );
}

function renderAccountWorkspace(overrides = {}) {
  dispatcher.reset();
  return renderTree(
    React.createElement(AccountWorkspace, {
      result: { data: { data: [account], total: 1 }, error: null },
      filters: { page: 1, limit: 25 },
      rows: [{ account, keycloak: null }],
      personOptions: [],
      ...overrides,
    }),
  );
}

/**
 * Every `name` attribute on a form control anywhere in the tree.
 *
 * Includes `<select>`, because the account form chooses its owner from a
 * picker rather than typing an id.
 */
function inputNames(tree) {
  const names = [];
  for (const node of walk(tree)) {
    if (node.type !== 'input' && node.type !== 'select') continue;
    names.push(node.props.name);
  }
  return names;
}

/**
 * Every navigation target in the tree.
 *
 * `next/link` is a forwardRef object, not the string `'a'`, so links are
 * collected by their `href` prop instead of by element type. That covers both
 * `<Link>` and a plain `<a>`.
 */
function hrefsOf(tree) {
  const hrefs = [];
  for (const node of walk(tree)) {
    const href = node.props && node.props.href;
    if (typeof href === 'string') hrefs.push(href);
  }
  return hrefs;
}

/** All text content in the tree, joined — used to assert on screen copy. */
function textOf(tree) {
  const parts = [];
  for (const node of walk(tree)) {
    const children = node.props && node.props.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      if (typeof child === 'string') parts.push(child);
    }
  }
  return parts.join(' ');
}

test('Data Individu list has no login column and links to the account menu', () => {
  const tree = renderPersonWorkspace();
  const text = textOf(tree);

  // The list is an identity directory: the owner's identity plus a read-only
  // pointer to the account screen.
  assert.match(text, /Nama/);
  assert.match(text, /NRP\/NIP/);
  assert.match(text, /Akun pengguna/);
  assert.match(text, /Status individu/);
  assert.doesNotMatch(text, /Status akun/);
  assert.doesNotMatch(text, /Email login/);

  const links = hrefsOf(tree);
  assert.ok(links.some((href) => href === `/data-individu/${PERSON_ID}`));
  // Identity navigation only: account editing happens on its own route.
  assert.ok(links.some((href) => href.startsWith('/akun-pengguna')));
  assert.ok(links.every((href) => !href.startsWith('/personel')));
});

test('creating a person has no account fields at all', () => {
  dispatcher.reset();
  dispatcher.queueState({ kind: 'create' });
  const tree = renderTree(
    React.createElement(PersonWorkspace, {
      result: { data: { data: [], total: 0 }, error: null },
      filters: { page: 1, limit: 25 },
      rows: [],
      audit: { data: null, error: 'audit unavailable' },
    }),
  );

  const names = inputNames(tree);
  // Identity only. A person can be saved without ever having a login.
  assert.ok(names.includes('personnelNumber'));
  assert.ok(names.includes('fullName'));
  assert.ok(names.includes('email'));
  assert.ok(!names.includes('username'));
  assert.ok(!names.includes('accountEmail'));
  assert.ok(!names.includes('accountStatus'));
  assert.ok(!names.includes('externalAuthId'));
  assert.ok(!names.includes('password'));

  const text = textOf(tree);
  assert.match(text, /Data individu dapat disimpan tanpa akun pengguna/);
  // The audit read failed: say so instead of rendering a clean bill of health.
  assert.doesNotMatch(text, /Tidak ada identitas ambigu/);
});

test('account creation selects an existing person instead of re-typing identity', () => {
  dispatcher.reset();
  dispatcher.queueState({ kind: 'create' });
  const tree = renderTree(
    React.createElement(AccountWorkspace, {
      result: { data: { data: [], total: 0 }, error: null },
      filters: { page: 1, limit: 25 },
      rows: [],
      personOptions: [person],
    }),
  );

  const names = inputNames(tree);
  // The link is by id: the person already exists and is chosen, not recreated.
  assert.ok(names.includes('personId'));
  assert.ok(names.includes('username'));
  assert.ok(names.includes('accountEmail'));
  assert.ok(names.includes('accountStatus'));
  // Identity is NOT an input on this form — it is rendered from the selection.
  assert.ok(!names.includes('fullName'));
  assert.ok(!names.includes('personnelNumber'));
  assert.ok(!names.includes('password'));

  const text = textOf(tree);
  assert.match(text, /Identitas orang diambil dari Data Individu/);
  assert.match(text, /Kata sandi tidak disimpan di LMS/);
  // The owner's identity is displayed read-only beside the picker.
  assert.match(text, /Ani Wijaya/);
  assert.match(text, /87001/);
});

test('account creation is blocked with guidance when every person already has an account', () => {
  dispatcher.reset();
  dispatcher.queueState({ kind: 'create' });
  const tree = renderTree(
    React.createElement(AccountWorkspace, {
      result: { data: { data: [], total: 0 }, error: null },
      filters: { page: 1, limit: 25 },
      rows: [],
      personOptions: [],
    }),
  );

  const text = textOf(tree);
  assert.match(text, /Semua data individu sudah memiliki akun/);
  assert.match(text, /Tambahkan data\s+individu lebih dahulu/);
  // No link form exists at all: an account cannot be invented without a person,
  // and the toolbar's read-only search form is not an account form.
  assert.ok(!inputNames(tree).includes('personId'));
  assert.equal(
    [...allForms(tree)].filter((form) => inputNames(form).includes('personId'))
      .length,
    0,
  );
});

test('account status and person status are labelled separately and never merged', () => {
  const suspended = {
    ...account,
    status: 'SUSPENDED',
    person: { ...person, status: 'INACTIVE' },
  };
  const tree = renderAccountWorkspace({
    result: { data: { data: [suspended], total: 1 }, error: null },
    rows: [{ account: suspended, keycloak: null }],
  });

  const text = textOf(tree);
  // Two independent columns, each with its own vocabulary.
  assert.match(text, /Status akun/);
  assert.match(text, /Status individu/);
  assert.match(text, /Ditangguhkan/);
  assert.match(text, /Nonaktif/);

  assert.equal(display.accountStatusLabel('SUSPENDED'), 'Ditangguhkan');
  assert.equal(display.accountStatusLabel('INACTIVE'), 'Nonaktif');
  assert.equal(display.accountStatusLabel('ACTIVE'), 'Aktif');
  assert.equal(display.personStatusLabel('INACTIVE'), 'Nonaktif');
  // Deactivating a person folds into the same word as a disabled account, but
  // the two helpers stay separate so neither can be derived from the other.
  assert.notEqual(display.accountStatusLabel, display.personStatusLabel);
});

test('a person without an account is shown honestly, and a denied read is not', () => {
  const noAccount = personModule.accountLabel(null, null);
  const denied = personModule.accountLabel(null, {
    message: 'permission user_account.read required',
    status: 403,
  });
  const linked = personModule.accountLabel(account, null);

  assert.match(textOf(renderTree(noAccount)), /Belum memiliki akun/);
  // A 403 must never render as "no account": that would push an operator to
  // create a second account for someone who already has one.
  const deniedText = textOf(renderTree(denied));
  assert.match(deniedText, /Akses akun ditolak/);
  assert.doesNotMatch(deniedText, /Belum memiliki akun/);
  assert.match(deniedText, /HTTP 403/);
  assert.match(textOf(renderTree(linked)), /Aktif/);
});

test('identity audit reports ambiguity with links and merges nobody', () => {
  const tree = renderPersonWorkspace({
    audit: {
      data: {
        totalPersons: 3,
        personsWithAccount: 1,
        personsWithoutAccount: 2,
        orphanedAccounts: 0,
        personsWithMultipleAccounts: 0,
        ambiguities: [
          {
            kind: 'DUPLICATE_NAME',
            key: 'siti aminah',
            personIds: ['a-1', 'a-2'],
            personLabels: ['Siti Aminah (87001)', 'Siti Aminah (87002)'],
            message: '2 data individu memiliki nama lengkap yang sama.',
          },
        ],
      },
      error: null,
    },
  });

  const text = textOf(tree);
  assert.match(text, /Pemeriksaan integritas identitas/);
  assert.match(text, /Hanya melaporkan/);
  assert.match(text, /Nama lengkap sama/);
  assert.match(text, /Perlu ditinjau/);

  const links = hrefsOf(tree);
  // Both candidates are linked so a human can compare them; the audit picks
  // no survivor and the UI offers no merge action.
  assert.ok(links.includes('/data-individu/a-1'));
  assert.ok(links.includes('/data-individu/a-2'));
  assert.equal(
    display.identityAmbiguityLabel('DUPLICATE_NAME'),
    'Nama lengkap sama',
  );
  assert.equal(
    display.identityAmbiguityLabel('ACCOUNT_EMAIL_MISMATCH'),
    'Email akun berbeda',
  );
});

test('the two workspaces navigate to different routes with no duplicates', () => {
  const personTree = renderPersonWorkspace();
  const accountTree = renderAccountWorkspace();

  const pathsOf = (tree) =>
    new Set(hrefsOf(tree).map((href) => href.split('?')[0]));

  const personHrefs = pathsOf(personTree);
  const accountHrefs = pathsOf(accountTree);

  // Each directory is reachable from itself, and the account screen never
  // links back into the identity directory's own list route.
  assert.ok(personHrefs.has('/data-individu'));
  assert.ok(accountHrefs.has('/akun-pengguna'));
  assert.ok(!accountHrefs.has('/data-individu'));
  assert.ok(!accountHrefs.has('/personel'));

  // Cross-navigation from a person to their account is intentional, so the
  // separation is asserted on content instead: the identity screen has no
  // account list, and the account screen has no identity audit panel.
  const personText = textOf(personTree);
  const accountText = textOf(accountTree);
  assert.match(personText, /Pemeriksaan integritas identitas/);
  assert.doesNotMatch(accountText, /Pemeriksaan integritas identitas/);
  assert.doesNotMatch(accountText, /Status individu diubah melalui Edit/);
});

test('Data Induk navigation exposes Data Individu and Akun Pengguna as separate menus', () => {
  const shell = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'components',
      'admin-shell.tsx',
    ),
    'utf8',
  );

  assert.match(shell, /label: 'Data Induk'/);
  assert.match(shell, /label: 'Manajemen Akses'/);
  assert.match(shell, /href: '\/data-individu', label: 'Data Individu'/);
  assert.match(shell, /href: '\/akun-pengguna', label: 'Akun Pengguna'/);
  // The old single "Foundation" / "Personel" menu must not come back.
  assert.doesNotMatch(shell, /label: 'Foundation'/);
  assert.doesNotMatch(shell, /href: '\/personel'/);
});
