// scripts/test-merchant-branches.cjs
// W03.3 MER-02-03 Merchant Branches (Step 3 of 4) Test Suite
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const vm = require('node:vm');

const repoRoot = resolve(__dirname, '..');
const read = (relPath) => readFileSync(resolve(repoRoot, relPath), 'utf8');

// Load TypeScript and React Test Renderer from project workspace
const ts = require(resolve(repoRoot, 'packages/api/node_modules/typescript'));
const apiRequire = Module.createRequire(resolve(repoRoot, 'packages/api/package.json'));
const React = apiRequire('react');
const ReactTestRenderer = apiRequire('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Pre-transpile production hook source code for production behavioral runner
const hookSourceCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep3.ts');
const transpiledHook = ts.transpileModule(hookSourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

function createProductionHookRunner(doubles) {
  const customRequire = (id) => {
    if (id === 'react') return React;
    if (id === '@wow/auth') return { useAuth: () => doubles.auth };
    if (id === '@wow/api') return doubles.api;
    if (id.includes('BranchEditorModal')) return {};
    return require(id);
  };
  const exports = {};
  const moduleObj = { exports };
  const wrapper = vm.runInThisContext(Module.wrap(transpiledHook.outputText));
  wrapper(exports, customRequire, moduleObj, 'useBusinessOnboardingStep3.js', repoRoot);
  const useHook = moduleObj.exports.useBusinessOnboardingStep3;

  let currentHook;
  function Harness() {
    currentHook = useHook(doubles.props || { businessId: 'biz-test-uuid' });
    return null;
  }

  let renderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(React.createElement(Harness));
  });

  return {
    getHook: () => currentHook,
    rerender: () => ReactTestRenderer.act(() => { renderer.update(React.createElement(Harness)); }),
  };
}

// ============================================================================
// PART 1: STATIC CONTRACT & SOURCE INTEGRITY AUDIT
// ============================================================================

test('W03.3 Approved artwork: Store Mascot PNG exists with exact SHA-256 and manifest entry', () => {
  const assetPath = resolve(repoRoot, 'packages/assets/assets/illustrations/merchant/WOW_MER-02-03_APPROVED_STORE_MASCOT.png');
  assert(existsSync(assetPath), 'Approved store mascot artwork must exist at runtime asset path');

  const buf = readFileSync(assetPath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const EXPECTED_HASH = '63f85c0d4714beaf314732a0dffa60d21c585b999b24fbebb4df1eefe0f50c7e';
  assert.equal(hash, EXPECTED_HASH, 'Store mascot asset SHA-256 mismatch');

  const manifest = JSON.parse(read('packages/assets/asset-manifest.json'));
  const entry = manifest.items.find(i => i.id === 'onboarding-beacon-branches');
  assert(entry, 'Asset manifest must contain onboarding-beacon-branches entry');
  assert.equal(entry.sha256, EXPECTED_HASH);
  assert.deepEqual(entry.dimensions, [1254, 1254]);

  const indexSource = read('packages/assets/src/index.ts');
  assert(indexSource.includes('onboardingBeaconBranches: require("../assets/illustrations/merchant/WOW_MER-02-03_APPROVED_STORE_MASCOT.png")'));

  const bannerSource = read('apps/merchant/src/features/business/components/BranchesBanner.tsx');
  assert(bannerSource.includes('wowIllustrations.merchant.onboardingBeaconBranches'));
});

test('W03.3 Stepper configuration: Step 3 active (currentStep={2}), Steps 1 and 2 completed', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep3.tsx');
  assert(screenCode.includes("variant=\"connected\""), 'Step 3 must use connected stepper variant');
  assert(screenCode.includes("currentStep={2}"), 'Step 3 must set currentStep={2}');
  assert(
    screenCode.includes("steps={['النشاط', 'المفوض', 'الفروع', 'المراجعة']}"),
    'Stepper steps must be exactly النشاط, المفوض, الفروع, المراجعة'
  );
});

