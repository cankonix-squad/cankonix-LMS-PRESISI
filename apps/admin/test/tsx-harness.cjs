'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Minimal TSX test harness for the Admin app.
 *
 * The Admin app ships no test runner, but the server actions and the form
 * composition of the provisioning flow are a security/UX boundary and must be
 * regression-tested. This harness compiles the REAL feature `.tsx` sources with
 * the SWC build already bundled with Next.js (no new dependency) and calls the
 * components as functions to obtain their React element tree.
 *
 * Why the tree and not the DOM: the browser silently DROPS a `<form>` nested
 * inside another `<form>` while parsing, which is exactly what makes the
 * panel's `action` run against the outer account form. React DOM's server
 * renderer does not drop it, so a rendered-markup assertion would not catch the
 * defect -- the element TREE is the honest signal, and the regression test
 * walks it.
 */

const { transformSync } = require('next/dist/build/swc/index.js');
const path = require('node:path');
const fs = require('node:fs');

const React = require('react');

const SRC_ROOT = path.resolve(__dirname, '..', 'src');
const CACHE = new Map();

/**
 * The access-token cookie `lib/api.ts` sees through `next/headers`. `null`
 * means "no cookie", which is what every other test in this suite expects.
 */
let sessionCookie = null;

/** Server-side API seam, stubbed so no Next request context is needed. */
const apiStub = {
  createAdminApiClient: () => {
    throw new Error('createAdminApiClient() not configured for this test');
  },
  getAdminAccessToken: async () => null,
  getApiBaseUrl: () => 'http://localhost:3001',
  /**
   * Portal gate doubles. `hasAdminPortalAccess` answers a state (used by
   * in-component fallbacks); `requireAdminPortalAccess` is the page gate and
   * resolves for a permitted caller rather than navigating.
   */
  hasAdminPortalAccess: async () => false,
  requireAdminPortalAccess: async () => {},
};

/** Lazily resolved aliases so loading order cannot matter. */
const aliasLoaders = {
  '@/components/admin': () => loadSrcModule('components/admin/index.ts'),
  '@/lib/utils': () => loadSrcModule('lib/utils.ts'),
  '@/lib/admin-permission-labels': () =>
    loadSrcModule('lib/admin-permission-labels.ts'),
  '@/lib/api': () => apiStub,
  '@/features/foundation/actions': () =>
    loadSrcModule('features/foundation/actions.ts'),
  '@/features/foundation/keycloak-actions': () =>
    loadSrcModule('features/foundation/keycloak-actions.ts'),
  'next/cache': () => ({ revalidatePath() {} }),
  // Loadable so `lib/api.ts` itself can be exercised (portal gate + denial
  // mapping) without a Next request context. `cookies()` answers the value set
  // by `setSessionCookie` (default: no cookie), and `redirect()` throws the
  // same sentinel Next throws.
  'next/headers': () => ({
    cookies: async () => ({
      get: (name) =>
        name === 'lms_access_token' && sessionCookie !== null
          ? { name, value: sessionCookie }
          : undefined,
      set() {},
    }),
  }),
  'next/navigation': () => ({
    redirect(url) {
      const error = new Error(`NEXT_REDIRECT: ${url}`);
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    },
  }),
};

function resolveSpecifier(specifier, fromDir) {
  const alias = aliasLoaders[specifier];
  if (alias) return alias();

  let target;
  if (specifier.startsWith('@/')) {
    target = path.join(SRC_ROOT, specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    target = path.resolve(fromDir, specifier);
  } else {
    return null;
  }
  for (const candidate of [
    `${target}.ts`,
    `${target}.tsx`,
    path.join(target, 'index.ts'),
    path.join(target, 'index.tsx'),
  ]) {
    if (fs.existsSync(candidate)) return loadModule(candidate);
  }
  return null;
}

function loadModule(filename) {
  const cached = CACHE.get(filename);
  if (cached) return cached.exports;

  const compiledModule = { exports: {} };
  CACHE.set(filename, compiledModule);

  const fromDir = path.dirname(filename);
  const localRequire = (specifier) =>
    resolveSpecifier(specifier, fromDir) || require(specifier);
  localRequire.resolve = (specifier) => specifier;

  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    jsc: {
      parser: { syntax: 'typescript', tsx: filename.endsWith('.tsx') },
      transform: { react: { runtime: 'automatic' } },
      target: 'es2022',
    },
    module: { type: 'commonjs' },
  });
  new Function('require', 'module', 'exports', '__filename', code)(
    localRequire,
    compiledModule,
    compiledModule.exports,
    filename,
  );
  return compiledModule.exports;
}

