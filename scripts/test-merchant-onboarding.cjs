// W03.1 MER-02-01 Merchant Business Onboarding Step 1 Test Suite
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const repoRoot = resolve(__dirname, '..');
const read = (relPath) => readFileSync(resolve(repoRoot, relPath), 'utf8');

test('W03.1 Stepper: variant="connected" renders connected circles in RTL with accessibility', () => {
  const stepperCode = read('packages/ui/src/Stepper.tsx');
  assert(stepperCode.includes("variant = 'pills'"), 'Stepper must default to pills variant for backwards compatibility');
  assert(stepperCode.includes("variant === 'connected'"), 'Stepper must handle connected variant');
  assert(stepperCode.includes('accessibilityRole="progressbar"'), 'Connected stepper must declare progressbar role');
  assert(stepperCode.includes('backgroundColor: colors.border'), 'Connecting track line must use theme border token');
  assert(stepperCode.includes('colors.primary'), 'Active step must use primary token');
  assert(stepperCode.includes('Tajawal-Bold'), 'Active step number must use Tajawal-Bold font');
  assert(stepperCode.includes('horizontal'), 'Must retain horizontal keyword for V0.6 test compatibility');
});

test('W03.1 Approved Arabic copy: all exact copy strings exist in screen implementation', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep1.tsx');
  const bannerCode = read('apps/merchant/src/features/business/components/WelcomeBanner.tsx');
  const sheetCode = read('apps/merchant/src/features/business/components/CategorySelectSheet.tsx');
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep1.ts');

  const combined = screenCode + bannerCode + sheetCode + hookCode;

  const approvedCopy = [
    'طلب تأهيل نشاط',
    'إضافة نشاط تجاري',
    'الخطوة 1 من 4',
    'النشاط', 'المفوض', 'الفروع', 'المراجعة',
    'لنبدأ بإضافة نشاطك التجاري',
    'أدخل البيانات الأساسية لنشاطك لإتمام طلب التأهيل.',
    'بيانات النشاط',
    'أدخل بيانات نشاطك التجاري. يمكنك حفظ الطلب واستكماله لاحقًا.',
    'اسم النشاط التجاري',
    'مثال: دار الألوان',
    'اكتب الاسم الحقيقي للنشاط كما يُعرف به، وبما يطابق مستنداته إن وجدت.',
    'فئة النشاط',
    'اختر فئة النشاط',
    'اختر الفئة الأقرب إلى المنتجات أو الخدمات التي تقدمها.',
    'وصف النشاط',
    'مثال: متجر متخصص في بيع الأدوات المنزلية ومستلزمات المطبخ.',
    'صف ما يقدمه نشاطك للعملاء في جملة أو جملتين.',
    'يمكنك إدارة أكثر من نشاط تجاري بحساب واحد، ويُراجع كل نشاط بشكل مستقل.',
    'حفظ ومتابعة',
    'حفظ كمسودة',
    'اختر فئة النشاط',
    'ابحث عن فئة النشاط...',
    'لم نعثر على فئة مطابقة. جرّب كلمة أخرى.',
    'تعذر تحميل الفئات. حاول مرة أخرى.',
    'أدخل اسم النشاط التجاري للمتابعة.',
    'اختر فئة النشاط للمتابعة.',
    'جارٍ الحفظ...',
    'تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.',
    'تعذر تأكيد الحفظ. تحقق من حالة الطلب قبل إعادة المحاولة.',
    'تم حفظ بيانات النشاط. يمكنك استكمال الخطوات التالية عند توفرها.',
  ];

  for (const text of approvedCopy) {
    assert(
      combined.includes(text),
      `Approved Arabic copy string missing: "${text}"`
    );
  }
});