test('W03.3 Locked visible Arabic copy: all exact approved copy strings exist in screen implementation', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep3.tsx');
  const bannerCode = read('apps/merchant/src/features/business/components/BranchesBanner.tsx');
  const modalCode = read('apps/merchant/src/features/business/components/BranchEditorModal.tsx');
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep3.ts');

  const combined = screenCode + bannerCode + modalCode + hookCode;

  const approvedCopy = [
    'طلب تأهيل نشاط',
    'إضافة فروع',
    'الخطوة 3 من 4',
    'النشاط', 'المفوض', 'الفروع', 'المراجعة',
    'أضف فروع نشاطك',
    'أدخل مواقع الفروع التي تخدم عملاءك ضمن طلب التأهيل.',
    'الفروع',
    'أدخل بيانات الفرع الرئيسي، ثم أضف الفروع الإضافية إن وجدت.',
    'الفرع الرئيسي',
    'إلزامي',
    'اسم الفرع',
    'عنوان التشغيل',
    'اكتب عنواناً واضحاً يسهل على الإدارة مراجعته.',
    'إضافة فرع',
    'فرع إضافي',
    'تعديل',
    'حذف',
    'حفظ بيانات الفروع لا يعني اعتمادها؛ ستراجعها الإدارة لاحقاً.',
    'حفظ ومتابعة',
    'حفظ كمسودة',
    'السابق',
    'حذف الفرع؟',
    'مغادرة الصفحة؟',
    'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
    'تم حفظ بيانات الفروع بنجاح. الخطوة التالية (المراجعة) قيد التطوير ولم تُتح بعد.',
  ];

  for (const text of approvedCopy) {
    assert(
      combined.includes(text),
      `Approved Arabic copy string missing: "${text}"`
    );
  }
});

test('W03.3 Field validation rules: branch name, city, and address bounds', () => {
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep3.ts');
  const modalCode = read('apps/merchant/src/features/business/components/BranchEditorModal.tsx');

  assert(hookCode.includes('trimmedName.length < 2 || trimmedName.length > 120'));
  assert(hookCode.includes('trimmedCity.length < 2 || trimmedCity.length > 120'));
  assert(hookCode.includes('trimmedAddress.length < 5 || trimmedAddress.length > 500'));

  assert(modalCode.includes('trimmedName.length < 2 || trimmedName.length > 120'));
  assert(modalCode.includes('trimmedCity.length < 2 || trimmedCity.length > 120'));
  assert(modalCode.includes('trimmedAddress.length < 5 || trimmedAddress.length > 500'));
});

test('W03.3 Screen architecture: PageScaffold app="merchant" and dedicated clean route exist', () => {
  const routeCode = read('apps/merchant/src/app/business/onboarding/branches.tsx');
  const componentCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep3.tsx');

  assert(routeCode.includes('BusinessOnboardingStep3'));
  assert(componentCode.includes('<PageScaffold app="merchant"'));
  assert(routeCode.includes('useLocalSearchParams'));
  assert(routeCode.includes('preview'));
  assert(routeCode.includes('businessId'));
});

test('W03.3 Migration 20261105000000 SQL safety and least privilege audit', () => {
  const migration = read('supabase/migrations/20261105000000_merchant_delete_draft_branch.sql');

  assert(migration.includes('CREATE OR REPLACE FUNCTION "wow_private"."delete_draft_branch_internal"'));
  assert(migration.includes('CREATE OR REPLACE FUNCTION "public"."wow_delete_draft_branch"'));
  assert(migration.includes('SECURITY DEFINER'));
  assert(migration.includes("SET \"search_path\" TO ''") || migration.includes("SET search_path TO ''"));
  assert(migration.includes('wow_private.is_business_owner'));
  assert(migration.includes('Primary branch cannot be deleted'));
  assert(migration.includes('v_is_primary'));
  assert(migration.includes("v_bs NOT IN ('draft', 'rejected')"));
  assert(migration.includes("v_br_status NOT IN ('draft', 'rejected')"));
  assert(migration.includes('business_verifications'));
  assert(migration.includes('offer_branches'));
  assert(migration.includes('business_member_branches'));
  assert(migration.includes('business_profile_revisions'));
  assert(migration.includes('merchant_operation_events'));
  assert(migration.includes('REVOKE ALL PRIVILEGES ON FUNCTION "public"."wow_delete_draft_branch"'));
  assert(migration.includes('GRANT EXECUTE ON FUNCTION "public"."wow_delete_draft_branch"'));

  // Verified check constraint rationale provenance
  assert(migration.includes('business_create'));
  assert(migration.includes('business_representative_draft_update'));
  assert(migration.includes('branch_draft_delete'));
});

