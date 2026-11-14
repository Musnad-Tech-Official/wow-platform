// W06 source-integrity checks. These do not replace Supabase role-matrix or browser tests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = (file) => readFileSync(resolve(__dirname, '..', file), 'utf8');

test('W06 routes are registered behind the shared fail-closed Admin gate', () => {
  const gate = read('apps/admin/src/features/w06/W06Shared.tsx');
  assert.match(gate, /access\.status !== 'authorized' \|\| access\.isFixture/);
  assert.match(gate, /access\.role/);
  for (const [path, screen] of [
    ['verifications.tsx', 'VerificationQueue'],
    ['verification/[id].tsx', 'VerificationDetails'],
    ['profile-revisions.tsx', 'ProfileRevisions'],
    ['payments.tsx', 'SubscriptionPayments'],
  ]) {
    const route = read('apps/admin/src/app/' + path);
    assert.match(route, /W06GuardedPage/);
    assert(route.includes(screen));
  }
});

test('Current admin role comes only from an authorized server RPC', () => {
  const hook = read('packages/api/src/query/hooks/use-admin-effective-role.ts');
  const access = read('apps/admin/src/features/auth/use-admin-access.ts');
  assert.match(hook, /wow_admin_get_effective_role/);
  assert.match(hook, /retry: false/);
  assert.match(access, /effectiveRoleQuery\.isSuccess/);
  assert.doesNotMatch(access, /publicMetadata/);
  assert.match(read('apps/admin/src/features/w06/W06Shared.tsx'), /role === 'reviewer' \|\| role === 'super_admin'/);
});

test('ADM-03 queue retrieves real filtered and paginated data', () => {
  const s = read('apps/admin/src/features/w06/VerificationQueue.tsx');
  assert.match(s, /useAdminBusinessVerifications\(\{ status, limit: PAGE_SIZE, offset \}\)/);
  assert.match(s, /router\.push/);
  assert.match(s, /query\.isError/);
  assert.match(s, /query\.isPending/);
  assert.doesNotMatch(s, /BIZ-028|const fixtures/);
});

test('ADM-04 requires trusted reviewer role, reason and explicit confirmation', () => {
  const s = read('apps/admin/src/features/w06/VerificationDetails.tsx');
  assert.match(s, /canSubmitW06Decision\(role\) && submitted/);
  assert.match(s, /reasonTrim\.length >= 5/);
  assert.match(s, /!confirming/);
  assert.match(s, /useAdminDecideBusinessVerification/);
  assert.match(s, /approvalEvidenceVerified/);
  assert.match(s, /evidenceQuery\.isSuccess/);
  assert.match(s, /Linking\.openURL/);
  assert.doesNotMatch(s, /getPublicUrl|storage\.from\(/);
});

test('Profile revision review shows allowlisted candidate patch values only', () => {
  const s = read('apps/admin/src/features/w06/ProfileRevisions.tsx');
  assert.match(s, /Object\.prototype\.hasOwnProperty\.call\(LABELS, key\)/);
  assert.match(s, /unrecognizedFields\.length > 0/);
  assert.match(s, /useAdminDecideProfileRevision/);
  assert.match(s, /!confirming/);
  assert.match(s, /selected\?\.status === 'submitted'/);
  assert.match(s, /baselineValid/);
  assert.match(s, /useAdminProfileRevisionContext/);
  assert.match(s, /canApprove/);
});

test('Payment review requires actual independent verification and documented note', () => {
  const s = read('apps/admin/src/features/w06/SubscriptionPayments.tsx');
  assert.match(s, /useAdminSubscriptionPayments/);
  assert.match(s, /useAdminDecideSubscriptionPayment/);
  assert.match(s, /trimmedNote\.length >= 10/);
  assert.match(s, /independentlyVerified/);
  assert.match(s, /!confirming/);
  assert.match(s, /selected\?\.status === 'submitted'/);
  assert.doesNotMatch(s, /setTimeout|auto.?approve/i);
});

test('W06 SQL security proposal closes active employee conflicts and scopes effective role', () => {
  const s = read('docs/sql/w06-admin-review-security-staging-proposal.sql');
  assert.match(s, /m\.business_id = v_business_id/);
  assert.match(s, /m\.status = 'active'/);
  assert.match(s, /wow_admin_get_effective_role/);
  assert.match(s, /wow_admin_get_profile_revision_context/);
  assert.match(s, /REVOKE ALL ON FUNCTION public\.wow_admin_get_effective_role\(\) FROM PUBLIC, anon/);
  assert.match(s, /has_admin_permission\(false\)/);
  const deployed = read('supabase/migrations/20261114202307_admin_w06_role_profile_context_employee_conflict.sql');
  assert.match(deployed, /m\.status = 'active'/);
  assert.match(deployed, /wow_admin_get_effective_role/);
  assert.match(deployed, /wow_admin_get_profile_revision_context/);
});

test('W06 shell has real navigation targets without replacing W07/W08 placeholders', () => {
  const s = read('apps/admin/src/features/shell/AdminShell.tsx');
  assert.match(s, /navTo\('\/verifications'\)/);
  assert.match(s, /navTo\('\/profile-revisions'\)/);
  assert.match(s, /navTo\('\/payments'\)/);
  assert.match(s, /navTo\('\/roles'\)/);
});

test('W06 Storage reviewer helper restores signed-evidence RLS without public execution', () => {
  const prior = read('supabase/migrations/20261113192750_merchant_final_8_revisions_complaints.sql');
  const migration = read('supabase/migrations/20261114212527_w06_storage_reviewer_role_helper_restore.sql');
  const matrix = read('docs/sql/w06-storage-reviewer-permission-smoke.sql');
  assert.match(prior, /wow_private\.is_catalog_reviewer\(\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION wow_private\.is_catalog_reviewer\(\)/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /wow_private\.has_admin_permission\(true\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION wow_private\.is_catalog_reviewer\(\) FROM PUBLIC, anon, authenticated/);
  for (const role of ['owner', 'reviewer', 'staff', 'viewer', 'guest', 'revoked']) {
    assert.match(matrix, new RegExp('Unexpected Storage ACL for ' + role));
  }
  assert.match(matrix, /ROLLBACK;/);
});


test('W06 private business-media signing remains owner/reviewer scoped', () => {
  const migration = read('supabase/migrations/20261114223935_w06_private_business_media_read_role_guard.sql');
  const probe = read('docs/sql/w06-private-business-media-role-smoke.sql');
  assert.match(migration, /WHEN 'wow-business-media' THEN/);
  assert.match(migration, /wow_private\.is_business_owner\(v_business\)/);
  assert.match(migration, /v_is_reviewer AND NOT wow_private\.is_business_member\(v_business\)/);
  assert.doesNotMatch(migration, /WHEN 'wow-business-media' THEN\s+RETURN true/);
  for (const who of ['owner', 'reviewer', 'staff', 'viewer', 'guest']) {
    assert.match(probe, new RegExp('Private business media ' + who));
  }
  assert.match(probe, /ROLLBACK;/);
});

test('W06 billing review regression has independent role and audit checks', () => {
  const s = read('docs/sql/w06-billing-decision-transaction-smoke.sql');
  for (const role of ['owner', 'staff', 'viewer', 'revoked']) {
    assert.match(s, new RegExp('Unauthorized ' + role + ' approved payment'));
  }
  assert.match(s, /Invalid note accepted/);
  assert.match(s, /Price mismatch was accepted/);
  assert.match(s, /payment_verified/);
  assert.match(s, /payment_rejected/);
  assert.match(s, /ROLLBACK;/);
});
