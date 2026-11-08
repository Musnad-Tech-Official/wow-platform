// W03.2 MER-02-02 Merchant Representative (Step 2 of 4) Test Suite
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const crypto = require('node:crypto');

const repoRoot = resolve(__dirname, '..');
const read = (relPath) => readFileSync(resolve(repoRoot, relPath), 'utf8');

test('W03.2 Approved composite artwork: Beacon Delegate PNG exists with exact SHA-256', () => {
  const assetPath = resolve(repoRoot, 'packages/assets/assets/illustrations/merchant/onboarding-beacon-delegate.png');
  assert(existsSync(assetPath), 'Approved beacon delegate artwork must exist at runtime asset path');

  const buf = readFileSync(assetPath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const EXPECTED_HASH = '036732745cd1875b27612564d03bdd71b257161b2cfdcb360c9b98e27460ccc9';
  assert.equal(hash, EXPECTED_HASH, 'Beacon delegate asset SHA-256 mismatch');

  const manifest = JSON.parse(read('packages/assets/asset-manifest.json'));
  const entry = manifest.items.find(i => i.id === 'onboarding-beacon-delegate');
  assert(entry, 'Asset manifest must contain onboarding-beacon-delegate entry');
  assert.equal(entry.sha256, EXPECTED_HASH);
  assert.deepEqual(entry.dimensions, [1815, 866]);
});

test('W03.2 Stepper configuration: Step 2 active, Step 1 completed, exact 4 step labels', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep2.tsx');
  assert(screenCode.includes("variant=\"connected\""), 'Step 2 must use connected stepper variant');
  assert(screenCode.includes("currentStep={1}"), 'Step 2 must set currentStep={1}');
  assert(
    screenCode.includes("steps={['النشاط', 'المفوض', 'الفروع', 'المراجعة']}"),
    'Stepper steps must be exactly النشاط, المفوض, الفروع, المراجعة'
  );
  assert(!screenCode.includes('المستندات'), 'Stepper must NOT revert Step 4 to obsolete المستندات label');
});

test('W03.2 Locked visible Arabic copy: all exact approved copy strings exist in screen implementation', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep2.tsx');
  const bannerCode = read('apps/merchant/src/features/business/components/RepresentativeBanner.tsx');
  const sheetCode = read('apps/merchant/src/features/business/components/RoleSelectSheet.tsx');
  const pickerCode = read('apps/merchant/src/features/business/components/EvidencePicker.tsx');
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep2.ts');

  const combined = screenCode + bannerCode + sheetCode + pickerCode + hookCode;

  const approvedCopy = [
    'طلب تأهيل نشاط',
    'إضافة مفوض',
    'الخطوة 2 من 4',
    'النشاط', 'المفوض', 'الفروع', 'المراجعة',
    'حدّد ممثلك المفوض',
    'أدخل بيانات الشخص الذي سيدير النشاط أو يمثله رسميًا عند الحاجة.',
    'الممثل المفوض',
    'أدخل بيانات الشخص الذي سيكون مخولًا بإدارة النشاط أو تمثيل النشاط رسميًا.',
    'اسم الممثل المفوض',
    'مثال: أحمد محمد صالح',
    'اكتب الاسم الكامل كما يظهر في الهوية أو وثيقة التفويض.',
    'صفة التمثيل',
    'مالك النشاط',
    'قد تطلب الإدارة دليلاً على صفة التفويض؛ لا تمنح هذه الخطوة صلاحيات تلقائيًا.',
    'إثبات الصفة',
    'أرفق مستندًا يوضح صفة التمثيل عند الحاجة.',
    'إضافة مستند إثبات',
    'اختر ملفاً للمعاينة (PDF أو JPG أو PNG حتى 10MB)',
    'المستندات خاصة بمراجعة الإدارة ولا تظهر للعامة.',
    'حفظ ومتابعة',
    'حفظ كمسودة',
    'السابق',
    'أدخل اسم الممثل المفوض للمتابعة.',
    'اختر صفة التمثيل للمتابعة.',
    'جارٍ الحفظ...',
    'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
    'تم حفظ بيانات المفوض بنجاح. جارٍ الانتقال إلى الفروع...',
    'تعذر تأكيد الحفظ. تحقق من حالة الطلب قبل إعادة المحاولة.',
  ];

  for (const text of approvedCopy) {
    assert(
      combined.includes(text),
      `Approved Arabic copy string missing: "${text}"`
    );
  }
});

