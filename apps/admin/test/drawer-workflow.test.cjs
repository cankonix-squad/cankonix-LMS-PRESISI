'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  React,
  loadSrcModule,
  installDispatcher,
  renderTree,
  walk,
} = require('./tsx-harness.cjs');
const { DrawerHost, DrawerWorkflowContext, useDrawerActionState } =
  loadSrcModule('components/admin/drawer-workflow.tsx');
const { EnterpriseDrawer } = loadSrcModule('components/admin/drawer.tsx');
const { FormActions } = loadSrcModule('components/admin/form.tsx');

// A stateful hook driver for the real host/action/keyboard handlers. It does not
// pretend to be browser DOM QA; that remains a separate runtime check.
function driver(component) {
  const slots = [];
  let cursor = 0;
  let context = null;
  const effects = [];
  function slot(initial) {
    const index = cursor++;
    if (!(index in slots))
      slots[index] = typeof initial === 'function' ? initial() : initial;
    return [
      slots[index],
      (value) => {
        slots[index] =
          typeof value === 'function' ? value(slots[index]) : value;
      },
    ];
  }
  return {
    render(props, value = null) {
      cursor = 0;
      context = value;
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H =
        {
          useState: slot,
          useRef: (initial) => slot(() => ({ current: initial }))[0],
          useContext: () => context,
          useId: () => slot('dialog-test')[0],
          useActionState: (action, initial) => [initial, action, false],
          useEffect: (fn, deps) => {
            const index = cursor++;
            const old = slots[index];
            if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
              old?.cleanup?.();
              slots[index] = { deps, cleanup: null };
              effects.push(() => {
                slots[index].cleanup = fn();
              });
            }
          },
        };
      const result = component(props);
      effects.splice(0).forEach((fn) => fn());
      return result;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
function rawNodes(element, output = []) {
  if (Array.isArray(element)) {
    element.forEach((child) => rawNodes(child, output));
    return output;
  }
  if (!element || typeof element !== 'object') return output;
  output.push(element);
  rawNodes(element.props?.children, output);
  return output;
}
function providers(tree) {
  return rawNodes(tree).filter(
    (n) => n.type === DrawerWorkflowContext.Provider,
  );
}
function hostFixture() {
  const host = driver(DrawerHost);
  let key = null;
  let child = null;
  let closeCount = 0;
  const onClose = () => {
    key = null;
    child = null;
    closeCount++;
  };
  return {
    host,
    open(next, node) {
      key = next;
      child = node;
      return this.render();
    },
    render() {
      return host.render({ activeKey: key, onClose, children: child });
    },
    closeCount: () => closeCount,
  };
}
function actionFor(workflow, action, options) {
  return driver(() =>
    useDrawerActionState(action, { ok: false, message: null }, options),
  ).render({}, workflow)[1];
}
const draftA = React.createElement(
  'form',
  null,
  React.createElement('input', { name: 'name', defaultValue: 'Draf A' }),
);
const draftB = React.createElement(
  'form',
  null,
  React.createElement('textarea', {
    name: 'description',
    defaultValue: 'Draf B',
  }),
);

test('closing/reopening and switching records retain distinct mounted drafts', () => {
  const fixture = hostFixture();
  let tree = fixture.open('create', draftA);
  providers(tree)[0].props.value.close();
  tree = fixture.render();
  assert.equal(providers(tree)[0].props.children.props.hidden, true);
  assert.equal(providers(tree)[0].props.children.props.inert, true);
  assert.equal(providers(tree)[0].props.children.props.children, draftA);
  tree = fixture.open('edit:B', draftB);
  assert.deepEqual(
    providers(tree).map((n) => n.key),
    ['create', 'edit:B'],
  );
  assert.equal(providers(tree)[0].props.children.props.children, draftA);
  assert.equal(providers(tree)[1].props.children.props.children, draftB);
  tree = fixture.open('create', draftA);
  assert.equal(providers(tree)[0].props.children.props.hidden, false);
  assert.equal(providers(tree)[1].props.children.props.hidden, true);
});

test('successful save returns to list, announces result, and removes only saved draft', async () => {
  const fixture = hostFixture();
  fixture.open('create', draftA);
  const tree = fixture.open('edit:B', draftB);
  const workflow = providers(tree)[1].props.value;
  const action = actionFor(workflow, async () => ({
    ok: true,
    message: 'Berhasil disimpan',
  }));
  const result = await action({ ok: false, message: null }, new FormData());
  assert.equal(result.ok, true);
  assert.equal(fixture.closeCount(), 1);
  const updated = fixture.render();
  assert.deepEqual(
    providers(updated).map((n) => n.key),
    ['create'],
  );
  assert.ok(rawNodes(updated).some((n) => n.props?.role === 'status'));
});

test('failed save keeps panel and input and does not announce success', async () => {
  const fixture = hostFixture();
  const tree = fixture.open('create', draftA);
  const action = actionFor(providers(tree)[0].props.value, async () => ({
    ok: false,
    message: 'Kode sudah dipakai',
  }));
  const result = await action({ ok: false, message: null }, new FormData());
  assert.equal(result.message, 'Kode sudah dipakai');
  assert.equal(fixture.closeCount(), 0);
  const updated = fixture.render();
  assert.equal(providers(updated)[0].props.children.props.children, draftA);
  assert.equal(providers(updated)[0].props.value.pending, false);
  assert.ok(!rawNodes(updated).some((n) => n.props?.role === 'status'));
});

test('pending save blocks duplicate submits, backdrop, X, cancel and Esc; disables fields', async () => {
  const fixture = hostFixture();
  let tree = fixture.open('create', draftA);
  let resolve;
  let calls = 0;
  const action = actionFor(providers(tree)[0].props.value, () => {
    calls++;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const initial = { ok: false, message: null };
  const promise = action(initial, new FormData());
  assert.equal(await action(initial, new FormData()), initial);
  assert.equal(calls, 1);
  tree = fixture.render();
  const workflow = providers(tree)[0].props.value;
  assert.equal(workflow.pending, true);
  const handlers = new Set();
  global.document = {
    activeElement: null,
    addEventListener: (_, fn) => handlers.add(fn),
    removeEventListener: (_, fn) => handlers.delete(fn),
  };
  const drawer = driver(EnterpriseDrawer);
  const drawerTree = drawer.render(
    {
      eyebrow: 'Tambah',
      title: 'Data',
      onClose: () => assert.fail('unguarded close'),
      children: draftA,
    },
    workflow,
  );
  for (const node of rawNodes(drawerTree).filter((n) => n.type === 'button')) {
    assert.equal(node.props.disabled, true);
    node.props.onClick();
  }
  const fieldset = rawNodes(drawerTree).find((n) => n.type === 'fieldset');
  assert.equal(fieldset.props.disabled, true);
  const cancel = rawNodes(
    driver(FormActions).render(
      {
        onCancel: () => assert.fail('unguarded cancel'),
        submitLabel: 'Simpan',
      },
      workflow,
    ),
  ).find((n) => n.type === 'button');
  assert.equal(cancel.props.disabled, true);
  cancel.props.onClick();
  handlers.forEach((handler) =>
    handler({ key: 'Escape', preventDefault() {} }),
  );
  assert.equal(fixture.closeCount(), 0);
  resolve({ ok: false, message: 'Gagal' });
  await promise;
  providers(fixture.render())[0].props.value.close();
  assert.equal(fixture.closeCount(), 1);
  drawer.unmount();
  assert.equal(handlers.size, 0);
});

test('React form reset is cancelled so unsuccessful action cannot erase uncontrolled input', () => {
  const handlers = new Set();
  global.document = {
    activeElement: null,
    addEventListener: (_, fn) => handlers.add(fn),
    removeEventListener: (_, fn) => handlers.delete(fn),
  };
  const drawer = driver(EnterpriseDrawer);
  const tree = drawer.render({
    eyebrow: 'Tambah',
    title: 'Data',
    onClose() {},
    children: draftA,
  });
  let cancelled = false;
  rawNodes(tree)
    .find((n) => n.type === 'fieldset')
    .props.onReset({
      preventDefault() {
        cancelled = true;
      },
    });
  assert.equal(cancelled, true);
  drawer.unmount();
});

test('read-only drawers handle Esc; hidden draft drawers do not intercept keyboard', () => {
  const handlers = new Set();
  global.document = {
    activeElement: null,
    addEventListener: (_, fn) => handlers.add(fn),
    removeEventListener: (_, fn) => handlers.delete(fn),
  };
  let closes = 0;
  const close = () => closes++;
  const active = driver(EnterpriseDrawer);
  const hidden = driver(EnterpriseDrawer);
  const props = {
    eyebrow: 'Detail',
    title: 'Data',
    onClose: close,
    children: 'Detail',
  };
  active.render(props, { active: true, pending: false, close });
  hidden.render(props, { active: false, pending: false, close });
  assert.equal(handlers.size, 1);
  handlers.forEach((handler) =>
    handler({ key: 'Escape', preventDefault() {} }),
  );
  assert.equal(closes, 1);
  active.unmount();
  hidden.unmount();
});

test('refresh remains open; initial ok state never closes; thrown actions release pending guard', async () => {
  const fixture = hostFixture();
  let workflow = providers(fixture.open('edit:A', draftA))[0].props.value;
  const action = actionFor(
    workflow,
    async () => ({ ok: true, message: 'Status dimuat' }),
    { closeOnSuccess: false },
  );
  assert.equal(fixture.closeCount(), 0);
  await action({ ok: true, message: null }, new FormData());
  assert.equal(fixture.closeCount(), 0);
  workflow = providers(fixture.render())[0].props.value;
  const throwing = actionFor(workflow, async () => {
    throw new Error('Network failed');
  });
  const failed = await throwing({ ok: false, message: null }, new FormData());
  assert.equal(failed.ok, false);
  assert.match(failed.message, /belum dapat dipastikan/);
  assert.equal(fixture.closeCount(), 0);
  assert.equal(providers(fixture.render())[0].props.value.pending, false);
});

const emptyList = { data: { data: [], total: 0 }, error: null };
const filters = { search: 'cari', status: 'ACTIVE', page: 3, limit: 50 };
const filterCases = [
  [
    'foundation/person-management.tsx',
    'PersonWorkspace',
    {
      result: emptyList,
      filters,
      rows: [],
      audit: { data: null, error: null },
    },
    '/data-individu',
  ],
  [
    'foundation/account-management.tsx',
    'AccountWorkspace',
    { result: emptyList, filters, rows: [], personOptions: [] },
    '/akun-pengguna',
  ],
  [
    'academic/program-management.tsx',
    'ProgramWorkspace',
    { result: emptyList, filters, organizations: [] },
    '/program',
  ],
  [
    'academic/curriculum-management.tsx',
    'CurriculumWorkspace',
    { result: emptyList, filters, programs: [] },
    '/kurikulum',
  ],
  [
    'learning/activity-workspace.tsx',
    'ActivityWorkspace',
    {
      result: { data: [], total: 0, error: null },
      filters,
      meetings: [],
      types: [],
    },
    '/aktivitas',
  ],
  [
    'learning/material-workspace.tsx',
    'MaterialWorkspace',
    { result: { data: [], total: 0, error: null }, filters, activities: [] },
    '/materi',
  ],
  [
    'learning/assignment-workspace.tsx',
    'AssignmentWorkspace',
    { result: { data: [], total: 0, error: null }, filters, activities: [] },
    '/tugas',
  ],
  [
    'assessment/assessment-workspace.tsx',
    'AssessmentWorkspace',
    { result: emptyList, filters, assessmentTypes: [], classSubjects: [] },
    '/assessment',
  ],
  [
    'assessment/question-bank-workspace.tsx',
    'QuestionBankWorkspace',
    { result: emptyList, filters, curricula: [] },
    '/bank-soal',
  ],
  [
    'graduation/graduation-workspace.tsx',
    'GraduationWorkspace',
    { result: emptyList, filters },
    '/kelulusan',
  ],
  [
    'graduation/certificate-template-workspace.tsx',
    'CertificateTemplateWorkspace',
    { result: emptyList, filters },
    '/template-sertifikat',
  ],
  [
    'graduation/decision-workspace.tsx',
    'GraduationDecisionWorkspace',
    { result: emptyList, filters },
    '/keputusan-kelulusan',
  ],
];
for (const [source, name, props, route] of filterCases) {
  test(`${route}: visible status filter preserves limit and resets page on submit`, () => {
    installDispatcher();
    const tree = renderTree(
      React.createElement(loadSrcModule(`features/${source}`)[name], props),
    );
    const form = [...walk(tree)].find(
      (n) => n.type === 'form' && n.props.action === route,
    );
    assert.ok(form);
    const nodes = [...walk(form)];
    assert.ok(
      nodes.some((n) => n.type === 'select' && n.props.name === 'status'),
    );
    assert.equal(nodes.find((n) => n.props?.name === 'limit').props.value, 50);
    assert.ok(!nodes.some((n) => n.props?.name === 'page'));
  });
}
for (const [kind, expected] of [
  ['subject', ['', 'ACTIVE', 'INACTIVE']],
  ['batch', ['', 'ACTIVE', 'INACTIVE']],
  ['class', ['', 'ACTIVE', 'INACTIVE', 'ARCHIVED']],
  ['enrollment', ['', 'ACTIVE', 'WITHDRAWN', 'COMPLETED']],
]) {
  test(`${kind}: list exposes only supported status values`, () => {
    installDispatcher();
    const { AcademicWorkspace } = loadSrcModule(
      'features/academic/academic-workspace.tsx',
    );
    const tree = renderTree(
      React.createElement(AcademicWorkspace, {
        kind,
        result: { data: [], total: 0 },
        filters,
      }),
    );
    const select = [...walk(tree)].find(
      (n) => n.type === 'select' && n.props.name === 'status',
    );
    assert.deepEqual(
      [...walk(select)]
        .filter((n) => n.type === 'option')
        .map((n) => n.props.value),
      expected,
    );
  });
}

test('role and permission filters preserve the other list and both page sizes', () => {
  installDispatcher();
  const { RolePermissionWorkspace } = loadSrcModule(
    'features/foundation/role-permission-management.tsx',
  );
  const tree = renderTree(
    React.createElement(RolePermissionWorkspace, {
      roles: emptyList,
      permissions: emptyList,
      rolePermissions: {},
      roleFilters: { search: 'admin', status: 'ACTIVE', page: 3, limit: 50 },
      permissionFilters: { search: 'akun', page: 2, limit: 10 },
    }),
  );
  const forms = [...walk(tree)].filter(
    (n) => n.type === 'form' && n.props.action === '/peran-hak-akses',
  );
  const role = forms.find((f) =>
    [...walk(f)].some(
      (n) =>
        n.props?.name === 'roleSearch' &&
        n.type === 'input' &&
        n.props.type === 'search',
    ),
  );
  const permission = forms.find((f) =>
    [...walk(f)].some(
      (n) => n.props?.name === 'permissionSearch' && n.props.type === 'search',
    ),
  );
  const fields = (f) =>
    new Map(
      [...walk(f)]
        .filter((n) => n.props?.name)
        .map((n) => [n.props.name, n.props]),
    );
  assert.equal(fields(role).get('roleStatus').defaultValue, 'ACTIVE');
  assert.equal(fields(role).get('rolePage').value, '1');
  assert.equal(fields(role).get('roleLimit').value, 50);
  assert.equal(fields(role).get('permissionSearch').value, 'akun');
  assert.equal(fields(role).get('permissionLimit').value, 10);
  assert.equal(fields(permission).get('rolePage').value, 3);
  assert.equal(fields(permission).get('permissionPage').value, '1');
  assert.equal(fields(permission).get('permissionLimit').value, 10);
});

test('assignment filters keep role, scope and page size when status/search is submitted', () => {
  installDispatcher();
  const { AssignmentWorkspace } = loadSrcModule(
    'features/foundation/assignment-scope-management.tsx',
  );
  const tree = renderTree(
    React.createElement(AssignmentWorkspace, {
      result: emptyList,
      accounts: [],
      roles: [],
      organizations: [],
      filters: { ...filters, roleId: 'role-A', scopeType: 'ORGANIZATION' },
    }),
  );
  const form = [...walk(tree)].find(
    (n) => n.type === 'form' && n.props.action === '/penugasan',
  );
  const nodes = [...walk(form)];
  assert.equal(
    nodes.find((n) => n.props?.name === 'roleId').props.value,
    'role-A',
  );
  assert.equal(
    nodes.find((n) => n.props?.name === 'scopeType').props.value,
    'ORGANIZATION',
  );
  assert.equal(nodes.find((n) => n.props?.name === 'status').type, 'select');
});

test('navigation signals are rethrown while pending guard is always released', async () => {
  const fixture = hostFixture();
  const workflow = providers(fixture.open('create', draftA))[0].props.value;
  const redirect = Object.assign(new Error('redirect'), {
    digest: 'NEXT_REDIRECT;replace;/login;307;',
  });
  const action = actionFor(workflow, async () => {
    throw redirect;
  });
  await assert.rejects(
    action({ ok: false, message: null }, new FormData()),
    (error) => error === redirect,
  );
  assert.equal(providers(fixture.render())[0].props.value.pending, false);
});

test('academic filters expose supported relations instead of a search the API ignores', () => {
  const { AcademicWorkspace } = loadSrcModule(
    'features/academic/academic-workspace.tsx',
  );
  for (const kind of ['batch', 'class', 'enrollment']) {
    installDispatcher();
    const tree = renderTree(
      React.createElement(AcademicWorkspace, {
        kind,
        result: { data: [], total: 0 },
        filters: {
          ...filters,
          educationProgramId: 'program-A',
          educationBatchId: 'batch-A',
          academicClassId: 'class-A',
        },
        options: {
          educationProgramId: [{ id: 'program-A', label: 'Program A' }],
          educationBatchId: [{ id: 'batch-A', label: 'Angkatan A' }],
          academicClassId: [{ id: 'class-A', label: 'Kelas A' }],
        },
      }),
    );
    const form = [...walk(tree)].find((n) => n.type === 'form');
    const nodes = [...walk(form)];
    const field = kind === 'batch' ? 'educationProgramId' : 'educationBatchId';
    assert.ok(nodes.some((n) => n.type === 'select' && n.props.name === field));
    assert.equal(
      nodes.some((n) => n.props?.name === 'search'),
      kind === 'class',
    );
    if (kind === 'enrollment')
      assert.equal(
        nodes.find((n) => n.props?.name === 'academicClassId').props
          .defaultValue,
        'class-A',
      );
  }
});
