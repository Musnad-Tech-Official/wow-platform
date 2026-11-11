// Admin Batch 01 safety and UI invariants. Only tracked sources are required.
// Runtime browser tests are a separate gate in capture-admin-batch01-screenshots.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Admin code and official WOW brand assets are tracked dependencies', () => {
  for (const path of [
    'apps/admin/src/app/index.tsx',
    'apps/admin/src/app/roles.tsx',
    'apps/admin/src/app/oauth-callback.tsx',
    'apps/admin/src/features/auth/use-admin-access.ts',
    'apps/admin/src/features/screens/AdminDashboardScreen.tsx',
    'apps/admin/src/features/screens/AdminRolesScreen.tsx',
    'packages/assets/assets/brand/logo-primary.png',
    'packages/assets/assets/brand/logo-navy.png',
  ]) {
    assert(existsSync(resolve(root, path)), 'Missing repository file: ' + path);
  }
});

test('Production preview is guarded and SSR hydration cannot prerender admin fixtures', () => {
  const s = read('apps/admin/src/features/auth/use-admin-access.ts');
  assert.match(s, /typeof __DEV__ !== 'undefined' && Boolean\(__DEV__\)/);
  assert.match(s, /const preview = isDev/);
  assert.match(s, /if \(isDev && preview\)/);
  const prerender = s.split('if (!isClient) {')[1]?.split('// 1. Preview overrides')[0];
  assert(prerender, 'No stable SSR snapshot found');
  assert.match(prerender, /status: 'unauthenticated'/);
  assert.match(prerender, /isAuthorized: false/);
  assert.doesNotMatch(prerender, /status: 'authorized'|isAuthorized: true/);
});

test('Access requires a successful matching-session server request', () => {
  const s = read('apps/admin/src/features/auth/use-admin-access.ts');
  assert.match(s, /isSuccess: isRpcSuccess/);
  assert.match(s, /apiContext\.userId === userId/);
  assert.match(s, /if \(!isQueryEnabled \|\| !isRpcSuccess\)/);
  const guard = s.split('if (!isQueryEnabled || !isRpcSuccess)')[1];
  assert(guard?.includes("status: 'authorized'"), 'Success must be gated');
  assert.doesNotMatch(s, /publicMetadata/);
});

test('Pure role checks deny unproven privileges', () => {
  const { canManageRoles, canReviewItems, getRoleArabicLabel } =
    require('../apps/admin/src/features/auth/admin-access.ts');
  assert.equal(canManageRoles(null), false);
  assert.equal(canManageRoles('viewer'), false);
  assert.equal(canManageRoles('reviewer'), false);
  assert.equal(canManageRoles('super_admin'), true);
  assert.equal(canReviewItems(null, true), false);
  assert.equal(canReviewItems('viewer', true), false);
  assert.equal(canReviewItems('reviewer', true), true);
  assert.equal(canReviewItems('super_admin', false), false);
  assert.equal(getRoleArabicLabel(null), 'إداري موثّق');
});

test('Dashboard does not emit fictitious production records or trends', () => {
  const s = read('apps/admin/src/features/screens/AdminDashboardScreen.tsx');
  assert.match(s, /isFixture \? previewCounts/);
  assert.match(s, /query\.isSuccess/);
  assert.match(s, /isLoading \? '…' : '—'/);
  assert.match(s, /وضع المعاينة التطويرية/);
  assert.match(s, /لا تتوفر سلسلة زمنية معتمدة/);
  assert.doesNotMatch(s, /BIZ-028|OF-164|CMP-043|points="10,65/);
});

test('Roles remain read-only and never fabricate the effective member role', () => {
  const s = read('apps/admin/src/features/screens/AdminRolesScreen.tsx');
  assert.match(s, /role: currentRole \?\? null/);
  assert.match(s, /isFixture\s*\? FIXTURE_ADMIN_MEMBERS/);
  assert.match(s, /disabled=\{true\}/);
  assert.match(s, /wow_admin_update_member_role/);
  assert.match(s, /flex md:hidden gap-3/);
  assert.doesNotMatch(s, /role: currentRole \?\? 'reviewer'/);
});

test('Both protected admin entry routes deny unauthorized rendering', () => {
  for (const path of ['apps/admin/src/app/index.tsx', 'apps/admin/src/app/roles.tsx']) {
    const s = read(path);
    assert.match(s, /if \(status !== 'authorized'\)/);
    assert.match(s, /<AdminAccessScreen/);
    assert.match(s, /<AdminShell/);
  }
});

test('Official WOW brand and accurate OAuth labels remain in use', () => {
  const access = read('apps/admin/src/features/screens/AdminAccessScreen.tsx');
  const shell = read('apps/admin/src/features/shell/AdminShell.tsx');
  assert.match(access, /wowBrand\.logoNavy/);
  assert.match(access, /wowBrand\.logoPrimary/);
  assert.match(shell, /wowBrand\.logoPrimary/);
  assert.match(access, /المتابعة باستخدام Facebook/);
  assert.doesNotMatch(access, /SSO \/ Clerk/);
});

test('Actual screenshot capture fails on browser errors, hydration and overflow', () => {
  const s = read('scripts/capture-admin-batch01-screenshots.cjs');
  assert.match(s, /page\.on\('pageerror'/);
  assert.match(s, /Hydration failed/);
  assert.match(s, /scrollWidth/);
  assert.match(s, /fs\.rmSync\(distDir/);
  assert.doesNotMatch(s, /hideLogBox|dismiss.*overlay/i);
});
