// Local HTTP doubles exercise the real SDK, React provider and Query v5 lifecycle.
// These tests never connect to Clerk or Supabase Cloud.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, symlinkSync, realpathSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const { createRequire, Module } = require('node:module');

const root = resolve(__dirname, '..');
const apiRequire = createRequire(resolve(root, 'packages/api/package.json'));
const output = mkdtempSync(resolve(tmpdir(), 'wow-query-tests-'));
execFileSync(process.execPath, [apiRequire.resolve('typescript/lib/tsc.js'),
  '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
  '--ignoreDeprecations', '6.0', '--skipLibCheck', '--strict', '--jsx', 'react-jsx',
  '--outDir', output, '--rootDir', 'packages/api/src', 'packages/api/src/index.ts',
], { cwd: root, stdio: 'inherit' });
symlinkSync(resolve(root, 'packages/api/node_modules'), resolve(output, 'node_modules'), 'dir');

const listeners = new Set();
let subscriptions = 0;
const native = {
  Platform: { OS: 'android' },
  AppState: {
    currentState: 'active',
    addEventListener(event, handler) {
      assert.equal(event, 'change');
      subscriptions++;
      listeners.add(handler);
      return { remove: () => listeners.delete(handler) };
    },
  },
};
// Only native AppState is substituted; React, TanStack and Supabase remain real.
const load = Module._load;
Module._load = function (request, parent, isMain) {
  return request === 'react-native' ? native : load.call(this, request, parent, isMain);
};
const api = require(resolve(output, 'index.js'));
const { subscribeToNativeFocus } = require(resolve(output, 'query/native-focus.js'));
Module._load = load;

const React = apiRequire('react');
const { create, act } = apiRequire('react-test-renderer');
const { useQueryClient, focusManager } = apiRequire('@tanstack/react-query');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalFetch = globalThis.fetch;
const originalError = console.error;
console.error = (...args) => {
  if (String(args[0]).startsWith('react-test-renderer is deprecated.')) return;
  originalError(...args);
};
const h = React.createElement;
const renderers = [];
const clients = [];
const id = '12345678-1234-4234-8234-123456789abc';
const otherId = '12345678-1234-4234-8234-123456789def';
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const scope = (userId, sessionId) => JSON.stringify([userId, sessionId]);
const makeClient = () => api.createWowSupabaseClient({ url: 'https://wow.invalid', publishableKey: 'sb_publishable_local', getToken: async () => 'local-session-token' });

async function mount(element) {
  let renderer;
  await act(async () => { renderer = create(element); await tick(); });
  renderers.push(renderer);
  return renderer;
}
async function update(renderer, element) {
  await act(async () => { renderer.update(element); await tick(); });
}
function provider(children, overrides = {}) {
  return h(api.WowQueryProvider, {
    client: makeClient(), userId: 'user_a', sessionScopeKey: scope('user_a', 'session_a'), isAuthReady: true, ...overrides,
  }, children);
}
function recordClient() {
  const queryClient = useQueryClient();
  if (!clients.includes(queryClient)) clients.push(queryClient);
  return queryClient;
}

afterEach(async () => {
  await act(async () => { for (const renderer of renderers.splice(0)) renderer.unmount(); });
  for (const client of clients.splice(0)) client.clear();
  globalThis.fetch = originalFetch;
  assert.equal(listeners.size, 0, 'Native subscriptions must be removed');
});

test('exports, v5 defaults, query keys and workspace React instances are consistent', () => {
  for (const name of ['WowQueryProvider', 'createWowQueryClient', 'useWowSupabaseClient', 'getCurrentUser', 'getMyBusinesses', 'getBusiness', 'createBusiness', 'getBusinessBranches', 'createBranch', 'useCurrentUser', 'useMyBusinesses', 'useBusiness', 'useCreateBusiness', 'useBusinessBranches', 'useCreateBranch']) assert.equal(typeof api[name], 'function', name);
  const first = api.createWowQueryClient();
  const second = api.createWowQueryClient();
  assert.notEqual(first, second);
  assert.deepEqual(first.getDefaultOptions(), { queries: { staleTime: 60000, gcTime: 300000, retry: 1, refetchOnReconnect: true, refetchOnWindowFocus: true }, mutations: { retry: false } });
  const keys = api.wowQueryKeys;
  assert.deepEqual(keys.users.current('a'), ['users', 'current', 'a']);
  assert.deepEqual(keys.businesses.mine('a'), ['businesses', 'mine', 'a']);
  assert.deepEqual(keys.businesses.detail(id, 'a'), ['businesses', 'detail', id, 'a']);
  assert.deepEqual(keys.branches.business(id, 'a'), ['branches', 'business', id, 'a']);
  const queryRequire = createRequire(apiRequire.resolve('@tanstack/react-query'));
  for (const app of ['customer', 'merchant', 'admin']) {
    const appRequire = createRequire(resolve(root, 'apps', app, 'package.json'));
    const appApiRequire = createRequire(appRequire.resolve('@wow/api'));
    assert.equal(realpathSync(appRequire.resolve('react')), realpathSync(apiRequire.resolve('react')));
    assert.equal(realpathSync(appRequire.resolve('react')), realpathSync(queryRequire.resolve('react')));
    assert.equal(appApiRequire.resolve('@tanstack/react-query'), apiRequire.resolve('@tanstack/react-query'));
  }
  assert.equal(apiRequire('@tanstack/react-query/package.json').version, '5.105.0');
});

