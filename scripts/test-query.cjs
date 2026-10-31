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
symlinkSync(resolve(root, 'packages/api/node_modules'), resolve(output, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

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
const { useQueryClient, focusManager, timeoutManager } = apiRequire('@tanstack/react-query');

// Keep the actual GC delays/callbacks, but do not hold Node open for five minutes.
timeoutManager.setTimeoutProvider({
  setTimeout(callback, delay) {
    const timer = setTimeout(callback, delay);
    if (delay >= 300_000) timer.unref();
    return timer;
  },
  clearTimeout,
  setInterval,
  clearInterval,
});
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
  const client = makeClient();
  return h(api.WowQueryProvider, {
    getClient: () => client, userId: 'user_a', sessionScopeKey: scope('user_a', 'session_a'), isAuthReady: true, ...overrides,
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
  for (const name of ['WowQueryProvider', 'createWowQueryClient', 'useWowSupabaseClient', 'getCurrentUser', 'getMyBusinesses', 'getBusiness', 'createBusiness', 'getBusinessBranches', 'createBranch', 'useCurrentUser', 'useMyBusinesses', 'useBusiness', 'useCreateBusiness', 'useBusinessBranches', 'useCreateBranch', 'getBusinessVerifications', 'submitBusinessVerification', 'resubmitBusinessVerification', 'listAdminBusinessVerifications', 'getAdminBusinessVerification', 'decideAdminBusinessVerification', 'useBusinessVerifications', 'useSubmitBusinessVerification', 'useResubmitBusinessVerification', 'useAdminBusinessVerifications', 'useAdminBusinessVerification', 'useAdminDecideBusinessVerification']) assert.equal(typeof api[name], 'function', name);
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
  await update(renderer, provider(h(Inspect), { userId: null, sessionScopeKey: null, getClient: () => null }));
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

test('StrictMode effect replay keeps active queries in the cache and invalidation working', async () => {
  let result;
  let queryClient;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return response([{ id: 'user_a', account_status: 'active' }]);
  };
  function Inspect() {
    queryClient = recordClient();
    result = api.useCurrentUser();
    return null;
  }
  await mount(h(React.StrictMode, null, provider(h(Inspect))));
  await act(tick);
  assert.equal(result.status, 'success');
  const key = api.wowQueryKeys.users.current('user_a');
  assert.deepEqual(queryClient.getQueryData(key), result.data);
  const before = requests;
  await act(async () => { await queryClient.invalidateQueries({ queryKey: key, exact: true }); });
  await act(tick);
  assert.equal(requests, before + 1);
  assert.equal(listeners.size, 1);
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
  let accessor;
  let tokenCalls = 0;
  let finishToken;
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push(options.headers.get('Authorization')); return response([]); };
  function Boundary({ sessionScopeKey, getToken }) {
    const getClient = api.useWowSupabaseClient({ url: 'https://wow.invalid', publishableKey: 'sb_publishable_local', getToken, sessionScopeKey });
    accessor = getClient;
    React.useEffect(() => { current = getClient(); }, [getClient]);
    return null;
  }
  const renderer = await mount(h(Boundary, { sessionScopeKey: 'session_a', getToken: async () => 'token_1' }));
  const first = current;
  const firstAccessor = accessor;
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_a', getToken: async () => { tokenCalls++; return 'token_2'; } }));
  assert.equal(current, first);
  assert.equal(accessor, firstAccessor);
  await api.getCurrentUser(current, 'user_a');
  assert.equal(tokenCalls, 1);
  assert.deepEqual(requests, ['Bearer token_2']);
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_a', getToken: () => new Promise(resolve => { finishToken = resolve; }) }));
  const pending = api.getCurrentUser(first, 'user_a');
  const rejected = assert.rejects(pending, error => /session changed/.test(error.message));
  await tick();
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_b', getToken: async () => 'token_b' }));
  finishToken('token_1');
  await rejected;
  assert.notEqual(current, first);
  assert.throws(firstAccessor, /session changed/);
  await assert.rejects(api.getCurrentUser(first, 'user_a'), error => /session changed/.test(error.message));
  assert.equal(requests.length, 1);
  await update(renderer, h(Boundary, { sessionScopeKey: 'session_b', getToken: async () => null }));
  await assert.rejects(api.getCurrentUser(current, 'user_b'), error => /token is required/.test(error.message));
  await update(renderer, h(Boundary, { sessionScopeKey: null, getToken: async () => null }));
  assert.equal(current, null);
});

test('the real authentication boundary keeps its cache across token changes and resets on readiness loss', async () => {
  let queryClient;
  let getClient;
  function Inspect() { queryClient = recordClient(); api.useCurrentUser(); return null; }
  function Boundary({ ready, getToken }) {
    const sessionScopeKey = ready ? scope('user_a', 'session_a') : null;
    getClient = api.useWowSupabaseClient({ url: 'https://wow.invalid', publishableKey: 'sb_publishable_local', getToken, sessionScopeKey });
    return h(api.WowQueryProvider, { getClient, userId: 'user_a', isAuthReady: ready, sessionScopeKey }, h(Inspect));
  }
  globalThis.fetch = async () => response([{ id: 'user_a', account_status: 'active' }]);
  const renderer = await mount(h(Boundary, { ready: true, getToken: async () => 'token_a' }));
  await act(tick);
  const first = queryClient;
  const firstSdkClient = getClient();
  await update(renderer, h(Boundary, { ready: true, getToken: async () => 'token_refreshed' }));
  assert.equal(queryClient, first);
  assert.equal(getClient(), firstSdkClient);
  await update(renderer, h(Boundary, { ready: false, getToken: async () => null }));
  assert.notEqual(queryClient, first);
  assert.equal(getClient(), null);
  assert.equal(first.getQueryCache().getAll().length, 0);
  assert.equal(queryClient.getQueryData(api.wowQueryKeys.users.current('user_a')), undefined);
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
  assert(requests.some(url => url.pathname.endsWith('/business_branches')));
});

test('all private hooks stay idle while signed out and business queries require an ID', async () => {
  let results;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return response([]); };
  function Inspect() {
    recordClient();
    results = [api.useCurrentUser(), api.useMyBusinesses(), api.useBusiness(id), api.useBusinessBranches(id)];
    return null;
  }
  const renderer = await mount(provider(h(Inspect), { userId: null, sessionScopeKey: null }));
  assert(results.every(query => query.fetchStatus === 'idle' && query.data === undefined));
  assert.equal(requests, 0);
  function MissingId() {
    recordClient();
    results = [api.useBusiness(), api.useBusinessBranches(null)];
    return null;
  }
  await update(renderer, provider(h(MissingId)));
  assert(results.every(query => query.fetchStatus === 'idle'));
  assert.equal(requests, 0);
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
  await act(async () => { await branch.mutateAsync({ businessId: id, name: 'Branch', city: 'Taiz', addressLine: 'Market Street 1' }); });
  assert(queryClient.getQueryState(branches).isInvalidated);
  for (const key of [detail, unrelated, otherBranches]) assert(!queryClient.getQueryState(key).isInvalidated);
  assert.deepEqual(requests, [
    { path: '/rest/v1/rpc/wow_create_business', body: { p_name: 'Shop', p_description: 'Description' } },
    { path: '/rest/v1/rpc/wow_create_branch', body: { p_business_id: id, p_name: 'Branch', p_city: 'Taiz', p_address_line: 'Market Street 1', p_district: null, p_latitude: null, p_longitude: null } },
  ]);
});

test('verification APIs use migration 003 RPC names and exact request fields', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, body: JSON.parse(options.body) });
    if (path.endsWith('wow_get_my_business_verifications') || path.endsWith('wow_admin_list_business_verifications')) return response([]);
    if (path.endsWith('wow_admin_get_business_verification')) return response({ id, status: 'submitted' });
    return response(id);
  };
  const client = makeClient();
  const evidence = [`business-verifications/${id}/user_a/id-proof.png`];
  assert.equal(await api.submitBusinessVerification(client, { businessId: id, branchId: otherId, requestType: 'initial', evidenceRefs: evidence }), id);
  assert.equal(await api.resubmitBusinessVerification(client, { verificationId: id, evidenceRefs: evidence }), id);
  assert.deepEqual(await api.getBusinessVerifications(client, id), []);
  assert.deepEqual(await api.listAdminBusinessVerifications(client, { status: 'submitted', limit: 20, offset: 10 }), []);
  assert.deepEqual(await api.getAdminBusinessVerification(client, id), { id, status: 'submitted' });
  assert.equal(await api.decideAdminBusinessVerification(client, { verificationId: id, decision: 'approved' }), id);
  assert.deepEqual(requests, [
    { path: '/rest/v1/rpc/wow_submit_business_verification', body: { p_business_id: id, p_branch_id: otherId, p_request_type: 'initial', p_evidence_refs: evidence } },
    { path: '/rest/v1/rpc/wow_resubmit_business_verification', body: { p_verification_id: id, p_evidence_refs: evidence } },
    { path: '/rest/v1/rpc/wow_get_my_business_verifications', body: { p_business_id: id } },
    { path: '/rest/v1/rpc/wow_admin_list_business_verifications', body: { p_status: 'submitted', p_limit: 20, p_offset: 10 } },
    { path: '/rest/v1/rpc/wow_admin_get_business_verification', body: { p_verification_id: id } },
    { path: '/rest/v1/rpc/wow_admin_decide_business_verification', body: { p_verification_id: id, p_decision: 'approved', p_reason: null } },
  ]);
});

