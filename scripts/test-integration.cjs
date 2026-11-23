// Local guard/diagnostic regression tests. No successful database responses are mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const output = mkdtempSync(resolve(tmpdir(), 'wow-integration-tests-'));
const compiler = require.resolve('typescript/lib/tsc.js', { paths: [resolve(root, 'apps/customer')] });
execFileSync(process.execPath, [compiler, '--target', 'ES2022', '--module', 'Node16', '--moduleResolution', 'Node16', '--ignoreDeprecations', '6.0', '--skipLibCheck', '--strict', '--outDir', output, '--rootDir', 'packages/api/src', 'packages/api/src/integration/index.ts'], { cwd: root, stdio: 'inherit' });
const { integrationTests, executeIntegrationTest, redact, errorDetails, validatePublicSupabaseKey } = require(resolve(output, 'integration/index.js'));
const { permissionDenied } = require(resolve(output, 'integration/helpers.js'));
const context = (overrides = {}) => ({ application: 'merchant', isLoaded: true, isSignedIn: true, userId: 'user_owner', getToken: async () => null, client: {}, anonymousClient: null, assertIdentity() {}, knownOtherUserId: '', otherUserExistsConfirmed: false, branchParameters: {}, artifacts: { verifiedProfiles: [] }, ...overrides });
const run = (id, c = context(), confirmed = false) => executeIntegrationTest(integrationTests(c.application).find(test => test.id === id), c, confirmed);

