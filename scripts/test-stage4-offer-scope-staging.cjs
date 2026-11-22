#!/usr/bin/env node
'use strict';

// AUD-015 / AUD-021 / AUD-022: live HTTP regression against an isolated,
// disposable staging database only. Never use this runner against production.
// Requires deliberately provisioned accounts and known-existing fixture objects.
const assert = require('node:assert/strict');

const required = [
  'WOW_STAGE4_SUPABASE_URL', 'WOW_STAGE4_PUBLISHABLE_KEY',
  'WOW_STAGE4_OWNER_JWT', 'WOW_STAGE4_EMPLOYEE_A_JWT',
  'WOW_STAGE4_EMPLOYEE_B_JWT', 'WOW_STAGE4_OFFER_B_ID',
  'WOW_STAGE4_OFFER_A_ID', 'WOW_STAGE4_PRIVATE_B_MEDIA_KEY',
  'WOW_STAGE4_OFFER_B_WITH_DRAFT_ID', 'WOW_STAGE4_VALID_DRAFT_JSON',
  'WOW_STAGE4_EMP_A_DRAFT_ID', 'WOW_STAGE4_FOREIGN_BRANCH_ID'
];
if (process.env.WOW_STAGE4_ISOLATED_STAGING !== 'I_CONFIRM_DISPOSABLE_STAGING') {
  throw new Error('Refusing to run: confirm disposable staging explicitly.');
}
const missing = required.filter((n) => !process.env[n]);
if (missing.length) throw new Error('Missing staging fixture parameters: ' + missing.join(', '));
const base = new URL(process.env.WOW_STAGE4_SUPABASE_URL);
if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid staging URL protocol');
if (base.hostname === 'jfqmdnffqwkqevdhmtfi.supabase.co') {
  throw new Error('Refusing to run on the connected MUSNAD-WOW Supabase database');
}
if (!base.hostname.includes('supabase.co') && !['localhost', '127.0.0.1'].includes(base.hostname)) {
  throw new Error('Unrecognized staging database host; no arbitrary remote HTTP targets');
}

const key = process.env.WOW_STAGE4_PUBLISHABLE_KEY;
const owner = process.env.WOW_STAGE4_OWNER_JWT;
const empA = process.env.WOW_STAGE4_EMPLOYEE_A_JWT;
const empB = process.env.WOW_STAGE4_EMPLOYEE_B_JWT;
const offerA = process.env.WOW_STAGE4_OFFER_A_ID;
const offerB = process.env.WOW_STAGE4_OFFER_B_ID;
const mediaB = process.env.WOW_STAGE4_PRIVATE_B_MEDIA_KEY;
const draftB = process.env.WOW_STAGE4_OFFER_B_WITH_DRAFT_ID;
const results = [];

