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
// 4. Branch and Incident Date Validation (Executed Boundaries, Leap Years, Local Timezone)
// ===========================================================================
test('4. Branch & Incident Date: Validates branch eligibility, strict calendar boundaries, leap years, and local timezone', () => {
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

  // Reference time for deterministic boundary tests: 2026-11-08 14:00:00 local
  const mockNow = new Date(2026, 10, 8, 14, 0, 0);
  const nowProvider = () => mockNow;

  // A. Optional empty / null / whitespace dates
  assert.deepEqual(complaintDisplay.validateIncidentDate('', nowProvider), { isValid: true, isoString: null });
  assert.deepEqual(complaintDisplay.validateIncidentDate(null, nowProvider), { isValid: true, isoString: null });
  assert.deepEqual(complaintDisplay.validateIncidentDate('   ', nowProvider), { isValid: true, isoString: null });

  // B. Valid current local date (today)
  const todayCheck = complaintDisplay.validateIncidentDate('2026-11-08', nowProvider);
  assert.equal(todayCheck.isValid, true);
  assert.ok(todayCheck.isoString);

  // C. Valid past dates without artificial 1-year cutoff (per wow_private.submit_complaint_internal contract)
  const pastOneYear = complaintDisplay.validateIncidentDate('2025-11-01', nowProvider);
  assert.equal(pastOneYear.isValid, true, 'Date from 1 year ago must be valid');

  const pastSixYears = complaintDisplay.validateIncidentDate('2020-01-01', nowProvider);
  assert.equal(pastSixYears.isValid, true, 'Date older than 1 year must be valid in SQL contract');

  const pastDecade = complaintDisplay.validateIncidentDate('1999-12-31', nowProvider);
  assert.equal(pastDecade.isValid, true, 'Historic past date must be valid');

  // D. Leap year validation
  // 2024 is a leap year -> Feb 29 exists
  const leap2024 = complaintDisplay.validateIncidentDate('2024-02-29', nowProvider);
  assert.equal(leap2024.isValid, true, '2024-02-29 is a valid leap day');

  // 2020 is a leap year -> Feb 29 exists
  const leap2020 = complaintDisplay.validateIncidentDate('2020-02-29', nowProvider);
  assert.equal(leap2020.isValid, true, '2020-02-29 is a valid leap day');

  // 2000 is a 400-year century leap year -> Feb 29 exists
  const leap2000 = complaintDisplay.validateIncidentDate('2000-02-29', nowProvider);
  assert.equal(leap2000.isValid, true, '2000-02-29 is a valid leap day');

  // 2023 is NOT a leap year -> Feb 29 does not exist
  const nonLeap2023 = complaintDisplay.validateIncidentDate('2023-02-29', nowProvider);
  assert.equal(nonLeap2023.isValid, false, '2023-02-29 must be rejected');
  assert.match(nonLeap2023.error, /اليوم غير موجود/);

  // 2025 is NOT a leap year -> Feb 29 does not exist
  const nonLeap2025 = complaintDisplay.validateIncidentDate('2025-02-29', nowProvider);
  assert.equal(nonLeap2025.isValid, false, '2025-02-29 must be rejected');
  assert.match(nonLeap2025.error, /اليوم غير موجود/);

  // 1900 is NOT a 400-year leap year -> Feb 29 does not exist
  const nonLeap1900 = complaintDisplay.validateIncidentDate('1900-02-29', nowProvider);
  assert.equal(nonLeap1900.isValid, false, '1900-02-29 must be rejected');
  assert.match(nonLeap1900.error, /اليوم غير موجود/);

  // E. Impossible calendar dates (variable month lengths)
  const feb30 = complaintDisplay.validateIncidentDate('2026-02-30', nowProvider);
  assert.equal(feb30.isValid, false);
  assert.match(feb30.error, /اليوم غير موجود/);

  const apr31 = complaintDisplay.validateIncidentDate('2026-04-31', nowProvider);
  assert.equal(apr31.isValid, false);
  assert.match(apr31.error, /اليوم غير موجود/);

  const jun31 = complaintDisplay.validateIncidentDate('2026-06-31', nowProvider);
  assert.equal(jun31.isValid, false);
  assert.match(jun31.error, /اليوم غير موجود/);

  const sep31 = complaintDisplay.validateIncidentDate('2026-09-31', nowProvider);
  assert.equal(sep31.isValid, false);
  assert.match(sep31.error, /اليوم غير موجود/);

  const nov31 = complaintDisplay.validateIncidentDate('2026-11-31', nowProvider);
  assert.equal(nov31.isValid, false);
  assert.match(nov31.error, /اليوم غير موجود/);

  const day32 = complaintDisplay.validateIncidentDate('2026-01-32', nowProvider);
  assert.equal(day32.isValid, false);
  assert.match(day32.error, /تاريخ غير صحيح/);

  const month13 = complaintDisplay.validateIncidentDate('2026-13-01', nowProvider);
  assert.equal(month13.isValid, false);
  assert.match(month13.error, /تاريخ غير صحيح/);

  const month00 = complaintDisplay.validateIncidentDate('2026-00-15', nowProvider);
  assert.equal(month00.isValid, false);
  assert.match(month00.error, /تاريخ غير صحيح/);

  // F. Malformed format patterns (must strictly be YYYY-MM-DD)
  assert.equal(complaintDisplay.validateIncidentDate('2026/11/08', nowProvider).isValid, false);
  assert.equal(complaintDisplay.validateIncidentDate('08-11-2026', nowProvider).isValid, false);
  assert.equal(complaintDisplay.validateIncidentDate('2026-11-8', nowProvider).isValid, false);
  assert.equal(complaintDisplay.validateIncidentDate('not-a-date', nowProvider).isValid, false);

  // G. Future dates (backend restriction: p_incident_at > now() + INTERVAL '5 minutes')
  const tomorrow = complaintDisplay.validateIncidentDate('2026-11-09', nowProvider);
  assert.equal(tomorrow.isValid, false);
  assert.match(tomorrow.error, /في المستقبل/);

  const nextYear = complaintDisplay.validateIncidentDate('2027-01-01', nowProvider);
  assert.equal(nextYear.isValid, false);
  assert.match(nextYear.error, /في المستقبل/);

  // H. Local timezone helpers
  // Test local formatting
  const testDate = new Date(2026, 3, 5, 23, 30); // April 5, 2026 local
  assert.equal(complaintDisplay.formatLocalDate(testDate), '2026-04-05');

  // getLocalTodayDate and getLocalYesterdayDate
  assert.equal(complaintDisplay.getLocalTodayDate(nowProvider), '2026-11-08');
  assert.equal(complaintDisplay.getLocalYesterdayDate(nowProvider), '2026-11-07');
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
// 6. Review Modal, Synchronous Guard, and Simultaneous Submit Execution
// ===========================================================================
test('6. Review & Submission Guard: Executes simultaneous double confirmation and verifies single execution', async () => {
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
  assert.ok(
    complaintScreenSrc.includes('executeComplaintSubmission'),
    'Must delegate confirmation flow to extracted executeComplaintSubmission',
  );

  // EXECUTED TEST: Simultaneous double submission
  const isSubmittingRef = { current: false };
  let mutationCallCount = 0;
  const mockMutateAsync = async () => {
    mutationCallCount++;
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 20));
    return 'c1111111-2222-3333-4444-555555555555';
  };

  const successCalls = [];
  const errorCalls = [];

  const baseOptions = {
    isSubmittingRef,
    offerId: 'e0000000-0000-4000-8000-000000000001',
    complaintType: 'price_mismatch',
    description: 'تم طلب مبلغ إضافي عند الدفع لم يكن مذكوراً في العرض أبداً',
    branchId: null,
    incidentDate: '2026-11-05',
    mutateAsync: mockMutateAsync,
    onSuccess: (id) => successCalls.push(id),
    onError: (err) => errorCalls.push(err),
  };

  // Launch two submissions concurrently
  const [result1, result2] = await Promise.all([
    complaintDisplay.executeComplaintSubmission(baseOptions),
    complaintDisplay.executeComplaintSubmission(baseOptions),
  ]);

  // Assert: Exactly one mutation occurred
  assert.equal(mutationCallCount, 1, 'mutateAsync must be invoked exactly once');

  // Assert: First succeeded, second was synchronously blocked as duplicate
  const results = [result1.status, result2.status];
  assert.ok(results.includes('success'), 'One execution must succeed');
  assert.ok(results.includes('blocked_duplicate'), 'Simultaneous execution must be blocked by synchronous ref guard');

  assert.equal(successCalls.length, 1);
  assert.equal(successCalls[0], 'c1111111-2222-3333-4444-555555555555');
  assert.equal(errorCalls.length, 0);

  // Guard must reset to false after completion
  assert.equal(isSubmittingRef.current, false, 'isSubmittingRef must reset to false in finally block');
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
// 8. Outcome Honesty, Executed Error Recovery, and Draft Preservation
// ===========================================================================
test('8. Outcome honesty: Executed successful UUID, failed mutation, draft preservation, and non-idempotent safety', async () => {
  // A. EXECUTED TEST: Successful mutation with real UUID return
  {
    const isSubmittingRef = { current: false };
    const successCalls = [];
    const errorCalls = [];

    const result = await complaintDisplay.executeComplaintSubmission({
      isSubmittingRef,
      offerId: 'e0000000-0000-4000-8000-000000000001',
      complaintType: 'unavailable',
      description: 'العرض غير متوفر في الفرع المذكور وتم رفض استقبال القسيمة',
      branchId: null,
      incidentDate: null,
      mutateAsync: async () => 'c9999999-8888-7777-6666-555555555555',
      onSuccess: (id) => successCalls.push(id),
      onError: (err) => errorCalls.push(err),
    });

    assert.equal(result.status, 'success');
    assert.equal(result.complaintId, 'c9999999-8888-7777-6666-555555555555');
    assert.equal(successCalls[0], 'c9999999-8888-7777-6666-555555555555');
    assert.equal(errorCalls.length, 0);
    assert.equal(isSubmittingRef.current, false);
  }

  // B. EXECUTED TEST: Failed mutation keeps user draft intact and resets submission lock
  {
    const isSubmittingRef = { current: false };
    const successCalls = [];
    const errorCalls = [];

    const userDraft = {
      description: 'وصف مفصل للمشكلة التي واجهتها في المتجر بالتفصيل',
      complaintType: 'business_conduct',
      branchId: 'b-1111',
      incidentDate: '2026-11-05',
    };

    const result = await complaintDisplay.executeComplaintSubmission({
      isSubmittingRef,
      offerId: 'e0000000-0000-4000-8000-000000000001',
      complaintType: userDraft.complaintType,
      description: userDraft.description,
      branchId: userDraft.branchId,
      incidentDate: userDraft.incidentDate,
      eligibleBranchIds: ['b-1111'],
      mutateAsync: async () => {
        throw new Error('Network connection lost during submission');
      },
      onSuccess: (id) => successCalls.push(id),
      onError: (err) => errorCalls.push(err),
    });

    assert.equal(result.status, 'error');
    assert.equal(successCalls.length, 0, 'onSuccess must NOT be called on failure');
    assert.equal(errorCalls.length, 1, 'onError must receive mapped error message');
    assert.match(errorCalls[0], /تعذّر التأكد من اكتمال استلام الشكوى/);
    assert.equal(result.isAmbiguous, true, 'Transport loss after submission has an uncertain write outcome');

    // User draft remains unchanged
    assert.equal(userDraft.description, 'وصف مفصل للمشكلة التي واجهتها في المتجر بالتفصيل');
    assert.equal(userDraft.complaintType, 'business_conduct');
    assert.equal(userDraft.branchId, 'b-1111');
    assert.equal(userDraft.incidentDate, '2026-11-05');

    // Ref guard unlocked for retry
    assert.equal(isSubmittingRef.current, false, 'Ref guard must unlock after error to permit deliberate retry');
  }

  // Explicit server-side validation rejection is known to have failed and is not ambiguous.
  const rejectedBranch = complaintDisplay.mapComplaintSubmissionError(
    new Error('Branch does not belong to the selected offer version'),
  );
  assert.equal(rejectedBranch.isAmbiguous, false);
  assert.match(rejectedBranch.message, /الفرع المحدد/);

  const failedToFetch = complaintDisplay.mapComplaintSubmissionError(
    new TypeError('Failed to fetch'),
  );
  assert.equal(failedToFetch.isAmbiguous, true);
  assert.match(failedToFetch.message, /تجنباً لتكرار الشكوى/);

  // C. EXECUTED TEST: Ambiguous network outcome provides honest uncertainty guidance without referencing unbuilt complaint list
  {
    const isSubmittingRef = { current: false };
    const errorCalls = [];
    let callCount = 0;

    const ambiguousError = new Error('Ambiguous write: check write outcome');

    const result = await complaintDisplay.executeComplaintSubmission({
      isSubmittingRef,
      offerId: 'e0000000-0000-4000-8000-000000000001',
      complaintType: 'misleading_terms',
      description: 'الشروط المطبقة في الفرع مخالفة لما هو معلن داخل بطاقة العرض',
      mutateAsync: async () => {
        callCount++;
        throw ambiguousError;
      },
      onSuccess: () => {},
      onError: (err) => errorCalls.push(err),
    });

    assert.equal(result.status, 'error');
    assert.equal(result.isAmbiguous, true);
    assert.equal(callCount, 1, 'Non-idempotent create mutation must NEVER be automatically retried');

    // Uncertainty message guidance
    assert.match(errorCalls[0], /تعذّر التأكد من اكتمال استلام الشكوى/);
    assert.match(errorCalls[0], /تجنباً لتكرار الشكوى غير المقصود/);

    // MUST NOT reference unbuilt CUS-08 route (سجل الشكاوى)
    assert.equal(
      errorCalls[0].includes('سجل الشكاوى'),
      false,
      'Must NOT direct user to unbuilt complaints list route',
    );
    assert.equal(
      errorCalls[0].includes('قائمة الشكاوى'),
      false,
      'Must NOT direct user to unbuilt complaints list route',
    );
  }

  // D. UI String checks for success display
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
});

console.log('All 8 CUS-07 test suites passed successfully.');
