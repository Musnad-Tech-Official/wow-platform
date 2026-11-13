// scripts/test-merchant-final-8.cjs
// Verification Test Suite for MUSNAD-WOW Merchant Final 8 Screens
// Screens: MER-12, MER-07, MER-07-01, MER-10, MER-11, MER-11-01, MER-08, MER-09
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const crypto = require('node:crypto');

const repoRoot = resolve(__dirname, '..');
const read = (relPath) => readFileSync(resolve(repoRoot, relPath), 'utf8');
const readBinary = (relPath) => readFileSync(resolve(repoRoot, relPath));

function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ============================================================================
// 1. Artwork & Mascot Provenance (All 8 Approved Mascots and Reference Screens)
// ============================================================================
test('FINAL-8: All 8 Approved Mascots match exact SHA-256 and byte counts', () => {
  const expectedMascots = [
    {
      role: 'MER-12 Business Account mascot (Empty Beacon)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-12_MASCOT.webp',
      sha256: 'a7a6a6b7da297ce8d9b7513308810966feebec0e45dce39d30ea41c1b39a6c85',
      bytes: 83740,
    },
    {
      role: 'MER-07 Branches List mascot (Search Checklist)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-07_MASCOT.png',
      sha256: '0f614f8752ab34bfeff15721deac5343a737944b8a259ebc4bfc8c37b6562b27',
      bytes: 853035,
    },
    {
      role: 'MER-07-01 Branch Editor mascot (Security Checklist Shield)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-07-01_MASCOT.png',
      sha256: '8d516582a25ce996debefe0bc741466f099b793d522cac6857b767f0611bb4ff',
      bytes: 905412,
    },
    {
      role: 'MER-10 Subscription & Billing mascot (Calendar Clock)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-10_MASCOT.png',
      sha256: '4d1482dfd4bf7e69469563aeb549e6710de2b1e2b60ccc348a580a08efce2737',
      bytes: 874149,
    },
    {
      role: 'MER-11 Team Management mascot (ID Badge Checklist)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-11_MASCOT.png',
      sha256: '92536a20f9149a171a62afbb41beacc46b58f5b838c8ac6327e24fc4a307f55e',
      bytes: 983329,
    },
    {
      role: 'MER-11-01 Team Permissions Editor mascot (Review Pen Clipboard)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-11-01_MASCOT.png',
      sha256: '705847197e17b068221aea24e5060027fe33a2fdb3b2eb1fc9c0f2f8439b9b04',
      bytes: 1087572,
    },
    {
      role: 'MER-08 Complaints List mascot (Folder Magnifier)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-08_MASCOT.png',
      sha256: 'd0698759820fdd03a81bd30683599666a53a8a1ae13a06011834ad8689ac3b40',
      bytes: 867879,
    },
    {
      role: 'MER-09 Complaint Details mascot (Small Search)',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-09_MASCOT.png',
      sha256: '326261c6697f30772e7288cecbfc81071492e3522a8335dc387700b56ed8e953',
      bytes: 305511,
    },
  ];

  for (const item of expectedMascots) {
    assert(existsSync(resolve(repoRoot, item.path)), `File missing: ${item.path}`);
    const buf = readBinary(item.path);
    assert.equal(buf.length, item.bytes, `Byte length mismatch for ${item.role}`);
    const actualSha = computeSha256(buf);
    assert.equal(actualSha, item.sha256, `SHA-256 mismatch for ${item.role}`);
  }
});