test('Migration 004 offer RPCs use exact names, types and parameter keys', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, body: JSON.parse(options.body) });
    if (path.endsWith('wow_admin_list_pending_offers')) return response([]);
    if (path.endsWith('wow_admin_get_offer_review')) return response({ version: { id } });
    return response(id);
  };
  const client = makeClient();
  const payload = {
    title: 'Offer', offer_kind: 'product', final_price: '42.00', currency: 'YER',
    items: [{ item_type: 'product', name: 'Item' }], branches: [otherId],
  };
  assert.equal(await api.createOffer(client, { businessId: id }), id);
  assert.equal(await api.saveOfferDraft(client, { offerId: id, payload }), id);
  assert.equal(await api.submitOffer(client, id), id);
  assert.equal(await api.setOfferAvailability(client, { offerId: id, available: true, paused: false }), id);
  assert.deepEqual(await api.listAdminPendingOffers(client, { limit: 25, offset: 5 }), []);
  assert.deepEqual(await api.getAdminOfferReview(client, id), { version: { id } });
  assert.equal(await api.decideAdminOffer(client, { versionId: id, decision: 'approved' }), id);
  assert.deepEqual(requests, [
    { path: '/rest/v1/rpc/wow_create_offer', body: { p_business_id: id } },
    { path: '/rest/v1/rpc/wow_save_offer_draft', body: { p_offer_id: id, p_payload: payload } },
    { path: '/rest/v1/rpc/wow_submit_offer', body: { p_offer_id: id } },
    { path: '/rest/v1/rpc/wow_set_offer_availability', body: { p_offer_id: id, p_available: true, p_paused: false } },
    { path: '/rest/v1/rpc/wow_admin_list_pending_offers', body: { p_limit: 25, p_offset: 5 } },
    { path: '/rest/v1/rpc/wow_admin_get_offer_review', body: { p_version_id: id } },
    { path: '/rest/v1/rpc/wow_admin_decide_offer', body: { p_version_id: id, p_decision: 'approved', p_reason: null } },
  ]);
});

