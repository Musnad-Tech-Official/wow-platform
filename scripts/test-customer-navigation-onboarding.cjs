const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rootDir = path.resolve(__dirname, '..');
const customerDir = path.resolve(rootDir, 'apps/customer');
const ts = require(require.resolve('typescript', { paths: [customerDir] }));

// Helper to transpile TS module in memory for unit testing
function loadTsModule(relativePath) {
  const fullPath = path.resolve(customerDir, relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', transpiled);
  fn(m, m.exports, require);
  return m.exports;
}

const accessDecision = loadTsModule('src/state/access-decision.ts');
const { resolveAccessDecision } = accessDecision;

test('1. First-Time User Experience: mandatory onboarding gate', () => {
  // New installation: not onboarded, not signed in, not guest
  const decision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: false,
    hasChosenGuest: false,
    currentPath: '/',
  });

  assert.equal(decision.isReady, true);
  assert.equal(decision.targetRoute, '/welcome');
  assert.equal(decision.canAccessPublicApp, false);
  assert.equal(decision.canAccessPrivateApp, false);
  assert.equal(decision.needsRedirect, true, 'Must redirect new user from / to /welcome');
});

test('2. Onboarding Completion: routes to continuation options (/access)', () => {
  // User just finished onboarding steps: hasCompletedOnboarding = true, neither guest nor signed in
  const decision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: false,
    currentPath: '/',
  });

  assert.equal(decision.isReady, true);
  assert.equal(decision.targetRoute, '/access');
  assert.equal(decision.canAccessPublicApp, false);
  assert.equal(decision.needsRedirect, true, 'Must redirect unauthenticated completed user to /access');
});

test('3. Guest Mode Access: public discovery allowed, private tabs protected', () => {
  // Explicit guest choice: hasChosenGuest = true
  const publicDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: true,
    currentPath: '/',
  });

  assert.equal(publicDecision.isReady, true);
  assert.equal(publicDecision.targetRoute, '/');
  assert.equal(publicDecision.canAccessPublicApp, true);
  assert.equal(publicDecision.canAccessPrivateApp, false);
  assert.equal(publicDecision.isGuest, true);
  assert.equal(publicDecision.needsRedirect, false);

  // Guest direct navigation to tab destinations (/favorites) displays in-screen honest invite without redirect
  const tabDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: true,
    currentPath: '/favorites',
  });

  assert.equal(tabDecision.canAccessPrivateApp, false);
  assert.equal(tabDecision.needsRedirect, false, 'Must allow guest to view tab with in-screen auth prompt');

  // Guest attempting to revisit /welcome or /access is redirected to /
  const authGateDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: true,
    currentPath: '/access',
  });

  assert.equal(authGateDecision.needsRedirect, true, 'Must redirect guest from /access to /');
  assert.equal(authGateDecision.targetRoute, '/');
});

test('4. Authenticated Clerk User: full access, migration policy, guest clear', () => {
  // Existing or newly authenticated user
  const authDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasCompletedOnboarding: false, // Pre-existing user before W09
    hasChosenGuest: true, // leftover guest flag
    currentPath: '/',
  });

  assert.equal(authDecision.isReady, true);
  assert.equal(authDecision.targetRoute, '/');
  assert.equal(authDecision.canAccessPublicApp, true);
  assert.equal(authDecision.canAccessPrivateApp, true);
  assert.equal(authDecision.shouldMigrateExistingUser, true, 'Must migrate pre-existing authenticated user without repeating onboarding');
  assert.equal(authDecision.isGuest, false);
  assert.equal(authDecision.needsRedirect, false);

  // Authenticated user landing on /welcome or /access should be sent to main app
  const redirectAuthDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: true,
    hasCompletedOnboarding: true,
    hasChosenGuest: false,
    currentPath: '/welcome',
  });

  assert.equal(redirectAuthDecision.needsRedirect, true, 'Authenticated user on /welcome must be redirected to /');
});

test('5. Sign Out Safety: does not reactivate guest access', () => {
  // After sign out: isSignedIn = false, hasChosenGuest must be false
  const signOutDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: false,
    currentPath: '/',
  });

  assert.equal(signOutDecision.isReady, true);
  assert.equal(signOutDecision.targetRoute, '/access');
  assert.equal(signOutDecision.canAccessPublicApp, false);
  assert.equal(signOutDecision.isGuest, false);
  assert.equal(signOutDecision.needsRedirect, true);
});