test('providers keep independent caches, stable rerenders and isolate same-user new sessions and sign-out', async () => {
  let current;
  let sibling;
  function Inspect() { current = recordClient(); return null; }
  function Sibling() { sibling = recordClient(); return null; }
  const renderer = await mount(provider(h(Inspect)));
  const first = current;
  first.setQueryData(api.wowQueryKeys.users.current('user_a'), { id: 'user_a' });
  await mount(provider(h(Sibling)));
  assert.notEqual(sibling, first);
  assert.equal(sibling.getQueryData(api.wowQueryKeys.users.current('user_a')), undefined);
  assert.equal(listeners.size, 1);
  await update(renderer, provider(h(Inspect)));
  assert.equal(current, first);
  assert.deepEqual(current.getQueryData(api.wowQueryKeys.users.current('user_a')), { id: 'user_a' });
  await update(renderer, provider(h(Inspect), { sessionScopeKey: scope('user_a', 'session_new') }));
  assert.notEqual(current, first);
  assert.equal(current.getQueryData(api.wowQueryKeys.users.current('user_a')), undefined);
  assert.equal(first.getQueryCache().getAll().length, 0);
  const second = current;
  second.setQueryData(['private'], 'private');
  await update(renderer, provider(h(Inspect), { userId: null, sessionScopeKey: null, client: null }));
  assert.notEqual(current, second);
  assert.equal(current.getQueryData(['private']), undefined);
  assert.equal(second.getQueryCache().getAll().length, 0);
});

test('switching accounts cannot expose a previous profile even for the first render', async () => {
  const reads = [];
  function Inspect() {
    const client = recordClient();
    reads.push(client.getQueryData(api.wowQueryKeys.users.current('user_a')));
    return null;
  }
  const renderer = await mount(provider(h(Inspect)));
  clients[0].setQueryData(api.wowQueryKeys.users.current('user_a'), { id: 'user_a' });
  reads.length = 0;
  await update(renderer, provider(h(Inspect), { userId: 'user_b', sessionScopeKey: scope('user_b', 'session_b') }));
  assert(reads.length > 0);
  assert(reads.every(value => value === undefined));
});

test('AppState shares one subscription, updates native focus, and preserves browser handling', async () => {
  const before = subscriptions;
  const first = subscribeToNativeFocus();
  const second = subscribeToNativeFocus();
  assert.equal(subscriptions - before, 1);
  for (const callback of listeners) callback('background');
  assert.equal(focusManager.isFocused(), false);
  for (const callback of listeners) callback('active');
  assert.equal(focusManager.isFocused(), true);
  first();
  assert.equal(listeners.size, 1);
  second();
  assert.equal(listeners.size, 0);
  native.Platform.OS = 'web';
  focusManager.setFocused(false);
  try {
    const stop = subscribeToNativeFocus();
    assert.equal(listeners.size, 0);
    assert.equal(focusManager.isFocused(), false);
    stop();
  } finally { native.Platform.OS = 'android'; focusManager.setFocused(undefined); }
});

test('the shared client survives token callback refresh and rejects stale-session or missing tokens', async () => {
  let current;
  let tokenCalls = 0;
  let finishToken;
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push(options.headers.get('Authorization')); return response([]); };
  function Boundary({ sessionScopeKey, getToken }) {
    current = api.useWowSupabaseClient({ url: 'https://wow.invalid', publishableKey: 'sb_publishable_local', getToken, sessionScopeKey });
    return null;
  }
  const renderer = await mount(h(Boundary, { sessionScopeKey: 'session_a', getToken: async () => 'token_1' }));
  const first = current;
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_a', getToken: async () => { tokenCalls++; return 'token_2'; } }));
  assert.equal(current, first);
  await api.getCurrentUser(current, 'user_a');
  assert.equal(tokenCalls, 1);
  assert.deepEqual(requests, ['Bearer token_2']);
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_a', getToken: () => new Promise(resolve => { finishToken = resolve; }) }));
  const pending = api.getCurrentUser(first, 'user_a');
  const rejected = assert.rejects(pending, /session changed/);
  await tick();
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_b', getToken: async () => 'token_b' }));
  finishToken('token_1');
  await rejected;
  assert.notEqual(current, first);
  await assert.rejects(api.getCurrentUser(first, 'user_a'), /session changed/);
  assert.equal(requests.length, 1);
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_b', getToken: async () => null }));
  await assert.rejects(api.getCurrentUser(current, 'user_b'), /token is required/);
  await update(renderer, h(Boundary, { sessionScopeKey: null, getToken: async () => null }));
  assert.equal(current, null);
});

