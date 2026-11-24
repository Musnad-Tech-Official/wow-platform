const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

// Read source files
const accountRouteSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/(tabs)/account.tsx'),
  'utf8',
);
const tabsLayoutSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/(tabs)/_layout.tsx'),
  'utf8',
);
const bottomNavSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/navigation/CustomerBottomTabBar.tsx'),
  'utf8',
);
const accountScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/CustomerAccountTabScreen.tsx'),
  'utf8',
);
const accountDisplaySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/account-display.ts'),
  'utf8',
);
const accountSummaryCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/AccountSummaryCard.tsx'),
  'utf8',
);
const accountInfoModalSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/AccountInformationModal.tsx'),
  'utf8',
);
const complaintsNoticeModalSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/ComplaintsNoticeModal.tsx'),
  'utf8',
);
const privacyPolicyModalSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/PrivacyPolicyModal.tsx'),
  'utf8',
);
const customerActivitySectionSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/CustomerActivitySection.tsx'),
  'utf8',
);
const accountSettingsSectionSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/AccountSettingsSection.tsx'),
  'utf8',
);
const privacyClosureSectionSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/PrivacyClosureSection.tsx'),
  'utf8',
);
const guestAccountViewSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/GuestAccountView.tsx'),
  'utf8',
);
const rootLayoutSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/_layout.tsx'),
  'utf8',
);
const queryProviderSrc = fs.readFileSync(
  path.join(repoRoot, 'packages/api/src/query/WowQueryProvider.tsx'),
  'utf8',
);