test('all apps expose shared tests, merchant and admin expose their own checks', () => {
  assert.equal(integrationTests('customer').length, 6);
  assert.equal(integrationTests('merchant').length, 13);
  assert.equal(integrationTests('admin').length, 11);
  for (const app of ['customer', 'merchant', 'admin']) {
    const tests = integrationTests(app);
    assert.equal(new Set(tests.map(t => t.id)).size, tests.length);
    assert(tests.find(t => t.id === 'users.write').stateChanging);
  }
});
test('all write tests refuse execution without explicit confirmation', async () => {
  for (const test of integrationTests('merchant').filter(t => t.stateChanging)) {
    const result = await executeIntegrationTest(test, context());
    assert.equal(result.status, 'SKIPPED');
    assert.match(result.explanation, /confirmation/);
  }
});
test('unknown or same-user IDs cannot prove cross-user RLS', async () => {
  for (const id of ['', 'user_owner', 'user_unverified']) {
    assert.equal((await run('users.isolation', context({ knownOtherUserId: id }))).status, 'SKIPPED');
  }
});
test('merchant isolation refuses unverified and same-owner evidence', async () => {
  assert.equal((await run('merchant.isolation')).status, 'SKIPPED');
  assert.equal((await run('merchant.isolation', context({ artifacts: { verifiedProfiles: [], businessId: 'existing', ownerUserId: 'user_owner', ownershipVerified: true } }))).status, 'SKIPPED');
});
test('creation reuses a captured business without calling the database', async () => {
  const c = context({ artifacts: { verifiedProfiles: [], businessId: 'captured', ownerUserId: 'user_owner' } });
  assert.equal((await run('merchant.create', c, true)).status, 'PASS');
});
test('branches require authenticated owner evidence', async () => {
  for (const id of ['merchant.branch.first', 'merchant.branch.second', 'merchant.branch.unauthorized']) assert.equal((await run(id, context(), true)).status, 'SKIPPED');
});
test('owner cannot complete unauthorized branch check before a second-account denial', async () => {
  const c = context({ artifacts: { verifiedProfiles: [], businessId: 'captured', ownerUserId: 'user_owner', ownershipVerified: true } });
  assert.equal((await run('merchant.branch.unauthorized', c, true)).status, 'SKIPPED');
});
test('future admin tests explicitly skip without client access', async () => {
  for (const test of integrationTests('admin').filter(t => t.id.startsWith('admin.future'))) {
    const result = await executeIntegrationTest(test, context({ application: 'admin' }));
    assert.equal(result.status, 'SKIPPED');
    assert.equal(result.explanation, 'Admin authorization backend not implemented yet');
  }
});
test('SQL/schema/credential failures do not masquerade as permission protection', () => {
  assert(permissionDenied({ code: '42501' }, 403));
  assert(permissionDenied({ code: 'P0001', message: 'Unauthorized' }, 400, true));
  for (const code of ['23502', '23503', 'PGRST202', '42P01']) assert(!permissionDenied({ code, message: 'unrelated failure' }, 400, true));
  assert(!permissionDenied({ code: 'PGRST301', message: 'JWT expired' }, 401));
});
test('anonymous invalid JWT errors fail with actual diagnostics', async () => {
  const anonymousClient = { from: () => ({ select: () => ({ limit: async () => ({ data: null, error: { code: 'PGRST301', message: 'JWT expired' }, status: 401 }) }) }) };
  const result = await run('users.anonymous', context({ anonymousClient }));
  assert.equal(result.status, 'FAIL');
  assert.equal(result.error.httpStatus, 401);
  assert.equal(result.error.code, 'PGRST301');
});
test('identity changes fail before authenticated requests', async () => {
  const result = await run('auth.session', context({ assertIdentity() { throw new Error('Clerk identity changed'); } }));
  assert.equal(result.status, 'FAIL');
  assert.match(result.explanation, /identity changed/);
});
test('signed-out or initializing Clerk does not report a session pass', async () => {
  assert.equal((await run('auth.session', context({ isLoaded: false }))).status, 'SKIPPED');
  assert.equal((await run('auth.session', context({ isSignedIn: false }))).status, 'FAIL');
  assert.equal((await run('auth.session')).status, 'FAIL');
});
test('tokens, keys, emails and failing-row details are redacted', () => {
  const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyIn0.signature';
  const input = `${token} sb_secret_example sk_test_example person@example.com`;
  assert(!redact(input).includes(token));
  assert(!redact(input).includes('example'));
  assert.equal(errorDetails({ message: 'denied', details: 'Failing row contains (private data)' }, 403).details, '[ROW DATA OMITTED]');
});
test('only public Supabase keys are accepted, including legacy anon JWTs', () => {
  validatePublicSupabaseKey('sb_publishable_example');
  const key = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  validatePublicSupabaseKey(key('anon'));
  for (const value of ['sb_secret_example', 'sk_live_example', key('service_role'), 'invalid']) assert.throws(() => validatePublicSupabaseKey(value), /prohibited/);
});
test('failed creation retains ambiguous outcomes and blocks duplicate retries', async () => {
  let requests = 0;
  const c = context({ client: { rpc: async () => { requests++; throw new Error('Network unavailable'); } } });
  assert.equal((await run('merchant.create', c, true)).status, 'FAIL');
  assert.deepEqual(c.artifacts.unresolvedWrites, ['businessId']);
  assert.equal((await run('merchant.create', c, true)).status, 'FAIL');
  assert.equal(requests, 1);
});
test('direct inserts retain the attempted UUID and block retries after transport failure', async () => {
  for (const throws of [true, false]) {
    let requests = 0;
    const c = context({ client: { from: () => ({ insert: async () => {
      requests++;
      if (throws) throw new Error('Network unavailable');
      return { data: null, error: { message: 'Failed to fetch' }, status: 0 };
    } }) } });
    assert.equal((await run('merchant.direct', c, true)).status, 'FAIL');
    const attemptedId = c.artifacts.directAttemptId;
    assert.match(attemptedId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(c.artifacts.unresolvedWrites, ['directBusinessId']);
    assert.equal((await run('merchant.direct', c, true)).status, 'FAIL');
    assert.equal(c.artifacts.directAttemptId, attemptedId);
    assert.equal(requests, 1);
  }
});
test('transactional insert denial clears pending state and permits a deliberate rerun', async () => {
  let requests = 0;
  const c = context({ client: { from: () => ({ insert: async () => {
    requests++;
    return { data: null, error: { code: '42501', message: 'Permission denied' }, status: 403 };
  } }) } });
  assert.equal((await run('merchant.direct', c, true)).status, 'PASS');
  assert.deepEqual(c.artifacts.unresolvedWrites, []);
  assert.equal((await run('merchant.direct', c, true)).status, 'PASS');
  assert.equal(requests, 2);
});
test('captured unauthorized success blocks further second-account writes', async () => {
  const c = context({ artifacts: { verifiedProfiles: [], businessId: 'captured', ownerUserId: 'user_other', ownershipVerified: true, unauthorizedBranchId: 'unexpected-branch' } });
  const result = await run('merchant.branch.unauthorized', c, true);
  assert.equal(result.status, 'FAIL');
  assert.match(result.explanation, /previous second-account branch RPC succeeded/);
});
test('SQL creation failures remain retryable and keep their diagnostics', async () => {
  let requests = 0;
  const c = context({ client: { rpc: async () => {
    requests++;
    return { data: null, error: { code: '23502', message: 'Required field is missing' }, status: 400 };
  } } });
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await run('merchant.create', c, true);
    assert.equal(result.status, 'FAIL');
    assert.equal(result.error.code, '23502');
    assert.equal(result.error.httpStatus, 400);
    assert.deepEqual(c.artifacts.unresolvedWrites, []);
  }
  assert.equal(requests, 2);
});