test('W03.3 Typed API & projection: Branch includes city, address_line, district; mutations exported', () => {
  const branchesApi = read('packages/api/src/branches.ts');
  const hooksCode = read('packages/api/src/query/hooks/use-branches.ts');
  const apiIndex = read('packages/api/src/index.ts');

  assert(branchesApi.includes('city?: string'));
  assert(branchesApi.includes('address_line?: string'));
  assert(branchesApi.includes('district?: string | null'));
  assert(branchesApi.includes('deleteDraftBranch'));
  assert(branchesApi.includes('updateBranchDraft'));

  assert(hooksCode.includes('useUpdateBranchDraft'));
  assert(hooksCode.includes('useDeleteDraftBranch'));

  assert(apiIndex.includes('useUpdateBranchDraft'));
  assert(apiIndex.includes('useDeleteDraftBranch'));
});

test('W03.3 P1 state isolation: scope changes reset state and route keys unmount previous owner drafts', () => {
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep3.ts');
  const routeCode = read('apps/merchant/src/app/business/onboarding/branches.tsx');

  assert(hookCode.includes('currentScope = `${userId ?? \'anon\'}:${activeBusinessId ?? \'\'}`'));
  assert(hookCode.includes('if (currentScope !== prevScope)'));
  assert(routeCode.includes('key={`${effectiveUserId ?? \'anon\'}:${businessId ?? \'new\'}`}'));
});

test('W03.3 Touch targets: header back, card actions and footer CTAs satisfy >= 48pt interactive size (C4)', () => {
  const componentCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep3.tsx');

  assert(componentCode.includes('min-h-12 min-w-12'));
  assert(componentCode.includes('width: 48'));
  assert(componentCode.includes('height: 48'));
  assert(componentCode.includes('BackHandler.addEventListener'));

  // Defect C4: hitSlop on Edit and Delete buttons extending interactive hit area to >= 48pt
  assert(componentCode.includes('hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}'));
});

test('W03.3 Route flow integration: Step 2 confirms save -> navigates to Step 3 with businessId', () => {
  const step2Hook = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep2.ts');
  assert(step2Hook.includes("pathname: '/business/onboarding/branches'"));
  assert(step2Hook.includes('onNavigateToStep3'));
});

test('W03.3 Step 3 back navigation: navigates back to Step 2 with businessId and unsaved exit guard', () => {
  const step3Component = read('apps/merchant/src/features/business/components/BusinessOnboardingStep3.tsx');
  assert(step3Component.includes("pathname: '/business/onboarding/representative'"));
  assert(step3Component.includes('showExitConfirm'));
  assert(step3Component.includes('لديك تغييرات غير محفوظة في بيانات الفروع. هل تريد تجاهل التغييرات والمغادرة؟'));
});

test('W03.3 Step 3 continue behavior: saves draft and honestly reports Step 4 dependency', () => {
  const step3Hook = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep3.ts');
  assert(step3Hook.includes('تم حفظ بيانات الفروع بنجاح. الخطوة التالية (المراجعة) قيد التطوير ولم تُتح بعد.'));
  assert(step3Hook.includes('onNavigateToStep4'));
});

test('W03.3 Dev-only preview safety: synthetic fixture cannot activate in production', () => {
  const routeCode = read('apps/merchant/src/app/business/onboarding/branches.tsx');
  assert(routeCode.includes('__DEV__ || process.env.NODE_ENV !== \'production\''));
  assert(routeCode.includes('preview === \'1\''));
});

// ============================================================================
// PART 2: ACTUAL PRODUCTION HOOK EXECUTABLE BEHAVIORAL SUITE (Defects C1 - C4)
// ============================================================================

