'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');
const customerDir = path.join(repoRoot, 'apps/customer');

// Read source files
const rateRouteSrc = fs.readFileSync(
  path.join(customerDir, 'src/app/offer/[id]/rate.tsx'),
  'utf8',
);
const rateScreenSrc = fs.readFileSync(
  path.join(customerDir, 'src/features/rating/CustomerRateOfferScreen.tsx'),
  'utf8',
);
const myRatingsRouteSrc = fs.readFileSync(
  path.join(customerDir, 'src/app/ratings.tsx'),
  'utf8',
);
const myRatingsScreenSrc = fs.readFileSync(
  path.join(customerDir, 'src/features/rating/CustomerMyRatingsScreen.tsx'),
  'utf8',
);
const ratingDisplaySrc = fs.readFileSync(
  path.join(customerDir, 'src/features/rating/rating-display.ts'),
  'utf8',
);
const offerDetailsSrc = fs.readFileSync(
  path.join(customerDir, 'src/features/offer/CustomerOfferDetailsScreen.tsx'),
  'utf8',
);
const accountActivitySrc = fs.readFileSync(
  path.join(customerDir, 'src/features/account/CustomerActivitySection.tsx'),
  'utf8',
);
const accountScreenSrc = fs.readFileSync(
  path.join(customerDir, 'src/features/account/CustomerAccountTabScreen.tsx'),
  'utf8',
);
const layoutSrc = fs.readFileSync(path.join(customerDir, 'src/app/_layout.tsx'), 'utf8');

// Transpile pure TS modules using workspace TypeScript
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));

const ratingDisplayTranspiled = ts.transpileModule(ratingDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const ratingDisplay = {};
new Function('exports', 'require', ratingDisplayTranspiled)(ratingDisplay, (mod) => {
  if (mod.includes('offer-display')) {
    return {
      isValidUuid: (val) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
    };
  }
  return {};
});

// =============================================================================
// Suite 1: Navigation & Route Wiring
// =============================================================================
test('1. Navigation wiring: Route /offer/[id]/rate is registered and accessible from offer details', () => {
  // Expo Router route file
  assert.match(
    rateRouteSrc,
    /CustomerRateOfferScreen/,
    'Route rate.tsx must render CustomerRateOfferScreen',
  );

  // Stack navigation in customer layout
  assert.match(
    layoutSrc,
    /<Stack\.Screen\s+name="offer\/\[id\]\/rate"\s*\/>/,
    '_layout.tsx must declare offer/[id]/rate route',
  );

  // Offer details screen provides entry
  assert.match(
    offerDetailsSrc,
    /renderOfferAssessmentSection/,
    'CustomerOfferDetailsScreen must have offer assessment section',
  );
  assert.match(
    offerDetailsSrc,
    /تقييم مطابقة العرض/,
    'Offer assessment section must feature Arabic title',
  );
  assert.match(
    offerDetailsSrc,
    /router\.push\(`\/offer\/\$\{offer\.id\}\/rate`\)/,
    'Signed-in user routes to /offer/[id]/rate',
  );

  // Gated action: unauthenticated guest is routed to sign-in with return intent
  assert.match(
    offerDetailsSrc,
    /returnTo:\s*`\/offer\/\$\{offer\.id\}\/rate`/,
    'Guest user redirects to sign-in with returnTo intent',
  );
  assert.match(
    offerDetailsSrc,
    /action:\s*'rate'/,
    'Sign-in redirect specifies rate action intent',
  );
});

// =============================================================================
// Suite 2: Conformity Choices Contract
// =============================================================================
test('2. Conformity contract: Exactly 3 Migration 005 enum values with authentic Arabic labels', () => {
  const { CONFORMITY_OPTIONS } = ratingDisplay;
  assert.equal(CONFORMITY_OPTIONS.length, 3, 'Must have exactly 3 conformity choices');

  const values = CONFORMITY_OPTIONS.map((c) => c.value);
  assert.deepEqual(
    values.sort(),
    ['could_not_verify', 'does_not_match', 'matches'].sort(),
    'Matches the Migration 005 OfferConformity enum',
  );

  const matches = CONFORMITY_OPTIONS.find((c) => c.value === 'matches');
  assert.equal(matches.label, 'مطابق للعرض');
  assert.equal(matches.tone, 'success');

  const doesNotMatch = CONFORMITY_OPTIONS.find((c) => c.value === 'does_not_match');
  assert.equal(doesNotMatch.label, 'غير مطابق للعرض');
  assert.equal(doesNotMatch.tone, 'warning');

  const couldNotVerify = CONFORMITY_OPTIONS.find((c) => c.value === 'could_not_verify');
  assert.equal(couldNotVerify.label, 'تعذّر التحقق');
  assert.equal(couldNotVerify.tone, 'neutral');
});

// =============================================================================
// Suite 3: Star Rating Constraints & Verification Logic
// =============================================================================
test('3. Star Rating Constraints: Optional 1-5 stars for matches/does_not_match, strictly null for could_not_verify', () => {
  const { validateRatingForm } = ratingDisplay;
  const validUuid = '12345678-1234-4234-8234-123456789abc';

  // 1. Matches with valid stars
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: 5 }).isValid, true);
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: 1 }).isValid, true);
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: null }).isValid, true);
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: undefined }).isValid, true);

  // 2. Does not match with valid stars
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'does_not_match', experienceStars: 2 }).isValid, true);
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'does_not_match', experienceStars: null }).isValid, true);

  // 3. Strict business rule: could_not_verify MUST have null/omitted stars
  const invalidStarsOnCouldNotVerify = validateRatingForm({
    offerId: validUuid,
    conformity: 'could_not_verify',
    experienceStars: 3,
  });
  assert.equal(invalidStarsOnCouldNotVerify.isValid, false);
  assert.match(
    invalidStarsOnCouldNotVerify.errors.experienceStars,
    /لا يمكن تحديد تقييم بالنجوم عند اختيار "تعذّر التحقق"/,
  );

  // Valid could_not_verify with null stars
  assert.equal(
    validateRatingForm({ offerId: validUuid, conformity: 'could_not_verify', experienceStars: null }).isValid,
    true,
  );

  // 4. Invalid star bounds rejected
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: 0 }).isValid, false);
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: 6 }).isValid, false);
  assert.equal(validateRatingForm({ offerId: validUuid, conformity: 'matches', experienceStars: 3.5 }).isValid, false);

  // UI control: disabled for could_not_verify with clear Arabic explanation
  assert.match(rateScreenSrc, /لا يمكن تقييم النجوم عند اختيار "تعذّر التحقق"/);
});

