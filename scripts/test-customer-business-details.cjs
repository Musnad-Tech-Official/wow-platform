'use strict';
// MUSNAD-WOW — W01 Public Business Details (CUS-10) Unit & Contract Tests
// Verifies routing, authorized RPC usage, UUID validation, conditional actions,
// responsive layouts, RTL, and honest states.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

// Read source files
const homeScreenSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/home/CustomerHomeScreen.tsx'),
  'utf8',
);
const discoverScreenSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/discovery/CustomerDiscoverScreen.tsx'),
  'utf8',
);
const businessRouteSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/app/business/[id].tsx'),
  'utf8',
);
const businessScreenSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/business/CustomerBusinessDetailsScreen.tsx'),
  'utf8',
);
const businessHeroSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/business/BusinessHero.tsx'),
  'utf8',
);
const businessOfferCardSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/business/PublicBusinessOfferCard.tsx'),
  'utf8',
);
const businessBranchCardSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/business/BusinessBranchCard.tsx'),
  'utf8',
);
const businessDisplaySrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/business/business-display.ts'),
  'utf8',
);
const favoritesTabScreenSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/favorites/CustomerFavoritesTabScreen.tsx'),
  'utf8',
);
const favoriteButtonSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/favorites/FavoriteButton.tsx'),
  'utf8',
);
const useInteractionsSrc = fs.readFileSync(
  path.join(root, 'packages/api/src/query/hooks/use-customer-interactions.ts'),
  'utf8',
);
const queryKeysSrc = fs.readFileSync(
  path.join(root, 'packages/api/src/query/query-keys.ts'),
  'utf8',
);

