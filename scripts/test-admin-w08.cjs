'use strict';
// W08 first tranche: admin queue/read-only detail contract. Authenticated
// reviewer writes and private evidence are separate acceptance gates.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

test('W08 administrative routes are protected and validate complaint identifiers', () => {
  for (const p of ['complaints.tsx', 'ratings.tsx', 'complaints/[id].tsx']) {
    const s = read('apps/admin/src/app/' + p);
    assert.match(s, /W06GuardedPage/);
  }
  const detail = read('apps/admin/src/app/complaints/[id].tsx');
  assert.match(detail, /\[0-9a-f\]/);
  assert.match(detail, /معرّف الشكوى غير صالح/);
  const shell = read('apps/admin/src/features/shell/AdminShell.tsx');
  assert.match(shell, /navTo\('\/complaints'\)/);
  assert.match(shell, /navTo\('\/ratings'\)/);
});

test('W08 queue lists use existing server-authorized RPC hooks and bounded pagination', () => {
  const q = read('apps/admin/src/features/w08/ModerationQueues.tsx');
  assert.match(q, /useAdminComplaints\(\{ status, offset, limit: PAGE_SIZE \}\)/);
  assert.match(q, /useAdminRatings\(\{ moderationStatus: status, offset, limit: PAGE_SIZE \}\)/);
  assert.match(q, /const PAGE_SIZE = 25/);
  assert.match(q, /W06Paging/);
  assert.match(q, /query\.isError/);
  assert.match(q, /query\.isPending/);
  assert.match(q, /query\.isSuccess/);
  assert.doesNotMatch(q, /MOCK|setTimeout|getPublicUrl|service_role/);
});

test('W08 complaint details render allowlisted fields without disclosing raw RPC objects', () => {
  const s = read('apps/admin/src/features/w08/ComplaintDetail.tsx');
  assert.match(s, /useAdminComplaint\(id\)/);
  assert.match(s, /record\(query\.data\?\.complaint\)/);
  assert.match(s, /query\.isPending/);
  assert.match(s, /query\.isError/);
  assert.doesNotMatch(s, /JSON\.stringify\(query\.data|private_evidence_keys|storage_key|signedURL|publicUrl/);
});

test('W08 first tranche never exposes write actions without review confirmation', () => {
  const queue = read('apps/admin/src/features/w08/ModerationQueues.tsx');
  const detail = read('apps/admin/src/features/w08/ComplaintDetail.tsx');
  for (const s of [queue, detail]) {
    assert.doesNotMatch(s, /useAdminModerateRating|useAdminUpdateComplaint|useAdminRequestMerchantResponse/);
    assert.doesNotMatch(s, /mutateAsync|\.mutate\(/);
  }
});
