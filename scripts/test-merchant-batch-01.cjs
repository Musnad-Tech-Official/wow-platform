// scripts/test-merchant-batch-01.cjs
// Verification Test Suite for MUSNAD-WOW Merchant Batch 01 (MER-02-04, MER-02-05, MER-03, MER-04)
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

// 1. Artwork & Mascot Provenance (All 8 PNGs)
test('BATCH-01: Approved Mascots and Reference Screens match exact SHA-256 and dimensions', () => {
  const expectedFiles = [
    {
      role: 'MER-02-04 dedicated mascot',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-02-04_REVIEW_MASCOT.png',
      sha256: 'c64262d57f5ad002a3b36b77479e33a636230b1eb8d3f4b87e9ee9d51ab2e866',
      bytes: 675754,
    },
    {
      role: 'MER-02-05 dedicated mascot',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-02-05_STATUS_MASCOT.png',
      sha256: '517a8a346ae0ad44606ab7a4bead2e3e93bc4568f0ba04cd852f04122c92d979',
      bytes: 711662,
    },
    {
      role: 'MER-03 dedicated mascot',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-03_DASHBOARD_MASCOT.png',
      sha256: '59c882f42de00bec3d71bca24810f4c1136b954fda71857f9894cfa497493e58',
      bytes: 742813,
    },
    {
      role: 'MER-04 dedicated mascot',
      path: 'packages/assets/assets/illustrations/merchant/WOW_MER-04_OFFERS_MASCOT_SCENE.png',
      sha256: '912b8195147653bca3a6ef783e33813aec7ad6c987450e8d4546ba78c2271985',
      bytes: 408338,
    },
    {
      role: 'MER-02-04 approved screen reference',
      path: 'packages/assets/assets/reference/MER-02-04_FINAL_REVIEW_SCREEN.png',
      sha256: '87cde0829ef68fd0536e60491d535a6c4784c1d78d9a2205cc3822bac1f91e03',
      bytes: 328893,
    },
    {
      role: 'MER-02-05 approved screen reference',
      path: 'packages/assets/assets/reference/MER-02-05_FINAL_REVIEW_SCREEN.png',
      sha256: 'b844deef46e2642ae1d97690bace29010dfc5e417610d3ac8305341234d80d30',
      bytes: 234980,
    },
    {
      role: 'MER-03 approved screen reference',
      path: 'packages/assets/assets/reference/MER-03_FINAL_REVIEW_SCREEN.png',
      sha256: '34b08c84771762ffb3f94dcfdf43ad78f85c29733dc713a8b4897b6a11519a32',
      bytes: 476503,
    },
    {
      role: 'MER-04 approved screen reference',
      path: 'packages/assets/assets/reference/MER-04_FINAL_REVIEW_SCREEN.png',
      sha256: '1c6de5c89f936a47785a023bc43c8e4645c2cf783a3fc5e8b19d5d049b205124',
      bytes: 530753,
    },
  ];

  for (const item of expectedFiles) {
    assert(existsSync(resolve(repoRoot, item.path)), `File missing: ${item.path}`);
    const buf = readBinary(item.path);
    assert.equal(buf.length, item.bytes, `Byte length mismatch for ${item.role}`);
    const actualSha = computeSha256(buf);
    assert.equal(actualSha, item.sha256, `SHA-256 mismatch for ${item.role}`);
  }
});

test('BATCH-01: Asset manifest and @wow/assets registry export all 4 dedicated mascots', () => {
  const manifest = JSON.parse(read('packages/assets/asset-manifest.json'));
  const mascotIds = ['review-mascot', 'status-mascot', 'dashboard-mascot', 'offers-mascot'];

  for (const id of mascotIds) {
    const entry = manifest.items.find((e) => e.id === id);
    assert(entry, `Asset manifest entry missing for ${id}`);
    assert.equal(entry.category, 'illustrations.merchant');
    assert.equal(entry.role, 'approved-runtime');
  }

  const assetIndex = read('packages/assets/src/index.ts');
  assert(assetIndex.includes('reviewMascot: require("../assets/illustrations/merchant/WOW_MER-02-04_REVIEW_MASCOT.png")'));
  assert(assetIndex.includes('statusMascot: require("../assets/illustrations/merchant/WOW_MER-02-05_STATUS_MASCOT.png")'));
  assert(assetIndex.includes('dashboardMascot: require("../assets/illustrations/merchant/WOW_MER-03_DASHBOARD_MASCOT.png")'));
  assert(assetIndex.includes('offersMascot: require("../assets/illustrations/merchant/WOW_MER-04_OFFERS_MASCOT_SCENE.png")'));
});

