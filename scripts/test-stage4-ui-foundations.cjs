'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const src = path => readFileSync(resolve(root, path), 'utf8');

test('AUD-047: sidebar avoids duplicate navigation and uses navigate for sections', () => {
  const s = src('apps/admin/src/features/shell/AdminShell.tsx');
  assert.match(s, /const activePath = pathname === '\/index' \? '\/' : pathname;/);
  assert.match(s, /if \(activePath === path\) return;/);
  assert.match(s, /router\.navigate\(target as any\)/);
  assert.doesNotMatch(s, /router\.push\(target as any\)/);
});

test('D-07: promotional and coming-soon audit placeholders are hidden', () => {
  const s = src('apps/admin/src/features/shell/AdminShell.tsx');
  assert.doesNotMatch(s, />\s*الترويج\s*</);
  assert.doesNotMatch(s, />\s*سجل التدقيق\s*</);
  assert.doesNotMatch(s, /قريباً/);
  assert.match(s, /onPress=\{\(\) => navTo\('\/profile-revisions'\)\}/);
});

test('AUD-056: merchant/admin OAuth errors are safe localized messages', () => {
  const merchant = src('apps/merchant/src/features/navigation/MerchantRouteGate.tsx');
  const admin = src('apps/admin/src/features/screens/AdminAccessScreen.tsx');
  assert.doesNotMatch(merchant, /setSignInError\([^)]*\.message/);
  assert.doesNotMatch(admin, /setSsoError\([^)]*\.message/);
  assert.match(merchant, /setSignInError\('تعذر إكمال تسجيل الدخول عبر مزود الهوية/);
  assert.match(admin, /setSsoError\('تعذر إتمام تسجيل الدخول عبر مزود الهوية/);
  assert.match(merchant, /await setActive\(\{ session: createdSessionId \}\)/);
  assert.match(admin, /await setActive\(\{ session: createdSessionId \}\)/);
});

test('AUD-061: desktop merchant shell can use the approved 1440px ceiling', () => {
  const s = src('apps/merchant/src/features/navigation/MerchantScaffold.tsx');
  assert.match(s, /maxWidth = 1440/);
  assert.match(s, /contentMaxWidth\?: number/);
  assert.match(s, /maxWidth: contentMaxWidth/);
});
for (const name of ['OfferDefinitionScreen','OfferPricingScreen','OfferBranchesScreen','OfferEvidenceScreen','OfferReviewScreen']) {
  test('AUD-061: ' + name + ' retains readable form width', () => {
    const s = src('apps/merchant/src/features/offers/components/' + name + '.tsx');
    assert.match(s, /<MerchantScaffold currentTab="offers" contentMaxWidth=\{880\}>/);
  });
}
for (const path of ['apps/merchant/src/features/team/components/MerchantTeamEditorScreen.tsx',
                    'apps/merchant/src/features/branches/components/MerchantBranchEditorScreen.tsx']) {
  test('AUD-061: editor form remains narrow in ' + path, () => {
    assert.match(src(path), /contentMaxWidth=\{760\}/);
  });
}