test('W03.3 Production Hook (C1): create-primary RPC resolves, refetch resolves with .error -> editor closed, uncertainty exposed, no secondary create', async () => {
  let createMutationCalled = 0;
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-1' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: {} }) }),
      useBusinessBranches: () => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: async () => ({ data: undefined, error: new Error('Post-write read timeout') }),
      }),
      useCreateBranch: () => ({
        mutateAsync: async () => {
          createMutationCalled++;
          return 'branch-uuid-001';
        },
        isPending: false,
      }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الرئيسي');
    hook.handlePrimaryCityChange('عدن');
    hook.handlePrimaryAddressChange('حي المعلا شارع مدرم');
  });
  runner.rerender();
  hook = runner.getHook();

  let saveOutcome;
  await ReactTestRenderer.act(async () => {
    saveOutcome = await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();

  // Primary save must fail-closed because refetch resolved with .error
  assert.equal(saveOutcome, false, 'persistPrimaryBranch must return false when refetch resolves with .error');
  assert.equal(createMutationCalled, 1, 'Write mutation was invoked once');
  assert.equal(hook.isUncertain, true, 'isUncertain must be set to true');
  assert.equal(hook.feedback.tone, 'warning');
  assert.match(hook.feedback.text, /تعذر تأكيد حفظ الفرع الرئيسي/);

  // Subsequent secondary creation MUST be rejected while uncertain without issuing RPC
  let secCreateResult;
  await ReactTestRenderer.act(async () => {
    secCreateResult = await hook.createAdditionalBranch({ name: 'فرع ثانوي', city: 'عدن', address_line: 'حي خور مكسر' });
  });
  assert.equal(secCreateResult, false, 'Secondary create must be blocked while uncertain');
  assert.equal(createMutationCalled, 1, 'No secondary create request must be issued');
});

test('W03.3 Production Hook (C1): create-primary RPC resolves, refetch rejects -> editor closed, uncertainty exposed', async () => {
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-2' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: {} }) }),
      useBusinessBranches: () => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: async () => { throw new Error('Network dropped on post-write refetch'); },
      }),
      useCreateBranch: () => ({ mutateAsync: async () => 'branch-uuid-002', isPending: false }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الرئيسي');
    hook.handlePrimaryCityChange('عدن');
    hook.handlePrimaryAddressChange('حي المنصورة');
  });
  runner.rerender();
  hook = runner.getHook();

  let saveOutcome;
  await ReactTestRenderer.act(async () => {
    saveOutcome = await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(saveOutcome, false, 'persistPrimaryBranch must return false when refetch rejects');
  assert.equal(hook.isUncertain, true, 'isUncertain must be set to true');
  assert.match(hook.feedback.text, /تعذر تأكيد حفظ الفرع الرئيسي/);
});

test('W03.3 Production Hook (C1): primary write returns success but authoritative refetch lacks expected primary -> fail closed', async () => {
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-3' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: {} }) }),
      useBusinessBranches: () => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: async () => ({
          data: [{ id: 'branch-other', is_primary: false, name: 'فرع غير رئيسي' }],
          error: null,
        }),
      }),
      useCreateBranch: () => ({ mutateAsync: async () => 'branch-uuid-003', isPending: false }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الرئيسي');
    hook.handlePrimaryCityChange('عدن');
    hook.handlePrimaryAddressChange('حي كريتر');
  });
  runner.rerender();
  hook = runner.getHook();

  let saveOutcome;
  await ReactTestRenderer.act(async () => {
    saveOutcome = await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(saveOutcome, false, 'Must fail closed when authoritative refetch lacks expected primary');
  assert.equal(hook.isUncertain, true, 'Inconsistent read must set isUncertain to true');
  assert.match(hook.feedback.text, /لم يظهر الفرع الرئيسي في السجلات المحدثة/);
});