test('offers hooks stay idle while signed out and offer creation invalidates only the right business', async () => {
  let privateQueries;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return response([]); };
  function InspectPrivate() {
    recordClient();
    privateQueries = [
      api.useBusinessOffers(id), api.useOfferVersions(id),
      api.useOfferVersionDetails(id), api.useAdminPendingOffers(),
      api.useAdminOfferReview(id),
    ];
    return null;
  }
  const signedOut = await mount(provider(h(InspectPrivate), { userId: null, sessionScopeKey: null }));
  assert(privateQueries.every(q => q.fetchStatus === 'idle' && q.data === undefined));
  assert.equal(requests, 0);

  let mutation;
  let queryClient;
  const captured = [];
  globalThis.fetch = async (url, options) => {
    captured.push({ path: new URL(url).pathname, body: JSON.parse(options.body) });
    return response(id);
  };
  function InspectCreate() {
    queryClient = recordClient();
    mutation = api.useCreateOffer();
    return null;
  }
  await mount(provider(h(InspectCreate)));
  const current = api.wowQueryKeys.offers.business(id, 'user_a');
  const other = api.wowQueryKeys.offers.business(otherId, 'user_a');
  const otherUser = api.wowQueryKeys.offers.business(id, 'user_b');
  for (const key of [current, other, otherUser]) queryClient.setQueryData(key, []);
  await act(async () => assert.equal(await mutation.mutateAsync({ businessId: id }), id));
  assert.equal(queryClient.getQueryState(current).isInvalidated, true);
  assert.equal(queryClient.getQueryState(other).isInvalidated, false);
  assert.equal(queryClient.getQueryState(otherUser).isInvalidated, false);
  assert.deepEqual(captured, [{ path: '/rest/v1/rpc/wow_create_offer', body: { p_business_id: id } }]);
});

