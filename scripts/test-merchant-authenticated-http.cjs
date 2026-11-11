'use strict';
// Opt-in, read-only, TRUE Clerk JWT -> Supabase HTTP/RLS verification.
// Tokens must be short-lived and injected into the process via protected secrets.
// No fixture creation, mutation or token logging. Not a substitute for browser E2E.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const REQUIRED = [
  'WOW_E2E_SUPABASE_URL', 'WOW_E2E_SUPABASE_PUBLISHABLE_KEY',
  'WOW_E2E_OWNER_JWT', 'WOW_E2E_NONOWNER_JWT', 'WOW_E2E_ADMIN_CANDIDATE_JWT',
  'WOW_E2E_OWNER_BUSINESS_ID', 'WOW_E2E_OWNER_BRANCH_ID',
];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) throw new Error(`Missing opt-in E2E environment settings: ${missing.join(', ')}`);
const cfg = Object.fromEntries(REQUIRED.map(k => [k, process.env[k]]));
const api = new URL(cfg.WOW_E2E_SUPABASE_URL);
if (api.protocol !== 'https:') throw new Error('Supabase E2E URL must use HTTPS.');
if (api.hostname !== 'jfqmdnffqwkqevdhmtfi.supabase.co') {
  throw new Error('Refusing to test an unexpected Supabase project.');
}

// Decode only for expected subject & expiry. This does NOT validate the signature.
function subject(token) {
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  if (!claims.sub || !claims.exp || claims.exp * 1000 < Date.now() + 15_000) {
    throw new Error('Missing subject or expired/near-expired Clerk E2E token.');
  }
  return claims.sub;
}
const ownerId = subject(cfg.WOW_E2E_OWNER_JWT);
const nonownerId = subject(cfg.WOW_E2E_NONOWNER_JWT);
const adminCandidateId = subject(cfg.WOW_E2E_ADMIN_CANDIDATE_JWT);
assert.notEqual(ownerId, nonownerId, 'The test requires distinct authenticated sessions.');
assert.notEqual(ownerId, adminCandidateId, 'Admin candidate must be independent of business owner.');

async function getRows(token, table, filters) {
  const url = new URL(`/rest/v1/${table}`, api);
  for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, v);
  url.searchParams.set('select', table === 'users' ? 'id,account_status' : 'id');
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    headers: {
      apikey: cfg.WOW_E2E_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if ([401, 403].includes(response.status)) return { denied: true, data: [] };
  if (!response.ok) throw new Error(`${table}: unexpected HTTP ${response.status}`);
  const data = await response.json();
  assert.ok(Array.isArray(data), 'PostgREST did not return a list.');
  return { denied: false, data };
}

test('owner session reads its own synchronized user profile', async () => {
  const { denied, data } = await getRows(cfg.WOW_E2E_OWNER_JWT, 'users', { id: `eq.${ownerId}` });
  assert.equal(denied, false);
  assert.equal(data.length, 1);
  assert.equal(data[0].id, ownerId);
});

test('second user cannot read owner profile', async () => {
  const { data } = await getRows(cfg.WOW_E2E_NONOWNER_JWT, 'users', { id: `eq.${ownerId}` });
  assert.equal(data.length, 0);
});

test('owner can read its known business fixture', async () => {
  const { denied, data } = await getRows(cfg.WOW_E2E_OWNER_JWT, 'businesses', { id: `eq.${cfg.WOW_E2E_OWNER_BUSINESS_ID}` });
  assert.equal(denied, false);
  assert.equal(data.length, 1, 'Fixture is missing or not owned by this token.');
});

test('nonowner cannot read the same merchant business', async () => {
  const { data } = await getRows(cfg.WOW_E2E_NONOWNER_JWT, 'businesses', { id: `eq.${cfg.WOW_E2E_OWNER_BUSINESS_ID}` });
  assert.equal(data.length, 0);
});

test('owner sees branch and nonowner cannot see that branch', async () => {
  const filter = { id: `eq.${cfg.WOW_E2E_OWNER_BRANCH_ID}` };
  const own = await getRows(cfg.WOW_E2E_OWNER_JWT, 'business_branches', filter);
  assert.equal(own.denied, false);
  assert.equal(own.data.length, 1, 'Owner branch fixture missing.');
  const other = await getRows(cfg.WOW_E2E_NONOWNER_JWT, 'business_branches', filter);
  assert.equal(other.data.length, 0);
});

test('ordinary Clerk account cannot call the admin review list RPC', async () => {
  const url = new URL('/rest/v1/rpc/wow_admin_list_business_verifications', api);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: cfg.WOW_E2E_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${cfg.WOW_E2E_ADMIN_CANDIDATE_JWT}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_status: null, p_limit: 1, p_offset: 0 }),
    signal: AbortSignal.timeout(15_000),
  });
  // This is a read-only RPC. A 404/missing signature is inconclusive, NOT a security pass.
  if (response.status === 404) throw new Error('Admin RPC is missing; cannot prove authorization.');
  if ([401, 403].includes(response.status)) return;
  const error = await response.json().catch(() => ({}));
  if (response.status >= 400 && ['42501', 'P0001'].includes(String(error.code))) return;
  assert.fail(`Admin candidate unexpectedly reached privileged RPC: HTTP ${response.status}`);
});