// 2. Route Architecture & Expo Router Wiring
test('BATCH-01: Dedicated routes exist and are wired correctly', () => {
  const routes = [
    'apps/merchant/src/app/business/onboarding/review.tsx',
    'apps/merchant/src/app/business/onboarding/status.tsx',
    'apps/merchant/src/app/business/status.tsx',
    'apps/merchant/src/app/index.tsx',
    'apps/merchant/src/app/offers/index.tsx',
    'apps/merchant/src/app/offers.tsx',
  ];

  for (const r of routes) {
    assert(existsSync(resolve(repoRoot, r)), `Route missing: ${r}`);
  }

  // Step 3 branches screen must pass onNavigateToStep4 to navigate to /business/onboarding/review
  const branchesRoute = read('apps/merchant/src/app/business/onboarding/branches.tsx');
  assert.match(branchesRoute, /onNavigateToStep4=\{/);
  assert.match(branchesRoute, /\/business\/onboarding\/review/);

  // Review route navigates to status on submit
  const reviewRoute = read('apps/merchant/src/app/business/onboarding/review.tsx');
  assert.match(reviewRoute, /\/business\/onboarding\/status/);

  // Merchant index renders the approved MerchantDashboardScreen
  const indexRoute = read('apps/merchant/src/app/index.tsx');
  assert.match(indexRoute, /MerchantDashboardScreen/);

  // Offers route renders MerchantOffersScreen
  const offersRoute = read('apps/merchant/src/app/offers/index.tsx');
  assert.match(offersRoute, /MerchantOffersScreen/);
});

// 3. MER-02-04 Review Qualification Request
test('BATCH-01: MER-02-04 review screen satisfies UI fidelity, stepper, and contracts', () => {
  const reviewScreen = read('apps/merchant/src/features/business/components/BusinessOnboardingStep4.tsx');
  const reviewBanner = read('apps/merchant/src/features/business/components/ReviewBanner.tsx');
  const reviewHook = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep4.ts');
  const allReviewSource = reviewScreen + reviewBanner + reviewHook;

  // Uses Review Mascot
  assert.match(reviewBanner, /wowIllustrations\.merchant\.reviewMascot/);

  // Stepper: 4 steps, step 4 active (currentStep={3})
  assert.match(reviewScreen, /steps=\{.*?النشاط.*?المفوض.*?الفروع.*?المراجعة.*?\}/s);
  assert.match(reviewScreen, /currentStep=\{3\}/);
  assert.match(reviewScreen, /variant="connected"/);

  // Locked Arabic copy
  const requiredCopy = [
    'مراجعة الطلب',
    'طلب تأهيل نشاط',
    'الخطوة 4 من 4',
    'ملخص الطلب',
    'النشاط التجاري',
    'المفوّض',
    'الفروع',
    'مكتمل ✓',
    'تعديل',
    'المستندات الخاصة بالمراجعة',
    'خاصة بالإدارة',
    'مستند إثبات النشاط والصلاحية',
    'إثبات_النشاط.pdf',
    'مرفق ✓',
    'استبدال',
    'حذف',
    '+ إضافة مستند داعم (إن وجد)',
    'الطلب جاهز للإرسال',
    'إرسال الطلب للمراجعة',
    'حفظ كمسودة',
    'السابق',
    'MER-02-04 — مراجعة طلب التأهيل',
  ];

  for (const text of requiredCopy) {
    assert(allReviewSource.includes(text), `MER-02-04 missing locked copy: "${text}"`);
  }

  // Hook wires real verification RPC
  assert.match(reviewHook, /useSubmitBusinessVerification/);
  assert.match(reviewHook, /requestType:\s*'initial'/);
  assert.match(reviewHook, /evidenceRefs/);

  // Independent document-draft RPC preserves all references without overwriting representative.
  assert.match(reviewHook, /useSaveBusinessVerificationEvidenceDraft/);
  assert.match(reviewHook, /saveEvidenceDraftMutation/);
  assert.match(reviewHook, /evidence_storage_key/);
  assert.match(reviewHook, /REPRESENTATIVE_ROLE_LABELS/);

  // Edit links to previous screens
  assert.match(reviewScreen, /\/business\/onboarding/);
  assert.match(reviewScreen, /\/business\/onboarding\/representative/);
  assert.match(reviewScreen, /\/business\/onboarding\/branches/);
});

// 4. MER-02-05 Qualification / Completion Status
test('BATCH-01: MER-02-05 status screen satisfies UI fidelity, read-only status, and transitions', () => {
  const statusScreen = read('apps/merchant/src/features/business/components/BusinessQualificationStatusScreen.tsx');
  const statusBanner = read('apps/merchant/src/features/business/components/StatusBanner.tsx');
  const statusHook = read('apps/merchant/src/features/business/hooks/useBusinessQualificationStatus.ts');
  const allStatusSource = statusScreen + statusBanner + statusHook;

  // Uses Status Mascot
  assert.match(statusBanner, /wowIllustrations\.merchant\.statusMascot/);

  // Locked Arabic copy
  const requiredCopy = [
    'حالة التأهيل',
    'طلب تأهيل النشاط التجاري',
    'متابعة الطلب',
    'النشاط الحالي',
    'طلبك قيد المراجعة',
    'الحالة الفعلية للطلب',
    'قيد المراجعة',
    'تم الإرسال',
    'صدور القرار',
    'تفاصيل الطلب',
    'نوع الطلب',
    'رقم الطلب',
    'آخر تحديث',
    'تاريخ الإرسال',
    'حالة المعالجة',
    'عدد الفروع',
    'ملاحظات الإدارة',
    'لا توجد ملاحظات حاليًا',
    'معلومة مهمة: قبول التأهيل لا يعني الموافقة التلقائية على نشر العروض',
    'عرض تفاصيل الطلب',
    'العودة إلى الرئيسية',
    'MER-02-05 — حالة طلب التأهيل',
  ];

  for (const text of requiredCopy) {
    assert(allStatusSource.includes(text), `MER-02-05 missing locked copy: "${text}"`);
  }

  // Status is read-only (not a picker or selector)
  assert(!statusScreen.includes('<select') && !statusScreen.includes('SelectField'), 'Status must remain read-only');

  // Distinguishes verification status `submitted` from business status `pending_review`
  assert.match(statusHook, /verificationStatus/);
  assert.match(statusHook, /businessStatus/);
  assert.match(statusHook, /isVerificationSubmitted/);
  assert.match(statusHook, /isBusinessPendingReview/);
  assert.match(statusScreen, /verificationStatusLabel/);
  assert.match(statusScreen, /businessStatusLabel/);

  // Continuation action disabled/read-only when qualification is pending
  assert.match(statusScreen, /canContinueToDashboard \?/);
  assert.match(statusScreen, /handleViewDetails/);
});

// 5. MER-03 Merchant Dashboard
test('BATCH-01: MER-03 dashboard satisfies UI fidelity, analytical metrics, and business scoping', () => {
  const dashboardScreen = read('apps/merchant/src/features/dashboard/components/MerchantDashboardScreen.tsx');
  const dashboardBanner = read('apps/merchant/src/features/dashboard/components/DashboardBanner.tsx');
  const dashboardMetrics = read('apps/merchant/src/features/dashboard/components/DashboardMetrics.tsx');
  const eligibility = read('apps/merchant/src/features/dashboard/components/DashboardEligibilityBanner.tsx');
  const needsAttention = read('apps/merchant/src/features/dashboard/components/NeedsAttentionSection.tsx');
  const subscriptionCard = read('apps/merchant/src/features/dashboard/components/SubscriptionCard.tsx');
  const quickActions = read('apps/merchant/src/features/dashboard/components/QuickActionsSection.tsx');
  const charts = read('apps/merchant/src/features/dashboard/components/DashboardCharts.tsx');
  const dashboardHook = read('apps/merchant/src/features/dashboard/hooks/useMerchantDashboard.ts');
  const allDashboardSource =
    dashboardScreen +
    dashboardBanner +
    dashboardMetrics +
    eligibility +
    needsAttention +
    subscriptionCard +
    quickActions +
    charts +
    dashboardHook;

  // Uses Dashboard Mascot
  assert.match(dashboardBanner, /wowIllustrations\.merchant\.dashboardMascot/);

  // Locked Arabic copy
  const requiredCopy = [
    'لوحة التاجر',
    'أعمالك بصورة أوضح',
    'أهلية النشاط',
    'التأهيل مكتمل',
    'الاشتراك تجريبي',
    'نظرة على أداء نشاطك',
    'العروض الظاهرة',
    'قيد المراجعة',
    'الاستفسارات',
    'الشكاوى المرتبطة',
    'تحتاج انتباهك',
    'اشتراك النشاط',
    'إجراءات سريعة',
    'الحالة الحالية',
  ];

  for (const text of requiredCopy) {
    assert(allDashboardSource.includes(text), `MER-03 missing locked copy: "${text}"`);
  }

  // 4 Diverse charts: Line trend (sparkline), Donut proportion, 7-day bar chart, Segmented status bar
  assert(charts.includes('SparklineTrend'), 'Sparkline trend chart missing');
  assert(charts.includes('DonutProportion'), 'Donut proportion chart missing');
  assert(charts.includes('WeekdayBarChart'), '7-day bar chart missing');
  assert(charts.includes('SegmentedStatusBar'), 'Segmented status bar missing');

  // Real data hooks used in useMerchantDashboard
  assert.match(dashboardHook, /useBusiness/);
  assert.match(dashboardHook, /useBusinessBilling/);
  assert.match(dashboardHook, /useBusinessOffers/);
  assert.match(dashboardHook, /useBusinessComplaints/);

  // Truthful telemetry: inquiriesMetrics distinguishes preview from production
  assert.match(dashboardHook, /inquiriesMetrics/);
  assert.match(dashboardHook, /attentionOffers/);
  assert.match(dashboardMetrics, /hasInquiriesTelemetry/);
  assert.match(needsAttention, /effectiveItems/);
});

// 6. MER-04 Manage Merchant Offers
test('BATCH-01: MER-04 offers management satisfies UI fidelity, status distribution, and RPC wiring', () => {
  const offersScreen = read('apps/merchant/src/features/offers/components/MerchantOffersScreen.tsx');
  const offersBanner = read('apps/merchant/src/features/offers/components/OffersHeroBanner.tsx');
  const distribution = read('apps/merchant/src/features/offers/components/OfferStatusDistribution.tsx');
  const card = read('apps/merchant/src/features/offers/components/MerchantOfferCard.tsx');
  const offersHook = read('apps/merchant/src/features/offers/hooks/useMerchantOffers.ts');

  // Uses Offers Mascot Scene
  assert.match(offersBanner, /wowIllustrations\.merchant\.offersMascot/);

  // Locked Arabic copy
  const requiredCopy = [
    'إدارة العروض',
    'عروضك تحت السيطرة!',
    'دليل العروض',
    'توزيع حالات العروض',
    'قائمة عروضك',
    'ابحث بالاسم أو رقم العرض أو التصنيف...',
    'تصفية',
    'ترتيب:',
    'معلومة مهمة: اعتماد الإدارة لا يعني ظهور العرض تلقائيًا',
    'تظهر بيانات العروض وفق سجلات النشاط الفعلية',
  ];

  for (const text of requiredCopy) {
    assert(offersScreen.includes(text) || offersBanner.includes(text) || distribution.includes(text), `MER-04 missing locked copy: "${text}"`);
  }

  // Distribution status counts
  assert.match(distribution, /ظاهر/);
  assert.match(distribution, /قيد المراجعة/);
  assert.match(distribution, /مسودة/);
  assert.match(distribution, /منتهي/);
  assert.match(distribution, /يحتاج تعديل/);

  // Offer items in preview fixture
  assert.match(offersHook, /OF-101/);
  assert.match(offersHook, /OF-102/);
  assert.match(offersHook, /OF-103/);
  assert.match(offersHook, /OF-104/);

  // Real RPC mutation and DB field merchant_available
  assert.match(offersHook, /useSetOfferAvailability/);
  assert.match(offersHook, /merchant_available/);
  assert.match(offersHook, /available:\s*!isCurrentlyAvailable/);
  assert.match(offersHook, /paused:\s*isCurrentlyAvailable/);
  assert.match(offersHook, /لا يمكن تفعيل أو إيقاف العرض إلا بعد اعتماده من الإدارة/);
});

// 7. Brand tokens & 48pt interactive accessibility
test('BATCH-01: Yellow #FACC15 brand token, Navy #0F172D, and >= 48pt touch targets', () => {
  const header = read('apps/merchant/src/features/navigation/MerchantAppHeader.tsx');
  const bottomNav = read('apps/merchant/src/features/navigation/MerchantBottomNav.tsx');
  const reviewScreen = read('apps/merchant/src/features/business/components/BusinessOnboardingStep4.tsx');

  // Primary yellow #FACC15
  assert.match(header, /#FACC15/);
  assert.match(bottomNav, /#FACC15/);

  // Primary navy #0F172D
  assert.match(header, /#0F172D/);
  assert.match(bottomNav, /#0F172D/);

  // Touch targets >= 48pt
  assert.match(reviewScreen, /min-h-12|min-w-12|width:\s*48,\s*height:\s*48/);
  assert.match(bottomNav, /min-h-\[48px\]/);
});

// 8. Regression guards for previously confirmed integration failures
test('BATCH-01: business context wraps data-bearing screen hooks and is not silently optional', () => {
  const dashboard = read('apps/merchant/src/app/index.tsx');
  const offers = read('apps/merchant/src/app/offers/index.tsx');
  const context = read('apps/merchant/src/features/business/context/ActiveBusinessContext.tsx');
  assert.match(dashboard, /<ActiveBusinessProvider><MerchantDashboardScreen\s*\/>/);
  assert.match(offers, /<ActiveBusinessProvider><MerchantOffersScreen\s*\/>/);
  assert.match(context, /requires ActiveBusinessProvider/);
});

test('BATCH-01: verification evidence is uploaded before attaching, with no native fake file', () => {
  const hook = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep4.ts');
  const screen = read('apps/merchant/src/features/business/components/BusinessOnboardingStep4.tsx');
  assert.match(hook, /useUploadWowMedia/);
  assert.match(hook, /await uploadMutation\.mutateAsync/);
  assert.match(hook, /!file\.bytes/);
  assert.match(screen, /File\.pickFileAsync/);
  assert.match(screen, /chosen\.arrayBuffer/);
  assert.match(screen, /acceptedMime/);
  assert.doesNotMatch(screen, /مستند_إضافي_\$\{/);
});

test('BATCH-01: offer metadata is read from actual versions, not manufactured business data', () => {
  const hook = read('apps/merchant/src/features/offers/hooks/useMerchantOffers.ts');
  const queries = read('packages/api/src/query/hooks/use-offers.ts');
  assert.match(queries, /\.in\('offer_id', offerIds\)/);
  assert.match(hook, /serverVersions\.filter/);
  assert.match(hook, /version\?\.title/);
  assert.match(hook, /version\?\.final_price/);
  assert.doesNotMatch(hook, /title: `عرض تجاري #/);
  assert.doesNotMatch(hook, /finalPrice: '15,000'/);
});

test('BATCH-01: qualification requires both approvals and production metrics contain no invented trends', () => {
  const status = read('apps/merchant/src/features/business/hooks/useBusinessQualificationStatus.ts');
  const charts = read('apps/merchant/src/features/dashboard/components/DashboardCharts.tsx');
  const metrics = read('apps/merchant/src/features/dashboard/components/DashboardMetrics.tsx');
  assert.match(status, /verificationStatus === 'approved' && businessStatus === 'approved'/);
  assert.doesNotMatch(status, /return 'QF-2026-0147'/);
  assert.doesNotMatch(charts, /const points = \[20, 28, 22/);
  assert.doesNotMatch(metrics, /12% ↗/);
});

test('BATCH-01: multi-file draft RPC is typed, owner-scoped and included in query invalidation', () => {
  const contracts = read('packages/api/src/verifications.ts');
  const hooks = read('packages/api/src/query/hooks/use-verifications.ts');
  const migrationFiles = require('node:fs').readdirSync(resolve(repoRoot, 'supabase/migrations'));
  const evidenceMigration = migrationFiles.find((name) => name.includes('merchant_verification_evidence_draft'));
  assert.ok(evidenceMigration, 'owner-scoped multi-document draft migration must exist');
  const migration = read(`supabase/migrations/${evidenceMigration}`);
  assert.match(contracts, /wow_get_business_verification_draft_evidence/);
  assert.match(contracts, /wow_save_business_verification_draft_evidence/);
  assert.match(hooks, /useBusinessVerificationEvidenceDraft/);
  assert.match(migration, /wow_private\.validate_evidence_refs/);
  assert.match(migration, /wow_private\.is_business_owner/);
  assert.match(migration, /REVOKE ALL ON TABLE/);
  assert.match(migration, /TO authenticated/);
});

test('BATCH-01: needs_info uses resubmit RPC, secure previews, and compatible file formats', () => {
  const hook = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep4.ts');
  const screen = read('apps/merchant/src/features/business/components/BusinessOnboardingStep4.tsx');
  assert.match(hook, /useResubmitBusinessVerification/);
  assert.match(hook, /latestInitialVerification\?\.status === 'needs_info'/);
  assert.match(hook, /await resubmitMutation\.mutateAsync/);
  assert.match(screen, /إعادة إرسال الطلب للمراجعة/);
  assert.match(screen, /createSignedUrl\(storageKey, 60\)/);
  assert.match(screen, /image\/webp/);
});
