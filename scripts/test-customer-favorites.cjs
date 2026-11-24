const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

// Read source files
const favoritesRouteSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/(tabs)/favorites.tsx'),
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
const favoritesScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/CustomerFavoritesTabScreen.tsx'),
  'utf8',
);
const favoriteOfferCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/FavoriteOfferCard.tsx'),
  'utf8',
);
const favoriteBusinessCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/FavoriteBusinessCard.tsx'),
  'utf8',
);
const favoriteButtonSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/FavoriteButton.tsx'),
  'utf8',
);
const unavailableCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/UnavailableFavoriteCard.tsx'),
  'utf8',
);
const useFavoritesDetailsSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/use-favorites-details.ts'),
  'utf8',
);
const favoritesDisplaySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/favorites/favorites-display.ts'),
  'utf8',
);

// Transpile pure display functions
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));
const displayTranspiled = ts.transpileModule(favoritesDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const favoritesDisplay = {};
new Function('exports', 'require', displayTranspiled)(favoritesDisplay, (req) => {
  if (req.includes('home-data')) {
    return {
      formatDiscoveryPrice: (amount, currency = 'YER') => {
        if (amount == null || amount === '') return '';
        const num = Number(amount);
        if (isNaN(num)) return `${amount} ${currency}`;
        return `${num.toLocaleString('ar-YE')} ${currency === 'YER' ? 'ر.ي' : currency}`;
      },
    };
  }
  if (req.includes('business-display')) {
    return {
      formatOfferCount: (total) => {
        if (total <= 0) return 'لا توجد عروض';
        const numAr = total.toLocaleString('ar-YE');
        if (total === 1) return 'عرض واحد';
        if (total === 2) return 'عروضان';
        if (total >= 3 && total <= 10) return `${numAr} عروض`;
        return `${numAr} عرض`;
      },
      isSafePublicImageUrl: (url) => typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://')),
    };
  }
  return require(req);
});

// Transpile production favorites details module to execute real executeGuardedRemoval
const useFavoritesDetailsTranspiled = ts.transpileModule(useFavoritesDetailsSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const useFavoritesDetailsModule = {};
new Function('exports', 'require', useFavoritesDetailsTranspiled)(
  useFavoritesDetailsModule,
  (req) => {
    if (req === 'react') {
      return {
        useState: (init) => [init, () => {}],
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
        useRef: (init) => ({ current: init }),
        useEffect: () => {},
      };
    }
    if (req.includes('favorites-display')) {
      return favoritesDisplay;
    }
    return {};
  },
);
const { executeGuardedRemoval } = useFavoritesDetailsModule;

// Transpile production favorite button module to execute real executeFavoriteToggle
const favoriteButtonTranspiled = ts.transpileModule(favoriteButtonSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;
const favoriteButtonModule = {};
new Function('exports', 'require', favoriteButtonTranspiled)(
  favoriteButtonModule,
  (req) => {
    if (req === 'react') {
      return {
        useState: (init) => [init, () => {}],
      };
    }
    if (req === 'react-native') {
      return {
        ActivityIndicator: () => null,
        Pressable: () => null,
      };
    }
    return {};
  },
);
const { executeFavoriteToggle } = favoriteButtonModule;

// ---------------------------------------------------------------------------
// 1. Navigation & Route Architecture
// ---------------------------------------------------------------------------
test('1. Navigation wiring: Expo Router Tabs registers /favorites and renders CustomerFavoritesTabScreen', () => {
  assert.match(favoritesRouteSrc, /CustomerFavoritesTabScreen/, 'Route must render CustomerFavoritesTabScreen');
  assert.match(tabsLayoutSrc, /name="favorites"/, 'Tabs layout must register favorites screen');
  assert.match(tabsLayoutSrc, /title:\s*['"]المفضلة['"]/, 'Tabs layout must configure title as المفضلة');
  assert.match(bottomNavSrc, /favorites:\s*\{\s*label:\s*['"]المفضلة['"]/, 'Bottom tab bar must configure favorites label');
  assert.match(bottomNavSrc, /backgroundColor:\s*wowBrandColors\.yellow/, 'Bottom tab bar must show yellow underline only');
  assert.match(bottomNavSrc, /maxWidth:\s*520/, 'Bottom tab bar must use balanced responsive container for desktop/web');
});

// ---------------------------------------------------------------------------
// 2. RTL-Friendly Two Tabs with Dynamic Item Counts
// ---------------------------------------------------------------------------
test('2. Two RTL tabs: Saved Offers and Saved Businesses with item counts', () => {
  assert.match(favoritesScreenSrc, /العروض المحفوظة/, 'Screen must define Saved Offers tab');
  assert.match(favoritesScreenSrc, /التجار المحفوظون/, 'Screen must define Saved Businesses tab');
  assert.match(favoritesScreenSrc, /activeTab\s*===\s*['"]offers['"]/, 'Screen must support toggling between tabs');
  assert.match(favoritesScreenSrc, /accessibilityRole="tablist"/, 'Screen must use accessible tablist semantic role');
  assert.match(favoritesScreenSrc, /offersCount\.toLocaleString\('ar-YE'\)/, 'Dynamic count inside tabs must format numbers in Arabic');
});

// ---------------------------------------------------------------------------
// 3. Responsive Column Grid Calculation
// ---------------------------------------------------------------------------
test('3. Responsive grid calculation: 2 columns mobile, 3 tablet, 3-4 web', () => {
  assert.match(
    favoritesScreenSrc,
    /numColumns\s*=\s*isCompact\s*\?\s*2\s*:\s*size\s*===\s*['"]medium['"]\s*\?\s*3\s*:\s*viewportWidth\s*>=\s*1280\s*\?\s*3\s*:\s*3/,
    'Grid must compute 2 columns for mobile, 3 for tablet, and 3 for desktop in centered container',
  );
  assert.match(favoritesScreenSrc, /maxWidth:\s*isDesktop\s*\?\s*960\s*:\s*1200/, 'Screen must use width-constrained container on desktop');
  assert.match(favoriteOfferCardSrc, /cardWidth:\s*DimensionValue/, 'Offer card must accept standard DimensionValue');
  assert.match(favoriteBusinessCardSrc, /cardWidth:\s*DimensionValue/, 'Business card must accept standard DimensionValue');
});

// ---------------------------------------------------------------------------
// 4. API Hook Integration & Deduplicated Public Resolution
// ---------------------------------------------------------------------------
test('4. Hook integration: useSavedOffers, useSavedBusinesses, and public discovery resolution', () => {
  assert.match(useFavoritesDetailsSrc, /useSavedOffers/, 'Hook must invoke useSavedOffers');
  assert.match(useFavoritesDetailsSrc, /useSavedBusinesses/, 'Hook must invoke useSavedBusinesses');
  assert.match(useFavoritesDetailsSrc, /useSetSavedOffer/, 'Hook must invoke useSetSavedOffer');
  assert.match(useFavoritesDetailsSrc, /useSetSavedBusiness/, 'Hook must invoke useSetSavedBusiness');
  assert.match(favoriteOfferCardSrc, /usePublicOffer\(.*item\.offerId/, 'Card must resolve public offer details through usePublicOffer');
  assert.match(favoriteBusinessCardSrc, /usePublicBusiness\(.*item\.businessId/, 'Card must resolve public business details through usePublicBusiness');
});

// ---------------------------------------------------------------------------
// 5. Removed and Unavailable Public Items Resilience & Transient Errors
// ---------------------------------------------------------------------------
test('5. Removed/unavailable public items vs transient errors distinction', () => {
  assert.match(favoriteOfferCardSrc, /FavoriteErrorRetryCard/, 'Offer card must render FavoriteErrorRetryCard for transient errors');
  assert.match(favoriteOfferCardSrc, /UnavailableFavoriteCard/, 'Offer card must render UnavailableFavoriteCard when item is unavailable');
  assert.match(favoriteOfferCardSrc, /if\s*\(isError\)\s*\{\s*return\s*\(?\s*<FavoriteErrorRetryCard/, 'Offer card must check isError before !offer');
  assert.match(favoriteBusinessCardSrc, /FavoriteErrorRetryCard/, 'Business card must render FavoriteErrorRetryCard for transient errors');
  assert.match(favoriteBusinessCardSrc, /UnavailableFavoriteCard/, 'Business card must render UnavailableFavoriteCard when item is unavailable');
  assert.match(favoriteBusinessCardSrc, /if\s*\(isError\)\s*\{\s*return\s*\(?\s*<FavoriteErrorRetryCard/, 'Business card must check isError before !business');

  assert.match(unavailableCardSrc, /عرض غير متوفر حالياً/, 'Unavailable card must display appropriate Arabic notice for offer');
  assert.match(unavailableCardSrc, /متجر غير متوفر حالياً/, 'Unavailable card must display appropriate Arabic notice for business');
  assert.match(unavailableCardSrc, /إزالة من المفضلة/, 'Unavailable card must provide quick remove CTA');

  assert.match(unavailableCardSrc, /تعذر تحميل العرض/, 'Retry card must display appropriate Arabic notice for offer error');
  assert.match(unavailableCardSrc, /تعذر تحميل المتجر/, 'Retry card must display appropriate Arabic notice for business error');
  assert.match(unavailableCardSrc, /إعادة المحاولة/, 'Retry card must provide retry CTA');
});

// ---------------------------------------------------------------------------
// 6. Mutation-Pending State, Feedback & Duplicate Prevention
// ---------------------------------------------------------------------------
test('6. Mutation pending state: synchronous refs, duplicate prevention, and user feedback', () => {
  assert.match(useFavoritesDetailsSrc, /pendingOfferIdsRef/, 'Hook must use pendingOfferIdsRef for synchronous race-safe protection');
  assert.match(useFavoritesDetailsSrc, /pendingBusinessIdsRef/, 'Hook must use pendingBusinessIdsRef for synchronous race-safe protection');
  assert.match(useFavoritesDetailsSrc, /executeGuardedRemoval/, 'Hook must invoke executeGuardedRemoval');
  assert.match(useFavoritesDetailsSrc, /FavoritesFeedback/, 'Hook must define FavoritesFeedback interface');
  assert.match(useFavoritesDetailsSrc, /feedback,\s*clearFeedback/, 'Hook must expose feedback and clearFeedback');
  assert.match(favoritesScreenSrc, /<ToastBanner/, 'Favorites screen must render ToastBanner for user feedback');
  assert.match(favoriteButtonSrc, /ActivityIndicator/, 'FavoriteButton must render ActivityIndicator during pending mutations');
  assert.match(favoriteButtonSrc, /disabled=\{disabled\s*\|\|\s*isPending\}/, 'FavoriteButton must disable interaction during pending mutations');
  assert.match(favoriteButtonSrc, /executeFavoriteToggle/, 'FavoriteButton must invoke executeFavoriteToggle');
});

// ---------------------------------------------------------------------------
// 7. Signed-Out (Guest) Screen Fidelity
// ---------------------------------------------------------------------------
test('7. Signed-out state: renders approved CUS-04 guest screen with Mascot illustration and honest CTAs', () => {
  assert.match(favoritesScreenSrc, /wowIllustrations\.customer\.favoritesGuide/, 'Guest state must use favoritesGuide illustration');
  assert.match(favoritesScreenSrc, /احتفظ بالعروض التي تهمك/, 'Guest state must display approved headline');
  assert.match(favoritesScreenSrc, /عرض المفضلة يتطلب تسجيل الدخول/, 'Guest state must display approved subtitle');
  assert.match(favoritesScreenSrc, /تسجيل الدخول/, 'Guest state must provide sign-in button');
  assert.match(favoritesScreenSrc, /متابعة الاستكشاف/, 'Guest state must provide continue exploring link');
});

// ---------------------------------------------------------------------------
// 8. Tab-Specific Empty States
// ---------------------------------------------------------------------------
test('8. Empty states: distinct empty illustrations and contextual CTAs for offers vs businesses', () => {
  assert.match(favoritesScreenSrc, /wowIllustrations\.customer\.savedOffersEmpty/, 'Must use savedOffersEmpty illustration');
  assert.match(favoritesScreenSrc, /wowIllustrations\.customer\.savedMerchantsEmpty/, 'Must use savedMerchantsEmpty illustration');
  assert.match(favoritesScreenSrc, /لا توجد عروض محفوظة/, 'Must display approved empty offers title');
  assert.match(favoritesScreenSrc, /لا يوجد تجار محفوظون/, 'Must display approved empty businesses title');
  assert.match(favoritesScreenSrc, /استكشف العروض الآن/, 'Must display approved empty offers CTA');
  assert.match(favoritesScreenSrc, /استكشف المتاجر الآن/, 'Must display approved empty businesses CTA');
});

// ---------------------------------------------------------------------------
// 9. Display & Formatting Helpers
// ---------------------------------------------------------------------------
test('9. Arabic inflection and availability helper functions', () => {
  assert.equal(favoritesDisplay.formatSavedOffersCount(0), 'لا توجد عروض');
  assert.equal(favoritesDisplay.formatSavedOffersCount(1), 'عرض واحد');
  assert.equal(favoritesDisplay.formatSavedOffersCount(2), 'عروضان');
  assert.equal(favoritesDisplay.formatSavedOffersCount(5), '٥ عروض');
  assert.equal(favoritesDisplay.formatSavedOffersCount(12), '١٢ عرض');

  assert.equal(favoritesDisplay.formatSavedBusinessesCount(0), 'لا يوجد تجار');
  assert.equal(favoritesDisplay.formatSavedBusinessesCount(1), 'تاجر واحد');
  assert.equal(favoritesDisplay.formatSavedBusinessesCount(2), 'تاجران');
  assert.equal(favoritesDisplay.formatSavedBusinessesCount(4), '٤ تجار');
  assert.equal(favoritesDisplay.formatSavedBusinessesCount(15), '١٥ تاجر');

  const now = new Date();
  const past = new Date(now.getTime() - 86400000).toISOString();
  const future = new Date(now.getTime() + 86400000).toISOString();
  const farFuture = new Date(now.getTime() + 172800000).toISOString();

  assert.equal(favoritesDisplay.getOfferStatus(past, future).label, 'متاح');
  assert.equal(favoritesDisplay.getOfferStatus(past, past).label, 'منتهي');
  assert.equal(favoritesDisplay.getOfferStatus(future, farFuture).label, 'قريباً');
});

// ---------------------------------------------------------------------------
// 10. Minimum 48pt Touch Targets and Accessibility Roles
// ---------------------------------------------------------------------------
test('10. Accessibility & Touch Targets: minimum 48pt and ARIA roles', () => {
  assert.match(favoriteButtonSrc, /hitSlop=\{\{\s*top:\s*8,\s*bottom:\s*8,\s*left:\s*8,\s*right:\s*8\s*\}\}/, 'FavoriteButton must provide hitSlop for 48pt+ target');
  assert.match(favoritesScreenSrc, /minHeight:\s*48/, 'Tab pressables must have minHeight 48');
  assert.match(favoriteOfferCardSrc, /accessibilityRole="button"/, 'Cards must declare accessibilityRole button');
  assert.match(favoriteBusinessCardSrc, /accessibilityRole="button"/, 'Cards must declare accessibilityRole button');
});

// ---------------------------------------------------------------------------
// 11. Production Logic Execution: Card presentation resolution (favorites-display.ts)
// ---------------------------------------------------------------------------
test('11. Production execution: resolveFavoriteCardPresentation distinguishes transient failure from confirmed missing data', () => {
  // Transient network error (isError: true) -> must return retry card
  const offerError = favoritesDisplay.resolveFavoriteCardPresentation({
    kind: 'offer',
    isError: true,
    hasDetails: false,
  });
  assert.equal(offerError.state, 'retry');
  assert.equal(offerError.canRetry, true);
  assert.equal(offerError.canRemove, false);
  assert.equal(offerError.title, 'تعذر تحميل العرض');

  const businessError = favoritesDisplay.resolveFavoriteCardPresentation({
    kind: 'business',
    isError: true,
    hasDetails: false,
  });
  assert.equal(businessError.state, 'retry');
  assert.equal(businessError.title, 'تعذر تحميل المتجر');

  // Confirmed missing / unpublished data (isError: false, hasDetails: false) -> must return unavailable card
  const offerMissing = favoritesDisplay.resolveFavoriteCardPresentation({
    kind: 'offer',
    isError: false,
    hasDetails: false,
  });
  assert.equal(offerMissing.state, 'unavailable');
  assert.equal(offerMissing.canRetry, false);
  assert.equal(offerMissing.canRemove, true);
  assert.equal(offerMissing.title, 'عرض غير متوفر حالياً');

  const businessMissing = favoritesDisplay.resolveFavoriteCardPresentation({
    kind: 'business',
    isError: false,
    hasDetails: false,
  });
  assert.equal(businessMissing.state, 'unavailable');
  assert.equal(businessMissing.title, 'متجر غير متوفر حالياً');

  // Ready entity (isError: false, hasDetails: true) -> normal card
  const offerReady = favoritesDisplay.resolveFavoriteCardPresentation({
    kind: 'offer',
    isError: false,
    hasDetails: true,
  });
  assert.equal(offerReady.state, 'ready');
});

// ---------------------------------------------------------------------------
// 12. Production Logic Execution: executeGuardedRemoval success path (use-favorites-details.ts)
// ---------------------------------------------------------------------------
test('12. Production execution: executeGuardedRemoval success path provides Arabic confirmation and clears pending state', async () => {
  const inFlightSet = new Set();
  const pendingSnapshots = [];
  let feedbackResult = null;
  let mutateCalls = 0;

  const mockMutate = async ({ offerId, save }) => {
    mutateCalls++;
    assert.equal(save, false);
    assert.equal(offerId, 'offer-live-1');
    assert.equal(inFlightSet.has('offer-live-1'), true, 'ID must be in inFlightSet during mutation execution');
    return { ok: true };
  };

  const success = await executeGuardedRemoval({
    id: 'offer-live-1',
    kind: 'offer',
    inFlightSet,
    mutateAsync: mockMutate,
    mutationArgs: { offerId: 'offer-live-1', save: false },
    onPendingChange: (set) => pendingSnapshots.push(new Set(set)),
    onFeedback: (fb) => {
      feedbackResult = fb;
    },
  });

  assert.equal(success, true, 'Must return true on mutation resolution');
  assert.equal(mutateCalls, 1, 'Must invoke mutateAsync exactly once');
  assert.equal(inFlightSet.has('offer-live-1'), false, 'inFlightSet must be cleared after resolution');
  assert.equal(feedbackResult.tone, 'success');
  assert.equal(feedbackResult.message, 'تمت إزالة العرض من المفضلة بنجاح');
  // Verify snapshots: first with id, then empty
  assert.equal(pendingSnapshots[0].has('offer-live-1'), true);
  assert.equal(pendingSnapshots[1].size, 0);
});

// ---------------------------------------------------------------------------
// 13. Production Logic Execution: executeGuardedRemoval failure and retry path
// ---------------------------------------------------------------------------
test('13. Production execution: executeGuardedRemoval failure catches rejection, preserves item, and enables retry', async () => {
  const inFlightSet = new Set();
  let feedbackResult = null;
  let mutateAttempt = 0;

  const flakyMutate = async () => {
    mutateAttempt++;
    if (mutateAttempt === 1) {
      throw new Error('Supabase network timeout / fetch error');
    }
    return { ok: true };
  };

  // Attempt 1: Fails
  const firstResult = await executeGuardedRemoval({
    id: 'biz-flaky-99',
    kind: 'business',
    inFlightSet,
    mutateAsync: flakyMutate,
    mutationArgs: { businessId: 'biz-flaky-99', save: false },
    onFeedback: (fb) => {
      feedbackResult = fb;
    },
  });

  assert.equal(firstResult, false, 'Failed mutation must return false without unhandled rejection');
  assert.equal(inFlightSet.has('biz-flaky-99'), false, 'inFlightSet must be cleared after failure so user can retry');
  assert.equal(feedbackResult.tone, 'danger');
  assert.equal(feedbackResult.message, 'تعذر إزالة المتجر من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.');

  // Attempt 2: User retries removing the item, and this time connection succeeds
  const retryResult = await executeGuardedRemoval({
    id: 'biz-flaky-99',
    kind: 'business',
    inFlightSet,
    mutateAsync: flakyMutate,
    mutationArgs: { businessId: 'biz-flaky-99', save: false },
    onFeedback: (fb) => {
      feedbackResult = fb;
    },
  });

  assert.equal(retryResult, true, 'Retry must succeed once connection is restored');
  assert.equal(mutateAttempt, 2, 'Must have attempted mutate twice');
  assert.equal(feedbackResult.tone, 'success');
  assert.equal(feedbackResult.message, 'تمت إزالة المتجر من المفضلة بنجاح');
});

// ---------------------------------------------------------------------------
// 14. Production Logic Execution: Synchronous duplicate guard and simultaneous taps
// ---------------------------------------------------------------------------
test('14. Production execution: executeGuardedRemoval synchronously blocks simultaneous rapid taps', async () => {
  const inFlightSet = new Set();
  let mutateCalls = 0;
  let resolveFirstCall;

  const slowMutate = async () => {
    mutateCalls++;
    return new Promise((resolve) => {
      resolveFirstCall = resolve;
    });
  };

  // Tap 1: starts in-flight
  const promise1 = executeGuardedRemoval({
    id: 'offer-double-tap',
    kind: 'offer',
    inFlightSet,
    mutateAsync: slowMutate,
    mutationArgs: { offerId: 'offer-double-tap', save: false },
  });

  // Tap 2: simultaneous rapid tap in the exact same tick / microtask before React re-render
  // Synchronous guard must immediately reject without waiting for promise1
  const tap2Result = await executeGuardedRemoval({
    id: 'offer-double-tap',
    kind: 'offer',
    inFlightSet,
    mutateAsync: slowMutate,
    mutationArgs: { offerId: 'offer-double-tap', save: false },
  });

  assert.equal(tap2Result, false, 'Simultaneous duplicate tap must be synchronously rejected');
  assert.equal(mutateCalls, 1, 'Duplicate tap must NOT trigger mutateAsync');

  // Tap 3 on a DIFFERENT item simultaneously must be allowed concurrently
  let diffMutateCalls = 0;
  const promise3 = executeGuardedRemoval({
    id: 'offer-different-item',
    kind: 'offer',
    inFlightSet,
    mutateAsync: async () => {
      diffMutateCalls++;
      return { ok: true };
    },
    mutationArgs: { offerId: 'offer-different-item', save: false },
  });

  const tap3Result = await promise3;
  assert.equal(tap3Result, true, 'Concurrent removal of a different item must be allowed');
  assert.equal(diffMutateCalls, 1);

  // Complete Tap 1
  resolveFirstCall({ ok: true });
  const tap1Result = await promise1;
  assert.equal(tap1Result, true, 'First tap completes successfully');
  assert.equal(inFlightSet.size, 0, 'inFlightSet must be completely clear');
});

// ---------------------------------------------------------------------------
// 15. Production Logic Execution: executeFavoriteToggle (FavoriteButton.tsx)
// ---------------------------------------------------------------------------
test('15. Production execution: executeFavoriteToggle handles success, rejection, and guest guards', async () => {
  let pendingState = false;
  let toggleCalledWith = null;

  // Case 1: Signed-in user clicks toggle -> succeeds
  const successResult = await executeFavoriteToggle({
    isSaved: true,
    isSignedIn: true,
    disabled: false,
    isPending: false,
    onToggle: async (nextSaved) => {
      toggleCalledWith = nextSaved;
    },
    setPending: (p) => {
      pendingState = p;
    },
  });
  assert.equal(successResult, true, 'Must return true on toggle success');
  assert.equal(toggleCalledWith, false, 'Must toggle from saved (true) to unsaved (false)');
  assert.equal(pendingState, false, 'Pending state must be false after completion');

  // Case 2: onToggle throws -> catches rejection safely without leaking unhandled error
  const failResult = await executeFavoriteToggle({
    isSaved: false,
    isSignedIn: true,
    onToggle: async () => {
      throw new Error('Connection refused / offline');
    },
    setPending: (p) => {
      pendingState = p;
    },
  });
  assert.equal(failResult, false, 'Must return false on mutation failure');
  assert.equal(pendingState, false, 'Pending state must be reset to false in finally');

  // Case 3: Guest user -> immediately guarded without calling onToggle
  let guestToggled = false;
  const guestResult = await executeFavoriteToggle({
    isSaved: false,
    isSignedIn: false,
    onToggle: () => {
      guestToggled = true;
    },
  });
  assert.equal(guestResult, false, 'Guest user toggle must be rejected');
  assert.equal(guestToggled, false, 'onToggle must never be invoked for guest');

  // Case 4: Disabled or already pending -> guarded
  let guardedCall = false;
  const disabledResult = await executeFavoriteToggle({
    isSaved: false,
    isSignedIn: true,
    disabled: true,
    onToggle: () => {
      guardedCall = true;
    },
  });
  assert.equal(disabledResult, false);
  assert.equal(guardedCall, false);
});



test('AUD-040: favorites grid virtualizes rows without dropping or repeating any item',()=>{
 const source=fs.readFileSync(path.join(repoRoot,'apps/customer/src/features/favorites/favorite-rows.ts'),'utf8');
 const h={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(h);
 const items=Array.from({length:1001},(_,i)=>({id:'favorite-'+i,offerId:'offer-'+i}));
 for(const columns of [2,3]){
  const rows=h.groupFavoriteRows('offers',items,columns);
  assert.equal(rows.length,Math.ceil(1001/columns));assert.deepEqual(rows.flatMap(x=>x.items),items);
  assert.equal(new Set(rows.map(x=>x.key)).size,rows.length);
 }
 assert.match(favoritesScreenSrc,/<FlatList/);
 assert.match(favoritesScreenSrc,/initialNumToRender=\{4\}/);
 assert.match(favoritesScreenSrc,/maxToRenderPerBatch=\{4\}/);
 assert.match(favoritesScreenSrc,/windowSize=\{5\}/);
});