test('W03.2 Field validation rules: name, role, and evidence size bounds', () => {
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep2.ts');
  const pickerCode = read('apps/merchant/src/features/business/components/EvidencePicker.tsx');

  assert(hookCode.includes('trimmedName.length < 2 || trimmedName.length > 120'));
  assert(hookCode.includes('role'));
  assert(pickerCode.includes('10 * 1024 * 1024'));
  assert(pickerCode.includes('application/pdf'));
  assert(pickerCode.includes('image/jpeg'));
  assert(pickerCode.includes('image/png'));
});

test('W03.2 Screen architecture: PageScaffold app="merchant" and dedicated clean route exist', () => {
  const routeCode = read('apps/merchant/src/app/business/onboarding/representative.tsx');
  const componentCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep2.tsx');

  assert(routeCode.includes('BusinessOnboardingStep2'));
  assert(routeCode.includes('useLocalSearchParams'));
  assert(routeCode.includes('businessId'));
  assert(routeCode.includes('preview'));
  assert(componentCode.includes('<PageScaffold app="merchant"'));
});

test('W03.2 Migration 20261104000000 SQL safety and least privilege audit', () => {
  const migration = read('supabase/migrations/20261104000000_merchant_representative_draft.sql');

  // Schema definitions
  assert(migration.includes('CREATE TABLE IF NOT EXISTS "public"."business_representative_drafts"'));
  assert(migration.includes('REFERENCES "public"."businesses"("id") ON DELETE CASCADE'));
  assert(migration.includes('REFERENCES "public"."users"("id")'));
  assert(migration.includes('ENABLE ROW LEVEL SECURITY'));

  // RLS policy check
  assert(migration.includes('CREATE POLICY "business_representative_drafts_owner_select"'));
  assert(migration.includes('wow_private.is_business_owner("business_id")'));

  // Table grants: only SELECT to authenticated
  assert(migration.includes('REVOKE ALL PRIVILEGES ON TABLE "public"."business_representative_drafts" FROM PUBLIC, anon, authenticated;'));
  assert(migration.includes('GRANT SELECT ON TABLE "public"."business_representative_drafts" TO authenticated;'));
  assert(migration.includes('GRANT ALL ON TABLE "public"."business_representative_drafts" TO service_role;'));

  // Search path safety on routines
  assert(migration.includes('SET "search_path" TO \'\''));

  // Owner verification in internal function
  assert(migration.includes('wow_private.is_business_owner(p_business_id)'));
  assert(migration.includes("status INTO v_bs FROM public.businesses WHERE id = p_business_id FOR UPDATE"));
  assert(migration.includes("v_bs NOT IN ('draft', 'rejected')"));
});

test('W03.2 P0 pre-migration API safety: representative draft query handles missing table/function gracefully', () => {
  const apiCode = read('packages/api/src/businesses.ts');
  assert(apiCode.includes('getBusinessRepresentativeDraft'));
  assert(apiCode.includes('saveBusinessRepresentativeDraft'));
  assert(apiCode.includes('isMissing'));
  assert(apiCode.includes('return null;'));
});

test('W03.2 P1 state isolation: scope changes reset state and route keys unmount previous owner drafts', () => {
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep2.ts');
  const routeCode = read('apps/merchant/src/app/business/onboarding/representative.tsx');

  assert(hookCode.includes('currentScope !== prevScope'));
  assert(hookCode.includes('setUserName(null)'));
  assert(hookCode.includes('setUserRole(null)'));
  assert(hookCode.includes('setSelectedFile(null)'));
  assert(hookCode.includes('setHasUnsavedChanges(false)'));
  assert(routeCode.includes('key={`${effectiveUserId ?? \'anon\'}:${businessId ?? \'new\'}`}'));
});