test('private queries stay disabled before auth readiness; missing webhook profiles are null and can refetch', async () => {
  let result;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return response(requests === 1 ? [] : [{ id: 'user_a', account_status: 'active' }]); };
  function Inspect() { recordClient(); result = api.useCurrentUser(); return null; }
  const renderer = await mount(provider(h(Inspect), { isAuthReady: false }));
  assert.equal(requests, 0);
  assert.equal(result.fetchStatus, 'idle');
  await update(renderer, provider(h(Inspect)));
  await act(tick);
  assert.equal(result.status, 'success');
  assert.equal(result.data, null);
  await act(async () => { await result.refetch(); });
  await act(tick);
  assert.equal(result.data.id, 'user_a');
});

test('all resource queries call SDK API functions with identity filters and business-specific keys', async () => {
  let result;
  const requests = [];
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    requests.push(parsed);
    if (parsed.pathname.endsWith('/businesses')) return response([{ id, name: 'Shop', owner_user_id: 'user_a', status: 'draft' }]);
    return response([{ id: otherId, name: 'Branch', business_id: id, status: 'draft', is_primary: true }]);
  };
  function Inspect() { recordClient(); result = { mine: api.useMyBusinesses(), detail: api.useBusiness(id), branches: api.useBusinessBranches(id) }; return null; }
  await mount(provider(h(Inspect)));
  await act(tick);
  assert.equal(result.mine.data[0].id, id);
  assert.equal(result.detail.data.id, id);
  assert.equal(result.branches.data[0].business_id, id);
  assert(requests.some(url => url.searchParams.get('owner_user_id') === 'eq.user_a'));
  assert(requests.some(url => url.searchParams.get('id') === `eq.${id}`));
  assert(requests.some(url => url.searchParams.get('business_id') === `eq.${id}`));
});

test('business and branch mutations use RPCs and invalidate only affected identity/resource keys', async () => {
  let business;
  let branch;
  let queryClient;
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ path: new URL(url).pathname, body: JSON.parse(options.body) }); return response(id); };
  function Inspect() { queryClient = recordClient(); business = api.useCreateBusiness(); branch = api.useCreateBranch(); return null; }
  await mount(provider(h(Inspect)));
  const keys = api.wowQueryKeys;
  const mine = keys.businesses.mine('user_a');
  const otherUser = keys.businesses.mine('user_b');
  const detail = keys.businesses.detail(id, 'user_a');
  const branches = keys.branches.business(id, 'user_a');
  const unrelated = keys.branches.business(otherId, 'user_a');
  const otherBranches = keys.branches.business(id, 'user_b');
  for (const key of [mine, otherUser, detail, branches, unrelated, otherBranches]) queryClient.setQueryData(key, []);
  await act(async () => { assert.equal(await business.mutateAsync({ name: 'Shop', description: 'Description' }), id); });
  assert(queryClient.getQueryState(mine).isInvalidated);
  assert(queryClient.getQueryState(detail).isInvalidated);
  assert(!queryClient.getQueryState(otherUser).isInvalidated);
  assert(!queryClient.getQueryState(branches).isInvalidated);
  queryClient.setQueryData(detail, {});
  await act(async () => { await branch.mutateAsync({ businessId: id, name: 'Branch', parameters: { p_address: 'Local', p_name: 'ignored', p_business_id: otherId } }); });
  assert(queryClient.getQueryState(branches).isInvalidated);
  for (const key of [detail, unrelated, otherBranches]) assert(!queryClient.getQueryState(key).isInvalidated);
  assert.deepEqual(requests, [
    { path: '/rest/v1/rpc/wow_create_business', body: { p_name: 'Shop', p_description: 'Description' } },
    { path: '/rest/v1/rpc/wow_create_branch', body: { p_business_id: id, p_name: 'Branch', p_address: 'Local' } },
  ]);
});

test('mutations do not retry failures and cannot write while signed out', async () => {
  let mutation;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return response({ code: '42501', message: 'Permission denied' }, 403); };
  function Inspect() { recordClient(); mutation = api.useCreateBusiness(); return null; }
  const renderer = await mount(provider(h(Inspect)));
  await act(async () => { await assert.rejects(mutation.mutateAsync({ name: 'Shop' }), error => error.code === '42501'); });
  assert.equal(requests, 1);
  await update(renderer, provider(h(Inspect), { userId: null, sessionScopeKey: null }));
  await act(async () => { await assert.rejects(mutation.mutateAsync({ name: 'Shop' }), /signed-in session/); });
  assert.equal(requests, 1);
});

test('session replacement cancels in-flight reads through the Supabase AbortSignal', async () => {
  let aborted = false;
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
  function Inspect() { recordClient(); api.useCurrentUser(); return null; }
  const renderer = await mount(provider(h(Inspect)));
  await update(renderer, provider(h(Inspect), { userId: null, sessionScopeKey: null }));
  assert.equal(aborted, true);
  assert.equal(clients[0].getQueryCache().getAll().length, 0);
});