/** Load an Admin source module by its path relative to `apps/admin/src`. */
function loadSrcModule(relativePath) {
  return loadModule(path.join(SRC_ROOT, relativePath));
}

/** Configure which API double the server actions will call. */
function setApiStub(client) {
  apiStub.createAdminApiClient = () => client;
}

/** Configure the session token the server actions observe. */
function setAccessToken(token) {
  apiStub.getAdminAccessToken = async () => token;
}

/**
 * Configure the access-token cookie that `lib/api.ts` reads through
 * `next/headers`. Only `lms_access_token` is answered; every other cookie name
 * resolves to `undefined`.
 */
function setSessionCookie(value) {
  sessionCookie = value === undefined ? null : value;
}

/**
 * Replace the React hook dispatcher with a passthrough implementation so the
 * real components can run outside a renderer. `useActionState` returns the
 * action verbatim, so a test invokes the exact server action React would.
 *
 * `useState` returns queued overrides in call order (falling back to the
 * component's own initial value), which lets a test open the enterprise
 * drawer without simulating a click.
 */
function installDispatcher() {
  const stateOverrides = [];
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = {
    useActionState: (action, initial) => [initial, action, false],
    useState: (initial) =>
      stateOverrides.length ? stateOverrides.shift() : [initial, () => {}],
  };
  return {
    /** Queue the value the Nth `useState` call should return. */
    queueState(value, setter = () => {}) {
      stateOverrides.push([value, setter]);
    },
    reset() {
      stateOverrides.length = 0;
    },
  };
}

/**
 * Call a component to get its element tree, resolving function components and
 * fragments so nested `<form>` elements become visible.
 */
function renderTree(element) {
  if (
    element === null ||
    element === undefined ||
    typeof element === 'boolean' ||
    typeof element === 'string' ||
    typeof element === 'number'
  ) {
    return null;
  }
  // Flattened, because JSX children are frequently produced by `.map()`: a
  // nested array would otherwise stay an array whose own children `walk` never
  // descends into, making real inputs and forms invisible to these tests.
  if (Array.isArray(element)) {
    return element.map(renderTree).filter(Boolean).flat(Infinity);
  }
  if (!element || typeof element !== 'object') return null;

  if (typeof element.type === 'function') {
    return renderTree(element.type(element.props || {}));
  }
  if (typeof element.type === 'symbol') {
    return renderTree(element.props && element.props.children);
  }
  return {
    type: element.type,
    props: element.props || {},
    children: renderTree(element.props && element.props.children),
  };
}

/** Depth-first walk over every element in a rendered tree. */
function* walk(node) {
  if (!node) return;
  for (const item of Array.isArray(node) ? node : [node]) {
    if (!item || typeof item !== 'object') continue;
    yield item;
    yield* walk(item.children);
  }
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Yield every form element contained anywhere under `node`. */
function* allForms(node) {
  for (const child of toArray(node && node.children)) {
    if (!child || typeof child !== 'object') continue;
    if (child.type === 'form') yield child;
    yield* allForms(child);
  }
}

/**
 * True when any form in the tree contains another form.
 *
 * That nesting is what the browser silently discards, so it is the exact
 * condition this regression guard exists to detect.
 */
function hasNestedForm(node) {
  for (const form of allForms(node)) {
    if (allForms(form).next().done === false) return true;
  }
  return false;
}

module.exports = {
  React,
  loadSrcModule,
  installDispatcher,
  renderTree,
  walk,
  allForms,
  hasNestedForm,
  apiStub,
  setApiStub,
  setAccessToken,
  setSessionCookie,
};