test('offer version detail reads are RLS-backed and return null for invisible versions', async () => {
  const seen = [];
  globalThis.fetch = async (url) => {
    const { pathname, searchParams } = new URL(url);
    seen.push({ pathname, search: searchParams.toString() });
    if (pathname.endsWith('/offer_versions')) {
      return response([{ id, offer_id: otherId, business_id: id, version_no: 1, review_status: 'draft' }]);
    }
    if (pathname.endsWith('/offer_items')) return response([{ id: otherId, offer_version_id: id, item_type: 'product', name: 'Item', sort_order: 0 }]);
    if (pathname.endsWith('/offer_item_attributes')) return response([{ id: otherId, offer_item_id: otherId, name: 'size', value: '1L', sort_order: 0 }]);
    if (pathname.endsWith('/offer_branches')) return response([{ business_id: id, offer_version_id: id, branch_id: otherId }]);
    if (pathname.endsWith('/offer_media')) return response([]);
    return response([]);
  };
  const client = makeClient();
  const detail = await api.getOfferVersionDetails(client, id);
  assert.equal(detail.version.id, id);
  assert.equal(detail.items[0].attributes[0].value, '1L');
  assert.equal(detail.branches[0].branch_id, otherId);
  for (const path of ['/offer_versions', '/offer_items', '/offer_item_attributes', '/offer_branches', '/offer_media']) {
    assert(seen.some(e => e.pathname.endsWith(path)), path);
  }
  assert(seen.some(e => e.pathname.endsWith('/offer_versions') && e.search.includes('id=eq.')));
  globalThis.fetch = async () => response(null);
  assert.equal(await api.getOfferVersionDetails(client, id), null);
});

test('Migration 005 RPCs use exact argument contracts, return types and redacted view names', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(options.body);
    calls.push({ path, body });
    if (path.endsWith('wow_set_saved_offer')) return response(true);
    if (path.endsWith('wow_set_saved_business')) return response(false);
    if (path.endsWith('wow_admin_get_complaint')) return response({ complaint: { id }, updates: [] });
    if (path.endsWith('wow_get_my_ratings') || path.endsWith('wow_get_my_complaints') ||
        path.endsWith('wow_get_business_complaints') || path.endsWith('wow_admin_list_ratings') ||
        path.endsWith('wow_admin_list_complaints')) return response([]);
    return response(id);
  };
  const client = makeClient();
  assert.equal(await api.setSavedOffer(client, { offerId: id, save: true }), true);
  assert.equal(await api.setSavedBusiness(client, { businessId: otherId, save: false }), false);
  assert.equal(await api.rateOffer(client, { offerId: id, conformity: 'could_not_verify' }), id);
  assert.deepEqual(await api.getMyRatings(client, { limit: 25, offset: 5 }), []);
  assert.equal(await api.submitComplaint(client, {
    offerId: id, complaintType: 'unavailable', description: 'Item not available at branch',
    offerVersionId: otherId,
  }), id);
  assert.deepEqual(await api.getMyComplaints(client), []);
  assert.deepEqual(await api.getBusinessComplaints(client, { businessId: otherId, limit: 10, offset: 0 }), []);
  assert.equal(await api.merchantRespondComplaint(client, { complaintId: id, message: 'Response from merchant' }), id);
  assert.deepEqual(await api.listAdminRatings(client, { moderationStatus: 'under_review' }), []);
  assert.equal(await api.adminModerateRating(client, { ratingId: id, status: 'excluded', reason: 'Evidence reviewed' }), id);
  assert.deepEqual(await api.listAdminComplaints(client, { status: 'new', offset: 7 }), []);
  assert.deepEqual(await api.getAdminComplaint(client, id), { complaint: { id }, updates: [] });
  assert.equal(await api.adminUpdateComplaint(client, {
    complaintId: id, status: 'closed', note: 'Complaint investigated',
    publicOutcome: 'Case has been resolved',
  }), id);
  const rpc = name => '/rest/v1/rpc/' + name;
  assert.deepEqual(calls, [
    { path: rpc('wow_set_saved_offer'), body: { p_offer_id: id, p_save: true } },
    { path: rpc('wow_set_saved_business'), body: { p_business_id: otherId, p_save: false } },
    { path: rpc('wow_rate_offer'), body: { p_offer_id: id, p_conformity: 'could_not_verify', p_experience_stars: null } },
    { path: rpc('wow_get_my_ratings'), body: { p_limit: 25, p_offset: 5 } },
    { path: rpc('wow_submit_complaint'), body: {
      p_offer_id: id, p_complaint_type: 'unavailable', p_description: 'Item not available at branch',
      p_offer_version_id: otherId, p_branch_id: null, p_incident_at: null, p_private_evidence_keys: [],
    } },
    { path: rpc('wow_get_my_complaints'), body: { p_limit: 50, p_offset: 0 } },
    { path: rpc('wow_get_business_complaints'), body: { p_business_id: otherId, p_limit: 10, p_offset: 0 } },
    { path: rpc('wow_merchant_respond_complaint'), body: { p_complaint_id: id, p_message: 'Response from merchant' } },
    { path: rpc('wow_admin_list_ratings'), body: { p_moderation_status: 'under_review', p_limit: 50, p_offset: 0 } },
    { path: rpc('wow_admin_moderate_rating'), body: { p_rating_id: id, p_status: 'excluded', p_reason: 'Evidence reviewed' } },
    { path: rpc('wow_admin_list_complaints'), body: { p_status: 'new', p_limit: 50, p_offset: 7 } },
    { path: rpc('wow_admin_get_complaint'), body: { p_complaint_id: id } },
    { path: rpc('wow_admin_update_complaint'), body: {
      p_complaint_id: id, p_status: 'closed', p_note: 'Complaint investigated',
      p_public_outcome: 'Case has been resolved',
    } },
  ]);
});