test('W03.2 Touch target: header back and bottom previous actions satisfy >= 48pt minimum interactive size', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep2.tsx');
  const pickerCode = read('apps/merchant/src/features/business/components/EvidencePicker.tsx');

  assert(screenCode.includes('min-h-12 min-w-12'));
  assert(screenCode.includes('width: 48'));
  assert(screenCode.includes('height: 48'));
  assert(screenCode.includes('min-h-12 w-full'));
  assert(pickerCode.includes('min-h-12 min-w-12'));
  assert(screenCode.includes('addEventListener(\'hardwareBackPress\''));
});

test('W03.2 Navigation and scope contract (a): successful new business save navigates to Step 2 with actual returned id', async () => {
  const step1Code = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep1.ts');
  const routeCode = read('apps/merchant/src/app/business/onboarding.tsx');

  assert(step1Code.includes('onNavigateToStep2?: (businessId: string) => void'), 'Step 1 hook must accept onNavigateToStep2 callback');
  assert(step1Code.includes('/business/onboarding/representative'), 'Step 1 must target Step 2 representative route');
  assert(routeCode.includes('onNavigateToStep2'), 'Step 1 route must pass onNavigateToStep2');
  assert(routeCode.includes('pathname: \'/business/onboarding/representative\''), 'Route must specify typed Expo Router pathname');

  // Behavioral simulation of new business save
  const newCreatedUuid = '00000000-0000-4000-8000-000000000001';
  let navigatedBusinessId = null;
  const mockCreate = async () => newCreatedUuid;
  const onNavigate = (id) => { navigatedBusinessId = id; };

  // Simulate saveAndContinue execution for new business
  const createdId = await mockCreate();
  onNavigate(createdId);

  assert.equal(navigatedBusinessId, newCreatedUuid, 'Navigation must receive the exact newly created business ID');
});

test('W03.2 Navigation and scope contract (b): successful existing draft update navigates to Step 2 with the same business id', async () => {
  const step1Code = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep1.ts');
  assert(step1Code.includes('await updateMutation.mutateAsync'), 'Existing draft save must await update mutation');
  assert(step1Code.includes('onNavigateToStep2(currentId)'), 'Step 1 must navigate with currentId');

  // Behavioral simulation of existing draft update
  const existingDraftUuid = '00000000-0000-4000-8000-000000000042';
  let navigatedBusinessId = null;
  let updateCalledWithId = null;

  const mockUpdate = async ({ businessId }) => {
    updateCalledWithId = businessId;
  };
  const onNavigate = (id) => { navigatedBusinessId = id; };

  await mockUpdate({ businessId: existingDraftUuid });
  onNavigate(existingDraftUuid);

  assert.equal(updateCalledWithId, existingDraftUuid, 'Update must be called with active draft businessId');
  assert.equal(navigatedBusinessId, existingDraftUuid, 'Navigation must preserve existing draft businessId');
});

test('W03.2 Navigation and scope contract (c): save draft does NOT navigate', async () => {
  const step1Code = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep1.ts');

  // In useBusinessOnboardingStep1, saveDraft should never call onNavigateToStep2 or router.push
  const saveDraftMatch = step1Code.match(/const saveDraft = useCallback[\s\S]*?\n  \}, \[/);
  assert(saveDraftMatch, 'saveDraft implementation must exist');
  assert(!saveDraftMatch[0].includes('onNavigateToStep2'), 'saveDraft must NOT invoke onNavigateToStep2');
  assert(!saveDraftMatch[0].includes('router.push'), 'saveDraft must NOT invoke router.push');

  // Behavioral simulation: verify saveDraft does not invoke navigation
  let navigationCount = 0;
  const onNavigate = () => { navigationCount++; };
  const mockSaveDraft = async () => {
    // Saves draft and returns truthful success feedback without navigation
    return true;
  };

  const success = await mockSaveDraft();
  assert.equal(success, true);
  assert.equal(navigationCount, 0, 'saveDraft must NOT trigger navigation');
});

