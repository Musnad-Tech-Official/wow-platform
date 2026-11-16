// W07 contract and UI source guards. Live RLS and device acceptance remain separate.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = (file) => readFileSync(resolve(__dirname, '..', file), 'utf8');

test('W07 routes use the real fail-closed admin access guard', () => {
  for (const [path,component] of [
    ['offer-review.tsx','OfferQueue'],
    ['offer-review/[id].tsx','OfferReview'],
    ['categories.tsx','CategoryManagement'],
  ]) {
    const s = read('apps/admin/src/app/' + path);
    assert.match(s, /W06GuardedPage/);
    assert(s.includes(component));
  }
  const shell = read('apps/admin/src/features/shell/AdminShell.tsx');
  assert.match(shell, /navTo\('\/offer-review'\)/);
  assert.match(shell, /navTo\('\/categories'\)/);
});

test('W07 pending-offer queue is real, paginated and has loading, denial and empty states', () => {
  const s = read('apps/admin/src/features/w07/OfferQueue.tsx');
  assert.match(s, /useAdminPendingOffers\(\{ limit: PAGE_SIZE, offset \}\)/);
  assert.match(s, /router\.push/);
  assert.match(s, /query\.isPending/);
  assert.match(s, /query\.isError/);
  assert.match(s, /query\.isSuccess/);
  assert.match(s, /W06Paging/);
  assert.doesNotMatch(s, /const fixtures|MOCK_OFFERS|setTimeout/);
});

test('Offer approval requires reviewed private assets and explicit role-scoped confirmation', () => {
  const s = read('apps/admin/src/features/w07/OfferReview.tsx');
  assert.match(s, /useAdminOfferReview/);
  assert.match(s, /useAdminDecideOffer/);
  assert.match(s, /useAdminOfferAssets/);
  assert.match(s, /viewerIsReviewer = canSubmitW06Decision\(role\)/);
  assert.match(s, /requiresEvidence/);
  assert.match(s, /assetQuery\.isSuccess/);
  assert.match(s, /validAssets/);
  assert.match(s, /validSubmission && readyToDecide|readyToDecide && !!decision/);
  assert.match(s, /!confirming/);
  assert.match(s, /Linking\.openURL/);
  assert.doesNotMatch(s, /getPublicUrl|service_role|SUPABASE_SECRET/);
});

test('Private media keys remain strictly scoped to business and offer; URLs are ephemeral', () => {
  const api = read('packages/api/src/admin-offer-assets.ts');
  const hook = read('packages/api/src/query/hooks/use-admin-offer-assets.ts');
  assert.match(api, /imagePrefix = businessId/);
  assert.match(api, /evidencePrefix = 'offer-verifications\/'/);
  assert.match(api, /unique\.has\(key\)/);
  assert.match(api, /createSignedUrl\(key, 60\)/);
  assert.doesNotMatch(api, /getPublicUrl|createPublicUrl/);
  assert.match(hook, /reviewerVerified/);
  assert.match(hook, /gcTime: 60_000/);
  assert.match(hook, /assetScopeFingerprint\(businessId, imageKeys, evidenceKeys\)/);
  assert.match(hook, /const parts = \[businessId/);
  assert.match(hook, /Math\.imul/);
  assert.doesNotMatch(hook, /queryKey:[^\n]*imageKeys|queryKey:[^\n]*evidenceKeys/);
  const review = read('apps/admin/src/features/w07/OfferReview.tsx');
  assert.match(review, /reviewedAssetReceipt\?\.versionId === id/);
  assert.match(review, /reviewedAssetReceipt\.issuedAt === assetQuery\.dataUpdatedAt/);
  assert.match(review, /!assetQuery\.isFetching/);
  assert.match(review, /viewerIsReviewer && assetQuery\.isSuccess && assetQuery\.data\.map/);
  assert.match(review, /viewerIsReviewer && assetQuery\.isSuccess && expectedAssets > 0/);
  assert.doesNotMatch(hook, /queryKey:.*imageKeys|queryKey:.*evidenceKeys/);
});

test('Category read RPCs enforce real server admin and revoke anonymous execution', () => {
  const sql = read('supabase/migrations/20261115174302_w07_admin_category_read_models.sql');
  assert.match(sql, /wow_admin_list_categories\(\)/);
  assert.match(sql, /wow_admin_search_business_categories/);
  assert.match(sql, /has_admin_permission\(false\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon/);
  assert.match(sql, /GRANT EXECUTE.*TO authenticated/);
  assert.doesNotMatch(sql, /GRANT SELECT ON public\.categories TO authenticated/);
});

test('Category save confirmation is gated in UI and handler without implicit writes', () => {
  const s = read('apps/admin/src/features/w07/CategoryManagement.tsx');
  const save = s.split('  async function saveCategory() {')[1]
    ?.split('  async function saveAssignment() {')[0];
  assert.ok(save, 'Category submit handler must exist');
  assert.match(save, /if \(!validCategory \|\| !confirmCategory\) return;/);
  assert.match(s, /disabled=\{!validCategory \|\| !confirmCategory\}/);
  assert.match(s, /disabled=\{!validCategory\}/);
  assert.match(save, /await edit\.mutateAsync\(/);
  assert.ok(save.indexOf('await edit.mutateAsync(') < save.indexOf('beginEdit(null)'),
    'Resetting to Create must occur only after a successful mutation');
  assert.ok(save.indexOf('beginEdit(null)') < save.indexOf('} catch {'),
    'The edit form must not reset after a failed mutation');
});

test('W07 category writes use existing server-guarded RPCs and explicit approval', () => {
  const s = read('apps/admin/src/features/w07/CategoryManagement.tsx');
  assert.match(s, /role === 'super_admin'/);
  assert.match(s, /canSubmitW06Decision\(role\)/);
  assert.match(s, /useAdminUpsertCategory/);
  assert.match(s, /useAdminSetBusinessCategories/);
  assert.match(s, /assigned\.length <= 12/);
  assert.match(s, /reason\.trim\(\)\.length >= 10/);
  assert.match(s, /confirmCategory/);
  assert.match(s, /confirmAssign/);
  const hooks = read('packages/api/src/query/hooks/use-discovery.ts');
  assert.match(hooks, /useAdminCategories/);
  assert.match(hooks, /useAdminBusinessCategories/);
  assert.match(hooks, /\['admin', 'category-businesses'\]/);
});
