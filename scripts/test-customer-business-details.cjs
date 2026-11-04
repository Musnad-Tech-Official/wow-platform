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
