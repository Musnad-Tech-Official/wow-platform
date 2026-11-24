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

test('W08 rating moderation requires verified reviewer, reason and independent confirmation', () => {
  const route = read('apps/admin/src/app/ratings.tsx');
  const queue = read('apps/admin/src/features/w08/ModerationQueues.tsx');
  const editor = read('apps/admin/src/features/w08/RatingDecision.tsx');
  assert.match(route, /<AdminRatingsQueue role=\{role\}/);
  assert.match(queue, /<RatingDecision key=\{item\.id/);
  assert.match(editor, /canSubmitW06Decision\(role\)/);
  assert.match(editor, /useAdminModerateRating\(\)/);
  assert.match(editor, /choice !== currentStatus/);
  assert.match(editor, /note\.length >= 5 && note\.length <= 2000/);
  assert.match(editor, /confirmed && !mutation\.isPending/);
  assert.match(editor, /if \(!valid \|\| !choice\) return/);
  assert.match(editor, /await mutation\.mutateAsync\(\{ ratingId, status: choice, reason: note \}\)/);
  assert.match(editor, /disabled=\{!valid\}/);
  assert.doesNotMatch(editor, /service_role|getPublicUrl|\.from\(/);
});

test('W08 complaint decisions require role, validated notes and explicit confirmation', () => {
  const route = read('apps/admin/src/app/complaints/[id].tsx');
  const detail = read('apps/admin/src/features/w08/ComplaintDetail.tsx');
  const action = read('apps/admin/src/features/w08/ComplaintActions.tsx');
  assert.match(route, /<AdminComplaintDetail id=\{id\} role=\{role\}/);
  assert.match(detail, /<ComplaintActions key=\{id \+ ':' \+ status\}/);
  assert.match(action, /canSubmitW06Decision\(role\)/);
  assert.match(action, /status !== 'closed'/);
  assert.match(action, /useAdminRequestMerchantResponse\(\)/);
  assert.match(action, /useAdminUpdateComplaint\(\)/);
  assert.match(action, /normalizedNote\.length >= 5 && normalizedNote\.length <= 3000/);
  assert.match(action, /normalizedOutcome\.length >= 5 && normalizedOutcome\.length <= 2000/);
  assert.match(action, /normalizedRequest\.length >= 5 && normalizedRequest\.length <= 3000/);
  assert.match(action, /confirmUpdate && !busy/);
  assert.match(action, /confirmRequest && !busy/);
  assert.match(action, /if \(!readyUpdate \|\| !selected\) return/);
  assert.match(action, /if \(!readyRequest\) return/);
  assert.match(action, /await update\.mutateAsync\(/);
  assert.match(action, /await request\.mutateAsync\(/);
  assert.match(action, /disabled=\{!readyUpdate\}/);
  assert.match(action, /disabled=\{!readyRequest\}/);
  assert.doesNotMatch(action, /service_role|getPublicUrl|\.from\(/);
});


test('AUD-036: reviewer-only complaint evidence opens via short-lived signed storage URL',()=>{
 const panel=read('apps/admin/src/features/w08/ComplaintEvidenceReview.tsx');
 const api=read('packages/api/src/admin-review-evidence.ts');
 assert.match(panel,/role==='reviewer'\|\|role==='super_admin'/);
 assert.match(panel,/private_evidence_count/);
 assert.match(panel,/requireWowApiSession\(api\)/);
 assert.match(panel,/signAdminComplaintEvidence\(client,complaintId,refs\[i\]\)/);
 assert.match(api,/parts\[2\] !== complaintId/);
 assert.match(api,/storage\.from\(wowStorageBuckets\.complaint\)\s*\.createSignedUrl\(reference, 60\)/);
 assert.doesNotMatch(panel,/console\.|getPublicUrl|JSON\.stringify\(complaint/);
});
