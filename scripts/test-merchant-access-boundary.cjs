'use strict';
// No-secret production access regression: runs in CI without Clerk or network access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(root, p), 'utf8');

// Node 22 --experimental-strip-types executes the actual production TS helper.
const { resolveMerchantRouteAccess: access } = require('../apps/merchant/src/features/navigation/merchant-route-access.ts');

test('visitor and loading states never render merchant workspace', () => {
  assert.equal(access(false, false, false, undefined), 'loading');
  assert.equal(access(false, true, false, undefined), 'loading');
  assert.equal(access(true, false, false, undefined), 'sign-in');
  assert.equal(access(true, true, false, undefined), 'allow');
});

test('production never grants access via URL preview flag', () => {
  for (const flag of ['1', 'unsigned', 'true', undefined]) {
    assert.equal(access(true, false, false, flag), 'sign-in');
    assert.equal(access(true, true, false, flag), 'allow');
  }
  assert.equal(access(true, false, true, '1'), 'allow');
  assert.equal(access(true, false, true, 'unsigned'), 'sign-in');
});

test('approved screens retain a common authentication boundary', () => {
  for (const file of [
    'apps/merchant/src/app/index.tsx',
    'apps/merchant/src/app/offers/index.tsx',
    'apps/merchant/src/app/business/onboarding/review.tsx',
    'apps/merchant/src/app/business/onboarding/status.tsx',
    'apps/merchant/src/app/business/onboarding.tsx',
    'apps/merchant/src/app/business/onboarding/representative.tsx',
    'apps/merchant/src/app/business/onboarding/branches.tsx',
  ]) {
    const body = src(file);
    assert.match(body, /<MerchantRouteGate>/);
    if (/app\/(index|offers\/index)\.tsx$/.test(file)) {
      assert.match(body, /<ActiveBusinessProvider>/);
      assert.ok(body.indexOf('<MerchantRouteGate>') < body.indexOf('<ActiveBusinessProvider>'));
    }
  }
  const gate = src('apps/merchant/src/features/navigation/MerchantRouteGate.tsx');
  assert.match(gate, /useAuth\(/);
  assert.match(gate, /resolveMerchantRouteAccess\(/);
  assert.match(gate, /تسجيل الدخول مطلوب/);
  assert.match(gate, /useSSO\(/);
  assert.match(gate, /startSSOFlow/);
  assert.match(gate, /تسجيل الدخول عبر Google/);
  assert.match(gate, /تسجيل الدخول عبر Facebook/);
});

test('development diagnostic route is not routable in production', () => {
  const layout = src('apps/merchant/src/app/_layout.tsx');
  const route = src('apps/merchant/src/app/integration-test.tsx');
  assert.match(layout, /<Stack\.Protected guard=\{__DEV__\}>/);
  assert.match(route, /if \(!__DEV__\) return <Redirect href="\/"\s*\/>/);
});

test('merchant switching respects an authenticated business list', () => {
  const ctx = src('apps/merchant/src/features/business/context/ActiveBusinessContext.tsx');
  assert.match(ctx, /resolveMerchantBusinessId\(/);
  assert.match(ctx, /allowedBusinessIds: businesses\.map/);
  assert.match(ctx, /router\.setParams\(\{ businessId: id \}\)/);
  const data = src('packages/api/src/query/hooks/use-businesses.ts');
  assert.match(data, /enabled: !!context\.userId/);
});


test('merchant synthetic preview cannot be enabled by NODE_ENV alone', () => {
  for (const file of [
    'apps/merchant/src/app/business/onboarding.tsx',
    'apps/merchant/src/app/business/onboarding/representative.tsx',
    'apps/merchant/src/app/business/onboarding/branches.tsx',
    'apps/merchant/src/app/business/onboarding/review.tsx',
    'apps/merchant/src/app/business/onboarding/status.tsx',
    'apps/merchant/src/features/business/context/ActiveBusinessContext.tsx',
    'apps/merchant/src/features/business/hooks/useBusinessOnboardingStep4.ts',
    'apps/merchant/src/features/business/hooks/useBusinessQualificationStatus.ts',
  ]) {
    const body = src(file);
    assert.doesNotMatch(body, /__DEV__\s*\|\|\s*process\.env\.NODE_ENV/, `${file}: unsafe preview fallback`);
  }
});

test('Clerk OAuth has a native deep-link callback instead of a dead-end', () => {
  const config = JSON.parse(src('apps/merchant/app.json')).expo;
  assert.equal(config.scheme, 'merchant');
  const gate = src('apps/merchant/src/features/navigation/MerchantRouteGate.tsx');
  assert.match(gate, /AuthSession\.makeRedirectUri/);
  assert.match(gate, /scheme: 'merchant'/);
  assert.match(gate, /path: 'oauth-callback'/);
  assert.match(gate, /WebBrowser\.maybeCompleteAuthSession/);
  const callback = src('apps/merchant/src/app/oauth-callback.tsx');
  assert.match(callback, /WebBrowser\.maybeCompleteAuthSession\(\)/);
  assert.match(callback, /Platform\.OS !== 'web'/);
  assert.match(callback, /router\.replace\('\/'\)/);
  assert.doesNotMatch(callback, /<Redirect href="\/"\s*\/>/);
  assert.match(callback, /العودة إلى تسجيل الدخول/);
});

test('merchant integration diagnostics read the existing branch table', () => {
  const integration = src('packages/api/src/integration/merchant.ts');
  assert.match(integration, /from\('business_branches'\)/);
  assert.doesNotMatch(integration, /from\('branches'\)/);
});

test('MER-01-02 recovery is externally verified and cannot regrant revoked merchant access', () => {
  const route = src('apps/merchant/src/app/auth/recovery.tsx');
  const gate = src('apps/merchant/src/features/navigation/MerchantRouteGate.tsx');
  assert.match(gate, /router\.push\('\/auth\/recovery'\)/);
  assert.match(route, /accounts\.google\.com\/signin\/recovery/);
  assert.match(route, /facebook\.com\/login\/identify/);
  assert.match(route, /استعادة حساب Google/);
  assert.match(route, /استعادة حساب Facebook/);
  assert.match(route, /لا تعيد ملكية نشاط أو تفويضًا ملغى/);
  assert.doesNotMatch(route, /setEmployeeAccess|submitProfileRevision|createBusiness|service_role/);
  assert.doesNotMatch(route, /<TextInput|<input|password|oneTimePassword/);
  assert.doesNotMatch(route, /<MerchantRouteGate>/);
});

test('MERCHANT NESTED AUTH: preview scope is propagated to nested offer-editor layouts safely', () => {
  const gate = src('apps/merchant/src/features/navigation/MerchantRouteGate.tsx');
  const editorLayout = src('apps/merchant/src/app/offers/editor/_layout.tsx');
  assert.match(editorLayout, /<MerchantRouteGate>/);
  assert.match(gate, /useGlobalSearchParams/);
  assert.doesNotMatch(gate, /useLocalSearchParams/);
  assert.match(gate, /__DEV__\s*===\s*true/);
  const pure = src('apps/merchant/src/features/navigation/merchant-route-access.ts');
  assert.match(pure, /isDevelopment && preview === '1'/);
});

test('Stage 5 access completion: dedicated merchant login route and shared legal links for all apps',()=>{
 const route=src('apps/merchant/src/app/sign-in.tsx');
 const gate=src('apps/merchant/src/features/navigation/MerchantRouteGate.tsx');
 const admin=src('apps/admin/src/features/screens/AdminAccessScreen.tsx');
 assert.match(route,/<MerchantRouteGate>/);assert.match(route,/<Redirect href="\/"/);
 assert.match(gate,/wowBrand.logoNavy/);assert.match(gate,/wow-merchant-login-canvas/);
 assert.match(gate,/viewport.isDesktop/);assert.match(gate,/LegalDocumentLinks/);assert.match(admin,/LegalDocumentLinks/);
 assert.match(src('apps/customer/src/features/legal/LegalDocumentLinks.tsx'),/SharedLegalDocumentLinks/);
});