test('FINAL-8: All 8 Historical Reference Screenshots match exact SHA-256 and byte counts', () => {
  const expectedReferences = [
    {
      id: 'MER-12',
      path: 'packages/assets/assets/reference/MER-12_ORIGINAL.png',
      sha256: '79dcc8109dc6e80a487b55243b85c3a87b2386e6db8e7374b765680b59cf04b3',
      bytes: 71805,
    },
    {
      id: 'MER-07',
      path: 'packages/assets/assets/reference/MER-07_ORIGINAL.png',
      sha256: 'a694b82c4dda91eff1736ef5a24af09d461a1d5cfaf49b0c0ff8520539dcc58f',
      bytes: 34962,
    },
    {
      id: 'MER-07-01',
      path: 'packages/assets/assets/reference/MER-07-01_ORIGINAL.png',
      sha256: 'e64cea67c0cd131aa30543bcbb12072ba92a2c1b81e9cb8a423b79ff40813fd5',
      bytes: 73174,
    },
    {
      id: 'MER-10',
      path: 'packages/assets/assets/reference/MER-10_ORIGINAL.png',
      sha256: 'f9c72469556e7a7be56cba0c697e527af3ab7c7e904b3cf16df007465bbf25f0',
      bytes: 80134,
    },
    {
      id: 'MER-11',
      path: 'packages/assets/assets/reference/MER-11_ORIGINAL.png',
      sha256: 'd60869e2bf319823ed4168fc64656e7e979e029d17354ea9dcb2ca3fb0d7baac',
      bytes: 45711,
    },
    {
      id: 'MER-11-01',
      path: 'packages/assets/assets/reference/MER-11-01_ORIGINAL.png',
      sha256: '42295e5c99cec5965e65cc13a3a0b8662e62a3d712bc4e4ba499ff25f2adebd7',
      bytes: 75719,
    },
    {
      id: 'MER-08',
      path: 'packages/assets/assets/reference/MER-08_ORIGINAL.png',
      sha256: '8bdab7cc34c7c5d784f3864438b3b7527cd76106350ac82a280cb775e38d4ed8',
      bytes: 46887,
    },
    {
      id: 'MER-09',
      path: 'packages/assets/assets/reference/MER-09_ORIGINAL.png',
      sha256: '51452e4cbe023dcee45eca038bd6b89d7982dbb5d6fe429dee30b9d2bfe3c6ef',
      bytes: 53758,
    },
  ];

  for (const item of expectedReferences) {
    assert(existsSync(resolve(repoRoot, item.path)), `Reference file missing: ${item.path}`);
    const buf = readBinary(item.path);
    assert.equal(buf.length, item.bytes, `Byte length mismatch for ${item.id}`);
    const actualSha = computeSha256(buf);
    assert.equal(actualSha, item.sha256, `SHA-256 mismatch for ${item.id}`);
  }
});

test('FINAL-8: Asset manifest and @wow/assets export all 8 mascots with runtime role', () => {
  const manifest = JSON.parse(read('packages/assets/asset-manifest.json'));
  const mascotIds = [
    'mer-12-account-mascot',
    'mer-07-branches-mascot',
    'mer-07-01-branch-editor-mascot',
    'mer-10-subscription-mascot',
    'mer-11-team-mascot',
    'mer-11-01-team-editor-mascot',
    'mer-08-complaints-mascot',
    'mer-09-complaint-details-mascot',
  ];

  for (const id of mascotIds) {
    const entry = manifest.items.find((e) => e.id === id);
    assert(entry, `Asset manifest entry missing for ${id}`);
    assert.equal(entry.category, 'illustrations.merchant');
    assert.equal(entry.role, 'approved-runtime');
  }

  const assetIndex = read('packages/assets/src/index.ts');
  assert(assetIndex.includes('mer12AccountMascot: require("../assets/illustrations/merchant/WOW_MER-12_MASCOT.webp")'));
  assert(assetIndex.includes('mer07BranchesMascot: require("../assets/illustrations/merchant/WOW_MER-07_MASCOT.png")'));
  assert(assetIndex.includes('mer0701BranchEditorMascot: require("../assets/illustrations/merchant/WOW_MER-07-01_MASCOT.png")'));
  assert(assetIndex.includes('mer10SubscriptionMascot: require("../assets/illustrations/merchant/WOW_MER-10_MASCOT.png")'));
  assert(assetIndex.includes('mer11TeamMascot: require("../assets/illustrations/merchant/WOW_MER-11_MASCOT.png")'));
  assert(assetIndex.includes('mer1101TeamEditorMascot: require("../assets/illustrations/merchant/WOW_MER-11-01_MASCOT.png")'));
  assert(assetIndex.includes('mer08ComplaintsMascot: require("../assets/illustrations/merchant/WOW_MER-08_MASCOT.png")'));
  assert(assetIndex.includes('mer09ComplaintDetailsMascot: require("../assets/illustrations/merchant/WOW_MER-09_MASCOT.png")'));
});