test('Migration 005 customer favorites query only authenticated owner table projections', async () => {
  const seen = [];
  globalThis.fetch = async (url, options) => {
    const u = new URL(url);
    seen.push(u);
    assert.equal(options.method, 'GET');
    if (u.pathname.endsWith('/saved_offers')) return response([{ id, user_id: 'user_a', offer_id: otherId, created_at: '2026-10-31T00:00:00Z' }]);
    if (u.pathname.endsWith('/saved_businesses')) return response([{ id: otherId, user_id: 'user_a', business_id: id, created_at: '2026-10-31T00:00:00Z' }]);
    throw Error('Forbidden raw table read: ' + u.pathname);
  };
  const client = makeClient();
  assert.equal((await api.getSavedOffers(client, 'user_a'))[0].offer_id, otherId);
  assert.equal((await api.getSavedBusinesses(client, 'user_a'))[0].business_id, id);
  assert.equal(seen.length, 2);
  assert(seen.every(u => u.searchParams.get('user_id') === 'eq.user_a'));
  assert(seen.some(u => u.pathname.endsWith('/saved_offers')));
  assert(seen.some(u => u.pathname.endsWith('/saved_businesses')));
});

test('Migration 005 hooks gate private reads and invalidate only the current account favorites', async () => {
  let results;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response([]); };
  function SignedOut() {
    recordClient();
    results = [
      api.useSavedOffers(), api.useSavedBusinesses(), api.useMyRatings(),
      api.useMyComplaints(), api.useBusinessComplaints({ businessId: id }),
      api.useAdminRatings(), api.useAdminComplaints(), api.useAdminComplaint(id),
    ];
    return null;
  }
  await mount(provider(h(SignedOut), { userId: null, sessionScopeKey: null }));
  assert(results.every(q => q.fetchStatus === 'idle' && q.data === undefined));
  assert.equal(calls, 0);

  let mutation;
  let queryClient;
  globalThis.fetch = async (url) => {
    assert(new URL(url).pathname.endsWith('/rpc/wow_set_saved_offer'));
    return response(true);
  };
  function SignedIn() {
    queryClient = recordClient();
    mutation = api.useSetSavedOffer();
    return null;
  }
  await mount(provider(h(SignedIn)));
  const keys = api.wowQueryKeys.interactions;
  queryClient.setQueryData(keys.savedOffers('user_a'), []);
  queryClient.setQueryData(keys.savedOffers('user_b'), []);
  queryClient.setQueryData(keys.savedBusinesses('user_a'), []);
  await act(async () => assert.equal(await mutation.mutateAsync({ offerId: id, save: true }), true));
  assert.equal(queryClient.getQueryState(keys.savedOffers('user_a')).isInvalidated, true);
  assert.equal(queryClient.getQueryState(keys.savedOffers('user_b')).isInvalidated, false);
  assert.equal(queryClient.getQueryState(keys.savedBusinesses('user_a')).isInvalidated, false);
});