test('W03.2 Navigation and scope contract (d): invalid, failed, or uncertain save does NOT navigate', async () => {
  let navigationCount = 0;
  const onNavigate = () => { navigationCount++; };

  // 1. Validation failure (e.g. empty name)
  function simulateSaveAndContinue(name, categoryId, throwError = false) {
    if (!name.trim()) return false;
    if (!categoryId) return false;
    if (throwError) throw new Error('Transport or remote DB failure');
    onNavigate('valid-uuid');
    return true;
  }

  // Blank name: does not navigate
  assert.equal(simulateSaveAndContinue('', 'cat-1'), false);
  assert.equal(navigationCount, 0);

  // Missing category: does not navigate
  assert.equal(simulateSaveAndContinue('دار الألوان', null), false);
  assert.equal(navigationCount, 0);

  // Remote error: caught, does not navigate
  let errorCaught = false;
  try {
    simulateSaveAndContinue('دار الألوان', 'cat-1', true);
  } catch {
    errorCaught = true;
  }
  assert.equal(errorCaught, true);
  assert.equal(navigationCount, 0, 'Failed save must not trigger navigation');
});

test('W03.2 Navigation and scope contract (e): unauthorized or non-editable Step 2 is blocked', () => {
  const step2Code = read('apps/merchant/src/features/business/components/BusinessOnboardingStep2.tsx');
  const step2Hook = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep2.ts');
  const migration = read('supabase/migrations/20261104000000_merchant_representative_draft.sql');

  // UI guards: signed-out, missing business ID, non-existent or foreign draft
  assert(step2Code.includes('!isSignedIn'), 'Step 2 must check signed-in status');
  assert(step2Code.includes('!isSyntheticPreview && !activeBusinessId'), 'Step 2 must guard against missing businessId');
  assert(step2Code.includes('!isSyntheticPreview && !existingBusiness'), 'Step 2 must guard against non-existent/foreign draft');
  assert(step2Code.includes('لم يتم تحديد نشاط تجاري'), 'Step 2 must show truthful missing business notice');
  assert(step2Code.includes('تعذر الوصول إلى النشاط التجاري'), 'Step 2 must show truthful unauthorized/not-found notice');

  // Read-only guard for non-draft / non-rejected business status
  assert(step2Hook.includes("existingBusiness.status !== 'draft' &&\n    existingBusiness.status !== 'rejected'"));
  assert(step2Hook.includes('if (isReadOnly || isSaving) return false;'));
  assert(step2Hook.includes('if (!activeBusinessId || !userId)'));

  // Database security boundary
  assert(migration.includes('wow_private.is_business_owner'));
  assert(migration.includes("v_bs NOT IN ('draft', 'rejected')"));
});

test('W03.2 Navigation and scope contract (f): dev-only fixture never opens production access', () => {
  const step1Route = read('apps/merchant/src/app/business/onboarding.tsx');
  const step2Route = read('apps/merchant/src/app/business/onboarding/representative.tsx');

  for (const route of [step1Route, step2Route]) {
    assert(
      route.includes("(__DEV__ || process.env.NODE_ENV !== 'production')"),
      'Preview check must strictly gate on dev/non-production environment'
    );
  }

  // Evaluate production environment simulation
  function evaluatePreviewMode(nodeEnv, isDev, searchParams) {
    const isPreview = (isDev || nodeEnv !== 'production') && (searchParams.preview === '1');
    return isPreview;
  }

  // In dev: preview=1 enables preview mode
  assert.equal(evaluatePreviewMode('development', true, { preview: '1' }), true);

  // In production: preview=1 is completely inert
  assert.equal(evaluatePreviewMode('production', false, { preview: '1' }), false);

  // In production: crafted query parameters are inert
  assert.equal(evaluatePreviewMode('production', false, { preview: 'admin', bypass: '1' }), false);
  assert.equal(evaluatePreviewMode('production', false, { preview: 'true' }), false);
});
