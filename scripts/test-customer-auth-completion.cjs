'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');
const customerDir = path.join(repoRoot, 'apps/customer');

// Read source files
const signInSrc = fs.readFileSync(path.join(customerDir, 'src/app/sign-in.tsx'), 'utf8');
const ssoCallbackSrc = fs.readFileSync(path.join(customerDir, 'src/app/sso-callback.tsx'), 'utf8');
const recoveryRouteSrc = fs.readFileSync(path.join(customerDir, 'src/app/recovery.tsx'), 'utf8');
const recoveryScreenSrc = fs.readFileSync(
  path.join(customerDir, 'src/features/auth/CustomerAccountRecoveryScreen.tsx'),
  'utf8',
);
const authDisplaySrc = fs.readFileSync(
  path.join(customerDir, 'src/features/auth/auth-display.ts'),
  'utf8',
);
const accessDecisionSrc = fs.readFileSync(
  path.join(customerDir, 'src/state/access-decision.ts'),
  'utf8',
);
const layoutSrc = fs.readFileSync(path.join(customerDir, 'src/app/_layout.tsx'), 'utf8');

// Transpile pure TS modules using workspace TypeScript
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));

const authDisplayTranspiled = ts.transpileModule(authDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const authDisplay = {};
new Function('exports', 'require', authDisplayTranspiled)(authDisplay, (mod) => {
  if (mod.includes('offer-display')) {
    return {
      isValidUuid: (val) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
    };
  }
  return {};
});

const accessDecisionTranspiled = ts.transpileModule(accessDecisionSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const accessDecision = {};
new Function('exports', 'require', accessDecisionTranspiled)(accessDecision, () => ({}));

// =============================================================================
// Suite 1: Google and Facebook OAuth Flow Preservation
// =============================================================================
test('1. Auth Flow Preservation: Google and Facebook SSO with Expo AuthSession callback', () => {
  // Must preserve exact strategies
  assert.match(signInSrc, /oauth_google/, 'Must retain oauth_google strategy');
  assert.match(signInSrc, /oauth_facebook/, 'Must retain oauth_facebook strategy');
  assert.match(signInSrc, /startSSOFlow/, 'Must invoke startSSOFlow from @wow/auth');

  // Must preserve callback route and customer URI scheme
  assert.match(signInSrc, /path:\s*'sso-callback'/, 'Must target sso-callback path');
  assert.match(signInSrc, /scheme:\s*'customer'/, 'Must use customer native scheme');
  assert.match(signInSrc, /redirectUrl/, 'Must construct explicit redirectUrl');

  // Must activate Clerk session upon completion
  assert.match(signInSrc, /setActive\(\{\s*session:\s*createdSessionId\s*\}\)/, 'Must activate session');

  // SSO Callback must complete browser session on web
  assert.match(ssoCallbackSrc, /WebBrowser\.maybeCompleteAuthSession\(\)/, 'Web callback completes session');
});

// =============================================================================
// Suite 2: Elimination of OTP / SMS and Password Reset Fiction
// =============================================================================
test('2. Owner Decision Enforcement: Zero OTP, SMS, or Fake Password Forms', () => {
  // Prohibit phone verification / OTP UI
  assert.ok(!signInSrc.includes('رمز التحقق'), 'No OTP references in sign-in');
  assert.ok(!signInSrc.includes('إعادة إرسال الرمز'), 'No OTP resend in sign-in');
  assert.ok(!signInSrc.includes('أدخل رمز OTP'), 'No fake OTP prompt');
  assert.ok(!recoveryScreenSrc.includes('رمز التحقق'), 'No OTP in recovery screen');
  assert.ok(!recoveryScreenSrc.includes('كلمة المرور الجديدة'), 'No password reset form');

  // Mode switcher between sign-in and sign-up (CUS-05-02)
  assert.match(signInSrc, /isSignUp/, 'Mode switcher tracks sign-up vs sign-in');
  assert.match(signInSrc, /إنشاء حساب جديد/, 'Arabic sign-up title present');
  assert.match(signInSrc, /تسجيل الدخول/, 'Arabic sign-in title present');
  assert.match(signInSrc, /التسجيل بواسطة Google/, 'Google sign-up button label present');
  assert.match(signInSrc, /التسجيل بواسطة Facebook/, 'Facebook sign-up button label present');
  assert.match(signInSrc, /المتابعة باستخدام Google/, 'Google sign-in button label present');
  assert.match(signInSrc, /المتابعة باستخدام Facebook/, 'Facebook sign-in button label present');
});

// =============================================================================
// Suite 3: Safe Continuable Return Navigation Intent Validation
// =============================================================================
test('3. Return Navigation Intent: Strict Internal Route Whitelisting and Open-Redirect Protection', () => {
  const { validateInternalReturnPath } = authDisplay;
  const validUuid = '12345678-1234-4234-8234-123456789abc';

  // 1. Valid internal routes allowed
  assert.equal(validateInternalReturnPath('/'), '/');
  assert.equal(validateInternalReturnPath('/(tabs)'), '/(tabs)');
  assert.equal(validateInternalReturnPath('/discover'), '/discover');
  assert.equal(validateInternalReturnPath('/favorites'), '/favorites');
  assert.equal(validateInternalReturnPath('/account'), '/account');
  assert.equal(validateInternalReturnPath('/ratings'), '/ratings');
  assert.equal(validateInternalReturnPath(`/offer/${validUuid}`), `/offer/${validUuid}`);
  assert.equal(validateInternalReturnPath(`/offer/${validUuid}/rate`), `/offer/${validUuid}/rate`);
  assert.equal(validateInternalReturnPath(`/offer/${validUuid}/complaint`), `/offer/${validUuid}/complaint`);
  assert.equal(validateInternalReturnPath('/complaints'), '/complaints');
  assert.equal(validateInternalReturnPath(`/complaints/${validUuid}`), `/complaints/${validUuid}`);
  assert.equal(validateInternalReturnPath(`/business/${validUuid}`), `/business/${validUuid}`);

  // Query parameters preserved on valid paths
  assert.equal(
    validateInternalReturnPath(`/offer/${validUuid}/rate?action=rate`),
    `/offer/${validUuid}/rate?action=rate`,
  );

  // 2. Open-redirect attacks blocked & sanitized to safe fallback
  assert.equal(validateInternalReturnPath('https://evil.com'), '/');
  assert.equal(validateInternalReturnPath('http://malicious.org/phish'), '/');
  assert.equal(validateInternalReturnPath('//malicious.com'), '/');
  assert.equal(validateInternalReturnPath('javascript:alert(1)'), '/');
  assert.equal(validateInternalReturnPath('/\\evil.com'), '/');
  assert.equal(validateInternalReturnPath('/offer/invalid-not-a-uuid/rate'), '/');
  assert.equal(validateInternalReturnPath('/admin/secret-door'), '/');
  assert.equal(validateInternalReturnPath(''), '/');
  assert.equal(validateInternalReturnPath(null), '/');

  // 3. Fallback to offer details when offerId is valid
  assert.equal(validateInternalReturnPath(null, validUuid), `/offer/${validUuid}`);
  assert.equal(validateInternalReturnPath('https://attacker.com', validUuid), `/offer/${validUuid}`);
  assert.equal(validateInternalReturnPath('invalid-path', validUuid), `/offer/${validUuid}`);

  // 4. Sign-in screen integrates validated return path
  assert.match(signInSrc, /validateInternalReturnPath\(params\.returnTo,\s*params\.offerId\)/);
  assert.match(signInSrc, /router\.replace\(destination\s+as\s+any\)/);
  assert.match(signInSrc, /hasGatedReturnIntent/, 'Gated return intent detected');
});

// =============================================================================
// Suite 4: Account Recovery Help (CUS-05-03)
// =============================================================================
test('4. CUS-05-03: Provider-Based Account Recovery Help Route & Official External Links', () => {
  // Route registration in _layout.tsx
  assert.match(layoutSrc, /<Stack\.Screen\s+name="recovery"\s*\/>/, 'Route /recovery registered in Stack');
  assert.match(recoveryRouteSrc, /CustomerAccountRecoveryScreen/, 'Route renders recovery screen component');

  // Whitelisted in access decision
  const decision = accessDecision.resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: false,
    currentPath: '/recovery',
  });
  assert.equal(decision.needsRedirect, false, 'Recovery path is whitelisted for unauthenticated access');
  assert.equal(decision.targetRoute, '/access', 'Default access target is unchanged');

  // Content fidelity: honest provider explanation without fake password recovery
  assert.match(recoveryScreenSrc, /مساعدة في استعادة الوصول/, 'Screen title matches specification');
  assert.match(recoveryScreenSrc, /تتيح واجهات تطبيق WOW الحالية تسجيل الدخول عبر Google أو Facebook/,
    'Recovery must describe the actual exposed sign-in buttons, not every Clerk strategy');
  assert.match(recoveryScreenSrc, /قد تكون بعض الحسابات السابقة مسجّلة بوسائل دخول أخرى/,
    'Legacy Clerk accounts must not be misrepresented as OAuth accounts');
  assert.doesNotMatch(recoveryScreenSrc, /نحن لا نخزن كلمات مرور/,
    'Do not assert no passwords while Clerk Development password sign-in is enabled');

  // Official verified recovery URLs
  assert.match(recoveryScreenSrc, /https:\/\/accounts\.google\.com\/signin\/recovery/, 'Official Google recovery URL');
  assert.match(recoveryScreenSrc, /https:\/\/www\.facebook\.com\/login\/identify/, 'Official Facebook recovery URL');

  // Direct SSO retry actions
  assert.match(recoveryScreenSrc, /إعادة المحاولة عبر Google/, 'Google retry button');
  assert.match(recoveryScreenSrc, /إعادة المحاولة عبر Facebook/, 'Facebook retry button');

  // Safe navigation back to sign-in and guest discovery
  assert.match(recoveryScreenSrc, /المتابعة كزائر واستكشاف العروض/, 'Guest exploration link');
  assert.match(signInSrc, /handleNavigateRecovery/, 'Sign-in page links directly to recovery');
});