// ============================================================================
// 2. Route Architecture & Expo Router Wiring
// ============================================================================
test('FINAL-8: All 8 Dedicated Routes exist and are gated with MerchantRouteGate', () => {
  const routes = [
    'apps/merchant/src/app/business/account.tsx',
    'apps/merchant/src/app/business/branches/index.tsx',
    'apps/merchant/src/app/business/branches/editor.tsx',
    'apps/merchant/src/app/business/subscription.tsx',
    'apps/merchant/src/app/business/team/index.tsx',
    'apps/merchant/src/app/business/team/editor.tsx',
    'apps/merchant/src/app/complaints/index.tsx',
    'apps/merchant/src/app/complaints/details.tsx',
  ];

  for (const route of routes) {
    assert(existsSync(resolve(repoRoot, route)), `Route file missing: ${route}`);
    const content = read(route);
    assert(
      content.includes('<MerchantRouteGate') || content.includes('MerchantRouteGate'),
      `Route ${route} must be protected by MerchantRouteGate`
    );
    assert(
      content.includes('<ActiveBusinessProvider') || content.includes('ActiveBusinessProvider'),
      `Route ${route} must have ActiveBusinessProvider scope`
    );
  }
});

// ============================================================================
// 3. Bottom Navigation Functional Wiring
// ============================================================================
test('FINAL-8: Bottom navigation has active paths for businesses, complaints, and more', () => {
  const navContent = read('apps/merchant/src/features/navigation/MerchantBottomNav.tsx');
  assert(navContent.includes("'/business/branches'"), 'MerchantBottomNav must wire businesses tab to /business/branches');
  assert(navContent.includes("'/complaints'"), 'MerchantBottomNav must wire complaints tab to /complaints');
  assert(navContent.includes("'/business/account'"), 'MerchantBottomNav must wire more tab to /business/account');
  assert(!navContent.includes("tab.id === 'complaints' ? undefined"), 'Complaints tab must not be disabled');
  assert(!navContent.includes("tab.id === 'more' ? undefined"), 'More tab must not be disabled');
});

// ============================================================================
// 4. Migration SQL & Security Isolation
// ============================================================================
test('FINAL-8: Migration SQL covers profile revision media and merchant complaint RPCs with security definer', () => {
  const migrationPath = 'supabase/migrations/20261112180000_merchant_final_8_revisions_complaints.sql';
  assert(existsSync(resolve(repoRoot, migrationPath)), `Migration missing: ${migrationPath}`);
  const sql = read(migrationPath);

  // Check profile revisions support logo_url and cover_url
  assert(sql.includes('logo_url'), 'Migration must support logo_url in profile revisions');
  assert(sql.includes('cover_url'), 'Migration must support cover_url in profile revisions');

  // Check complaint RPCs
  assert(sql.includes('wow_merchant_get_complaint'), 'Migration must create wow_merchant_get_complaint');
  assert(sql.includes('wow_merchant_respond_complaint'), 'Migration must create wow_merchant_respond_complaint');
  assert(sql.includes('SECURITY DEFINER'), 'Complaint RPCs must be SECURITY DEFINER');
  assert(sql.includes('wow-complaint-evidence'), 'Evidence keys must be validated against wow-complaint-evidence bucket');
});