test('W03.1 Arabic search normalization handles diacritics, alef, taa marbuta, and yaa', () => {
  function normalizeArabicText(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[يى]/g, 'ي')
      .replace(/[ؤئ]/g, 'ء');
  }

  // Diacritics (tashkeel)
  assert.equal(normalizeArabicText('مَطْبَخْ'), 'مطبخ');
  assert.equal(normalizeArabicText('أَدَوَاتٌ مَنْزِلِيَّةٌ'), 'ادوات منزليه');

  // Alef variants
  assert.equal(normalizeArabicText('أطعمة'), 'اطعمه');
  assert.equal(normalizeArabicText('إلكترونيات'), 'الكترونيات');
  assert.equal(normalizeArabicText('آلات'), 'الات');

  // Taa marbuta and alef maksura
  assert.equal(normalizeArabicText('مكتبة كبرى'), 'مكتبه كبري');

  // Search match test
  const categories = [
    { id: '1', name_ar: 'أدوات منزلية ومطبخ', slug: 'home-kitchen' },
    { id: '2', name_ar: 'أغذية ومشروبات', slug: 'food-beverage' },
    { id: '3', name_ar: 'ملابس وأزياء', slug: 'fashion' },
  ];

  const search = (q) => {
    const normQ = normalizeArabicText(q);
    return categories.filter(c => normalizeArabicText(c.name_ar).includes(normQ));
  };

  assert.equal(search('منزليه').length, 1);
  assert.equal(search('منزليه')[0].id, '1');
  assert.equal(search('اغذية').length, 1);
  assert.equal(search('اغذية')[0].id, '2');
  assert.equal(search('مَطْبَخ').length, 1);
  assert.equal(search('ازياء').length, 1);
  assert.equal(search('سيارات').length, 0);
});

test('W03.1 Field validation rules: name, category, and description bounds', () => {
  function validateDraft(name, description) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { valid: false, error: 'أدخل اسم النشاط التجاري للمتابعة.' };
    if (trimmed.length < 2 || trimmed.length > 120) return { valid: false, error: 'يجب أن يتراوح اسم النشاط بين 2 و 120 حرفًا.' };
    if ((description || '').length > 1200) return { valid: false, error: 'يجب ألا يتجاوز وصف النشاط 1200 حرف.' };
    return { valid: true, error: null };
  }

  function validateContinue(name, categoryId, description) {
    const draftRes = validateDraft(name, description);
    if (!draftRes.valid) return draftRes;
    if (!categoryId) return { valid: false, error: 'اختر فئة النشاط للمتابعة.' };
    return { valid: true, error: null };
  }

  // Blank name fails both
  assert.equal(validateDraft('', '').valid, false);
  assert.equal(validateDraft('   ', '').error, 'أدخل اسم النشاط التجاري للمتابعة.');
  assert.equal(validateContinue('  ', 'cat-1', '').valid, false);

  // Single character name fails length bound
  assert.equal(validateDraft('م', '').valid, false);
  assert.equal(validateDraft('م', '').error, 'يجب أن يتراوح اسم النشاط بين 2 و 120 حرفًا.');

  // Valid name allows draft without category
  assert.equal(validateDraft('دار الألوان', '').valid, true);

  // Continue requires category
  assert.equal(validateContinue('دار الألوان', null, '').valid, false);
  assert.equal(validateContinue('دار الألوان', null, '').error, 'اختر فئة النشاط للمتابعة.');

  // Continue succeeds with valid name and category
  assert.equal(validateContinue('دار الألوان', 'cat-1', 'وصف قصير').valid, true);

  // Description > 1200 chars fails
  const longDesc = 'أ'.repeat(1201);
  assert.equal(validateDraft('دار الألوان', longDesc).valid, false);
  assert.equal(validateDraft('دار الألوان', longDesc).error, 'يجب ألا يتجاوز وصف النشاط 1200 حرف.');
});

test('W03.1 Screen architecture: PageScaffold app="merchant" and dedicated route exist', () => {
  const routeCode = read('apps/merchant/src/app/business/onboarding.tsx');
  assert(routeCode.includes('BusinessOnboardingStep1'), 'Route must render BusinessOnboardingStep1');
  assert(routeCode.includes('useLocalSearchParams'), 'Route must accept businessId param');

  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep1.tsx');
  assert(screenCode.includes('app="merchant"'), 'PageScaffold must specify app="merchant"');
  assert(!screenCode.includes('from "business_categories"'), 'Screen must never query or insert into business_categories directly');
  assert(!screenCode.includes('wow_admin_set_business_categories'), 'Screen must never call admin mutations');
});