test('6. Hydration & Auth Race Safety: prevents premature rendering', () => {
  // Stores still hydrating
  const unhydratedDecision = resolveAccessDecision({
    isHydrated: false,
    isAuthLoaded: true,
    isSignedIn: true,
    hasCompletedOnboarding: true,
    hasChosenGuest: false,
  });

  assert.equal(unhydratedDecision.isReady, false);
  assert.equal(unhydratedDecision.targetRoute, null);

  // Clerk auth still loading
  const unauthDecision = resolveAccessDecision({
    isHydrated: true,
    isAuthLoaded: false,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: true,
  });

  assert.equal(unauthDecision.isReady, false);
  assert.equal(unauthDecision.targetRoute, null);
});

test('7. State Stores Architecture: AsyncStorage keys and versioning', () => {
  const onboardingStoreFile = fs.readFileSync(
    path.resolve(customerDir, 'src/state/onboarding-store.ts'),
    'utf8',
  );
  assert.match(onboardingStoreFile, /wow:customer:onboarding:v1/, 'Uses approved versioned onboarding key');
  assert.match(onboardingStoreFile, /AsyncStorage/, 'Persists to AsyncStorage');
  assert.match(onboardingStoreFile, /migrate:/, 'Implements migration recovery handler');

  const guestStoreFile = fs.readFileSync(
    path.resolve(customerDir, 'src/state/guest-store.ts'),
    'utf8',
  );
  assert.match(guestStoreFile, /wow:customer:guest:v1/, 'Uses approved versioned guest key');
  assert.match(guestStoreFile, /AsyncStorage/, 'Persists to AsyncStorage');
  assert.match(guestStoreFile, /migrate:/, 'Implements migration recovery handler');
});

test('8. Expo Router Tabs & Route Declarations', () => {
  const tabsLayout = fs.readFileSync(
    path.resolve(customerDir, 'src/app/(tabs)/_layout.tsx'),
    'utf8',
  );
  assert.match(tabsLayout, /CustomerBottomTabBar/, 'Wired to CustomerBottomTabBar');
  assert.match(tabsLayout, /name="index"/, 'Tabs has index route');
  assert.match(tabsLayout, /name="favorites"/, 'Tabs has favorites route');
  assert.match(tabsLayout, /name="account"/, 'Tabs has account route');

  const tabBar = fs.readFileSync(
    path.resolve(customerDir, 'src/features/navigation/CustomerBottomTabBar.tsx'),
    'utf8',
  );
  assert.match(tabBar, /minHeight:\s*48/, 'Enforces 48pt minimum touch target on tabs');
  assert.match(tabBar, /wowBrandColors\.yellow/, 'Uses WOW yellow accent underline for active tab');
});

test('9. CUS-01/02/03/10 Route Compatibility & OAuth Preserved', () => {
  const typesDeclaration = fs.readFileSync(
    path.resolve(customerDir, '.expo/types/router.d.ts'),
    'utf8',
  );
  assert(typesDeclaration.includes('/discover'), 'Route /discover preserved');
  assert(typesDeclaration.includes('/business/[id]'), 'Route /business/[id] preserved');
  assert(typesDeclaration.includes('/offer/[id]'), 'Route /offer/[id] preserved');
  assert(typesDeclaration.includes('/sso-callback'), 'Route /sso-callback preserved');
  assert(typesDeclaration.includes('/sign-in'), 'Route /sign-in preserved');
  assert(typesDeclaration.includes('/welcome'), 'Route /welcome registered');
  assert(typesDeclaration.includes('/access'), 'Route /access registered');
  assert(typesDeclaration.includes('/favorites'), 'Route /favorites registered');
  assert(typesDeclaration.includes('/account'), 'Route /account registered');
});

test('10. Screen Fidelity & Approved Visual Copy Assertions', () => {
  const onboardingScreen = fs.readFileSync(
    path.resolve(customerDir, 'src/features/onboarding/OnboardingScreen.tsx'),
    'utf8',
  );
  assert.match(onboardingScreen, /أهلاً بك في WOW/, 'Step 1 title matches approved visual');
  assert.match(onboardingScreen, /كل عرض يستحق نظرة/, 'Step 1 subtitle matches approved visual');
  assert.match(onboardingScreen, /التالي/, 'Step 1 action button matches approved visual');
  assert.match(onboardingScreen, /ابدأ الآن/, 'Step 2 action button matches approved visual');

  const accessScreen = fs.readFileSync(
    path.resolve(customerDir, 'src/features/auth/AccessScreen.tsx'),
    'utf8',
  );
  assert.match(accessScreen, /ابدأ مع WOW/, 'Screen 3 header matches approved visual');
  assert.match(accessScreen, /كيف تحب تكمّل؟/, 'Screen 3 title matches approved visual');
  assert.match(accessScreen, /تسجيل الدخول/, 'Screen 3 sign in button present');
  assert.match(accessScreen, /إنشاء حساب/, 'Screen 3 sign up button present');
  assert.match(accessScreen, /المتابعة كضيف/, 'Screen 3 continue as guest present');
  assert.match(accessScreen, /لا يُنشأ حساب عند اختيار المتابعة كضيف/, 'Screen 3 footnote present');
});

