'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { loadSrcModule, renderTree, setApiStub } = require('./tsx-harness.cjs');
const { OrganizationWorkspace } = loadSrcModule(
  'features/foundation/organization-management.tsx',
);
function setup({ saving = false, ok = true } = {}) {
  const changes = [];
  const states = [
    [{ mode: 'create' }, (value) => changes.push(['drawer', value])],
    [
      { create: { code: 'DRAFT', name: 'Draf organisasi' } },
      (value) => changes.push(['drafts', value]),
    ],
    [saving, (value) => changes.push(['saving', value])],
    [null, (value) => changes.push(['notice', value])],
  ];
  let escape;
  global.document = {
    addEventListener: (_, fn) => {
      escape = fn;
    },
    removeEventListener() {},
  };
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = {
    useState: () => states.shift(),
    useContext: () => null,
    useRef: (initial) => ({ current: initial }),
    useId: () => 'test-organization-title',
    useMemo: (fn) => fn(),
    useEffect: (fn) => fn(),
    useActionState: (action, initial) => [initial, action, false],
  };
  setApiStub({
    organizations: {
      create: async () =>
        ok
          ? { ok: true, data: { name: 'Draf organisasi' } }
          : { ok: false, error: { message: 'Gagal' } },
    },
  });
  const tree = renderTree(
    React.createElement(OrganizationWorkspace, {
      result: { data: { data: [], total: 0 }, error: null },
      filters: { page: 1, limit: 25 },
      parentOptions: [],
    }),
  );
  const nodes = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node) return;
    nodes.push(node);
    walk(node.children);
  }
  walk(tree);
  return {
    changes,
    nodes,
    escape: () => escape({ key: 'Escape', preventDefault() {} }),
  };
}
test('Esc closes without clearing draft; reopening restores values', () => {
  const view = setup();
  view.escape();
  assert.deepEqual(view.changes, [['drawer', null]]);
  assert.equal(
    view.nodes.find((n) => n.props?.name === 'code').props.value,
    'DRAFT',
  );
});
test('Esc cannot close during save', () => {
  const view = setup({ saving: true });
  view.escape();
  assert.deepEqual(view.changes, []);
});
test('successful save clears only saved draft, closes drawer, and reports success', async () => {
  const view = setup();
  const form = view.nodes.find(
    (n) => n.type === 'form' && typeof n.props.action === 'function',
  );
  const data = new FormData();
  data.set('code', 'DRAFT');
  data.set('name', 'Draf organisasi');
  const state = await form.props.action({ ok: false, message: null }, data);
  assert.equal(state.ok, true);
  assert.ok(
    view.changes.some(([key, value]) => key === 'drawer' && value === null),
  );
  const clear = view.changes.find(([key]) => key === 'drafts')[1];
  assert.deepEqual(
    clear({ create: { code: 'DRAFT' }, other: { code: 'OTHER' } }),
    { other: { code: 'OTHER' } },
  );
});
test('failed save retains drawer and draft', async () => {
  const view = setup({ ok: false });
  const data = new FormData();
  data.set('code', 'DRAFT');
  data.set('name', 'Draf organisasi');
  await view.nodes
    .find((n) => n.type === 'form' && typeof n.props.action === 'function')
    .props.action({ ok: false, message: null }, data);
  assert.ok(view.changes.every(([key]) => key === 'saving'));
});
test('filter submits status and search to server with page reset', () => {
  const view = setup();
  const filter = view.nodes.find(
    (n) => n.type === 'form' && n.props.action === '/organisasi',
  );
  assert.ok(filter);
  assert.ok(
    view.nodes.some((n) => n.type === 'select' && n.props.name === 'status'),
  );
  assert.ok(view.nodes.some((n) => n.props?.name === 'search'));
  assert.ok(!view.nodes.some((n) => n.props?.name === 'page'));
});