test('Migration 006 billing RPCs send exact names, arguments and validate result shapes', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : {};
    requests.push({ path, body });
    if (path.endsWith('/wow_list_subscription_plans')) {
      return response([{ code: 'BASIC', name: 'Basic', price: '1200.00', currency: 'YER', duration_days: 30, feature_limits: {} }]);
    }
    if (path.endsWith('/wow_get_business_billing')) {
      return response({ business_id: id, has_publication_entitlement: false, subscriptions: [], payments: [], agreements: [] });
    }
    if (path.endsWith('/wow_admin_list_subscription_payments')) return response([]);
    return response(id);
  };
  const client = makeClient();
  assert.equal((await api.listSubscriptionPlans(client))[0].code, 'BASIC');
  assert.equal((await api.getBusinessBilling(client, id)).has_publication_entitlement, false);
  assert.equal(await api.activateBusinessTrial(client, id), id);
  assert.equal(await api.requestPaidSubscription(client, { businessId: id, planCode: 'BASIC' }), id);
  assert.equal(await api.submitSubscriptionPayment(client, { subscriptionId: id, method: 'wallet', reference: 'TEST-REF-1234' }), id);
  assert.equal(await api.adminConfigureSubscriptionPlan(client, {
    code: 'BASIC', price: '1200.00', currency: 'YER',
    durationDays: 30, featureLimits: { offers: 20 }, active: true,
  }), id);
  assert.deepEqual(await api.adminListSubscriptionPayments(client, { status: 'submitted', limit: 20, offset: 3 }), []);
  assert.equal(await api.adminDecideSubscriptionPayment(client, {
    paymentId: id, approve: false, note: 'Payment was not independently confirmed.',
  }), id);
  assert.equal(await api.adminCreateCommercialAgreement(client, {
    businessId: id, agreementType: 'partnership', grantsPublication: true,
    startsAt: '2026-11-01T00:00:00+03:00', endsAt: null,
    termsSnapshot: { approved: true }, reason: 'Approved partnership agreement',
  }), id);
  assert.equal(await api.adminRevokeCommercialAgreement(client, {
    agreementId: id, reason: 'Partnership agreement ended',
  }), id);
  const rpc = n => '/rest/v1/rpc/' + n;
  assert.deepEqual(requests, [
    { path: rpc('wow_list_subscription_plans'), body: {} },
    { path: rpc('wow_get_business_billing'), body: { p_business_id: id } },
    { path: rpc('wow_activate_business_trial'), body: { p_business_id: id } },
    { path: rpc('wow_request_paid_subscription'), body: { p_business_id: id, p_plan_code: 'BASIC' } },
    { path: rpc('wow_submit_subscription_payment'), body: {
      p_subscription_id: id, p_method: 'wallet', p_reference: 'TEST-REF-1234',
    } },
    { path: rpc('wow_admin_configure_subscription_plan'), body: {
      p_code: 'BASIC', p_price: '1200.00', p_currency: 'YER', p_duration_days: 30,
      p_feature_limits: { offers: 20 }, p_active: true,
    } },
    { path: rpc('wow_admin_list_subscription_payments'), body: {
      p_status: 'submitted', p_limit: 20, p_offset: 3,
    } },
    { path: rpc('wow_admin_decide_subscription_payment'), body: {
      p_payment_id: id, p_approve: false, p_note: 'Payment was not independently confirmed.',
    } },
    { path: rpc('wow_admin_create_commercial_agreement'), body: {
      p_business_id: id, p_agreement_type: 'partnership', p_grants_publication: true,
      p_starts_at: '2026-11-01T00:00:00+03:00', p_ends_at: null,
      p_terms_snapshot: { approved: true }, p_reason: 'Approved partnership agreement',
    } },
    { path: rpc('wow_admin_revoke_commercial_agreement'), body: {
      p_agreement_id: id, p_reason: 'Partnership agreement ended',
    } },
  ]);
});

test('Migration 006 billing private hooks wait for auth and trial update targets a single business', async () => {
  let results;
  let requestCount = 0;
  globalThis.fetch = async () => { requestCount++; return response([]); };
  function SignedOut() {
    recordClient();
    results = [
      api.useSubscriptionPlans(), api.useBusinessBilling(id), api.useAdminSubscriptionPayments(),
    ];
    return null;
  }
  await mount(provider(h(SignedOut), { userId: null, sessionScopeKey: null }));
  assert(results.every(query => query.fetchStatus === 'idle' && query.data === undefined));
  assert.equal(requestCount, 0);

  let mutation;
  let queryClient;
  globalThis.fetch = async (url) => {
    assert(new URL(url).pathname.endsWith('/rpc/wow_activate_business_trial'));
    return response(id);
  };
  function SignedIn() {
    queryClient = recordClient();
    mutation = api.useActivateBusinessTrial();
    return null;
  }
  await mount(provider(h(SignedIn)));
  const current = api.wowQueryKeys.billing.business('user_a', id);
  const unrelated = api.wowQueryKeys.billing.business('user_a', otherId);
  const anotherAccount = api.wowQueryKeys.billing.business('user_b', id);
  for (const key of [current, unrelated, anotherAccount]) queryClient.setQueryData(key, {});
  await act(async () => assert.equal(await mutation.mutateAsync(id), id));
  assert.equal(queryClient.getQueryState(current).isInvalidated, true);
  assert.equal(queryClient.getQueryState(unrelated).isInvalidated, false);
  assert.equal(queryClient.getQueryState(anotherAccount).isInvalidated, false);
});