test('11. Complete Lifecycle Regression: Onboard -> Guest -> Sign In -> Logout -> /access -> Guest Re-entry -> Tabs', () => {
  // 1. Complete onboarding
  let state = {
    isHydrated: true,
    isAuthLoaded: true,
    isSignedIn: false,
    hasCompletedOnboarding: true,
    hasChosenGuest: false,
  };
  let d1 = resolveAccessDecision({ ...state, currentPath: '/welcome' });
  assert.equal(d1.needsRedirect, true, 'Step 1: Onboarding finished at /welcome must redirect to /access');
  assert.equal(d1.targetRoute, '/access');

  // 2. Continue as guest
  state.hasChosenGuest = true;
  let d2 = resolveAccessDecision({ ...state, currentPath: '/' });
  assert.equal(d2.needsRedirect, false, 'Step 2: Guest can browse / without redirect');
  assert.equal(d2.canAccessPublicApp, true);
  assert.equal(d2.canAccessPrivateApp, false);
  assert.equal(d2.isGuest, true);

  // 3. Sign in (Clerk authenticates)
  state.isSignedIn = true;
  state.hasChosenGuest = false; // Auth gate clears temporary guest flag
  let d3 = resolveAccessDecision({ ...state, currentPath: '/' });
  assert.equal(d3.needsRedirect, false, 'Step 3: Signed-in user accesses / with full privileges');
  assert.equal(d3.canAccessPublicApp, true);
  assert.equal(d3.canAccessPrivateApp, true);
  assert.equal(d3.isGuest, false);

  // 4. Sign out
  state.isSignedIn = false;
  state.hasChosenGuest = false; // Sign out must NOT activate guest mode
  let d4 = resolveAccessDecision({ ...state, currentPath: '/account' });
  assert.equal(d4.needsRedirect, true, 'Step 4: After sign-out, navigating from private tab must redirect to /access');
  assert.equal(d4.targetRoute, '/access');
  assert.equal(d4.isGuest, false, 'Guest mode must not activate automatically after logout');
  assert.equal(d4.canAccessPrivateApp, false);

  // 5. Return to /access
  let d5 = resolveAccessDecision({ ...state, currentPath: '/access' });
  assert.equal(d5.needsRedirect, false, 'Step 5: User stays on /access without redirect loops');
  assert.equal(d5.targetRoute, '/access');
  assert.equal(d5.isGuest, false);

  // 6. Choose guest mode again
  state.hasChosenGuest = true;
  let d6 = resolveAccessDecision({ ...state, currentPath: '/access' });
  assert.equal(d6.needsRedirect, true, 'Step 6: Choosing guest on /access redirects to /');
  assert.equal(d6.targetRoute, '/');

  // 7. Navigate to Home, Favorites, and Account tabs as re-entered guest
  let d7Home = resolveAccessDecision({ ...state, currentPath: '/' });
  assert.equal(d7Home.needsRedirect, false, 'Step 7a: Re-entered guest accesses /');
  assert.equal(d7Home.canAccessPublicApp, true);
  assert.equal(d7Home.isGuest, true);

  let d7Fav = resolveAccessDecision({ ...state, currentPath: '/favorites' });
  assert.equal(d7Fav.needsRedirect, false, 'Step 7b: Re-entered guest accesses /favorites to view honest sign-in prompt');
  assert.equal(d7Fav.canAccessPrivateApp, false);
  assert.equal(d7Fav.isGuest, true);

  let d7Acc = resolveAccessDecision({ ...state, currentPath: '/account' });
  assert.equal(d7Acc.needsRedirect, false, 'Step 7c: Re-entered guest accesses /account to view guest status and sign-in button');
  assert.equal(d7Acc.canAccessPrivateApp, false);
  assert.equal(d7Acc.isGuest, true);
});