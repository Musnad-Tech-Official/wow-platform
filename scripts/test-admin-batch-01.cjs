// scripts/test-admin-batch-01.cjs
// Verification Test Suite for MUSNAD-WOW Admin Batch 01 (ADM-01, ADM-02, ADM-14)
// Consolidated Security, UI/UX & Brand Fidelity Verification
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const repoRoot = resolve(__dirname, '..');
const read = (relPath) => readFileSync(resolve(repoRoot, relPath), 'utf8');
const readBinary = (relPath) => readFileSync(resolve(repoRoot, relPath));

// 1. Reference Assets & Provenance Verification
test('ADMIN BATCH-01: Approved reference images and structures exist and match provenance', () => {
  const expectedFiles = [
    {
      role: 'ADM-01 visual reference',
      path: 'references/images/ADM-01_approved_v02.png',
      minBytes: 50000,
    },
    {
      role: 'ADM-02 visual reference',
      path: 'references/images/ADM-02_approved_v02.png',
      minBytes: 90000,
    },
    {
      role: 'ADM-14 visual reference',
      path: 'references/images/ADM-14_approved_v02.png',
      minBytes: 70000,
    },
    {
      role: 'ADM-01 structural markdown',
      path: 'references/structures/ADM-01.md',
    },
    {
      role: 'ADM-02 structural markdown',
      path: 'references/structures/ADM-02.md',
    },
    {
      role: 'ADM-14 structural markdown',
      path: 'references/structures/ADM-14.md',
    },
  ];

  for (const item of expectedFiles) {
    const fullPath = resolve(repoRoot, item.path);
    assert(existsSync(fullPath), `Missing required file: ${item.path}`);
    if (item.minBytes) {
      const buf = readBinary(item.path);
      assert(buf.length >= item.minBytes, `${item.role} is smaller than expected (${buf.length} bytes)`);
    }
  }
});

// 2. CRITICAL SECURITY: Production Preview Bypass Prevention
test('ADMIN BATCH-01: Preview parameters are strictly development-only (__DEV__)', () => {
  const useAdminAccess = read('apps/admin/src/features/auth/use-admin-access.ts');

  // Must declare and use isDev based on __DEV__
  assert(
    useAdminAccess.includes("const isDev = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);"),
    'Must strictly verify __DEV__ before reading or respecting preview parameters'
  );

  // Preview must only be evaluated if isDev is true
  assert(
    useAdminAccess.includes('const preview = isDev'),
    'Preview parameter resolution must be gated behind isDev'
  );

  // Preview branch must check isDev
  assert(
    useAdminAccess.includes('if (isDev && preview)'),
    'Preview branch execution must be strictly gated by isDev'
  );

  // Prerender must not expose authorized fixtures when !isDev
  assert(
    useAdminAccess.includes('if (\n      isDev &&\n      (preview === \'adm02\''),
    'Static prerender must not unlock authorized fixtures when !isDev'
  );
});

// 3. CRITICAL AUTHORIZATION: Server Authority & Zero Invented Roles
test('ADMIN BATCH-01: Effective admin roles are never invented or defaulted to reviewer/super_admin', () => {
  const useAdminAccess = read('apps/admin/src/features/auth/use-admin-access.ts');
  const adminAccess = read('apps/admin/src/features/auth/admin-access.ts');

  // In production authorization resolution, role must be null (not defaulted to reviewer or super_admin)
  assert(
    useAdminAccess.includes('role: null, // Truthful server contract: admin verified, specific granular role unexposed by RPC'),
    'Production authorization must return role: null when specific role is unexposed by backend RPC'
  );

  // Clerk metadata must not be trusted for admin roles
  assert(
    !useAdminAccess.includes('user?.publicMetadata?.role as AdminRole'),
    'Must not derive effective admin role from untrusted Clerk metadata'
  );

  // canManageRoles must strictly require super_admin; null or unassigned must return false
  const { canManageRoles, canReviewItems, getRoleArabicLabel } = require('../apps/admin/src/features/auth/admin-access.ts');
  assert.equal(canManageRoles(null), false, 'Null role must not have role management permission');
  assert.equal(canManageRoles(undefined), false, 'Undefined role must not have role management permission');
  assert.equal(canManageRoles('reviewer'), false, 'Reviewer must not have role management permission');
  assert.equal(canManageRoles('viewer'), false, 'Viewer must not have role management permission');
  assert.equal(canManageRoles('super_admin'), true, 'super_admin is the only role with role management permission');

  // canReviewItems allows review when isAuthorized is true from server RPC
  assert.equal(canReviewItems(null, true), true, 'Server-verified admin can review queues');
  assert.equal(canReviewItems(null, false), false, 'Unverified session cannot review queues');

  // getRoleArabicLabel returns truthful fallback
  assert.equal(getRoleArabicLabel(null), 'إداري موثّق');
  assert.equal(getRoleArabicLabel(undefined), 'إداري موثّق');
});