async function request(method, endpoint, token, payload) {
  const resp = await fetch(new URL(endpoint, base), {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  let data = null;
  const body = await resp.text();
  try { data = JSON.parse(body); } catch { data = { message: body.slice(0, 200) }; }
  return { status: resp.status, ok: resp.ok, data };
}
function rpc(name, token, payload) {
  return request('POST', '/rest/v1/rpc/' + name, token, payload);
}
function signedMedia(token) {
  return request('POST',
    '/storage/v1/object/sign/wow-offer-media/' +
    mediaB.split('/').map(encodeURIComponent).join('/'),
    token, { expiresIn: 60 });
}
function denied(r, name) {
  assert.ok(!r.ok, name + ': unexpectedly succeeded');
  assert.ok([400, 401, 403, 404].includes(r.status), name + ': unexpected status ' + r.status);
  // 400/404 from Storage can hide a forbidden existing object. We first prove
  // the *same key* is accessible to the owner, so this is not a missing object.
  if (r.status === 400 && !name.startsWith('media-')) {
    assert.equal(r.data?.code, '42501', name + ': rejection must be an authorization failure');
  }
}
async function run(name, fn) {
  try {
    await fn();
    results.push({ name, result: 'PASS' });
    console.log('PASS', name);
  } catch (err) {
    results.push({ name, result: 'FAIL', reason: err.message });
    console.error('FAIL', name, err.message);
  }
}
(async () => {
  await run('media-owner-known-existing-object', async () => {
    const r = await signedMedia(owner);
    assert.ok(r.ok, 'owner must be able to sign fixture object; HTTP ' + r.status);
    assert.ok(r.data?.signedURL || r.data?.signedUrl,
      'Storage did not return a signed URL for an existing object');
  });
  if (results[0].result !== 'PASS') {
    throw new Error('Cannot infer Storage denial without proving the fixture object exists');
  }
  await run('media-employee-outside-branch-denied', async () => {
    denied(await signedMedia(empA), 'media-employee-outside-branch-denied');
  });
  await run('evidence-own-version-readable', async () => {
    const r = await rpc('wow_get_offer_evidence_draft', empA, { p_offer_id: offerA });
    assert.ok(r.ok, 'employee A must read authorized evidence: ' + r.status);
  });
  await run('evidence-other-branch-denied', async () => {
    denied(await rpc('wow_get_offer_evidence_draft', empA, { p_offer_id: offerB }),
      'evidence-other-branch-denied');
  });
  let evidenceBefore;
  await run('evidence-employee-B-before-denied-write', async () => {
    const r = await rpc('wow_get_offer_evidence_draft', empB, { p_offer_id: offerB });
    assert.ok(r.ok, 'employee B should retain access: ' + r.status);
    evidenceBefore = r.data;
  });
  await run('evidence-other-branch-write-denied', async () => {
    denied(await rpc('wow_save_offer_evidence_draft', empA,
      { p_offer_id: offerB, p_documents: [] }), 'evidence-other-branch-write-denied');
  });
  await run('evidence-other-branch-write-unchanged', async () => {
    assert.notEqual(evidenceBefore, undefined, 'missing evidence snapshot');
    const r = await rpc('wow_get_offer_evidence_draft', empB, { p_offer_id: offerB });
    assert.ok(r.ok, 'employee B should still read evidence: ' + r.status);
    assert.deepEqual(r.data, evidenceBefore, 'denied mutation unexpectedly altered evidence');
  });
  await run('draft-other-employee-edit-denied', async () => {
    const validPayload = JSON.parse(process.env.WOW_STAGE4_VALID_DRAFT_JSON || 'null');
    if (!validPayload || !Array.isArray(validPayload.items) ||
        !Array.isArray(validPayload.branches)) {
      throw new Error('WOW_STAGE4_VALID_DRAFT_JSON is required for draft mutation tests');
    }
    denied(await rpc('wow_save_offer_draft', empA,
      { p_offer_id: draftB, p_payload: validPayload }), 'draft-other-employee-edit-denied');
  });
  // This case uses a disposable employee-A draft and must reject the branch
  // after the RPC has entered the transactional save path.
  await run('draft-unassigned-branch-denied-atomically', async () => {
    const payload = JSON.parse(process.env.WOW_STAGE4_VALID_DRAFT_JSON);
    payload.branches = [process.env.WOW_STAGE4_FOREIGN_BRANCH_ID];
    denied(await rpc('wow_save_offer_draft', empA,
      { p_offer_id: process.env.WOW_STAGE4_EMP_A_DRAFT_ID, p_payload: payload }),
      'draft-unassigned-branch-denied-atomically');
  });
  const passed = results.filter((r) => r.result === 'PASS').length;
  const failed = results.filter((r) => r.result === 'FAIL').length;
  const notRun = results.filter((r) => r.result === 'NOT_RUN').length;
  console.log(JSON.stringify({ suite: 'AUD-015/021/022 HTTP staging', passed, failed, notRun }));
  if (failed || notRun) process.exitCode = 1;
})().catch((err) => {
  console.error('Suite blocked:', err.message);
  process.exitCode = 1;
});