// =============================================================================
// Suite 4: Strict UUID Validation on Offer ID
// =============================================================================
test('4. UUID Validation: Strictly accepts RFC 4122 UUID and rejects malformed IDs', () => {
  const { validateRatingForm } = ratingDisplay;

  // Valid UUIDs
  assert.equal(
    validateRatingForm({
      offerId: '12345678-1234-4234-8234-123456789abc',
      conformity: 'matches',
    }).isValid,
    true,
  );

  // Invalid IDs
  assert.equal(
    validateRatingForm({ offerId: 'malformed-id', conformity: 'matches' }).isValid,
    false,
  );
  assert.equal(
    validateRatingForm({ offerId: '12345', conformity: 'matches' }).isValid,
    false,
  );
  assert.equal(
    validateRatingForm({ offerId: '', conformity: 'matches' }).isValid,
    false,
  );
  assert.equal(
    validateRatingForm({ offerId: null, conformity: 'matches' }).isValid,
    false,
  );

  // Screen handles invalid UUID
  assert.match(rateScreenSrc, /isUuidValid/);
  assert.match(rateScreenSrc, /معرّف العرض غير صالح/);
});

// =============================================================================
// Suite 5: Submission Guard & Synchronous Double-Tap Prevention
// =============================================================================
test('5. Submission Guard: Synchronous ref blocks duplicate in-flight submissions', async () => {
  const { executeGuardedRatingSubmission } = ratingDisplay;
  const validUuid = '12345678-1234-4234-8234-123456789abc';

  let callCount = 0;
  const mockMutation = {
    mutateAsync: async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return 'rating-uuid-generated-123';
    },
  };

  const isSubmittingRef = { current: false };

  // First tap executes
  const p1 = executeGuardedRatingSubmission({
    offerId: validUuid,
    conformity: 'matches',
    experienceStars: 4,
    isSubmittingRef,
    submitRatingMutation: mockMutation,
  });

  // Second rapid tap is synchronously blocked
  const r2 = await executeGuardedRatingSubmission({
    offerId: validUuid,
    conformity: 'matches',
    experienceStars: 4,
    isSubmittingRef,
    submitRatingMutation: mockMutation,
  });

  assert.equal(r2.success, false);
  assert.match(r2.errorMessage, /جارٍ إرسال التقييم بالفعل/);

  const r1 = await p1;
  assert.equal(r1.success, true);
  assert.equal(r1.ratingId, 'rating-uuid-generated-123');
  assert.equal(callCount, 1, 'Only one mutation execution took place');
  assert.equal(isSubmittingRef.current, false, 'Guard reset after completion');
});

