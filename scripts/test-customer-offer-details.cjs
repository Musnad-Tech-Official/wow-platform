const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

// Read source files
const offerRouteSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/offer/[id].tsx'),
  'utf8',
);
const offerScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/offer/CustomerOfferDetailsScreen.tsx'),
  'utf8',
);
const offerDisplaySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/offer/offer-display.ts'),
  'utf8',
);
const offerGallerySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/offer/OfferImageGallery.tsx'),
  'utf8',
);
const offerMerchantCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/offer/OfferMerchantIdentityCard.tsx'),
  'utf8',
);
const offerBranchesSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/offer/OfferParticipatingBranches.tsx'),
  'utf8',
);
const homeScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/home/CustomerHomeScreen.tsx'),
  'utf8',
);
const discoverScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/discovery/CustomerDiscoverScreen.tsx'),
  'utf8',
);
const businessScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/business/CustomerBusinessDetailsScreen.tsx'),
  'utf8',
);

// Transpile pure offer-display functions to test them directly
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));
const displayTranspiled = ts.transpileModule(offerDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const offerDisplay = {};
new Function('exports', 'require', displayTranspiled)(offerDisplay, (req) => {
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
// 1. Navigation Wiring to /offer/[id]
// ---------------------------------------------------------------------------
test('1. Navigation wiring: CUS-01, CUS-02, and CUS-10 route to /offer/[id]', () => {
  // CUS-01 Home screen offer tap
  assert.match(
    homeScreenSrc,
    /pathname:\s*['"]\/offer\/\[id\]['"]/,
    'CUS-01 Home screen must route offer taps to /offer/[id]',
  );

  // CUS-02 Discovery screen offer tap
  assert.match(
    discoverScreenSrc,
    /pathname:\s*['"]\/offer\/\[id\]['"]/,
    'CUS-02 Discovery search screen must route offer taps to /offer/[id]',
  );

  // CUS-10 Merchant profile screen offer action
  assert.match(
    businessScreenSrc,
    /pathname:\s*['"]\/offer\/\[id\]['"]/,
    'CUS-10 Business screen must route offer details actions to /offer/[id]',
  );
});

// ---------------------------------------------------------------------------
// 2. Strict ID & UUID Validation
// ---------------------------------------------------------------------------
test('2. Strict UUID validation: accepts valid UUIDs and rejects malformed IDs', () => {
  const validUuid = 'e0000000-0000-4000-8000-000000000001';
  assert.equal(offerDisplay.isValidUuid(validUuid), true);

  assert.equal(offerDisplay.isValidUuid(''), false);
  assert.equal(offerDisplay.isValidUuid('12345'), false);
  assert.equal(offerDisplay.isValidUuid('invalid-uuid-string'), false);
  assert.equal(offerDisplay.isValidUuid(null), false);
  assert.equal(offerDisplay.isValidUuid(undefined), false);

  assert.match(
    offerScreenSrc,
    /const\s+isUuidValid\s*=\s*isValidUuid\(offerId\)/,
    'Screen must validate UUID before executing queries',
  );
  assert.match(
    offerScreenSrc,
    /usePublicOffer\(isUuidValid\s*\?\s*offerId\s*:\s*null\)/,
    'Must pass null to hook when UUID is invalid',
  );
});

// ---------------------------------------------------------------------------
// 3. Security & RPC Contracts
// ---------------------------------------------------------------------------
test('3. Security & RPC contracts: uses usePublicOffer and usePublicOfferMedia only', () => {
  assert.match(
    offerScreenSrc,
    /import\s*\{[^}]*usePublicOffer[^}]*\}\s*from\s*['"]@wow\/api['"]/,
    'Must import usePublicOffer from @wow/api',
  );
  assert.match(
    offerGallerySrc,
    /import\s*\{[^}]*usePublicOfferMedia[^}]*\}\s*from\s*['"]@wow\/api['"]/,
    'Must import usePublicOfferMedia from @wow/api',
  );

  // Ensure no raw table SELECT queries are performed
  assert.doesNotMatch(
    offerScreenSrc,
    /\.from\(['"](offers|businesses|branches)['"]\)/,
    'Direct restricted table queries are forbidden in customer screens',
  );
  assert.doesNotMatch(
    offerGallerySrc,
    /\.from\(['"]wow_offer_media['"]\)/,
    'Direct media table queries are forbidden; RPC only',
  );
});

// ---------------------------------------------------------------------------
// 4. Authorized Media & Gallery Fallback
// ---------------------------------------------------------------------------
test('4. Authorized media: signing helper, gallery controls, and WOW watermark fallback', () => {
  assert.match(
    offerGallerySrc,
    /signPublicOfferMedia\(client,\s*item,\s*120\)/,
    'Must sign offer media through audited signPublicOfferMedia with 120s max expiry',
  );
  assert.match(
    offerGallerySrc,
    /WOW/,
    'Gallery must render branded WOW watermark when no media exists',
  );
  assert.match(
    offerGallerySrc,
    /totalImages\s*>\s*1/,
    'Gallery must conditionally render multi-image navigation controls',
  );
});

// ---------------------------------------------------------------------------
// 5. Pricing & Authentic Arabic Badges
// ---------------------------------------------------------------------------
test('5. Pricing & discount badges: formatted prices, strikethrough, and discount badges', () => {
  assert.equal(offerDisplay.formatDiscountBadge(30), 'خصم %٣٠');
  assert.equal(offerDisplay.formatDiscountBadge(0), null);
  assert.equal(offerDisplay.formatDiscountBadge(-5), null);
  assert.equal(offerDisplay.formatDiscountBadge(null), null);

  assert.match(
    offerScreenSrc,
    /formatDiscoveryPrice\(offer\.final_price,\s*offer\.currency\)/,
    'Final price must be formatted using formatDiscoveryPrice',
  );
  assert.match(
    offerScreenSrc,
    /textDecorationLine:\s*['"]line-through['"]/,
    'Original price must render with strikethrough',
  );
});

// ---------------------------------------------------------------------------
// 6. Offer Availability & Expiration Prose
// ---------------------------------------------------------------------------
test('6. Offer availability & expiration: 3-state logic, boundaries, and Arabic prose', () => {
  const referenceNow = new Date('2026-11-05T12:00:00Z').getTime();

  // Case 1: Future offer (starts_at > now) => 'لم يبدأ بعد'
  const futureOffer = offerDisplay.getOfferAvailability(
    '2026-11-06T00:00:00Z',
    '2026-12-01T00:00:00Z',
    referenceNow,
  );
  assert.equal(futureOffer.status, 'upcoming');
  assert.equal(futureOffer.isAvailable, false);
  assert.equal(futureOffer.label, 'لم يبدأ بعد');

  // Case 2: Active offer (starts_at <= now < ends_at) => 'متاح'
  const activeOffer = offerDisplay.getOfferAvailability(
    '2026-11-01T00:00:00Z',
    '2026-11-10T00:00:00Z',
    referenceNow,
  );
  assert.equal(activeOffer.status, 'active');
  assert.equal(activeOffer.isAvailable, true);
  assert.equal(activeOffer.label, 'متاح');

  // Case 3: Expired offer (ends_at <= now) => 'منتهي'
  const expiredOffer = offerDisplay.getOfferAvailability(
    '2026-10-01T00:00:00Z',
    '2026-11-04T00:00:00Z',
    referenceNow,
  );
  assert.equal(expiredOffer.status, 'expired');
  assert.equal(expiredOffer.isAvailable, false);
  assert.equal(expiredOffer.label, 'منتهي');

  // Case 4: Exact start boundary (now === starts_at) => 'متاح'
  const startBoundary = offerDisplay.getOfferAvailability(
    '2026-11-05T12:00:00Z',
    '2026-11-10T00:00:00Z',
    referenceNow,
  );
  assert.equal(startBoundary.status, 'active');
  assert.equal(startBoundary.isAvailable, true);
  assert.equal(startBoundary.label, 'متاح');

  // Case 5: Exact end boundary (now === ends_at) => 'منتهي'
  const endBoundary = offerDisplay.getOfferAvailability(
    '2026-11-01T00:00:00Z',
    '2026-11-05T12:00:00Z',
    referenceNow,
  );
  assert.equal(endBoundary.status, 'expired');
  assert.equal(endBoundary.isAvailable, false);
  assert.equal(endBoundary.label, 'منتهي');

  // Screen wiring verification: uses both starts_at and ends_at
  assert.match(
    offerScreenSrc,
    /getOfferAvailability\(offer\.starts_at,\s*offer\.ends_at\)/,
    'Screen must pass both starts_at and ends_at to getOfferAvailability',
  );

  assert.match(offerDisplay.formatOfferExpiry('2099-12-31T23:59:59Z'), /سارٍ حتى/);
  assert.equal(
    offerDisplay.formatOfferExpiry(null),
    'تاريخ الانتهاء غير متوفر في المعاينة',
  );
});

// ---------------------------------------------------------------------------
// 7. Merchant Identity Card & Profile Navigation
// ---------------------------------------------------------------------------
test('7. Merchant identity card: links directly to /business/[id]', () => {
  assert.match(
    offerMerchantCardSrc,
    /pathname:\s*['"]\/business\/\[id\]['"]/,
    'Merchant card must route to /business/[id]',
  );
  assert.match(
    offerMerchantCardSrc,
    /الملف العام للتاجر/,
    'Card must include Arabic subtitle for public merchant profile',
  );
});

// ---------------------------------------------------------------------------
// 8. Participating Branches & Mascot Empty State
// ---------------------------------------------------------------------------
test('8. Participating branches: coordinate validation, directions link, and WOW mascot illustration', () => {
  assert.equal(offerDisplay.hasValidCoordinates(15.3694, 44.191), true);
  assert.equal(offerDisplay.hasValidCoordinates(null, 44.191), false);
  assert.equal(offerDisplay.hasValidCoordinates(15.3694, null), false);
  assert.equal(offerDisplay.hasValidCoordinates('invalid', 44.191), false);

  assert.match(
    offerDisplay.getDirectionsUrl(15.3694, 44.191),
    /google\.com\/maps\/dir/,
    'Directions URL must target Google Maps with valid coordinates',
  );

  // Check WOW mascot illustration in empty map state
  assert.match(
    offerBranchesSrc,
    /wowIllustrations\.customer\.mapUnavailable/,
    'Must use approved wowIllustrations.customer.mapUnavailable for empty location state',
  );
  assert.match(
    offerBranchesSrc,
    /تعذّر عرض موقع الفرع/,
    'Must display authentic Arabic title for unavailable branch map',
  );
});

// ---------------------------------------------------------------------------
// 9. Accessibility & 48pt Touch Targets
// ---------------------------------------------------------------------------
test('9. Accessibility & touch targets: strictly enforces 48pt minimum across all controls', () => {
  // Header controls
  assert.match(offerScreenSrc, /width:\s*48,\s*height:\s*48/, 'Header buttons must be at least 48pt');
  // Merchant card
  assert.match(offerMerchantCardSrc, /minHeight:\s*64/, 'Merchant card must exceed 48pt minimum');
  // Branch selector
  assert.match(offerBranchesSrc, /minHeight:\s*48/, 'Branch selector button must meet 48pt minimum');
  // Gallery controls
  assert.match(offerGallerySrc, /width:\s*48,\s*height:\s*48/, 'Gallery arrow buttons must meet 48pt');
});

// ---------------------------------------------------------------------------
// 10. Responsive Desktop & Mobile Layout
// ---------------------------------------------------------------------------
test('10. Responsive layout: desktop split columns and honest states', () => {
  assert.match(
    offerScreenSrc,
    /isDesktop\s*\?/,
    'Screen must adapt layout based on isDesktop viewport hook',
  );
  assert.match(
    offerScreenSrc,
    /kind=['"]error['"]/,
    'Must provide honest error state with retry on failure',
  );
  assert.match(
    offerScreenSrc,
    /kind=['"]empty['"]/,
    'Must provide honest empty/unavailable state for missing offers',
  );
});