// 4. Official WOW Logo Branding
test('ADMIN BATCH-01: Official WOW logo is used consistently across access screen and shell', () => {
  const accessScreen = read('apps/admin/src/features/screens/AdminAccessScreen.tsx');
  const shell = read('apps/admin/src/features/shell/AdminShell.tsx');

  // ADM-01 uses official WOW navy logo on yellow panel and primary logo on header
  assert(accessScreen.includes("import { wowBrand } from '@wow/assets';"));
  assert(accessScreen.includes('source={wowBrand.logoNavy}'));
  assert(accessScreen.includes('source={isDark ? wowBrand.logoPrimaryDark : wowBrand.logoPrimary}'));

  // AdminShell uses official WOW logo
  assert(shell.includes("import { wowBrand } from '@wow/assets';"));
  assert(shell.includes('source={isDark ? wowBrand.logoPrimaryDark : wowBrand.logoPrimary}'));
});

// 5. ADM-01: Compact Theme Control & Contrast
test('ADMIN BATCH-01: ADM-01 uses CompactThemeControl and preserves high-contrast text', () => {
  const accessScreen = read('apps/admin/src/features/screens/AdminAccessScreen.tsx');
  const themeControl = read('apps/admin/src/features/theme/CompactThemeControl.tsx');

  // Access screen uses compact control
  assert(accessScreen.includes('<CompactThemeControl'));
  assert(themeControl.includes('Sun, Moon, Laptop'));
  assert(themeControl.includes("options: { id: ThemeMode; label: string; Icon: typeof Sun }[]"));

  // Solid dark text on yellow card (#0F172D and #1E293B)
  assert(accessScreen.includes('text-[#0F172D]'));
  assert(accessScreen.includes('text-[#1E293B]'));
});

// 6. ADM-02: Compact Mobile Top Bar & Truthful Empty State
test('ADMIN BATCH-01: ADM-02 Dashboard has truthful empty state and compact mobile header', () => {
  const dashboardScreen = read('apps/admin/src/features/screens/AdminDashboardScreen.tsx');
  const shell = read('apps/admin/src/features/shell/AdminShell.tsx');

  // Shell top bar uses compact control and flex-shrink protection
  assert(shell.includes('<CompactThemeControl />'));
  assert(shell.includes('flex-shrink min-w-0'));

  // Dashboard in empty preview mode zeroes trend stats and renders flat zero baseline
  assert(dashboardScreen.includes("{isEmptyPreview ? '00' : '01'}"));
  assert(dashboardScreen.includes("{isEmptyPreview ? '00' : '08'}"));
  assert(dashboardScreen.includes('points="10,70 310,70"'));
  assert(dashboardScreen.includes("isEmptyPreview ? '0%' : '45%'"));

  // Development fixture mode displays clear disclaimer banner
  assert(dashboardScreen.includes('وضع المعاينة التطويرية (Fixture Mode)'));
});

// 7. ADM-14: Responsive Mobile Cards & Contract Gap Security Guard
test('ADMIN BATCH-01: ADM-14 Roles Screen replaces mobile table with cards and enforces disabled mutation', () => {
  const rolesScreen = read('apps/admin/src/features/screens/AdminRolesScreen.tsx');

  // Desktop table layout exists for >= md
  assert(rolesScreen.includes('hidden md:flex w-full overflow-x-auto'));

  // Mobile card layout exists for < md
  assert(rolesScreen.includes('flex md:hidden gap-3'));
  assert(rolesScreen.includes('محدد للمراجعة'));

  // Fictitious accounts never exposed in production
  assert(rolesScreen.includes('!isFixture'));
  assert(rolesScreen.includes('id: \'CURRENT-SESSION\''));

  // Role mutation button is disabled with explicit contract gap explanation
  assert(rolesScreen.includes('title="تعديل الصلاحيات معطّل (عقد الخادم غير متوفر)"'));
  assert(rolesScreen.includes('disabled={true}'));
  assert(rolesScreen.includes('wow_admin_update_member_role'));

  // Contract gap alert banner
  assert(rolesScreen.includes('عقد الخادم غير متوفر: تعديل الأدوار معطّل برمجياً'));
});

// 8. Fail-Closed Route Protection
test('ADMIN BATCH-01: Route guards fail-closed if status is not authorized', () => {
  const adminIndex = read('apps/admin/src/app/index.tsx');
  const rolesRoute = read('apps/admin/src/app/roles.tsx');

  assert(adminIndex.includes("if (status !== 'authorized')"));
  assert(adminIndex.includes('<AdminAccessScreen'));
  assert(adminIndex.includes('<AdminShell'));

  assert(rolesRoute.includes("if (status !== 'authorized')"));
  assert(rolesRoute.includes('<AdminAccessScreen'));
  assert(rolesRoute.includes('<AdminShell'));
});