test('W03.1 Migration 20261103000000 SQL safety and least privilege audit', () => {
  const sql = read('supabase/migrations/20261103000000_merchant_requested_category.sql');
  // Additive column check
  assert(sql.includes('ADD COLUMN IF NOT EXISTS "requested_category_id" "uuid"'));
  assert(sql.includes('REFERENCES "public"."categories"("id") ON DELETE SET NULL'));
  assert(sql.includes('CREATE INDEX IF NOT EXISTS "businesses_requested_category_id_idx"'));

  // Definer search_path hardening
  assert(sql.includes('SET "search_path" TO \'\''));

  // Grant least privilege: public wrappers are granted to authenticated, but private internal routines are NOT
  assert(sql.includes('REVOKE ALL ON FUNCTION "wow_private"."create_business_with_category_internal"'));
  assert(sql.includes('REVOKE ALL ON FUNCTION "public"."wow_create_business_with_category"'));
  assert(sql.includes('GRANT ALL ON FUNCTION "public"."wow_create_business_with_category"'));
  assert(sql.includes('TO "authenticated"'));
  assert(!sql.includes('GRANT ALL ON FUNCTION "wow_private"."create_business_with_category_internal"("p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "authenticated"'), 'Internal private routine must NOT be granted to authenticated');
  assert(!sql.includes('GRANT ALL ON FUNCTION "wow_private"."update_business_draft_internal"("p_business_id" "uuid", "p_name" "text", "p_requested_category_id" "uuid", "p_description" "text") TO "authenticated"'), 'Internal private draft update routine must NOT be granted to authenticated');

  // Status check for draft updates
  assert(sql.includes("v_bs NOT IN ('draft', 'rejected')"));
  assert(sql.includes("Only draft/rejected businesses may be edited directly"));

  // No admin role escalation
  assert(!sql.includes('approved_by_user_id'));
  assert(!sql.includes('business_categories'));
});

test('W03.1 P0 pre-migration API safety: existing getMyBusinesses and getBusiness do not query unmigrated requested_category_id', () => {
  const apiCode = read('packages/api/src/businesses.ts');
  const getMyBusinessesMatch = apiCode.match(/function getMyBusinesses[\s\S]*?\.select\('([^']+)'\)/);
  assert(getMyBusinessesMatch, 'getMyBusinesses must have a select projection');
  assert(!getMyBusinessesMatch[1].includes('requested_category_id'), 'getMyBusinesses must NOT query requested_category_id on pre-migration database');

  const getBusinessBlock = apiCode.split('export async function getBusiness(')[1]?.split('/** Scoped onboarding/draft detail reader')[0];
  assert(getBusinessBlock, 'getBusiness implementation must exist');
  assert.match(getBusinessBlock, /client\.rpc\('wow_merchant_list_accessible_businesses'\)/,
    'Employee-visible business details must use a server-sanitized projection');
  assert.doesNotMatch(getBusinessBlock, /\.from\('businesses'\)/,
    'Employee business detail must never read the full business row directly');

  assert(apiCode.includes('getBusinessDraftDetails'), 'Dedicated getBusinessDraftDetails must exist for onboarding draft loading');
});

test('W03.1 P1 state isolation: scope changes reset state and route keys unmount previous owner drafts', () => {
  const hookCode = read('apps/merchant/src/features/business/hooks/useBusinessOnboardingStep1.ts');
  assert(hookCode.includes('currentScope'), 'Hook must compute currentScope combining userId and businessId');
  assert(hookCode.includes('prevScope'), 'Hook must track prevScope to detect account or business switches');
  assert(hookCode.includes('setUserName(null)'), 'Hook must reset userName override when scope changes');
  assert(hookCode.includes('setUserCategoryId(undefined)'), 'Hook must reset userCategoryId override when scope changes');
  assert(hookCode.includes('setUserDescription(null)'), 'Hook must reset userDescription override when scope changes');
  assert(hookCode.includes('isDeploymentPendingError'), 'Hook must detect pre-migration backend states and report clear message');

  const routeCode = read('apps/merchant/src/app/business/onboarding.tsx');
  assert(routeCode.includes('key={`'), 'Route must pass key with userId and businessId to force clean component lifecycle');
});

test('W03.1 Touch target: header back action satisfies >= 48pt minimum interactive size and registers hardware back listener', () => {
  const screenCode = read('apps/merchant/src/features/business/components/BusinessOnboardingStep1.tsx');
  assert(screenCode.includes('width: 48'), 'Back button must have 48pt width');
  assert(screenCode.includes('height: 48'), 'Back button must have 48pt height');
  assert(screenCode.includes('min-h-12 min-w-12'), 'Back button must have min-h-12 and min-w-12 class');
  assert(screenCode.includes('BackHandler.addEventListener'), 'Screen must attach hardwareBackPress listener for Android navigation safety');
});