// Transpile pure display functions
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));
const displayTranspiled = ts.transpileModule(accountDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const accountDisplay = {};
new Function('exports', 'require', displayTranspiled)(accountDisplay, (req) => {
  return {};
});

// ===========================================================================
// 1. Navigation and Route Wiring
// ===========================================================================
test('1. Navigation wiring: Expo Router Tabs registers /account and renders CustomerAccountTabScreen', () => {
  assert.ok(
    accountRouteSrc.includes("import { CustomerAccountTabScreen } from '../../features/account/CustomerAccountTabScreen'"),
    'account.tsx must import CustomerAccountTabScreen',
  );
  assert.ok(
    accountRouteSrc.includes('<CustomerAccountTabScreen'),
    'account.tsx must render CustomerAccountTabScreen',
  );

  assert.ok(
    tabsLayoutSrc.includes('name="account"'),
    'tabs layout must register account screen',
  );

  assert.ok(
    bottomNavSrc.includes("account: { label: 'حسابي', icon: UserRound }"),
    'CustomerBottomTabBar must configure account tab with UserRound icon',
  );
  assert.ok(
    bottomNavSrc.includes('wowBrandColors.yellow'),
    'CustomerBottomTabBar must use thin yellow underline for active tab',
  );
});

// ===========================================================================
// 2. Pure Display Logic & Profile Resolution
// ===========================================================================
test('2. Pure display logic: resolveCustomerDisplayName handles all presence/absence combinations', () => {
  const { resolveCustomerDisplayName } = accountDisplay;

  // Full name available
  assert.equal(
    resolveCustomerDisplayName({ fullName: 'محمد علي الحيمي' }),
    'محمد علي الحيمي',
  );

  // First and last name available
  assert.equal(
    resolveCustomerDisplayName({ firstName: 'فؤاد', lastName: 'الريمي' }),
    'فؤاد الريمي',
  );

  // First name only
  assert.equal(
    resolveCustomerDisplayName({ firstName: 'فاطمة' }),
    'فاطمة',
  );

  // Email fallback
  assert.equal(
    resolveCustomerDisplayName({ primaryEmailAddress: { emailAddress: 'user.test@example.com' } }),
    'user.test',
  );

  // Completely empty or null
  assert.equal(resolveCustomerDisplayName(null), 'مستخدم مسجل');
  assert.equal(resolveCustomerDisplayName({}), 'مستخدم مسجل');
  assert.equal(resolveCustomerDisplayName({ fullName: '   ' }), 'مستخدم مسجل');
});

test('3. Pure display logic: resolveCustomerEmail and resolveCustomerPhone handle values and falsy states', () => {
  const { resolveCustomerEmail, resolveCustomerPhone } = accountDisplay;

  assert.equal(
    resolveCustomerEmail({ primaryEmailAddress: { emailAddress: 'customer@wow.ye' } }),
    'customer@wow.ye',
  );
  assert.equal(resolveCustomerEmail({ primaryEmailAddress: { emailAddress: '  ' } }), null);
  assert.equal(resolveCustomerEmail(null), null);

  assert.equal(
    resolveCustomerPhone({ primaryPhoneNumber: { phoneNumber: '+967770111222' } }),
    '+967770111222',
  );
  assert.equal(resolveCustomerPhone(null), null);
});

// ===========================================================================
// 4. Removal of Unconditional Security Claim & Authentic Account Status
// ===========================================================================
test('4. Security & Compliance: Unconditional "حساب موثق ومحمي" and unjustified "قيد المزامنة" eliminated', () => {
  assert.ok(
    !accountScreenSrc.includes('حساب موثق ومحمي'),
    'CustomerAccountTabScreen must NEVER display unconditional "حساب موثق ومحمي"',
  );
  assert.ok(
    !accountSummaryCardSrc.includes('حساب موثق ومحمي'),
    'AccountSummaryCard must NEVER claim unverified "حساب موثق ومحمي"',
  );
  assert.ok(
    !accountDisplaySrc.includes('قيد المزامنة'),
    'account-display.ts must not claim unjustified sync state "قيد المزامنة"',
  );
  assert.ok(
    !accountSummaryCardSrc.includes('قيد المزامنة'),
    'AccountSummaryCard must not show unverified "قيد المزامنة"',
  );

  const { resolveAccountStatusInfo, resolveAccountStatusSource } = accountDisplay;
  const syncedActive = resolveAccountStatusInfo('active', 'verified');
  assert.equal(syncedActive.label, 'حساب نشط');
  assert.equal(syncedActive.tone, 'success');
  assert.equal(syncedActive.isAuthoritative, true);
  const session = { userId: 'user-a', isPending: false, isError: false };
  for (const profile of [null, undefined, { id: 'user-b', account_status: 'active' }]) {
    const resolved = resolveAccountStatusSource({ ...session, profile });
    assert.equal(resolved.source, 'unknown');
    assert.equal(resolveAccountStatusInfo(resolved.status, resolved.source).isAuthoritative, false);
  }
  const active = { id: 'user-a', account_status: 'active' };
  for (const [state, expected] of [[{ isPending: true }, 'loading'], [{ isError: true }, 'error']]) {
    const resolved = resolveAccountStatusSource({ ...session, profile: active, ...state });
    assert.equal(resolved.source, expected);
    assert.equal(resolveAccountStatusInfo(resolved.status, resolved.source).isAuthoritative, false);
  }
  const verified = resolveAccountStatusSource({ ...session, profile: active });
  assert.deepEqual(verified, { status: 'active', source: 'verified' });
  assert.equal(resolveAccountStatusInfo('suspended', 'verified').tone, 'warning');
  assert.equal(resolveAccountStatusInfo('active').isAuthoritative, false);
  assert.equal(resolveAccountStatusInfo('active', 'preview').isAuthoritative, false);
  assert.equal(resolveAccountStatusInfo('unexpected', 'verified').isAuthoritative, false);
  assert.match(accountScreenSrc, /profile: currentUserQuery\.data/);
  assert.doesNotMatch(accountScreenSrc, /realIsSignedIn\s*\?\s*'active'/);
});

// ===========================================================================
// 5. Customer Activity & CUS-08 Complaints Capability Guard
// ===========================================================================
test('5. Customer Activity: CUS-08 route availability check and honest unavailable state without fake records', () => {
  const { IS_CUS08_ROUTE_AVAILABLE } = accountDisplay;
  assert.equal(
    IS_CUS08_ROUTE_AVAILABLE,
    false,
    'IS_CUS08_ROUTE_AVAILABLE must be false because CUS-08 route is not yet implemented in app',
  );

  assert.ok(
    customerActivitySectionSrc.includes('شكاواي ومتابعة البلاغات'),
    'CustomerActivitySection must render complaints entry',
  );
  assert.ok(
    customerActivitySectionSrc.includes('العروض والمتاجر المحفوظة'),
    'CustomerActivitySection must render favorites entry',
  );

  assert.ok(
    complaintsNoticeModalSrc.includes('مسار متابعة الشكاوى (CUS-08) قيد التطوير والربط وفق المسار المعتمد'),
    'Complaints notice modal must honestly report that CUS-08 is in development',
  );
  assert.ok(
    complaintsNoticeModalSrc.includes('لا يتم عرض سجلات تجريبية أو وهمية'),
    'Must explicitly state that no fake records are presented',
  );
});

// ===========================================================================
// 6. Account Settings: Real Theme Switcher & Honest Push Notification State
// ===========================================================================
test('6. Account Settings: Working theme switcher and honest push notification presentation without fake toggle', () => {
  const { IS_PUSH_NOTIFICATIONS_CONFIGURED } = accountDisplay;
  assert.equal(
    IS_PUSH_NOTIFICATIONS_CONFIGURED,
    false,
    'Push notifications must be marked unconfigured',
  );

  // Real theme mode switcher connected to useTheme
  assert.ok(
    accountSettingsSectionSrc.includes('const { mode, setMode, resolvedTheme } = useTheme();'),
    'AccountSettingsSection must consume useTheme',
  );
  assert.ok(
    accountSettingsSectionSrc.includes("setMode(opt.mode)"),
    'AccountSettingsSection must invoke setMode to update app theme',
  );
  assert.ok(
    accountSettingsSectionSrc.includes('مظهر التطبيق'),
    'Must display app appearance setting',
  );

  // Push notifications row
  assert.ok(
    accountSettingsSectionSrc.includes('إشعارات التنبيهات'),
    'Must display push notification row',
  );
  assert.ok(
    accountSettingsSectionSrc.includes('غير متوفرة'),
    'Must show non-working/unsupported status badge for notifications',
  );
  assert.ok(
    !accountSettingsSectionSrc.includes('SwitchField'),
    'Must NOT display a fake working switch for unconfigured push notifications',
  );
});

// ===========================================================================
// 7. Profile Action Clarity & Privacy Policy
// ===========================================================================
test('7. Profile Action Clarity & Privacy Policy: Honest view-only labelling without fake update operations', () => {
  const { IS_ACCOUNT_CLOSURE_SUBMISSION_SUPPORTED, IS_PROFILE_DIRECT_EDIT_SUPPORTED } = accountDisplay;
  assert.equal(IS_ACCOUNT_CLOSURE_SUBMISSION_SUPPORTED, true);
  assert.equal(IS_PROFILE_DIRECT_EDIT_SUPPORTED, false);

  assert.ok(
    accountSummaryCardSrc.includes('عرض معلومات الحساب'),
    'AccountSummaryCard must label profile action as viewing information, not editing',
  );
  assert.ok(
    accountInfoModalSrc.includes('معلومات الحساب المعتمدة'),
    'AccountInformationModal must present view of authoritative account information',
  );

  assert.ok(
    privacyClosureSectionSrc.includes('طلب إغلاق الحساب لا يعني الحذف الفوري لسجلات التحقيق'),
    'Must display explicit data retention and investigation preservation notice',
  );
  assert.ok(
    privacyClosureSectionSrc.includes('طلب نسخة من البيانات الشخصية'),
    'Must include personal data request entry',
  );
  assert.ok(
    privacyClosureSectionSrc.includes('طلب تصحيح البيانات'),
    'Must include data correction entry',
  );
  assert.ok(
    privacyClosureSectionSrc.includes('طلب إغلاق الحساب عند السماح'),
    'Must include closure request entry',
  );

  assert.ok(
    privacyClosureSectionSrc.includes('<PrivacyRequestPanel'),
    'Privacy requests must use the real request workflow',
  );
  assert.ok(
    privacyPolicyModalSrc.includes('سياسة الخصوصية وحفظ البيانات'),
    'Privacy modal must provide clear policy guidance',
  );
});

// ===========================================================================
// 8. Sign-out Flow: Order of Operations, Confirmation, and Error Handling
// ===========================================================================
test('8. Sign-out Flow: clerk.signOut() executed BEFORE enterGuest(), errors caught safely', () => {
  assert.ok(
    accountScreenSrc.includes('ConfirmDialog'),
    'CustomerAccountTabScreen must use ConfirmDialog for sign out',
  );
  assert.ok(
    accountScreenSrc.includes('title="تأكيد تسجيل الخروج"'),
    'ConfirmDialog title must be تأكيد تسجيل الخروج',
  );

  const signOutIdx = accountScreenSrc.indexOf('await clerk.signOut();');
  const enterGuestIdx = accountScreenSrc.indexOf('enterGuest();');
  assert.ok(signOutIdx !== -1, 'Must call await clerk.signOut()');
  assert.ok(enterGuestIdx !== -1, 'Must call enterGuest() after signOut');
  assert.ok(
    signOutIdx < enterGuestIdx,
    'clerk.signOut() must execute and await BEFORE enterGuest() to prevent inconsistent hybrid session state',
  );

  assert.ok(
    accountScreenSrc.includes("setNoticeTone('danger')"),
    'Must display error banner when sign out throws',
  );
});

// ===========================================================================
// 9. Session Cache Isolation Across Sign-Out
// ===========================================================================
test('9. Session Security: QueryProvider isolates cache and resets on sign-out', () => {
  assert.ok(
    rootLayoutSrc.includes('const sessionScopeKey ='),
    'Root layout must derive sessionScopeKey from userId and sessionId',
  );
  assert.ok(
    rootLayoutSrc.includes('isLoaded && isSignedIn && userId && sessionId'),
    'sessionScopeKey must be null when signed out or when session ceases',
  );
  assert.ok(
    queryProviderSrc.includes("const scope = active ? JSON.stringify([props.userId, props.sessionScopeKey]) : 'signed-out'"),
    'WowQueryProvider must assign signed-out scope key when user signs out',
  );
  assert.ok(
    queryProviderSrc.includes('<SessionQueryProvider key={scope}'),
    'SessionQueryProvider key switch destroys previous user cache entirely',
  );
});

// ===========================================================================
// 10. Information Hierarchy: Account Summary First, Followed by Activity, Settings, Privacy, Session
// ===========================================================================
test('10. Information Hierarchy: Summary card is FIRST, followed by activity, settings, privacy, and sign-out', () => {
  const summaryCardIdx = accountScreenSrc.indexOf('<AccountSummaryCard');
  const activityIdx = accountScreenSrc.indexOf('<CustomerActivitySection');
  const settingsIdx = accountScreenSrc.indexOf('<AccountSettingsSection');
  const privacyIdx = accountScreenSrc.indexOf('<PrivacyClosureSection');
  const sessionIdx = accountScreenSrc.indexOf('title="تسجيل الخروج"');

  assert.ok(summaryCardIdx !== -1, 'AccountSummaryCard must be present');
  assert.ok(activityIdx !== -1, 'CustomerActivitySection must be present');
  assert.ok(settingsIdx !== -1, 'AccountSettingsSection must be present');
  assert.ok(privacyIdx !== -1, 'PrivacyClosureSection must be present');
  assert.ok(sessionIdx !== -1, 'Sign-out button must be present');

  assert.ok(
    summaryCardIdx < activityIdx,
    'Account summary must appear FIRST before customer activity',
  );
  assert.ok(
    activityIdx < settingsIdx,
    'Customer activity must appear before account settings',
  );
  assert.ok(
    settingsIdx < privacyIdx,
    'Account settings must appear before privacy & closure section',
  );
  assert.ok(
    privacyIdx < sessionIdx,
    'Privacy & closure must appear near the end, before sign-out',
  );
});

// ===========================================================================
// 11. Modal Contained Bounds & Dark Mode Visibility
// ===========================================================================
test('11. Modal Bounds & Accessibility: Close button is contained within bounds, high-contrast in dark mode, supports Escape', () => {
  // Privacy Policy Modal
  assert.ok(
    privacyPolicyModalSrc.includes('flexShrink: 1'),
    'PrivacyPolicyModal title container must shrink so close button never overflows',
  );
  assert.ok(
    privacyPolicyModalSrc.includes('minWidth: 48'),
    'PrivacyPolicyModal close button must satisfy min 48pt touch target',
  );
  assert.ok(
    privacyPolicyModalSrc.includes("e.key === 'Escape'"),
    'PrivacyPolicyModal must support Escape key on web',
  );

  // Account Information Modal
  assert.ok(
    accountInfoModalSrc.includes('flexShrink: 1'),
    'AccountInformationModal title container must shrink so close button never overflows',
  );
  assert.ok(
    accountInfoModalSrc.includes("e.key === 'Escape'"),
    'AccountInformationModal must support Escape key on web',
  );

  // Complaints Notice Modal
  assert.ok(
    complaintsNoticeModalSrc.includes('flexShrink: 1'),
    'ComplaintsNoticeModal title container must shrink so close button never overflows',
  );
});

// ===========================================================================
// 12. Guest Account State Presentation & Accessibility
// ===========================================================================
test('12. Guest State & Ergonomics: Secure access illustration, honest copy, min 48pt touch targets, and 640px max width container', () => {
  assert.ok(
    guestAccountViewSrc.includes('wowIllustrations.customer.secureAccess'),
    'Guest view must use approved secureAccess illustration',
  );
  assert.ok(
    guestAccountViewSrc.includes('أنت تتصفح تطبيق WOW كضيف'),
    'Guest view must feature approved Arabic heading',
  );
  assert.ok(
    guestAccountViewSrc.includes('تسجيل الدخول / إنشاء حساب'),
    'Guest view must offer sign in CTA',
  );

  // Ergonomics & max width
  assert.ok(
    accountScreenSrc.includes('Math.min(viewport.width - 32, 640)'),
    'Must constrain content max width to 640px on desktop',
  );
  assert.ok(
    accountSummaryCardSrc.includes('minHeight: 48'),
    'AccountSummaryCard action row must maintain min 48pt touch target',
  );
  assert.ok(
    accountScreenSrc.includes("dir: 'rtl'"),
    'Must set RTL direction on web platforms',
  );
});


test('AUD-051: legal documents use configured HTTPS URLs and never claim unavailable acceptance', () => {
  const dir=path.join(repoRoot,'apps/customer/src/features/legal');
  const src=fs.readFileSync(path.join(repoRoot,'packages/ui/src/legal-documents.ts'),'utf8');
  const h={};
  new Function('exports',ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(h);
  assert.equal(h.validateLegalDocumentUrl('https://example.com/terms'),'https://example.com/terms');
  for(const value of [null,'','http://example.com','javascript:alert(1)','//example.com','https://user:pass@example.com/','https://127.0.0.1/','https://x.local/','https://example.com/?token=test']) assert.equal(h.validateLegalDocumentUrl(value),null);
  const links=fs.readFileSync(path.join(repoRoot,'packages/ui/src/LegalDocumentLinks.tsx'),'utf8');
  const signIn=fs.readFileSync(path.join(repoRoot,'apps/customer/src/app/sign-in.tsx'),'utf8');
  assert.match(links,/Linking\.openURL\(url\)/);
  assert.match(links,/disabled=\{!legalDocuments\.terms\}/);
  assert.match(links,/disabled=\{!legalDocuments\.privacy\}/);
  assert.match(signIn,/<LegalDocumentLinks \/>/);
  assert.match(privacyPolicyModalSrc,/<LegalDocumentLinks \/>/);
  assert.doesNotMatch(signIn,/بتسجيلك فإنك توافق/);
});


test('AUD-053: privacy request intake is server-backed and not automatic deletion',()=>{
 const read=p=>fs.readFileSync(path.join(repoRoot,p),'utf8');
 const panel=read('apps/customer/src/features/account/PrivacyRequestPanel.tsx');
 const admin=read('apps/admin/src/app/privacy-requests.tsx');
 const api=read('packages/api/src/privacy-requests.ts');
 const hooks=read('packages/api/src/query/hooks/use-privacy-requests.ts');
 assert.match(accountScreenSrc,/requestsEnabled=\{!isPreview && accountStatus.source === 'verified' && accountStatus.status === 'active'\}/);
 assert.match(panel,/if\(!enabled\|\|!kind\|\|!confirm\|\|busy.current\)return/);
 assert.match(panel,/await submit.mutateAsync/);
 assert.match(api,/wow_submit_privacy_request/);
 assert.match(api,/wow_list_my_privacy_requests/);
 assert.match(hooks,/\['privacy','own',ctx.userId,offset\]/);
 assert.match(hooks,/retry:false/);
 assert.match(admin,/role==='super_admin'\?<Queue/);
 assert.match(admin,/تأكيد وتسجيل الحالة/);
 assert.doesNotMatch(api,/deleteUser|account_status|\.delete\(/);
});