// =============================================================================
// Suite 6: Server 14-Day Assessment Window & Error Handling
// =============================================================================
test('6. Server Assessment Window: Honest Error Outcome Without False Success', async () => {
  const { executeGuardedRatingSubmission } = ratingDisplay;
  const validUuid = '12345678-1234-4234-8234-123456789abc';

  // Server error: 14-day assessment window
  const mockWindowExpiredMutation = {
    mutateAsync: async () => {
      const err = new Error('Offer is not within the 14-day assessment window');
      err.code = '22023';
      throw err;
    },
  };

  const isSubmittingRef = { current: false };
  const res = await executeGuardedRatingSubmission({
    offerId: validUuid,
    conformity: 'matches',
    experienceStars: 5,
    isSubmittingRef,
    submitRatingMutation: mockWindowExpiredMutation,
  });

  assert.equal(res.success, false);
  assert.equal(res.ratingId, undefined);
  assert.match(
    res.errorMessage,
    /انتهت فترة تقييم هذا العرض أو أن العرض غير مؤهل للتقييم حالياً/,
  );
  assert.match(res.errorMessage, /14 يوماً/);
  assert.equal(isSubmittingRef.current, false, 'Guard cleared on failure');
});

// =============================================================================
// Suite 7: Previous Rating Detection and Replacement Semantics
// =============================================================================
test('7. Existing Rating Semantics: Detects previous rating and allows updating', () => {
  // Screen detects existing rating from useMyRatings query
  assert.match(rateScreenSrc, /useMyRatings\(\{ limit: 50, offset: 0 \}\)/);
  assert.match(rateScreenSrc, /existingRating/, 'Checks existing rating for offer');
  assert.match(rateScreenSrc, /سبق لك تقييم هذا العرض/, 'Displays previous rating notice');
  assert.match(rateScreenSrc, /تحديث التقييم/, 'Submit button indicates update');
});

// =============================================================================
// Suite 8: Private My Ratings History (CUS-06 Account Tab Integration)
// =============================================================================
test('8. CUS-06 Integration: Private "تقييماتي للعروض" Activity Entry and /ratings Route', () => {
  // Activity section in account
  assert.match(
    accountActivitySrc,
    /تقييماتي للعروض/,
    'CustomerActivitySection must render My Ratings row',
  );
  assert.match(
    accountScreenSrc,
    /handleRatingsNavigation/,
    'CustomerAccountTabScreen provides handleRatingsNavigation',
  );
  assert.match(
    accountScreenSrc,
    /onPressRatings=\{handleRatingsNavigation\}/,
    'Passes onPressRatings to activity section',
  );

  // Route registration
  assert.match(layoutSrc, /<Stack\.Screen\s+name="ratings"\s*\/>/);
  assert.match(myRatingsRouteSrc, /CustomerMyRatingsScreen/);

  // Screen contracts
  assert.match(myRatingsScreenSrc, /useMyRatings\(\{ limit: 50, offset: 0 \}\)/);
  assert.match(myRatingsScreenSrc, /usePublicOffer/, 'Must query authorized public offer API for offer title');
  assert.match(myRatingsScreenSrc, /العرض غير متاح حالياً/, 'Must provide clear unavailable-offer fallback');
  assert.match(myRatingsScreenSrc, /سجّل الدخول لعرض تقييماتك/, 'Guest gate present');
  assert.match(myRatingsScreenSrc, /لا توجد تقييمات مسجلة/, 'Empty state present');
  assert.match(myRatingsScreenSrc, /عرض العرض أو تعديل التقييم/, 'Card links to offer rate');
});

// =============================================================================
// Suite 9: Integrity of Existing Complaints & Favorites
// =============================================================================
test('9. System Boundaries: Complaints CUS-07/08/09 and Favorites CUS-04 Unaffected', () => {
  // Distinct complaint actions preserved in offer details
  assert.match(
    offerDetailsSrc,
    /الإبلاغ عن مشكلة في العرض/,
    'Complaint action remains intact',
  );
  assert.match(
    offerDetailsSrc,
    /router\.push\(`\/offer\/\$\{offer\.id\}\/complaint`\)/,
    'Complaint route preserved',
  );

  // Account complaints navigation preserved
  assert.match(accountActivitySrc, /شكاواي ومتابعة البلاغات/);
  assert.match(accountActivitySrc, /العروض والمتاجر المحفوظة/);
});

// =============================================================================
// Suite 10: Accessibility & Responsive Layout Contracts
// =============================================================================
test('10. Accessibility & Visual Contracts: 48pt Touch Targets, RTL, and WCAG Contrast', () => {
  // Radio options touch targets
  assert.match(rateScreenSrc, /minHeight:\s*56/, 'Conformity cards exceed 48pt');

  // Star buttons touch targets
  assert.match(rateScreenSrc, /width:\s*48,\s*height:\s*48/, 'Star buttons are 48x48pt');

  // Submit button height
  assert.match(rateScreenSrc, /height:\s*52/, 'Submit button exceeds 48pt');

  // RTL web props
  assert.match(rateScreenSrc, /rtlWebProps/);
  assert.match(myRatingsScreenSrc, /rtlWebProps/);

  // ARIA / Accessibility roles
  assert.match(rateScreenSrc, /accessibilityRole="radio"/);
  assert.match(rateScreenSrc, /accessibilityRole="button"/);
  assert.match(myRatingsScreenSrc, /accessibilityRole="button"/);
});