test('W03.3 Production Hook (C1/F1): confirmed primary save and authoritative refetch -> secondary creation permitted', async () => {
  let branchStore = [];
  let setBranchesStateRef;
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-4' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: {} }) }),
      useBusinessBranches: () => {
        const [branches, setBranches] = React.useState([...branchStore]);
        setBranchesStateRef = setBranches;
        return {
          data: branches,
          isLoading: false,
          error: null,
          refetch: async () => {
            const data = [...branchStore];
            setBranches(data);
            return { data, error: null };
          },
        };
      },
      useCreateBranch: () => ({
        mutateAsync: async (input) => {
          const isPrim = branchStore.length === 0;
          const id = `b-${Date.now()}-${branchStore.length}`;
          branchStore.push({ id, name: input.name, city: input.city, address_line: input.addressLine, is_primary: isPrim, status: 'draft' });
          if (setBranchesStateRef) setBranchesStateRef([...branchStore]);
          return id;
        },
        isPending: false,
      }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الرئيسي');
    hook.handlePrimaryCityChange('عدن');
    hook.handlePrimaryAddressChange('حي المعلا');
  });
  runner.rerender();
  hook = runner.getHook();

  let primarySaveOutcome;
  await ReactTestRenderer.act(async () => {
    primarySaveOutcome = await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(primarySaveOutcome, true, 'Primary save must succeed when write and refetch confirm primary');
  assert.equal(hook.isUncertain, false);
  assert.equal(branchStore.length, 1);
  assert.equal(branchStore[0].is_primary, true);
  assert.notEqual(hook.primaryBranch, null, 'primaryBranch must be populated');

  // Secondary creation is now permitted and receives is_primary=false
  let secSaveOutcome;
  await ReactTestRenderer.act(async () => {
    secSaveOutcome = await hook.createAdditionalBranch({ name: 'فرع خور مكسر', city: 'عدن', address_line: 'ساحل أبين' });
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(secSaveOutcome, true, 'Secondary branch creation must succeed after primary confirmation');
  assert.equal(branchStore.length, 2);
  assert.equal(branchStore[1].is_primary, false, 'Secondary branch must have is_primary=false');
});

test('W03.3 Production Hook (F2): false update/delete RPC results never yield success', async () => {
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-5' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: {} }) }),
      useBusinessBranches: () => ({
        data: [{ id: 'b-1', name: 'فرع 1', is_primary: false, status: 'draft' }],
        isLoading: false,
        error: null,
        refetch: async () => ({ data: [{ id: 'b-1', name: 'فرع 1', is_primary: false, status: 'draft' }], error: null }),
      }),
      useCreateBranch: () => ({ mutateAsync: async () => 'id', isPending: false }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => false, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => false, isPending: false }),
    },
  });

  let hook = runner.getHook();
  let updateOutcome, deleteOutcome;

  await ReactTestRenderer.act(async () => {
    updateOutcome = await hook.updateAdditionalBranch({ id: 'b-1', name: 'فرع معدل', city: 'عدن', address_line: 'عدن' });
  });
  runner.rerender();
  hook = runner.getHook();
  assert.equal(updateOutcome, false, 'False update RPC must return false');
  assert.equal(hook.feedback.tone, 'warning');
  assert.match(hook.feedback.text, /تعذر تحديث بيانات الفرع/);

  await ReactTestRenderer.act(async () => {
    deleteOutcome = await hook.deleteAdditionalBranch('b-1');
  });
  runner.rerender();
  hook = runner.getHook();
  assert.equal(deleteOutcome, false, 'False delete RPC must return false');
  assert.equal(hook.feedback.tone, 'info');
  assert.match(hook.feedback.text, /لم يتم العثور على الفرع المطلوب أو تم حذفه مسبقاً/);
});

