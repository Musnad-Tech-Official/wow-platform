// scripts/test-merchant-batch-02.cjs
// Verification Test Suite for MUSNAD-WOW Merchant Batch 02 (MER-05-01, MER-05-02, MER-05-03, MER-05-04, MER-05-05, MER-06)
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

// 1. Artwork & Mascot Provenance (All 6 Approved Mascots)
test('BATCH-02: Approved Mascots match exact SHA-256 and byte counts', () => {
  const expectedFiles = [
    {
      role: 'MER-05-01 Offer Definition mascot (Thinking)',
      path: 'packages/assets/assets/illustrations/merchant/MER-05-01_WOW_OFFICIAL_THINKING.webp',
      sha256: '7a86985a53e377523086a1f16c515a1bceeab0619cde2b4a90dc30056216c3c8',
      bytes: 89924,
    },
    {
      role: 'MER-05-02 Offer Pricing/Terms mascot (Guide)',
      path: 'packages/assets/assets/illustrations/merchant/MER-05-02_WOW_OFFICIAL_GUIDE.webp',
      sha256: 'eb51be40103abc1e4a4d584d640b02a5767591808402e4318f422e0ea6b35217',
      bytes: 102446,
    },
    {
      role: 'MER-05-03 Offer Branches/Dates mascot (Branches Calendar Composite)',
      path: 'packages/assets/assets/illustrations/merchant/MER-05-03_WOW_OFFICIAL_BRANCHES_CALENDAR.png',
      sha256: '87aa45da7f5f91d328a3df070fd121f399dd00b40906293458d5a1da4e2fe50d',
      bytes: 351233,
    },
    {
      role: 'MER-05-04 Offer Evidence mascot (Privacy)',
      path: 'packages/assets/assets/illustrations/merchant/MER-05-04_WOW_OFFICIAL_PRIVACY.webp',
      sha256: 'aed80c33140d2556d558f35669d9457f923ca26c7dfd882e7ebe7ac72e348ba9',
      bytes: 74586,
    },
    {
      role: 'MER-05-05 Offer Review mascot (Base Calm)',
      path: 'packages/assets/assets/illustrations/merchant/MER-05-05_WOW_OFFICIAL_BASE.webp',
      sha256: 'bcd890373a0c4247e18900e77986742fdb2f316e4ad3883f39a71ef7c3a53363',
      bytes: 65980,
    },
    {
      role: 'MER-06 Offer Details mascot (Review Investigation)',
      path: 'packages/assets/assets/illustrations/merchant/MER-06_WOW_OFFICIAL_REVIEW.webp',
      sha256: 'd9ad07c073c5eaca5a9e4d72f077f7f82ddb152757bb65b18c3132026aea66fb',
      bytes: 211568,
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

test('BATCH-02: Asset manifest and @wow/assets registry export all 6 dedicated mascots', () => {
  const manifest = JSON.parse(read('packages/assets/asset-manifest.json'));
  const mascotIds = [
    'offer-definition-thinking',
    'offer-pricing-guide',
    'offer-branches-calendar',
    'offer-evidence-privacy',
    'offer-review-base',
    'offer-details-review',
  ];

  for (const id of mascotIds) {
    const entry = manifest.items.find((e) => e.id === id);
    assert(entry, `Asset manifest entry missing for ${id}`);
    assert.equal(entry.category, 'illustrations.merchant');
    assert.equal(entry.role, 'approved-runtime');
  }

  const assetIndex = read('packages/assets/src/index.ts');
  assert(assetIndex.includes('offerDefinitionThinking: require("../assets/illustrations/merchant/MER-05-01_WOW_OFFICIAL_THINKING.webp")'));
  assert(assetIndex.includes('offerPricingGuide: require("../assets/illustrations/merchant/MER-05-02_WOW_OFFICIAL_GUIDE.webp")'));
  assert(assetIndex.includes('offerBranchesCalendar: require("../assets/illustrations/merchant/MER-05-03_WOW_OFFICIAL_BRANCHES_CALENDAR.png")'));
  assert(assetIndex.includes('offerEvidencePrivacy: require("../assets/illustrations/merchant/MER-05-04_WOW_OFFICIAL_PRIVACY.webp")'));
  assert(assetIndex.includes('offerReviewBase: require("../assets/illustrations/merchant/MER-05-05_WOW_OFFICIAL_BASE.webp")'));
  assert(assetIndex.includes('offerDetailsReview: require("../assets/illustrations/merchant/MER-06_WOW_OFFICIAL_REVIEW.webp")'));
});

// 2. Route Architecture & Expo Router Wiring
test('BATCH-02: Dedicated routes exist and are wired correctly', () => {
  const routes = [
    'apps/merchant/src/app/offers/editor/index.tsx',
    'apps/merchant/src/app/offers/editor/pricing.tsx',
    'apps/merchant/src/app/offers/editor/branches.tsx',
    'apps/merchant/src/app/offers/editor/evidence.tsx',
    'apps/merchant/src/app/offers/editor/review.tsx',
    'apps/merchant/src/app/offers/details.tsx',
  ];

  for (const r of routes) assert(existsSync(resolve(repoRoot, r)), `Route file missing: ${r}`);

  // Shared Expo Router layout protects all child editor routes and prevents
  // the provider being remounted for every step (which lost unsaved input).
  const editorLayoutPath = 'apps/merchant/src/app/offers/editor/_layout.tsx';
  assert(existsSync(resolve(repoRoot, editorLayoutPath)), 'Shared editor layout missing');
  const editorLayout = read(editorLayoutPath);
  for (const symbol of ['MerchantRouteGate','ActiveBusinessProvider','OfferEditorProvider','Slot']) {
    assert(editorLayout.includes(symbol), `Editor layout missing ${symbol}`);
  }
  for (const r of routes.filter((value) => value.includes('/editor/'))) {
    const route = read(r);
    assert(!route.includes('<OfferEditorProvider>'), `Do not remount draft in ${r}`);
  }
  const detailsRoute = read('apps/merchant/src/app/offers/details.tsx');
  assert(detailsRoute.includes('OfferDetailsScreen'));
  assert(detailsRoute.includes('MerchantRouteGate'));
  assert(read('apps/merchant/src/app/offers/editor/index.tsx').includes('OfferDefinitionScreen'));
});

// 3. Offer Editor Stepper
test('BATCH-02: Stepper component renders 5 steps with approved Arabic labels', () => {
  const stepperPath = 'apps/merchant/src/features/offers/components/OfferEditorStepper.tsx';
  assert(existsSync(resolve(repoRoot, stepperPath)), 'Stepper component missing');
  const stepper = read(stepperPath);

  assert(stepper.includes('التعريف'), 'Step 1 label missing');
  assert(stepper.includes('القيمة'), 'Step 2 label missing');
  assert(stepper.includes('الفروع'), 'Step 3 label missing');
  assert(stepper.includes('المستندات'), 'Step 4 label missing');
  assert(stepper.includes('المراجعة'), 'Step 5 label missing');
});

// 4. MER-05-01 Offer Definition Screen
test('BATCH-02: MER-05-01 Offer Definition satisfies all approved specs', () => {
  const defPath = 'apps/merchant/src/features/offers/components/OfferDefinitionScreen.tsx';
  assert(existsSync(resolve(repoRoot, defPath)), 'OfferDefinitionScreen missing');
  const def = read(defPath);

  // Character
  assert(def.includes('offerDefinitionThinking'), 'MER-05-01 must use offerDefinitionThinking mascot');
  // Type selection
  assert(def.includes('منتج'), 'Product kind missing');
  assert(def.includes('خدمة'), 'Service kind missing');
  // Inputs
  assert(def.includes('عنوان العرض'), 'Title field missing');
  assert(def.includes('وصف ما يشمله العرض'), 'Description field missing');
  // Category Link
  assert(def.includes('فئة العرض'), 'Category field missing');
  assert(def.includes('النشاط التجاري'), 'Commercial activity check missing');
});

// 5. MER-05-02 Offer Pricing & Terms Screen
test('BATCH-02: MER-05-02 Offer Pricing satisfies all approved specs', () => {
  const pricePath = 'apps/merchant/src/features/offers/components/OfferPricingScreen.tsx';
  assert(existsSync(resolve(repoRoot, pricePath)), 'OfferPricingScreen missing');
  const price = read(pricePath);

  // Character
  assert(price.includes('offerPricingGuide'), 'MER-05-02 must use offerPricingGuide mascot');
  // Price inputs
  assert(price.includes('السعر النهائي'), 'Final price missing');
  assert(price.includes('السعر المرجعي'), 'Original / reference price missing');
  // Benefit types
  assert(price.includes('تخفيض سعري'), 'Direct discount option missing');
  assert(price.includes('حزمة أو قيمة مضافة'), 'Bundle option missing');
  assert(price.includes('هدية أو ميزة إضافية'), 'Gift option missing');
  // Clearance disclosure
  assert(price.includes('تصفية أو مخزون أقدم'), 'Clearance disclosure toggle missing');
  // Terms & mandatory fees
  assert(price.includes('الشروط والاستثناءات'), 'Terms field missing');
  assert(price.includes('رسوم إضافية إلزامية'), 'Mandatory fees missing');
});

// 6. MER-05-03 Offer Branches & Dates Screen
test('BATCH-02: MER-05-03 Offer Branches satisfies all approved specs', () => {
  const branchPath = 'apps/merchant/src/features/offers/components/OfferBranchesScreen.tsx';
  assert(existsSync(resolve(repoRoot, branchPath)), 'OfferBranchesScreen missing');
  const branch = read(branchPath);

  // Character
  assert(branch.includes('offerBranchesCalendar'), 'MER-05-03 must use offerBranchesCalendar mascot');
  // Branches list & select all
  assert(branch.includes('تحديد الكل'), 'Select all toggle missing');
  assert(branch.includes('الفروع المشاركة'), 'Eligible branches section missing');
  // Branch approval awareness notice
  assert(branch.includes('اعتماد الفرع شرط مستقل عن اعتماد محتوى العرض'), 'Branch approval notice missing');
  // Date pickers
  assert(branch.includes('تاريخ البداية'), 'Start date missing');
  assert(branch.includes('تاريخ النهاية'), 'End date missing');
  // Operational Availability Toggle
  assert(branch.includes('التوفر الآن'), 'Availability section missing');
  assert(branch.includes('متاح للعملاء'), 'Available label missing');
  assert(branch.includes('متوقف مؤقتاً من التاجر'), 'Paused label missing');
  // Quantity/time limits
  assert(branch.includes('قيود الكمية أو الأوقات'), 'Quantity or time restrictions missing');
});

// 7. MER-05-04 Offer Evidence Screen & Private Storage Isolation
test('BATCH-02: MER-05-04 Offer Evidence enforces privacy and storage isolation', () => {
  const evPath = 'apps/merchant/src/features/offers/components/OfferEvidenceScreen.tsx';
  assert(existsSync(resolve(repoRoot, evPath)), 'OfferEvidenceScreen missing');
  const ev = read(evPath);

  // Character
  assert(ev.includes('offerEvidencePrivacy'), 'MER-05-04 must use offerEvidencePrivacy mascot');
  // Privacy Reassurance
  assert(ev.includes('تُستخدم المستندات للمراجعة الخاصة فقط'), 'Privacy disclaimer missing');
  // Evidence requirement condition
  assert(ev.includes('isEvidenceRequired'), 'Conditional evidence requirement logic missing');
  // Verified EvidencePicker component integration
  assert(ev.includes('EvidencePicker'), 'EvidencePicker integration missing');
  assert(ev.includes('المستندات المؤيدة'), 'Evidence section title missing');
});

// 8. MER-05-05 Offer Review Screen
test('BATCH-02: MER-05-05 Offer Review provides full summary, edit links, and separate submit/save buttons', () => {
  const revPath = 'apps/merchant/src/features/offers/components/OfferReviewScreen.tsx';
  assert(existsSync(resolve(repoRoot, revPath)), 'OfferReviewScreen missing');
  const rev = read(revPath);

  // Character (calm base)
  assert(rev.includes('offerReviewBase'), 'MER-05-05 must use offerReviewBase mascot');
  // 4 substantive review sections
  assert(rev.includes('تعريف العرض'), 'Offer definition section missing');
  assert(rev.includes('السعر والشروط'), 'Pricing & terms section missing');
  assert(rev.includes('الفروع والمدة'), 'Branches & dates section missing');
  assert(rev.includes('المستندات الخاصة'), 'Evidence section missing');
  // Direct [تعديل] jump links
  assert(rev.includes('تعديل'), 'Edit jump buttons missing');
  // Separate submit vs save draft actions
  assert(rev.includes('إرسال للمراجعة'), 'Submit for review button missing');
  assert(rev.includes('حفظ مسودة'), 'Save draft button missing');
  // Submit disclaimer
  assert(rev.includes('إرسال العرض للمراجعة لا ينشره تلقائياً'), 'Submission disclaimer missing');
});

// 9. MER-06 Offer Details & Review Status Screen
test('BATCH-02: MER-06 Offer Details handles independent review and customer visibility states', () => {
  const detPath = 'apps/merchant/src/features/offers/components/OfferDetailsScreen.tsx';
  assert(existsSync(resolve(repoRoot, detPath)), 'OfferDetailsScreen missing');
  const det = read(detPath);

  // Character
  assert(det.includes('offerDetailsReview'), 'MER-06 must use offerDetailsReview mascot');
  // Header and title
  assert(det.includes('تفاصيل العرض وحالته'), 'Header title missing');
  // Independent Review Status
  assert(det.includes('حالة مراجعة المحتوى'), 'Content review status section missing');
  // Independent Customer Visibility
  assert(det.includes('ظهور النسخة المحددة'), 'Selected-version visibility section missing');
  // Version switch
  assert(det.includes('نسخة منشورة'), 'Published version tab missing');
  assert(det.includes('نسخة معلّقة'), 'Pending revision tab missing');
  // Review notes
  assert(det.includes('ملاحظات المراجعة'), 'Review notes section missing');
  // Operational toggle
  assert(det.includes('إيقاف التوفر') || det.includes('استئناف التوفر'), 'Availability action button missing');
  // Edit action
  assert(det.includes('تعديل العرض'), 'Edit offer button missing');
});

// 10. Cross-Business Conflict Guard
test('BATCH-02: Cross-business draft migration conflict guard is implemented', () => {
  const modalPath = 'apps/merchant/src/features/offers/components/OfferBusinessConflictModal.tsx';
  assert(existsSync(resolve(repoRoot, modalPath)), 'OfferBusinessConflictModal missing');
  const modal = read(modalPath);

  assert(modal.includes('تغيير النشاط التجاري'), 'Conflict warning title missing');
  assert(modal.includes('مسودة العرض مرتبطة بنشاط محدد'), 'Conflict warning subtitle missing');
  assert(modal.includes('بدء مسودة جديدة للنشاط المختار'), 'Reset draft option missing');
});

// 11. Database Migration & Backend Schema Support
test('BATCH-02: Migration file adds category_id and private evidence table', () => {
  const migPath = 'supabase/migrations/20261111120000_merchant_offer_category_and_evidence.sql';
  assert(existsSync(resolve(repoRoot, migPath)), 'Migration file missing');
  const mig = read(migPath);

  assert(mig.includes('category_id'), 'category_id column missing');
  assert(mig.includes('offer_evidence_drafts'), 'offer_evidence_drafts table missing');
  assert(mig.includes('wow_save_offer_evidence_draft'), 'wow_save_offer_evidence_draft RPC missing');
  assert(mig.includes('wow_get_offer_evidence_draft'), 'wow_get_offer_evidence_draft RPC missing');
});

// 12. API contracts & queries
test('BATCH-02: @wow/api exports category_id and evidence RPC hooks', () => {
  const offersApi = read('packages/api/src/offers.ts');
  assert(offersApi.includes('category_id?: string | null'), 'OfferDraftPayload missing category_id');
  assert(offersApi.includes('getOfferEvidenceDraft'), 'getOfferEvidenceDraft function missing');
  assert(offersApi.includes('saveOfferEvidenceDraft'), 'saveOfferEvidenceDraft function missing');

  const offersHooks = read('packages/api/src/query/hooks/use-offers.ts');
  assert(offersHooks.includes('useOfferEvidenceDraft'), 'useOfferEvidenceDraft hook missing');
  assert(offersHooks.includes('useSaveOfferEvidenceDraft'), 'useSaveOfferEvidenceDraft hook missing');

  const apiIndex = read('packages/api/src/index.ts');
  assert(apiIndex.includes('useOfferEvidenceDraft'), 'useOfferEvidenceDraft export missing from index');
  assert(apiIndex.includes('useSaveOfferEvidenceDraft'), 'useSaveOfferEvidenceDraft export missing from index');
});

test('BATCH-02: Navigation waits for saved draft and shared state survives route transitions', () => {
  const state = read('apps/merchant/src/features/offers/context/OfferEditorContext.tsx');
  assert(state.includes('useGlobalSearchParams'), 'Shared layout must read current route params');
  assert(state.includes('await saveDraftMutation.mutateAsync'), 'Draft persistence must be awaited');
  assert(state.includes('documents: draft.evidenceFile?.isUploaded'), 'Evidence removal must persist as empty list');
  assert(!state.includes('if (payload.branches.length > 0)'), 'Partial drafts must be stored without branches');

  for (const screen of ['OfferDefinitionScreen','OfferPricingScreen','OfferBranchesScreen','OfferEvidenceScreen']) {
    const s = read(`apps/merchant/src/features/offers/components/${screen}.tsx`);
    assert(s.includes('const savedOfferId = await saveDraft()'), `${screen}: wait for draft save`);
    assert(s.includes('if (!savedOfferId) return;'), `${screen}: failed save must block next step`);
    assert(!s.includes('void saveDraft();'), `${screen}: no fire-and-forget navigation saves`);
  }
});

test('BATCH-02: Offer API never silently drops category or claims evidence was saved', () => {
  const api = read('packages/api/src/offers.ts');
  assert(!api.includes('fallbackPayload'), 'Never silently drop merchant category');
  assert(!api.includes('return true;\n    }\n    throw error;'), 'Missing RPC must never be treated as successful save');
  assert(api.includes('Offer evidence was not confirmed as saved'), 'Require positive evidence save acknowledgment');
  assert(api.includes('getOfferEligibleCategories'), 'Category list must be business-authorized');
});

test('BATCH-02: Server enforces category, versioned evidence, partial drafts and proof at submission', () => {
  const sql = read('supabase/migrations/20261111120000_merchant_offer_category_and_evidence.sql');
  for (const contract of [
    'NOT BETWEEN 0 AND 50',
    'public.business_categories bc',
    'public.wow_get_offer_eligible_categories',
    'offer_version_id',
    'validate_evidence_refs',
    'private_evidence',
    'Evidence required for reference price or clearance claim',
  ]) assert(sql.includes(contract), `Migration missing: ${contract}`);
});

test('BATCH-02: Details uses persisted status, not hard-coded preview values', () => {
  const det = read('apps/merchant/src/features/offers/components/OfferDetailsScreen.tsx');
  assert(det.includes('useBusinessOffers'), 'Details must load authoritative offer state');
  assert(det.includes('offer?.status'), 'Details must inspect actual offer status');
  assert(det.includes('offer.current_version_id'), 'Visibility must be version-aware');
  assert(!det.includes('setIsOfferActive'), 'Do not invent local offer status');
  assert(!det.includes('OF-101 • إلكترونيات'), 'Do not show hard-coded offer number/category');
});

test('BATCH-02: Native evidence picker is present for Android/iOS and stays private', () => {
  const picker = read('apps/merchant/src/features/business/components/EvidencePicker.tsx');
  const packageJson = JSON.parse(read('apps/merchant/package.json'));
  const lockfile = read('pnpm-lock.yaml');
  assert.equal(packageJson.dependencies['expo-document-picker'], '~57.0.3');
  assert(lockfile.includes('expo-document-picker@57.0.3'));
  assert(picker.includes('Platform.OS === \'ios\' || Platform.OS === \'android\''));
  assert(picker.includes('DocumentPicker.getDocumentAsync'));
  assert(picker.includes('copyToCacheDirectory: true'));
  assert(picker.includes('new ExpoFile(asset.uri).arrayBuffer()'));
  assert(picker.includes('bytes.byteLength !== asset.size'), 'Reject short reads of native documents');
  const evidence = read('apps/merchant/src/features/offers/components/OfferEvidenceScreen.tsx');
  assert(evidence.includes("kind: 'offerEvidence'"));
  const media = read('packages/api/src/media.ts');
  assert(media.includes("kind: 'offerEvidence'"));
  assert(media.includes('offer-verifications/'));
});

test('BATCH-02: Availability is version-scoped and applied only on admin approval', () => {
  const db = read('supabase/migrations/20261111231000_merchant_offer_draft_availability_on_approval.sql');
  const context = read('apps/merchant/src/features/offers/context/OfferEditorContext.tsx');
  const api = read('packages/api/src/offers.ts');
  assert(db.includes('merchant_available_requested'));
  assert(db.includes('merchant_available=(SELECT merchant_available_requested'));
  assert(context.includes('merchant_available_requested: draft.merchantAvailable'));
  assert(context.includes('merchantAvailable: v.merchant_available_requested'));
  assert(api.includes('merchant_available_requested?: boolean'));
});

test('BATCH-02: Private evidence ACL is separate from owner-only verification', () => {
  const migration = read('supabase/migrations/20261111230000_merchant_offer_private_evidence_access_and_review_notes.sql');
  const api = read('packages/api/src/offers.ts');
  const details = read('apps/merchant/src/features/offers/components/OfferDetailsScreen.tsx');
  assert(migration.includes("v_parts[1]='offer-verifications'"));
  assert(migration.includes('wow_private.can_manage_offer_business'));
  assert(migration.includes('wow_private.is_business_owner'));
  assert(migration.includes('validate_offer_evidence_refs'));
  assert(migration.includes('storage.objects'));
  assert(migration.includes('wow_get_offer_review_notes'));
  assert(api.includes('getOfferReviewNotes'));
  assert(details.includes('useOfferReviewNotes'));
  assert(details.includes('latestReviewNote'));
});