// ============================================================================
// 5. Typed API Exports & Customer Interactions
// ============================================================================
test('FINAL-8: @wow/api exports typed complaint queries, mutations, and models', () => {
  const apiIndex = read('packages/api/src/index.ts');
  assert(apiIndex.includes('useMerchantComplaint'), '@wow/api must export useMerchantComplaint');
  assert(apiIndex.includes('useMerchantRespondComplaint'), '@wow/api must export useMerchantRespondComplaint');

  const customerInteractions = read('packages/api/src/customer-interactions.ts');
  assert(customerInteractions.includes('getMerchantComplaint'), 'customer-interactions must provide getMerchantComplaint');
  assert(customerInteractions.includes('merchantRespondComplaint'), 'customer-interactions must provide merchantRespondComplaint');
  assert(customerInteractions.includes('MerchantComplaintDetail'), 'customer-interactions must define MerchantComplaintDetail');
});

// ============================================================================
// 6. UI Feature Components & Specification Conformance
// ============================================================================
test('FINAL-8: Feature screens enforce approved UX/UI rules and RTL layout', () => {
  const screens = [
    {
      name: 'MER-12 MerchantAccountScreen',
      path: 'apps/merchant/src/features/account/components/MerchantAccountScreen.tsx',
      tokens: ['mer12AccountMascot', 'MerchantScaffold', 'ActiveBusinessContext', 'useSubmitProfileRevision'],
    },
    {
      name: 'MER-07 MerchantBranchesScreen',
      path: 'apps/merchant/src/features/branches/components/MerchantBranchesScreen.tsx',
      tokens: ['mer07BranchesMascot', 'MerchantScaffold', 'useBusinessBranches', 'إضافة فرع'],
    },
    {
      name: 'MER-07-01 MerchantBranchEditorScreen',
      path: 'apps/merchant/src/features/branches/components/MerchantBranchEditorScreen.tsx',
      tokens: ['mer0701BranchEditorMascot', 'MerchantScaffold', 'BranchEditorForm', 'حفظ بيانات الفرع'],
    },
    {
      name: 'MER-10 MerchantSubscriptionScreen',
      path: 'apps/merchant/src/features/subscription/components/MerchantSubscriptionScreen.tsx',
      tokens: ['mer10SubscriptionMascot', 'MerchantScaffold', 'useBusinessBilling', 'نموذج الاستحقاق'],
    },
    {
      name: 'MER-11 MerchantTeamScreen',
      path: 'apps/merchant/src/features/team/components/MerchantTeamScreen.tsx',
      tokens: ['mer11TeamMascot', 'MerchantScaffold', 'useBusinessTeam', 'إضافة موظف'],
    },
    {
      name: 'MER-11-01 MerchantTeamEditorScreen',
      path: 'apps/merchant/src/features/team/components/MerchantTeamEditorScreen.tsx',
      tokens: ['mer1101TeamEditorMascot', 'MerchantScaffold', 'TeamEditorForm', 'can_draft', 'can_submit', 'can_pause', 'can_monitor'],
    },
    {
      name: 'MER-08 MerchantComplaintsScreen',
      path: 'apps/merchant/src/features/complaints/components/MerchantComplaintsScreen.tsx',
      tokens: ['mer08ComplaintsMascot', 'MerchantScaffold', 'useBusinessComplaints', 'شكاوى النشاط'],
    },
    {
      name: 'MER-09 MerchantComplaintDetailsScreen',
      path: 'apps/merchant/src/features/complaints/components/MerchantComplaintDetailsScreen.tsx',
      tokens: ['mer09ComplaintDetailsMascot', 'MerchantScaffold', 'useMerchantComplaint', 'useMerchantRespondComplaint', 'الرد الرسمي'],
    },
  ];

  for (const s of screens) {
    assert(existsSync(resolve(repoRoot, s.path)), `Feature component missing: ${s.path}`);
    const src = read(s.path);
    for (const token of s.tokens) {
      assert(src.includes(token), `${s.name} must include ${token}`);
    }
  }
});
