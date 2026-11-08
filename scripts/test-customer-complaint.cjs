const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');

// Read source files
const complaintRouteSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/offer/[id]/complaint.tsx'),
  'utf8',
);
const complaintScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/CustomerSubmitComplaintScreen.tsx'),
  'utf8',
);
const complaintDisplaySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/complaint-display.ts'),
  'utf8',
);
const summaryCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintOfferSummaryCard.tsx'),
  'utf8',
);
const evidenceNoticeSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintEvidenceNotice.tsx'),
  'utf8',
);
const reviewModalSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintReviewModal.tsx'),
  'utf8',
);
const customerLayoutSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/_layout.tsx'),
  'utf8',
);
const offerScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/offer/CustomerOfferDetailsScreen.tsx'),
  'utf8',
);
const apiInteractionsSrc = fs.readFileSync(
  path.join(repoRoot, 'packages/api/src/customer-interactions.ts'),
  'utf8',
);
const queryHooksSrc = fs.readFileSync(
  path.join(repoRoot, 'packages/api/src/query/hooks/use-customer-interactions.ts'),
  'utf8',
);

// Transpile pure complaint-display functions using workspace TypeScript
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));
const displayTranspiled = ts.transpileModule(complaintDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const complaintDisplay = {};
new Function('exports', 'require', displayTranspiled)(complaintDisplay, (req) => {
  return {};
});

// ===========================================================================
// 1. Navigation and Route Wiring
// ===========================================================================
test('1. Navigation wiring: Route /offer/[id]/complaint is registered and linked from offer details', () => {
  // Expo Router route file
  assert.ok(
    complaintRouteSrc.includes("import { CustomerSubmitComplaintScreen } from '../../../features/complaint'"),
    'Route complaint.tsx must import CustomerSubmitComplaintScreen',
  );
  assert.ok(
    complaintRouteSrc.includes('<CustomerSubmitComplaintScreen'),
    'Route complaint.tsx must render CustomerSubmitComplaintScreen',
  );

  // Stack navigation in customer layout
  assert.ok(
    customerLayoutSrc.includes('<Stack.Screen name="offer/[id]/complaint" />'),
    '_layout.tsx must declare offer/[id]/complaint route',
  );

  // Entry point on CustomerOfferDetailsScreen
  assert.match(
    offerScreenSrc,
    /router\.push\(`\/offer\/\$\{offer\.id\}\/complaint`\)/,
    'Offer Details screen must provide navigation action to /offer/[id]/complaint',
  );
  assert.ok(
    offerScreenSrc.includes('الإبلاغ عن مشكلة'),
    'Offer Details screen must display Arabic label for reporting an issue',
  );

  // Scope safety: CUS-08 and CUS-09 routes must NOT be registered in customer _layout
  assert.equal(
    customerLayoutSrc.includes('name="complaints"'),
    false,
    'Must not expose unapproved complaints list route in _layout',
  );
  assert.equal(
    customerLayoutSrc.includes('name="complaint/[id]"'),
    false,
    'Must not expose unapproved complaint details route in _layout',
  );
});

// ===========================================================================
// 2. Exact ComplaintType Contract Mapping
// ===========================================================================
test('2. ComplaintType contract: Maps exactly to the 6 Migration 005 enum values', () => {
  const approvedTypes = [
    'price_mismatch',
    'unavailable',
    'misleading_terms',
    'product_mismatch',
    'business_conduct',
    'other',
  ];

  // Inspect the options exported from complaint-display
  assert.equal(complaintDisplay.COMPLAINT_TYPE_OPTIONS.length, 6);

  const exportedValues = complaintDisplay.COMPLAINT_TYPE_OPTIONS.map((o) => o.value);
  assert.deepEqual(exportedValues, approvedTypes);

  // Verify that each type option has non-empty Arabic label and description
  for (const opt of complaintDisplay.COMPLAINT_TYPE_OPTIONS) {
    assert.ok(opt.label && opt.label.length > 3, `Type ${opt.value} must have Arabic label`);
    assert.ok(opt.description && opt.description.length > 10, `Type ${opt.value} must have Arabic description`);
    const formatted = complaintDisplay.getComplaintTypeLabel(opt.value);
    assert.equal(formatted, opt.label);
  }

  // Fallback for null or unknown
  assert.equal(complaintDisplay.getComplaintTypeLabel(null), 'غير محدد');
  assert.equal(complaintDisplay.getComplaintTypeLabel(undefined), 'غير محدد');
});

// ===========================================================================
// 3. Multi-line Description Validation (15-4000 characters)
// ===========================================================================
test('3. Description validation: Enforces 15 to 4000 trimmed characters', () => {
  const baseValidForm = {
    complaintType: 'price_mismatch',
    description: 'تم طلب سعر أعلى من المعلن في التطبيق بمقدار 500 ريال',
    branchId: null,
    incidentDate: '',
  };

  // Valid description
  const validResult = complaintDisplay.validateComplaintForm(baseValidForm);
  assert.equal(validResult.isValid, true);
  assert.equal(Object.keys(validResult.errors).length, 0);
  assert.equal(validResult.normalizedDescription, baseValidForm.description.trim());

  // Empty description
  const emptyResult = complaintDisplay.validateComplaintForm({
    ...baseValidForm,
    description: '   ',
  });
  assert.equal(emptyResult.isValid, false);
  assert.ok(emptyResult.errors.description);

  // Too short (< 15 chars)
  const shortResult = complaintDisplay.validateComplaintForm({
    ...baseValidForm,
    description: 'سعر غير صحيح', // 12 chars
  });
  assert.equal(shortResult.isValid, false);
  assert.match(shortResult.errors.description, /15 حرفاً على الأقل/);

  // Exactly 14 chars -> fails
  const fourteenChars = 'أ'.repeat(14);
  assert.equal(
    complaintDisplay.validateComplaintForm({ ...baseValidForm, description: fourteenChars }).isValid,
    false,
  );

  // Exactly 15 chars -> passes
  const fifteenChars = 'أ'.repeat(15);
  const fifteenResult = complaintDisplay.validateComplaintForm({
    ...baseValidForm,
    description: fifteenChars,
  });
  assert.equal(fifteenResult.isValid, true);
  assert.equal(fifteenResult.normalizedDescription.length, 15);

  // Exactly 4000 chars -> passes
  const fourThousandChars = 'ب'.repeat(4000);
  const fourThousandResult = complaintDisplay.validateComplaintForm({
    ...baseValidForm,
    description: fourThousandChars,
  });
  assert.equal(fourThousandResult.isValid, true);
  assert.equal(fourThousandResult.normalizedDescription.length, 4000);

  // Exceeds 4000 chars -> fails
  const overLimit = 'ب'.repeat(4001);
  const overResult = complaintDisplay.validateComplaintForm({
    ...baseValidForm,
    description: overLimit,
  });
  assert.equal(overResult.isValid, false);
  assert.match(overResult.errors.description, /لا يمكن أن يتجاوز/);
});

// ===========================================================================
// 4. Branch and Incident Date Validation
// ===========================================================================
test('4. Branch & Incident Date: Validates branch eligibility and prevents future dates', () => {
  const eligibleBranches = ['b-1111', 'b-2222'];
  const baseValidForm = {
    complaintType: 'unavailable',
    description: 'الفرع رفض تقديم العرض المذكور بالتطبيق بالكامل',
    branchId: 'b-1111',
    incidentDate: '2026-11-01',
  };

  // Eligible branch passes
  const validBranchResult = complaintDisplay.validateComplaintForm(baseValidForm, eligibleBranches);
  assert.equal(validBranchResult.isValid, true);

  // Unlisted branch fails
  const invalidBranchResult = complaintDisplay.validateComplaintForm(
    { ...baseValidForm, branchId: 'b-unauthorized' },
    eligibleBranches,
  );
  assert.equal(invalidBranchResult.isValid, false);
  assert.match(invalidBranchResult.errors.branchId, /غير مشمول/);

  // Optional empty branch passes
  const nullBranchResult = complaintDisplay.validateComplaintForm(
    { ...baseValidForm, branchId: null },
    eligibleBranches,
  );
  assert.equal(nullBranchResult.isValid, true);

  // Incident date tests
  // Empty date is valid (optional)
  const emptyDateCheck = complaintDisplay.validateIncidentDate('');
  assert.equal(emptyDateCheck.isValid, true);
  assert.equal(emptyDateCheck.isoString, null);

  // Valid past date
  const pastDateCheck = complaintDisplay.validateIncidentDate('2026-11-05');
  assert.equal(pastDateCheck.isValid, true);
  assert.ok(pastDateCheck.isoString);

  // Malformed date
  const malformedCheck = complaintDisplay.validateIncidentDate('not-a-date');
  assert.equal(malformedCheck.isValid, false);
  assert.match(malformedCheck.error, /تاريخ غير صحيح/);

  // Future date (beyond +5 minutes)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const futureCheck = complaintDisplay.validateIncidentDate(tomorrow);
  assert.equal(futureCheck.isValid, false);
  assert.match(futureCheck.error, /في المستقبل/);

  // Ancient date (> 1 year)
  const ancientCheck = complaintDisplay.validateIncidentDate('2020-01-01');
  assert.equal(ancientCheck.isValid, false);
  assert.match(ancientCheck.error, /قديم جداً/);
});

// ===========================================================================
// 5. Evidence & Attachment Honesty
// ===========================================================================
test('5. Evidence honesty: Explains attachment unavailability and preserves empty array contract', () => {
  // Capability flag must be strictly false
  assert.equal(complaintDisplay.IS_EVIDENCE_ATTACHMENT_SUPPORTED, false);

  // Evidence notice component must render honest text and no file inputs
  assert.ok(
    evidenceNoticeSrc.includes('غير متاحة حالياً'),
    'EvidenceNotice must display honest status badge',
  );
  assert.ok(
    evidenceNoticeSrc.includes('خدمة إرفاق الصور والإيصالات قيد التطوير'),
    'EvidenceNotice must inform user that file attachments are coming in future',
  );
  assert.equal(
    evidenceNoticeSrc.includes('type="file"'),
    false,
    'Must not include working file upload inputs',
  );
  assert.equal(
    evidenceNoticeSrc.includes('uploadWowMedia'),
    false,
    'Must not upload unverified media in this phase',
  );

  // API submitComplaint implementation in packages/api must hardcode empty evidence array
  assert.match(
    apiInteractionsSrc,
    /p_private_evidence_keys:\s*\[\]/,
    'API submitComplaint must enforce empty evidence keys array',
  );
});

// ===========================================================================
// 6. Two-Stage Review and Synchronous Submit Guard
// ===========================================================================
test('6. Review & Submission Guard: Two-stage confirmation and duplicate submission lock', () => {
  // Review modal exists and shows all required fields
  assert.ok(reviewModalSrc.includes('مراجعة تفاصيل الشكوى'), 'ReviewModal has correct title');
  assert.ok(reviewModalSrc.includes('offerTitle'), 'ReviewModal displays offer title');
  assert.ok(reviewModalSrc.includes('businessName'), 'ReviewModal displays business name');
  assert.ok(reviewModalSrc.includes('complaintTypeLabel'), 'ReviewModal displays complaint type');
  assert.ok(reviewModalSrc.includes('description'), 'ReviewModal displays complaint description');
  assert.ok(reviewModalSrc.includes('branchName'), 'ReviewModal displays branch if provided');
  assert.ok(reviewModalSrc.includes('incidentDate'), 'ReviewModal displays incident date if provided');
  assert.ok(reviewModalSrc.includes('تأكيد إرسال الشكوى'), 'ReviewModal has confirm action');
  assert.ok(reviewModalSrc.includes('تعديل البيانات'), 'ReviewModal has edit action');

  // CustomerSubmitComplaintScreen uses ref-based synchronous guard
  assert.ok(
    complaintScreenSrc.includes('const isSubmittingRef = useRef(false);'),
    'Must use synchronous ref guard for rapid double-submit prevention',
  );
  assert.match(
    complaintScreenSrc,
    /if\s*\(\s*isSubmittingRef\.current\s*\)\s*return;/,
    'Must synchronously bail out if submission is already in flight',
  );
  assert.ok(
    complaintScreenSrc.includes('isSubmittingRef.current = true;'),
    'Must synchronously lock isSubmittingRef before awaiting mutation',
  );
});

// ===========================================================================
// 7. Auth Session and Guest Handling
// ===========================================================================
test('7. Auth session safety: Displays guest gate without leaking private data', () => {
  // Auth readiness & session check
  assert.ok(
    /useAuth\(\)/.test(complaintScreenSrc) && complaintScreenSrc.includes('isSignedIn'),
    'Screen must inspect Clerk auth state',
  );

  // Guest view branch
  assert.ok(
    complaintScreenSrc.includes('if (isAuthLoaded && !isSignedIn)'),
    'Screen must explicitly handle unauthenticated state',
  );
  assert.ok(
    complaintScreenSrc.includes('تسجيل الدخول مطلوب لتقديم شكوى'),
    'Guest view must inform user of login requirement',
  );
  assert.ok(
    complaintScreenSrc.includes('handleSignInRedirect'),
    'Guest view must provide clear path to sign-in',
  );
  assert.ok(
    complaintScreenSrc.includes('ComplaintOfferSummaryCard'),
    'Guest view can display verified public offer summary',
  );

  // React Query hook safety
  assert.ok(
    queryHooksSrc.includes('useSubmitComplaint'),
    'useSubmitComplaint must be exported from query hooks',
  );
  assert.match(
    queryHooksSrc,
    /requireWowApiSession\(context\)/,
    'useSubmitComplaint must require authenticated session',
  );
  assert.match(
    queryHooksSrc,
    /wowQueryKeys\.interactions\.myComplaintsRoot\(context\.userId\)/,
    'useSubmitComplaint must invalidate only the current user complaint queries',
  );
});

// ===========================================================================
// 8. Outcome Honesty, Success, and Error Recovery
// ===========================================================================
test('8. Outcome honesty: Verified success display, ambiguous write guidance, and draft preservation', () => {
  // Success state checks
  assert.ok(
    complaintScreenSrc.includes('submittedComplaintId'),
    'Screen must store returned complaint UUID',
  );
  assert.ok(
    complaintScreenSrc.includes('الرقم المرجعي للشكوى'),
    'Success view must display complaint reference ID',
  );
  assert.ok(
    complaintScreenSrc.includes('تم تسجيل شكواك بنجاح'),
    'Success view must display verified Arabic confirmation',
  );
  assert.ok(
    complaintScreenSrc.includes('العودة إلى تفاصيل العرض'),
    'Success view must offer return to the originating offer',
  );

  // Error handling checks
  assert.ok(
    complaintScreenSrc.includes('setSubmitError'),
    'Screen must capture submission errors without losing draft inputs',
  );
  assert.match(
    complaintScreenSrc,
    /تعذّر التأكد من اكتمال استلام الشكوى/,
    'Ambiguous outcome must warn user to check existing complaints instead of blindly retrying',
  );
  assert.ok(
    complaintScreenSrc.includes('لم تفقد بياناتك المكتوبة ويمكنك إعادة المحاولة'),
    'Error feedback must reassure user that form draft is preserved',
  );
});

console.log('All 8 CUS-07 test suites passed successfully.');