// =============================================================================
// AUD-046: Recovery guest navigation must update persisted access state first
// =============================================================================
test('4b. Recovery guest action sets access state before navigating to discovery', () => {
  assert.match(recoveryScreenSrc, /const enterGuest = useGuestStore\(\(state\) => state\.enterGuest\)/);
  assert.match(
    recoveryScreenSrc,
    /function handleContinueAsGuest\(\)\s*\{[^}]*enterGuest\(\);\s*router\.replace\('\/discover'\);/s,
    'The guest choice must be committed before the navigation action',
  );
  assert.match(recoveryScreenSrc, /onPress=\{handleContinueAsGuest\}/);

  const decision = accessDecision.resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: true,
    currentPath: '/discover',
  });
  assert.equal(decision.needsRedirect, false, 'Guest discovery is permitted by the root gate');
  assert.equal(decision.isGuest, true);
});

// =============================================================================
// Suite 5: Honest Arabic Error Formatting for Provider SSO
// =============================================================================
test('5. Error Handling: Honest User-Facing Arabic Messages Without Token/Stack Leakage', () => {
  const { resolveAuthErrorMessage } = authDisplay;

  // Cancellation
  const cancelMsg = resolveAuthErrorMessage(new Error('User cancelled SSO flow'), false);
  assert.equal(cancelMsg, 'تم إلغاء عملية المصادقة من قبلك.');

  const dismissMsg = resolveAuthErrorMessage(new Error('Browser popup dismissed'), true);
  assert.equal(dismissMsg, 'تم إلغاء عملية المصادقة من قبلك.');

  // Network failure
  const netMsg = resolveAuthErrorMessage(new Error('Network request failed: timeout'), false);
  assert.equal(netMsg, 'تعذر الاتصال بمزود الخدمة. يُرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.');

  // Verification required
  const verifyMsg = resolveAuthErrorMessage(new Error('Account requires additional verification steps'), false);
  assert.equal(verifyMsg, 'يتطلب حسابك خطوات إضافية للتحقق من مزود الهوية. يُرجى فتح الحساب والتحقق منه أولاً.');

  // Generic fallback
  const genericIn = resolveAuthErrorMessage(new Error('Unknown error code'), false);
  assert.equal(genericIn, 'تعذر إتمام تسجيل الدخول. يُرجى المحاولة مرة أخرى أو اختيار مزود آخر.');

  const genericUp = resolveAuthErrorMessage(new Error('Unknown error code'), true);
  assert.equal(genericUp, 'تعذر إكمال إنشاء الحساب. يُرجى المحاولة مرة أخرى أو اختيار مزود آخر.');

  // Zero raw error string leakage in UI
  assert.ok(!signInSrc.includes('error.message :'), 'Raw error message is never rendered directly');
});

// =============================================================================
// Suite 6: Accessibility, Minimum 48pt Touch Targets, and RTL
// =============================================================================
test('6. Accessibility & Visual Contracts: 48pt Touch Targets, RTL, and Responsive Layout', () => {
  // Sign in back button touch target
  assert.match(signInSrc, /width:\s*48,\s*height:\s*48/, 'Sign-in back button has 48pt dimensions');
  assert.match(signInSrc, /minHeight:\s*48/, 'Mode switcher has 48pt minimum height');

  // Recovery screen back button & links touch targets
  assert.match(recoveryScreenSrc, /width:\s*48,\s*height:\s*48/, 'Recovery back button has 48pt dimensions');
  assert.match(recoveryScreenSrc, /minHeight:\s*48/, 'Recovery links maintain 48pt minHeight');

  // RTL web props
  assert.match(signInSrc, /rtlWebProps/, 'Sign-in has RTL web props');
  assert.match(recoveryScreenSrc, /rtlWebProps/, 'Recovery has RTL web props');

  // Accessible roles
  assert.match(signInSrc, /accessibilityRole="button"/);
  assert.match(recoveryScreenSrc, /accessibilityRole="button"/);
  assert.match(recoveryScreenSrc, /accessibilityRole="link"/);
});