test('Migration 006 billing rejects unexpected RPC JSON results and never enables proof upload', async () => {
  const client = makeClient();
  globalThis.fetch = async url => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/wow_list_subscription_plans')) return response({});
    if (pathname.endsWith('/wow_get_business_billing')) return response([]);
    if (pathname.endsWith('/wow_admin_list_subscription_payments')) return response({});
    return response(null);
  };
  await assert.rejects(api.listSubscriptionPlans(client), /JSON array/);
  await assert.rejects(api.getBusinessBilling(client, id), /JSON object/);
  await assert.rejects(api.adminListSubscriptionPayments(client), /JSON array/);
  await assert.rejects(api.submitSubscriptionPayment(client, {
    subscriptionId: id, method: 'cash', reference: 'TEST-REF-0001',
  }), /no scalar UUID/);
});

test('Migration 007 public RPCs send exact search parameters and safe null detail responses', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    calls.push({ path, body: options.body ? JSON.parse(options.body) : {} });
    if (path.endsWith('/wow_public_list_categories')) return response([{ id, parent_id: null, slug: 'groceries', name_ar: 'مواد غذائية', name_en: null }]);
    if (path.endsWith('/wow_public_search_businesses')) return response({ total: 0, limit: 5, offset: 10, items: [] });
    return response(null);
  };
  const client = api.createWowPublicSupabaseClient('https://wow.invalid', 'sb_publishable_local');
  assert.equal((await api.listPublicCategories(client))[0].slug, 'groceries');
  assert.deepEqual(await api.searchPublicBusinesses(client, {
    query: 'coffee', city: 'Taiz', district: 'Center', categoryId: id, sort: 'discount', limit: 5, offset: 10,
  }), { total: 0, limit: 5, offset: 10, items: [] });
  assert.equal(await api.getPublicBusiness(client, id), null);
  assert.equal(await api.getPublicOffer(client, id), null);
  assert.deepEqual(calls, [
    { path: '/rest/v1/rpc/wow_public_list_categories', body: {} },
    { path: '/rest/v1/rpc/wow_public_search_businesses', body: {
      p_query: 'coffee', p_city: 'Taiz', p_district: 'Center', p_category_id: id,
      p_sort: 'discount', p_limit: 5, p_offset: 10,
    } },
    { path: '/rest/v1/rpc/wow_public_get_business', body: { p_business_id: id } },
    { path: '/rest/v1/rpc/wow_public_get_offer', body: { p_offer_id: id } },
  ]);
});

test('Migration 007 anonymous discovery hooks run signed-out without a Clerk token', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({
      path: new URL(url).pathname,
      authorization: options.headers.get('Authorization'),
    });
    if (new URL(url).pathname.endsWith('/wow_public_list_categories')) return response([]);
    if (new URL(url).pathname.endsWith('/wow_public_search_businesses')) {
      return response({ total: 0, limit: 20, offset: 0, items: [] });
    }
    return response(null);
  };
  let categories;
  let search;
  let business;
  let offer;
  function Guest() {
    recordClient();
    const config = { url: 'https://wow.invalid', publishableKey: 'sb_publishable_local' };
    categories = api.usePublicCategories(config);
    search = api.usePublicSearchBusinesses({}, config);
    business = api.usePublicBusiness(id, config);
    offer = api.usePublicOffer(otherId, config);
    return null;
  }
  await mount(provider(h(Guest), { userId: null, sessionScopeKey: null, getClient: () => null }));
  await act(tick);
  assert.deepEqual(categories.data, []);
  assert.deepEqual(search.data, { total: 0, limit: 20, offset: 0, items: [] });
  assert.equal(business.data, null);
  assert.equal(offer.data, null);
  assert.equal(calls.length, 4);
  assert(calls.every(c => c.authorization !== 'Bearer local-session-token'));
  assert(calls.every(c => c.path.startsWith('/rest/v1/rpc/wow_public_')));
});

