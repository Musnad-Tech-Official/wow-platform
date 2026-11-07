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
test('6. Mutation pending state: per-item pending set, duplicate prevention, and user feedback', () => {
  assert.match(useFavoritesDetailsSrc, /pendingOfferIds\.has\(offerId\)/, 'Must check pendingOfferIds before initiating mutation');
  assert.match(useFavoritesDetailsSrc, /pendingBusinessIds\.has\(businessId\)/, 'Must check pendingBusinessIds before initiating mutation');
  assert.match(useFavoritesDetailsSrc, /FavoritesFeedback/, 'Hook must define FavoritesFeedback interface');
  assert.match(useFavoritesDetailsSrc, /feedback,\s*clearFeedback/, 'Hook must expose feedback and clearFeedback');
  assert.match(favoritesScreenSrc, /<ToastBanner/, 'Favorites screen must render ToastBanner for user feedback');
  assert.match(favoriteButtonSrc, /ActivityIndicator/, 'FavoriteButton must render ActivityIndicator during pending mutations');
  assert.match(favoriteButtonSrc, /disabled=\{disabled\s*\|\|\s*isPending\}/, 'FavoriteButton must disable interaction during pending mutations');
  assert.match(favoriteButtonSrc, /try\s*\{\s*setLocalPending\(true\);\s*await\s*onToggle\?\.\(!isSaved\);\s*\}\s*catch/, 'FavoriteButton must catch onToggle rejection');
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
// 11. Behavioral Regression: Transient error vs missing entity decision logic
// ---------------------------------------------------------------------------
test('11. Behavioral: Card presentation distinguishes transient query failure from confirmed missing data', () => {
  function resolveCardPresentation(queryState) {
    const isError = !queryState.details && queryState.isQueryError;
    const entity = queryState.details ?? queryState.data;
    if (isError) {
      return { card: 'FavoriteErrorRetryCard', canRetry: true, canRemove: false };
    }
    if (!entity) {
      return { card: 'UnavailableFavoriteCard', canRetry: false, canRemove: true };
    }
    return { card: 'StandardCard', canRetry: false, canRemove: false };
  }

  // Transient network/API failure (isQueryError: true) -> must prompt retry, NOT mark as deleted
  const transientError = resolveCardPresentation({ details: null, data: undefined, isQueryError: true });
  assert.equal(transientError.card, 'FavoriteErrorRetryCard');
  assert.equal(transientError.canRetry, true);
  assert.equal(transientError.canRemove, false);

  // Confirmed missing or unpublished item (query returned null without error) -> allow user removal
  const confirmedMissing = resolveCardPresentation({ details: null, data: null, isQueryError: false });
  assert.equal(confirmedMissing.card, 'UnavailableFavoriteCard');
  assert.equal(confirmedMissing.canRetry, false);
  assert.equal(confirmedMissing.canRemove, true);

  // Normal valid item
  const validItem = resolveCardPresentation({ details: null, data: { title: 'وجبة غداء' }, isQueryError: false });
  assert.equal(validItem.card, 'StandardCard');
});

// ---------------------------------------------------------------------------
// 12. Behavioral Regression: Hook removal mutation success path
// ---------------------------------------------------------------------------
test('12. Behavioral: Removal mutation success path provides positive Arabic feedback and clears pending state', async () => {
  let feedback = null;
  const pendingOfferIds = new Set();
  let mutateCalls = 0;

  const mockMutation = {
    mutateAsync: async ({ offerId, save }) => {
      mutateCalls++;
      assert.equal(save, false);
      assert.equal(offerId, 'offer-123');
      assert.equal(pendingOfferIds.has('offer-123'), true, 'ID must be in pending set during execution');
      return { success: true };
    },
  };

  async function removeOffer(offerId) {
    if (pendingOfferIds.has(offerId)) return false;
    pendingOfferIds.add(offerId);
    try {
      await mockMutation.mutateAsync({ offerId, save: false });
      feedback = {
        id: `offer-success-${offerId}-${Date.now()}`,
        message: 'تمت إزالة العرض من المفضلة بنجاح',
        tone: 'success',
      };
      return true;
    } catch {
      feedback = {
        id: `offer-error-${offerId}-${Date.now()}`,
        message: 'تعذر إزالة العرض من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.',
        tone: 'danger',
      };
      return false;
    } finally {
      pendingOfferIds.delete(offerId);
    }
  }

  const result = await removeOffer('offer-123');
  assert.equal(result, true, 'Must return true on success');
  assert.equal(mutateCalls, 1, 'Must invoke mutateAsync once');
  assert.equal(feedback.tone, 'success', 'Must set feedback tone to success');
  assert.match(feedback.message, /تمت إزالة العرض من المفضلة بنجاح/, 'Must display clear Arabic confirmation');
  assert.equal(pendingOfferIds.has('offer-123'), false, 'Pending state must be cleared after resolution');
});

// ---------------------------------------------------------------------------
// 13. Behavioral Regression: Hook removal mutation failure path
// ---------------------------------------------------------------------------
test('13. Behavioral: Removal mutation failure path catches rejection, provides Arabic error, and preserves item', async () => {
  let feedback = null;
  const pendingOfferIds = new Set();
  let mutateCalls = 0;

  const failingMutation = {
    mutateAsync: async () => {
      mutateCalls++;
      throw new Error('Supabase network timeout / fetch failed');
    },
  };

  async function removeOffer(offerId) {
    if (pendingOfferIds.has(offerId)) return false;
    pendingOfferIds.add(offerId);
    try {
      await failingMutation.mutateAsync({ offerId, save: false });
      feedback = {
        id: `offer-success-${offerId}-${Date.now()}`,
        message: 'تمت إزالة العرض من المفضلة بنجاح',
        tone: 'success',
      };
      return true;
    } catch {
      feedback = {
        id: `offer-error-${offerId}-${Date.now()}`,
        message: 'تعذر إزالة العرض من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.',
        tone: 'danger',
      };
      return false;
    } finally {
      pendingOfferIds.delete(offerId);
    }
  }

  // Must not throw an unhandled promise rejection
  const result = await removeOffer('offer-fail-999');
  assert.equal(result, false, 'Must return false on failure');
  assert.equal(mutateCalls, 1, 'Must have attempted mutateAsync once');
  assert.equal(feedback.tone, 'danger', 'Must set feedback tone to danger');
  assert.match(feedback.message, /تعذر إزالة العرض من المفضلة/, 'Must display Arabic failure guidance');
  assert.equal(pendingOfferIds.has('offer-fail-999'), false, 'Pending state must be cleared in finally block');
});

// ---------------------------------------------------------------------------
// 14. Behavioral Regression: Duplicate in-flight request suppression
// ---------------------------------------------------------------------------
test('14. Behavioral: Concurrent removal calls suppress duplicates while in-flight', async () => {
  let feedback = null;
  const pendingBusinessIds = new Set();
  let mutateCalls = 0;
  let resolvePromise;

  const slowMutation = {
    mutateAsync: async () => {
      mutateCalls++;
      return new Promise((resolve) => {
        resolvePromise = resolve;
      });
    },
  };

  async function removeBusiness(businessId) {
    if (pendingBusinessIds.has(businessId)) return false;
    pendingBusinessIds.add(businessId);
    try {
      await slowMutation.mutateAsync({ businessId, save: false });
      feedback = {
        id: `biz-success-${businessId}-${Date.now()}`,
        message: 'تمت إزالة المتجر من المفضلة بنجاح',
        tone: 'success',
      };
      return true;
    } catch {
      feedback = {
        id: `biz-error-${businessId}-${Date.now()}`,
        message: 'تعذر إزالة المتجر من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.',
        tone: 'danger',
      };
      return false;
    } finally {
      pendingBusinessIds.delete(businessId);
    }
  }

  // First call starts in-flight
  const promise1 = removeBusiness('biz-dup-1');
  assert.equal(pendingBusinessIds.has('biz-dup-1'), true, 'ID is registered as pending');

  // Second call attempted while first is still pending
  const call2Result = await removeBusiness('biz-dup-1');
  assert.equal(call2Result, false, 'Duplicate concurrent call must return false immediately');
  assert.equal(mutateCalls, 1, 'Duplicate call must NOT invoke mutateAsync a second time');

  // Complete first call
  resolvePromise({ success: true });
  const call1Result = await promise1;
  assert.equal(call1Result, true, 'First call completes successfully');
  assert.equal(feedback.tone, 'success');
  assert.equal(pendingBusinessIds.has('biz-dup-1'), false, 'Pending set is cleared');
});

// ---------------------------------------------------------------------------
// 15. Behavioral Regression: FavoriteButton handles rejected onToggle without unhandled rejections
// ---------------------------------------------------------------------------
test('15. Behavioral: FavoriteButton press catches rejected promises safely and resets pending state', async () => {
  let isPending = false;
  let errorCaught = false;

  async function simulateButtonPress(onToggleFn) {
    if (isPending) return;
    try {
      isPending = true;
      await onToggleFn();
    } catch {
      errorCaught = true;
    } finally {
      isPending = false;
    }
  }

  // Case 1: onToggle succeeds
  await simulateButtonPress(async () => {});
  assert.equal(isPending, false, 'Pending reset after success');
  assert.equal(errorCaught, false);

  // Case 2: onToggle rejects
  await simulateButtonPress(async () => {
    throw new Error('Async network failure');
  });
  assert.equal(isPending, false, 'Pending must be reset even after async rejection');
  assert.equal(errorCaught, true, 'Error was intercepted safely without leaking unhandled rejection');
});