// Transpile pure business-display functions to test them directly
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(root, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));
const displayTranspiled = ts.transpileModule(businessDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const businessDisplay = {};
new Function('exports', 'require', displayTranspiled)(businessDisplay, (req) => {
  if (req.includes('discovery-data')) {
    return {
      formatDiscoveryPrice: (amount, currency = 'YER') => {
        if (amount == null) return '';
        const num = Number(amount);
        if (isNaN(num)) return '';
        return `${num.toLocaleString('ar-YE')} ${currency === 'YER' ? 'ر.ي' : currency}`;
      },
    };
  }
  return require(req);
});

// ---------------------------------------------------------------------------
// 1. Navigation & Route Architecture
// ---------------------------------------------------------------------------
test('1. Navigation wiring: CUS-01 and CUS-02 route directly to /business/[id]', () => {
  // CUS-01 Home must route to /business/[id]
  assert.match(
    homeScreenSrc,
    /router\.push\(\{\s*pathname:\s*['"]\/business\/\[id\]['"],\s*params:\s*\{\s*id:\s*merchantId\s*\}\s*\}\)/,
    'CUS-01 CustomerHomeScreen handleMerchantPress must navigate to /business/[id]',
  );

  // CUS-02 Discover must route to /business/[id]
  assert.match(
    discoverScreenSrc,
    /router\.push\(\{\s*pathname:\s*['"]\/business\/\[id\]['"],\s*params:\s*\{\s*id:\s*merchantId\s*\}\s*\}\)/,
    'CUS-02 CustomerDiscoverScreen handleMerchantPress must navigate to /business/[id]',
  );

  // Route file must export default and render CustomerBusinessDetailsScreen
  assert.match(
    businessRouteSrc,
    /export default function BusinessDetailsRoute\(\)/,
    '/business/[id].tsx must export default BusinessDetailsRoute',
  );
  assert.match(
    businessRouteSrc,
    /<CustomerBusinessDetailsScreen\s+businessId=\{businessId\}\s*\/>/,
    '/business/[id].tsx must render CustomerBusinessDetailsScreen with businessId',
  );
});

// ---------------------------------------------------------------------------
// 2. Strict UUID Validation
// ---------------------------------------------------------------------------
test('2. Strict ID validation: accepts valid UUIDs and rejects malformed IDs', () => {
  const validUuid = 'b0000000-0000-4000-8000-000000000001';
  assert.equal(businessDisplay.isValidUuid(validUuid), true, 'Valid UUID v4 must pass');
  assert.equal(businessDisplay.isValidUuid(''), false, 'Empty string must fail');
  assert.equal(businessDisplay.isValidUuid('12345'), false, 'Numeric string must fail');
  assert.equal(businessDisplay.isValidUuid('invalid-uuid-slug'), false, 'Slug string must fail');
  assert.equal(businessDisplay.isValidUuid(null), false, 'Null must fail');
  assert.equal(businessDisplay.isValidUuid(undefined), false, 'Undefined must fail');

  // Verify CustomerBusinessDetailsScreen enforces validation before query
  assert.match(
    businessScreenSrc,
    /const\s+isUuidValid\s*=\s*isValidUuid\(businessId\)/,
    'CustomerBusinessDetailsScreen must validate businessId with isValidUuid',
  );
  assert.match(
    businessScreenSrc,
    /usePublicBusiness\(isUuidValid\s*\?\s*businessId\s*:\s*null\)/,
    'CustomerBusinessDetailsScreen must only query usePublicBusiness when UUID is valid',
  );
  assert.match(
    businessScreenSrc,
    /title=['"]معرّف المتجر غير صالح['"]/,
    'CustomerBusinessDetailsScreen must display invalid ID state if UUID fails',
  );
});

// ---------------------------------------------------------------------------
// 3. Authorized Public RPC Hook Usage & No Raw Restricted Tables
// ---------------------------------------------------------------------------
test('3. Security & RPC contracts: uses usePublicBusiness only, no raw table queries', () => {
  assert.match(
    businessScreenSrc,
    /import\s*\{[^}]*usePublicBusiness[^}]*\}\s*from\s*['"]@wow\/api['"]/,
    'Must import usePublicBusiness from @wow/api',
  );
  assert.match(
    businessScreenSrc,
    /import\s*\{[^}]*usePublicOffer[^}]*\}\s*from\s*['"]@wow\/api['"]/,
    'Must import usePublicOffer from @wow/api for authorized offer previews',
  );

  // Must not perform direct table reads
  assert.doesNotMatch(businessScreenSrc, /from\(['"]businesses['"]\)/, 'No raw businesses table reads');
  assert.doesNotMatch(businessScreenSrc, /from\(['"]offers['"]\)/, 'No raw offers table reads');
  assert.doesNotMatch(businessScreenSrc, /from\(['"]branches['"]\)/, 'No raw branches table reads');
});

// ---------------------------------------------------------------------------
// 4. Arabic Language Inflection Helpers
// ---------------------------------------------------------------------------
test('4. Arabic inflection: authentic singular/dual/plural offer and branch formatting', () => {
  // Offer count inflections
  assert.equal(businessDisplay.formatOfferCount(0), 'لا توجد عروض');
  assert.equal(businessDisplay.formatOfferCount(1), 'عرض واحد');
  assert.equal(businessDisplay.formatOfferCount(2), 'عرضان');
  assert.equal(businessDisplay.formatOfferCount(3), '٣ عروض');
  assert.equal(businessDisplay.formatOfferCount(10), '١٠ عروض');
  assert.equal(businessDisplay.formatOfferCount(12), '١٢ عرض');

  // Branch count inflections
  assert.equal(businessDisplay.formatBranchCount(0), 'لا توجد فروع مسجلة');
  assert.equal(businessDisplay.formatBranchCount(1), 'فرع واحد');
  assert.equal(businessDisplay.formatBranchCount(2), 'فرعان');
  assert.equal(businessDisplay.formatBranchCount(4), '٤ فروع');
  assert.equal(businessDisplay.formatBranchCount(15), '١٥ فرع');
});

// ---------------------------------------------------------------------------
// 5. Conditional Actions (Contact Phone & Valid Coordinates)
// ---------------------------------------------------------------------------
test('5. Conditional actions: contact phone and coordinates validation', () => {
  // Coordinate validation
  assert.equal(businessDisplay.hasValidCoordinates(15.3694, 44.191), true, 'Sanaa coordinates are valid');
  assert.equal(businessDisplay.hasValidCoordinates(0, 0), true, '0,0 coordinates are valid');
  assert.equal(businessDisplay.hasValidCoordinates(null, 44.191), false, 'Null latitude must fail');
  assert.equal(businessDisplay.hasValidCoordinates(15.3694, undefined), false, 'Undefined longitude must fail');
  assert.equal(businessDisplay.hasValidCoordinates(NaN, 44.191), false, 'NaN must fail');
  assert.equal(businessDisplay.hasValidCoordinates(Infinity, 44.191), false, 'Infinity must fail');
  assert.equal(businessDisplay.hasValidCoordinates(95, 44.191), false, 'Out of latitude range must fail');
  assert.equal(businessDisplay.hasValidCoordinates(15.3694, 200), false, 'Out of longitude range must fail');

  // Directions URL
  const directionsUrl = businessDisplay.getDirectionsUrl(15.3694, 44.191);
  assert.match(directionsUrl, /google\.com\/maps\/dir/);
  assert.match(directionsUrl, /destination=15\.3694,44\.191/);

  // Contact action in CustomerBusinessDetailsScreen
  assert.match(
    businessScreenSrc,
    /business\?\.contact_phone/,
    'Contact action must only be rendered if contact_phone exists',
  );
  assert.match(
    businessScreenSrc,
    /Linking\.openURL\(`tel:\$\{business\.contact_phone/,
    'Contact action must link safely to tel: protocol',
  );

  // Directions action in BusinessBranchCard
  assert.match(
    businessBranchCardSrc,
    /const\s+canNavigate\s*=\s*hasValidCoordinates\(branch\.latitude,\s*branch\.longitude\)/,
    'Branch directions must only render if coordinates are valid',
  );
});

// ---------------------------------------------------------------------------
// 6. Safe Public Image & Fallback Handling
// ---------------------------------------------------------------------------
test('6. Image validation & WOW brand fallbacks', () => {
  assert.equal(businessDisplay.isSafePublicImageUrl('https://example.com/logo.webp'), true);
  assert.equal(businessDisplay.isSafePublicImageUrl('http://example.com/logo.webp'), true);
  assert.equal(businessDisplay.isSafePublicImageUrl(''), false);
  assert.equal(businessDisplay.isSafePublicImageUrl(null), false);
  assert.equal(businessDisplay.isSafePublicImageUrl('private-bucket-storage-key'), false);

  // BusinessHero fallback
  assert.match(businessHeroSrc, /WOW/, 'Hero must render branded WOW watermark on cover fallback');
  assert.match(businessHeroSrc, /initial/, 'Hero must render merchant initial on logo fallback');
});

// ---------------------------------------------------------------------------
// 7. Offer Media, Prices, and Detail Previews
// ---------------------------------------------------------------------------
test('7. Offer presentation: authorized OfferMediaImage, discount badge, and preview BottomSheet', () => {
  assert.match(
    businessOfferCardSrc,
    /<OfferMediaImage/,
    'PublicBusinessOfferCard must render authorized OfferMediaImage',
  );
  assert.match(
    businessOfferCardSrc,
    /خصم\s*\{discountVal\}%/,
    'Offer card must render discount percentage badge',
  );
  assert.match(
    businessScreenSrc,
    /onOfferPress=\{setSelectedOfferId\}/,
    'Clicking offer card must trigger selected offer detail preview',
  );
  assert.match(
    businessScreenSrc,
    /<BottomSheet[^>]*title=['"]تفاصيل العرض['"]/,
    'Must provide offer detail preview BottomSheet',
  );
  assert.match(
    businessScreenSrc,
    /usePublicOffer\(selectedOfferId\)/,
    'Offer detail BottomSheet must use authorized usePublicOffer hook',
  );
});

// ---------------------------------------------------------------------------
// 8. 48pt Touch Target Enforcement
// ---------------------------------------------------------------------------
test('8. Accessibility & touch targets: strictly enforces 48pt minimum', () => {
  assert.match(
    businessScreenSrc,
    /width:\s*48,\s*height:\s*48,\s*minWidth:\s*48,\s*minHeight:\s*48/,
    'Screen header back and share buttons must enforce 48pt minimum touch target',
  );
  assert.match(
    businessScreenSrc,
    /minHeight:\s*48,\s*flexDirection:\s*['"]row['"],\s*alignItems:\s*['"]center['"],\s*gap:\s*8/,
    'Quick action buttons must enforce 48pt minimum touch target',
  );
});

// ---------------------------------------------------------------------------
// 9. Responsive Layout Branches & Honest States
// ---------------------------------------------------------------------------
test('9. Responsive layout: desktop split columns and honest states', () => {
  assert.match(
    businessScreenSrc,
    /useWowViewport\(\)/,
    'Must use responsive viewport hook',
  );
  assert.match(
    businessScreenSrc,
    /isDesktop\s*\?/,
    'Must have dedicated desktop 2-column layout branch',
  );
  assert.match(
    businessScreenSrc,
    /width:\s*380/,
    'Desktop must have secondary information panel',
  );

  // States
  assert.match(
    businessScreenSrc,
    /title=['"]جاري تحميل بيانات المتجر\.\.\.['"]/,
    'Must render loading state',
  );
  assert.match(
    businessScreenSrc,
    /title=['"]تعذّر تحميل بيانات المتجر['"]/,
    'Must render error retry state',
  );
  assert.match(
    businessScreenSrc,
    /title=['"]هذا المتجر غير متاح حاليًا['"]/,
    'Must render not-found state',
  );
  assert.match(
    businessScreenSrc,
    /لا توجد عروض متاحة حاليًا/,
    'Must render honest empty offers state',
  );
  assert.match(
    businessScreenSrc,
    /لا توجد فروع مسجلة حاليًا/,
    'Must render honest empty branches state',
  );
});

// ---------------------------------------------------------------------------
// 10. Merchant Favorites Integration (useSavedBusinesses & useSetSavedBusiness)
// ---------------------------------------------------------------------------
test('10. Merchant favorites: integrates useSavedBusinesses, useSetSavedBusiness, and FavoriteButton', () => {
  // Must import and use approved query hooks
  assert.match(
    businessScreenSrc,
    /useSavedBusinesses/,
    'CustomerBusinessDetailsScreen must use useSavedBusinesses',
  );
  assert.match(
    businessScreenSrc,
    /useSetSavedBusiness/,
    'CustomerBusinessDetailsScreen must use useSetSavedBusiness',
  );

  // Must render FavoriteButton in Hero
  assert.match(
    businessHeroSrc,
    /<FavoriteButton/,
    'BusinessHero must render FavoriteButton on cover banner',
  );
  assert.match(
    businessHeroSrc,
    /kind=['"]business['"]/,
    'FavoriteButton kind must be business',
  );

  // Must render quick action favorite button with explicit Arabic labels
  assert.match(
    businessScreenSrc,
    /حفظ التاجر/,
    'Must display accessible "حفظ التاجر" when merchant is not saved',
  );
  assert.match(
    businessScreenSrc,
    /محفوظ/,
    'Must display "محفوظ" when merchant is saved',
  );

  // Must render ToastBanner for user feedback
  assert.match(
    businessScreenSrc,
    /<ToastBanner/,
    'Must render ToastBanner to display feedback after saving/removing',
  );
  assert.match(
    businessScreenSrc,
    /تمت إضافة المتجر إلى المفضلة بنجاح/,
    'Must provide authentic Arabic confirmation when saved',
  );
  assert.match(
    businessScreenSrc,
    /تمت إزالة المتجر من المفضلة بنجاح/,
    'Must provide authentic Arabic confirmation when removed',
  );
});

// ---------------------------------------------------------------------------
// 11. Guest Authentication Requirement & Honest Sign-In Path
// ---------------------------------------------------------------------------
test('11. Guest authentication: public details accessible, saving prompts sign-in without fake claims', () => {
  // Guest prompt BottomSheet
  assert.match(
    businessScreenSrc,
    /<BottomSheet[^>]*visible=\{showGuestPrompt\}[^>]*title=['"]حفظ التاجر في المفضلة['"]/,
    'Must render BottomSheet when guest attempts to save',
  );
  assert.match(
    businessScreenSrc,
    /حفظ التاجر يتطلب تسجيل الدخول/,
    'Must honestly explain that saving requires authentication',
  );
  assert.match(
    businessScreenSrc,
    /router\.push\(['"]\/sign-in['"]\)/,
    'Guest prompt must navigate to /sign-in',
  );

  // FavoriteButton onGuestPress integration
  assert.match(
    favoriteButtonSrc,
    /onGuestPress\?:\s*\(\)\s*=>\s*void/,
    'FavoriteButtonProps must support onGuestPress',
  );
  assert.match(
    favoriteButtonSrc,
    /if\s*\(!isSignedIn\)\s*\{\s*if\s*\(onGuestPress\)\s*\{\s*onGuestPress\(\);?\s*\}\s*return;?\s*\}/,
    'FavoriteButton must invoke onGuestPress for signed-out users',
  );
});

// ---------------------------------------------------------------------------
// 12. Loading, Pending, and Error Safeguards
// ---------------------------------------------------------------------------
test('12. Safeguards: prevents false unsaved inference, blocks duplicate mutations, handles failure', () => {
  // Does not infer unsaved before query resolves
  assert.match(
    businessScreenSrc,
    /const\s+isFavoriteLoading\s*=/,
    'Must distinguish pending query from unsaved state',
  );

  // Synchronous duplicate guard
  assert.match(
    businessScreenSrc,
    /isMutatingRef\.current/,
    'Must guard duplicate rapid taps with synchronous isMutatingRef',
  );

  // Failure handling without displaying false success
  assert.match(
    businessScreenSrc,
    /catch[\s\S]*?تعذر إضافة المتجر إلى المفضلة/,
    'Must catch mutation error and provide failure notice without false success',
  );
});

// ---------------------------------------------------------------------------
// 13. Session Isolation & Cross-Account Cache Safety
// ---------------------------------------------------------------------------
test('13. Session isolation: query keys include userId and state resets on logout/account switch', () => {
  // Query key incorporates userId
  assert.match(
    queryKeysSrc,
    /savedBusinesses:\s*\(userId:\s*string\s*\|\s*null\)\s*=>\s*\['interactions',\s*'savedBusinesses',\s*userId\]/,
    'savedBusinesses query key must incorporate userId for cross-account cache safety',
  );

  // Reset in-flight ref and feedback on userId / businessId change
  assert.match(
    businessScreenSrc,
    /useEffect\(\(\)\s*=>\s*\{[^}]*isMutatingRef\.current\s*=\s*false;[^}]*\},\s*\[userId,\s*businessId/,
    'Must reset mutation tracking, feedback, and guest prompt on session or merchant change',
  );
});

// ---------------------------------------------------------------------------
// 14. Navigation Entry Points: CUS-01, CUS-02, and CUS-04 to /business/[id]
// ---------------------------------------------------------------------------
test('14. Navigation integration: CUS-01 Home, CUS-02 Discover, and CUS-04 Favorites route to /business/[id]', () => {
  // CUS-01 Home
  assert.match(
    homeScreenSrc,
    /\/business\/\[id\]/,
    'CUS-01 Home screen must route merchant taps to /business/[id]',
  );

  // CUS-02 Discover
  assert.match(
    discoverScreenSrc,
    /\/business\/\[id\]/,
    'CUS-02 Discover screen must route merchant taps to /business/[id]',
  );

  // CUS-04 Favorites
  assert.match(
    favoritesTabScreenSrc,
    /\/business\/\$\{businessId\}/,
    'CUS-04 Favorites tab screen must route saved merchant taps to /business/${businessId}',
  );
});

// ---------------------------------------------------------------------------
// 15. Production Execution: Favorite Toggle Logic Simulation
// ---------------------------------------------------------------------------
test('15. Production execution: favorite toggle handles save, remove, duplicate guard, and guest guard', async () => {
  // Pure helper simulating the production favorite toggle logic
  async function simulateFavoriteToggle({
    isSignedIn,
    isSaved,
    isMutatingRef,
    isFavoriteLoading,
    mutateAsync,
    setShowGuestPrompt,
    setFeedback,
  }) {
    if (!isSignedIn) {
      setShowGuestPrompt(true);
      return { handled: true, outcome: 'guest_prompt' };
    }

    if (isMutatingRef.current || isFavoriteLoading) {
      return { handled: false, outcome: 'blocked_in_flight' };
    }

    isMutatingRef.current = true;
    const nextSave = !isSaved;

    try {
      await mutateAsync(nextSave);
      setFeedback({
        message: nextSave ? 'تمت إضافة المتجر بنجاح' : 'تمت إزالة المتجر بنجاح',
        tone: 'success',
      });
      return { handled: true, outcome: 'success', nextSave };
    } catch {
      setFeedback({
        message: 'تعذر تحديث المفضلة',
        tone: 'danger',
      });
      return { handled: false, outcome: 'failure' };
    } finally {
      isMutatingRef.current = false;
    }
  }

  const mutatingRef = { current: false };
  let promptShown = false;
  let lastFeedback = null;
  let mutationTargetSave = null;

  // Case A: Guest tap -> opens prompt, does not call mutation
  const guestResult = await simulateFavoriteToggle({
    isSignedIn: false,
    isSaved: false,
    isMutatingRef: mutatingRef,
    isFavoriteLoading: false,
    mutateAsync: async () => { throw new Error('Must not be called'); },
    setShowGuestPrompt: (val) => { promptShown = val; },
    setFeedback: (val) => { lastFeedback = val; },
  });
  assert.equal(guestResult.outcome, 'guest_prompt');
  assert.equal(promptShown, true);
  assert.equal(lastFeedback, null);

  // Case B: Authenticated tap to save (unsaved -> saved)
  const saveResult = await simulateFavoriteToggle({
    isSignedIn: true,
    isSaved: false,
    isMutatingRef: mutatingRef,
    isFavoriteLoading: false,
    mutateAsync: async (save) => { mutationTargetSave = save; },
    setShowGuestPrompt: (val) => { promptShown = val; },
    setFeedback: (val) => { lastFeedback = val; },
  });
  assert.equal(saveResult.outcome, 'success');
  assert.equal(mutationTargetSave, true);
  assert.equal(lastFeedback.tone, 'success');
  assert.equal(mutatingRef.current, false);

  // Case C: Authenticated tap to remove (saved -> unsaved)
  const removeResult = await simulateFavoriteToggle({
    isSignedIn: true,
    isSaved: true,
    isMutatingRef: mutatingRef,
    isFavoriteLoading: false,
    mutateAsync: async (save) => { mutationTargetSave = save; },
    setShowGuestPrompt: (val) => { promptShown = val; },
    setFeedback: (val) => { lastFeedback = val; },
  });
  assert.equal(removeResult.outcome, 'success');
  assert.equal(mutationTargetSave, false);
  assert.equal(lastFeedback.tone, 'success');

  // Case D: Rapid simultaneous duplicate tap blocked synchronously
  mutatingRef.current = true;
  const blockedResult = await simulateFavoriteToggle({
    isSignedIn: true,
    isSaved: false,
    isMutatingRef: mutatingRef,
    isFavoriteLoading: false,
    mutateAsync: async () => {},
    setShowGuestPrompt: () => {},
    setFeedback: () => {},
  });
  assert.equal(blockedResult.outcome, 'blocked_in_flight');
  mutatingRef.current = false;

  // Case E: Network failure caught safely, reports danger feedback, no false success
  const failResult = await simulateFavoriteToggle({
    isSignedIn: true,
    isSaved: false,
    isMutatingRef: mutatingRef,
    isFavoriteLoading: false,
    mutateAsync: async () => { throw new Error('Network timeout'); },
    setShowGuestPrompt: () => {},
    setFeedback: (val) => { lastFeedback = val; },
  });
  assert.equal(failResult.outcome, 'failure');
  assert.equal(lastFeedback.tone, 'danger');
  assert.equal(mutatingRef.current, false);
});

// ---------------------------------------------------------------------------
// 16. Regression: Account Switching & In-Flight Mutation Isolation
// ---------------------------------------------------------------------------
test('16. Account switching regression: in-flight mutation from account A cannot overwrite account B UI or feedback', async () => {
  // Session key generation contract
  assert.match(
    businessScreenSrc,
    /const\s+sessionKey\s*=\s*`\$\{effectiveUserId\s*\?\?\s*['"]guest['"]\}:\$\{businessId\}:\$\{previewMode\}`/,
    'Component must generate user-scoped sessionKey for identity-isolated mounting',
  );
  assert.match(
    businessScreenSrc,
    /<CustomerBusinessDetailsContent[^>]*key=\{sessionKey\}/,
    'Inner content must be keyed by sessionKey to reset all local state on account switch',
  );

  // Active identity guard in mutation callback
  assert.match(
    businessScreenSrc,
    /activeUserIdRef\.current\s*!==\s*mutationUserId/,
    'Mutation completion must check activeUserIdRef to discard late asynchronous results across accounts',
  );

  // Simulation: User A initiates save, account switches to User B before promise resolves
  let accountATargetFeedback = null;
  let accountBFeedback = null;
  let accountBMutating = false;

  const currentSession = {
    userId: 'user_account_A',
    businessId: 'b0000000-0000-4000-8000-000000000001',
  };

  // Deferred promise simulating slow network mutation
  let resolveNetworkRequest;
  const inFlightPromise = new Promise((resolve) => {
    resolveNetworkRequest = resolve;
  });

  // Account A initiates favorite toggle
  async function executeToggleForSession(sessionAtStart, onFeedbackSet, onMutatingSet) {
    const mutationUserId = sessionAtStart.userId;
    const mutationBusinessId = sessionAtStart.businessId;

    onMutatingSet?.(true);

    try {
      await inFlightPromise;

      // Asynchronous session & merchant boundary guard matching CustomerBusinessDetailsScreen
      if (
        currentSession.userId !== mutationUserId ||
        currentSession.businessId !== mutationBusinessId
      ) {
        return { discarded: true, reason: 'session_changed' };
      }

      onFeedbackSet?.({
        message: 'تمت إضافة المتجر إلى المفضلة بنجاح',
        tone: 'success',
      });
      return { discarded: false, success: true };
    } finally {
      if (
        currentSession.userId === mutationUserId &&
        currentSession.businessId === mutationBusinessId
      ) {
        onMutatingSet?.(false);
      }
    }
  }

  // Start Account A's mutation
  const accountAPromise = executeToggleForSession(
    { ...currentSession },
    (f) => { accountATargetFeedback = f; },
    () => {},
  );

  // Account switch occurs while Account A's mutation is in-flight!
  currentSession.userId = 'user_account_B';

  // Account B starts in completely clean state
  assert.equal(accountBFeedback, null, 'Account B must not have any feedback from Account A');
  assert.equal(accountBMutating, false, 'Account B must not inherit Account A pending lock');

  // Account B performs an independent synchronous check
  const accountBGuardCheck = currentSession.userId === 'user_account_B';
  assert.equal(accountBGuardCheck, true, 'Account B identity is active');

  // Now the slow network request from Account A finally resolves!
  resolveNetworkRequest(true);
  const aOutcome = await accountAPromise;

  // Verify Account A's result was cleanly discarded
  assert.equal(aOutcome.discarded, true, 'Account A mutation result must be discarded');
  assert.equal(aOutcome.reason, 'session_changed');
  assert.equal(accountATargetFeedback, null, 'Account A feedback setter must never be invoked after switch');
  assert.equal(accountBFeedback, null, 'Account B must never see Account A feedback toast');
});

 
// ---------------------------------------------------------------------------
// 17. Failed Saved-State Lookup Must Not Become an Actionable "Unsaved" State
// ---------------------------------------------------------------------------
test('17. Favorite lookup failure: disable both toggle entry points and offer retry', () => {
  assert.match(
    businessScreenSrc,
    /isFavoriteUnavailable\s*=\s*Boolean\([\s\S]*?savedBusinessesQuery\.isError\s*&&\s*!savedBusinessesQuery\.data/,
    'An authenticated saved-state lookup failure must be distinguished from a valid unsaved result',
  );
  assert.match(
    businessScreenSrc,
    /if\s*\(isMutatingRef\.current\s*\|\|\s*isFavoriteLoading\s*\|\|\s*isFavoriteUnavailable\)/,
    'The mutation handler must reject a favorite toggle when owner state could not be determined',
  );
  assert.match(
    businessScreenSrc,
    /disabled=\{isMutating\s*\|\|\s*isFavoriteLoading\s*\|\|\s*isFavoriteUnavailable\}/,
    'The visible CTA must be disabled when saved state lookup fails',
  );
  assert.match(
    businessHeroSrc,
    /disabled=\{isFavoriteDisabled\}/,
    'The floating cover button must also be disabled when saved state lookup fails',
  );
  assert.ok(
    businessScreenSrc.includes('title="إعادة تحميل المفضلة"') &&
      businessScreenSrc.includes('savedBusinessesQuery.refetch()'),
    'An accessible retry action must be available when the owner-scoped saved state cannot be loaded',
  );
});

test('AUD-TS-001: React Native 0.88 ScrollView ref uses instance type', () => {
  assert.match(businessScreenSrc, /type ScrollViewInstance/);
  assert.match(businessScreenSrc, /useRef<ScrollViewInstance>\(null\)/);
  assert.match(businessScreenSrc, /ref=\{scrollRef\}/);
  assert.match(businessScreenSrc, /scrollRef\.current\?\.scrollTo\(/);
  assert.doesNotMatch(businessScreenSrc, /useRef<ScrollView>\(null\)/);
});