test('Migration 007 admin category mutations are authenticated and invalidate discovery', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ path: new URL(url).pathname, body: JSON.parse(options.body) });
    return response(id);
  };
  const client = makeClient();
  assert.equal(await api.adminUpsertCategory(client, {
    slug: 'groceries', nameAr: 'مواد غذائية', nameEn: 'Groceries', active: true, sortOrder: 2,
  }), id);
  assert.equal(await api.adminSetBusinessCategories(client, {
    businessId: id, categoryIds: [otherId], primaryCategoryId: otherId,
    reason: 'Merchant category approved by administrator',
  }), id);
  assert.deepEqual(calls, [
    { path: '/rest/v1/rpc/wow_admin_upsert_category', body: {
      p_id: null, p_slug: 'groceries', p_name_ar: 'مواد غذائية', p_name_en: 'Groceries',
      p_parent_id: null, p_sort_order: 2, p_is_active: true,
    } },
    { path: '/rest/v1/rpc/wow_admin_set_business_categories', body: {
      p_business_id: id, p_category_ids: [otherId], p_primary_category_id: otherId,
      p_reason: 'Merchant category approved by administrator',
    } },
  ]);

  let mutation;
  let queryClient;
  function Admin() {
    queryClient = recordClient();
    mutation = api.useAdminUpsertCategory();
    return null;
  }
  await mount(provider(h(Admin)));
  const categories = api.wowQueryKeys.discovery.categories();
  const search = api.wowQueryKeys.discovery.search(null, null, null, null, 'recent', 20, 0);
  queryClient.setQueryData(categories, []);
  queryClient.setQueryData(search, { total: 0, items: [], limit: 20, offset: 0 });
  await act(async () => {
    await mutation.mutateAsync({ slug: 'groceries', nameAr: 'مواد غذائية', active: true });
  });
  assert.equal(queryClient.getQueryState(categories).isInvalidated, true);
  assert.equal(queryClient.getQueryState(search).isInvalidated, true);
});

test('Migration 007 rejects malformed public search results and private Supabase keys', async () => {
  assert.throws(
    () => api.createWowPublicSupabaseClient('https://wow.invalid', 'sb_secret_private'),
    /Secret\\/service-role keys are prohibited/,
  );
  globalThis.fetch = async () => response({ total: 1, limit: 20, offset: 0 });
  const client = api.createWowPublicSupabaseClient('https://wow.invalid', 'sb_publishable_local');
  await assert.rejects(api.searchPublicBusinesses(client), /unexpected result shape/);
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

test('query retry runs once without multiplying Supabase SDK retries', async () => {
  const queryClient = api.createWowQueryClient();
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retryDelay: 0 } });
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(JSON.stringify({ code: '503', message: 'Unavailable' }), {
      status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '0' },
    });
  };
  try {
    await assert.rejects(queryClient.fetchQuery({
      queryKey: api.wowQueryKeys.businesses.mine('user_a'),
      queryFn: () => api.getMyBusinesses(makeClient(), 'user_a'),
    }), error => error.code === '503');
    assert.equal(requests, 2);
  } finally { queryClient.clear(); }
});

test('a late mutation response cannot populate or invalidate the next session cache', async () => {
  let mutation;
  let queryClient;
  let finishRequest;
  globalThis.fetch = async () => new Promise(resolve => { finishRequest = () => resolve(response(id)); });
  function Inspect() {
    queryClient = recordClient();
    mutation = api.useCreateBusiness();
    return null;
  }
  const renderer = await mount(provider(h(Inspect)));
  let pending;
  await act(async () => { pending = mutation.mutateAsync({ name: 'Shop' }); await tick(); });
  assert.equal(typeof finishRequest, 'function');
  await update(renderer, provider(h(Inspect), { userId: 'user_b', sessionScopeKey: scope('user_b', 'session_b') }));
  const key = api.wowQueryKeys.businesses.mine('user_b');
  queryClient.setQueryData(key, []);
  await act(async () => { finishRequest(); await pending; });
  assert.equal(mutation.status, 'idle');
  assert.equal(queryClient.getQueryState(key).isInvalidated, false);
  assert.equal(queryClient.getQueryData(api.wowQueryKeys.businesses.detail(id, 'user_a')), undefined);
  assert.equal(queryClient.getMutationCache().getAll().length, 0);
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