test('W03.3 Production Hook (F4): timeout prevents duplicate/conflicting mutations until successful reconciliation', async () => {
  let timeoutTriggered = true;
  let serverReconcileBranches = [{ id: 'prim-1', name: 'الفرع الرئيسي', city: 'عدن', address_line: 'حي المنصورة', is_primary: true, status: 'draft' }];
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-6' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: { id: 'biz-test-uuid' } }) }),
      useBusinessBranches: () => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: async () => ({ data: serverReconcileBranches, error: null }),
      }),
      useCreateBranch: () => ({
        mutateAsync: async () => {
          if (timeoutTriggered) {
            const err = new Error('Gateway Timeout 504');
            err.name = 'TimeoutError';
            throw err;
          }
          return 'id';
        },
        isPending: false,
      }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الرئيسي');
    hook.handlePrimaryCityChange('عدن');
    hook.handlePrimaryAddressChange('حي المنصورة');
  });
  runner.rerender();
  hook = runner.getHook();

  let timeoutOutcome;
  await ReactTestRenderer.act(async () => {
    timeoutOutcome = await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(timeoutOutcome, false);
  assert.equal(hook.isUncertain, true, 'Timeout must set isUncertain = true');

  // Next mutation attempt MUST be blocked by hard-stop
  let blockedOutcome;
  await ReactTestRenderer.act(async () => {
    blockedOutcome = await hook.saveDraft();
  });
  assert.equal(blockedOutcome, false, 'Mutations must be blocked while uncertain');

  // Run reconciliation
  let recOutcome;
  await ReactTestRenderer.act(async () => {
    recOutcome = await hook.reconcileState();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(recOutcome, true, 'Reconciliation must succeed');
  assert.equal(hook.isUncertain, false, 'Uncertainty must be cleared after successful reconciliation');
  assert.equal(hook.hasUnsavedChanges, false, 'Local dirty state must be cleared after reconciliation');
});

test('W03.3 Production Hook (F4): reconciliation refetch error does not clear uncertainty', async () => {
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c1-7' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: undefined, error: new Error('Refetch 503') }) }),
      useBusinessBranches: () => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: async () => ({ data: undefined, error: new Error('Branches 503') }),
      }),
      useCreateBranch: () => ({ mutateAsync: async () => { throw new TypeError('Network request failed'); }, isPending: false }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الرئيسي');
    hook.handlePrimaryCityChange('عدن');
    hook.handlePrimaryAddressChange('حي التواهي');
  });
  runner.rerender();
  hook = runner.getHook();

  await ReactTestRenderer.act(async () => {
    await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();
  assert.equal(hook.isUncertain, true);

  // Attempt reconciliation with failing refetches
  let recFailOutcome;
  await ReactTestRenderer.act(async () => {
    recFailOutcome = await hook.reconcileState();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(recFailOutcome, false);
  assert.equal(hook.isUncertain, true, 'isUncertain must remain true when reconciliation fails');
  assert.match(hook.feedback.text, /تعذر التحقق من حالة الطلب/);
});

test('W03.3 Production Hook (C3): Preview edit and delete independent of setState scheduling', async () => {
  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-c3-1' },
    props: {
      fixtureBranches: [
        { id: 'dev-prim', name: 'فرع رئيسي', city: 'عدن', address_line: 'عدن', is_primary: true, status: 'draft' },
        { id: 'dev-sec-1', name: 'فرع 1', city: 'عدن', address_line: 'عدن', is_primary: false, status: 'draft' },
      ],
    },
    api: {
      useBusinessDraftDetails: () => ({ data: null, isLoading: false, error: null, refetch: async () => ({}) }),
      useBusinessBranches: () => ({ data: [], isLoading: false, error: null, refetch: async () => ({}) }),
      useCreateBranch: () => ({ mutateAsync: async () => '', isPending: false }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();

  // 1. Delete existing branch returns true immediately and synchronously
  let previewDelRes;
  await ReactTestRenderer.act(async () => {
    previewDelRes = await hook.deleteAdditionalBranch('dev-sec-1');
  });
  assert.equal(previewDelRes, true, 'Preview delete on existing branch must return true');

  // 2. Delete non-existent branch returns false immediately and synchronously
  let previewDelGhostRes;
  await ReactTestRenderer.act(async () => {
    previewDelGhostRes = await hook.deleteAdditionalBranch('non-existent-id');
  });
  assert.equal(previewDelGhostRes, false, 'Preview delete on absent branch must return false');

  // 3. Update existing branch returns true immediately
  let previewUpdRes;
  await ReactTestRenderer.act(async () => {
    previewUpdRes = await hook.updateAdditionalBranch({ id: 'dev-prim', name: 'الرئيسي المعدل', city: 'عدن', address_line: 'عدن' });
  });
  assert.equal(previewUpdRes, true, 'Preview update on existing branch must return true');

  // 4. Update absent branch returns false immediately
  let previewUpdGhostRes;
  await ReactTestRenderer.act(async () => {
    previewUpdGhostRes = await hook.updateAdditionalBranch({ id: 'non-existent-id', name: 'فرع وهمي', city: 'عدن', address_line: 'عدن' });
  });
  assert.equal(previewUpdGhostRes, false, 'Preview update on absent branch must return false');
});

// ============================================================================
// PART 3: V4 RECONCILIATION-ONLY CORRECTION & AMBIGUOUS INTENT TESTS
// ============================================================================

test('W03.3 Production Hook (V4 Reconciliation): Existing-primary update Old -> New, timeout, refetch still Old preserves local New and dirty flag without false success', async () => {
  const initialPrimary = {
    id: 'prim-old-id',
    name: 'الفرع القديم',
    city: 'عدن',
    address_line: 'شارع المعلا القديم',
    district: 'المعلا',
    is_primary: true,
    status: 'draft',
  };
  let serverBranches = [initialPrimary];

  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-v4-1' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: { id: 'biz-test-uuid' } }) }),
      useBusinessBranches: () => ({
        data: serverBranches,
        isLoading: false,
        error: null,
        refetch: async () => ({ data: serverBranches, error: null }),
      }),
      useCreateBranch: () => ({ mutateAsync: async () => 'id', isPending: false }),
      useUpdateBranchDraft: () => ({
        mutateAsync: async () => {
          const timeoutErr = new Error('Network timeout during primary update');
          timeoutErr.name = 'TimeoutError';
          throw timeoutErr;
        },
        isPending: false,
      }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  assert.equal(hook.primaryName, 'الفرع القديم');
  assert.equal(hook.hasUnsavedChanges, false);

  // User edits primary branch to New value
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الجديد');
  });
  runner.rerender();
  hook = runner.getHook();
  assert.equal(hook.primaryName, 'الفرع الجديد');
  assert.equal(hook.hasUnsavedChanges, true);

  // Attempt save -> times out
  let saveRes;
  await ReactTestRenderer.act(async () => {
    saveRes = await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(saveRes, false, 'Save must return false on timeout');
  assert.equal(hook.isUncertain, true, 'isUncertain must be set to true');

  // Trigger reconciliation while server still has Old values
  let recRes;
  await ReactTestRenderer.act(async () => {
    recRes = await hook.reconcileState();
  });
  runner.rerender();
  hook = runner.getHook();

  // V4 Requirements:
  // 1. local New must not disappear
  assert.equal(hook.primaryName, 'الفرع الجديد', 'Local New value must not disappear when refetch is still Old');
  // 2. dirty flag must stay true
  assert.equal(hook.hasUnsavedChanges, true, 'Dirty flag must remain true');
  // 3. no false success
  assert.notEqual(hook.feedback?.tone, 'success', 'Must not report false success');
  assert.equal(recRes, false, 'Reconciliation must not report success when write is unconfirmed');
  assert.equal(hook.isUncertain, true, 'Uncertainty stop must remain active');
});

test('W03.3 Production Hook (V4 Reconciliation): Existing-primary update Old -> New, timeout, refetch now New resolves safely with confirmed sync', async () => {
  const initialPrimary = {
    id: 'prim-old-id',
    name: 'الفرع القديم',
    city: 'عدن',
    address_line: 'شارع المعلا القديم',
    district: 'المعلا',
    is_primary: true,
    status: 'draft',
  };
  let serverBranches = [initialPrimary];

  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-v4-2' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: { id: 'biz-test-uuid' } }) }),
      useBusinessBranches: () => ({
        data: serverBranches,
        isLoading: false,
        error: null,
        refetch: async () => ({ data: serverBranches, error: null }),
      }),
      useCreateBranch: () => ({ mutateAsync: async () => 'id', isPending: false }),
      useUpdateBranchDraft: () => ({
        mutateAsync: async () => {
          // Simulate packet reached server and succeeded, but response timed out
          serverBranches = [{
            ...initialPrimary,
            name: 'الفرع الجديد',
          }];
          const timeoutErr = new Error('Response timeout');
          timeoutErr.name = 'TimeoutError';
          throw timeoutErr;
        },
        isPending: false,
      }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();
  ReactTestRenderer.act(() => {
    hook.handlePrimaryNameChange('الفرع الجديد');
  });
  runner.rerender();
  hook = runner.getHook();

  // Save times out
  await ReactTestRenderer.act(async () => {
    await hook.persistPrimaryBranch();
  });
  runner.rerender();
  hook = runner.getHook();
  assert.equal(hook.isUncertain, true);

  // Reconcile when server has New values
  let recRes;
  await ReactTestRenderer.act(async () => {
    recRes = await hook.reconcileState();
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(recRes, true, 'Reconciliation must succeed when server has New values');
  assert.equal(hook.isUncertain, false, 'Uncertainty must be cleared');
  assert.equal(hook.hasUnsavedChanges, false, 'hasUnsavedChanges must be false after confirmed sync');
  assert.equal(hook.primaryName, 'الفرع الجديد', 'Primary name must display the confirmed New value');
  assert.equal(hook.feedback?.tone, 'success', 'Must show success confirmation');
});

test('W03.3 Production Hook (V4 Reconciliation): Additional create times out, refetch lacks new branch -> retry remains blocked, no false success', async () => {
  const primaryBranch = { id: 'prim-1', name: 'الفرع الرئيسي', city: 'عدن', address_line: 'المعلا', is_primary: true, status: 'draft' };
  let serverBranches = [primaryBranch];

  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-v4-3' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: { id: 'biz-test-uuid' } }) }),
      useBusinessBranches: () => ({
        data: serverBranches,
        isLoading: false,
        error: null,
        refetch: async () => ({ data: serverBranches, error: null }),
      }),
      useCreateBranch: () => ({
        mutateAsync: async () => {
          const timeoutErr = new Error('Gateway Timeout');
          timeoutErr.name = 'TimeoutError';
          throw timeoutErr;
        },
        isPending: false,
      }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();

  // Create additional branch times out
  let createRes;
  await ReactTestRenderer.act(async () => {
    createRes = await hook.createAdditionalBranch({ name: 'فرع المنصورة', city: 'عدن', address_line: 'حي المنصورة' });
  });
  runner.rerender();
  hook = runner.getHook();

  assert.equal(createRes, false);
  assert.equal(hook.isUncertain, true);

  // Reconcile runs, but server only returns unrelated primary branch
  let recRes;
  await ReactTestRenderer.act(async () => {
    recRes = await hook.reconcileState();
  });
  runner.rerender();
  hook = runner.getHook();

  // Assertions required by V4:
  // Retry must remain blocked; do not infer success merely from valid data fetch
  assert.equal(recRes, false, 'Reconciliation must return false when new branch is unconfirmed');
  assert.equal(hook.isUncertain, true, 'isUncertain must remain true');
  assert.notEqual(hook.feedback?.tone, 'success', 'Must not show success banner');

  // Verify that retry remains strictly blocked
  let retryOutcome;
  await ReactTestRenderer.act(async () => {
    retryOutcome = await hook.createAdditionalBranch({ name: 'فرع المنصورة', city: 'عدن', address_line: 'حي المنصورة' });
  });
  assert.equal(retryOutcome, false, 'Blind retry must be blocked while uncertain');
});

test('W03.3 Production Hook (V4 Reconciliation): Additional create times out, refetch confirms new branch -> uncertainty cleared, correct outcome banner, no duplicates', async () => {
  const primaryBranch = { id: 'prim-1', name: 'الفرع الرئيسي', city: 'عدن', address_line: 'المعلا', is_primary: true, status: 'draft' };
  let serverBranches = [primaryBranch];
  let createCallCount = 0;

  const runner = createProductionHookRunner({
    auth: { isLoaded: true, isSignedIn: true, userId: 'user-v4-4' },
    api: {
      useBusinessDraftDetails: () => ({ data: { id: 'biz-test-uuid', status: 'draft' }, isLoading: false, error: null, refetch: async () => ({ data: { id: 'biz-test-uuid' } }) }),
      useBusinessBranches: () => ({
        data: serverBranches,
        isLoading: false,
        error: null,
        refetch: async () => ({ data: serverBranches, error: null }),
      }),
      useCreateBranch: () => ({
        mutateAsync: async (input) => {
          createCallCount++;
          // Simulate server created branch, but client timed out waiting for response
          serverBranches = [
            primaryBranch,
            { id: 'sec-confirmed-id', name: input.name, city: input.city, address_line: input.addressLine, is_primary: false, status: 'draft' },
          ];
          const timeoutErr = new Error('Client timeout');
          timeoutErr.name = 'TimeoutError';
          throw timeoutErr;
        },
        isPending: false,
      }),
      useUpdateBranchDraft: () => ({ mutateAsync: async () => true, isPending: false }),
      useDeleteDraftBranch: () => ({ mutateAsync: async () => true, isPending: false }),
    },
  });

  let hook = runner.getHook();

  // Create additional branch times out
  await ReactTestRenderer.act(async () => {
    await hook.createAdditionalBranch({ name: 'فرع المنصورة', city: 'عدن', address_line: 'حي المنصورة' });
  });
  runner.rerender();
  hook = runner.getHook();
  assert.equal(hook.isUncertain, true);
  assert.equal(createCallCount, 1);

  // Reconcile runs, and serverBranches contains the matching new branch
  let recRes;
  await ReactTestRenderer.act(async () => {
    recRes = await hook.reconcileState();
  });
  runner.rerender();
  hook = runner.getHook();

  // Assertions required by V4:
  // Uncertainty cleared, correct outcome banner, no duplicate creation attempt
  assert.equal(recRes, true, 'Reconciliation must succeed when new branch is unambiguously confirmed');
  assert.equal(hook.isUncertain, false, 'Uncertainty must be cleared');
  assert.equal(hook.feedback?.tone, 'success', 'Outcome banner must be success');
  assert.match(hook.feedback?.text, /تم تأكيد إضافة الفرع في الخادم بنجاح/);
  assert.equal(createCallCount, 1, 'No duplicate mutation call must have occurred');
});
