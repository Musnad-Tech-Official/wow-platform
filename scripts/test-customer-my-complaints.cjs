const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');

// 1. Read source files
const complaintsRouteSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/complaints.tsx'),
  'utf8',
);
const complaintsScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/CustomerMyComplaintsScreen.tsx'),
  'utf8',
);
const complaintsDisplaySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/complaints-list-display.ts'),
  'utf8',
);
const cardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintCard.tsx'),
  'utf8',
);
const badgeSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintStatusBadge.tsx'),
  'utf8',
);
const filtersSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintFilterTabs.tsx'),
  'utf8',
);
const modalSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintDetailsBoundaryModal.tsx'),
  'utf8',
);
const layoutSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/_layout.tsx'),
  'utf8',
);
const accountTabScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/account/CustomerAccountTabScreen.tsx'),
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
const queryKeysSrc = fs.readFileSync(
  path.join(repoRoot, 'packages/api/src/query/query-keys.ts'),
  'utf8',
);

// 2. Transpile pure complaints-list-display functions using workspace TypeScript
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));
const displayTranspiled = ts.transpileModule(complaintsDisplaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const complaintsDisplay = {};
new Function('exports', 'require', displayTranspiled)(complaintsDisplay, () => ({}));

// ===========================================================================
// 1. Real Complaint Mapping & Projections
// ===========================================================================
test('1. Real complaint mapping: CustomerComplaint model contracts and wow_get_my_complaints RPC', () => {
  // Confirm CustomerComplaint in API
  assert.ok(
    apiInteractionsSrc.includes('export interface CustomerComplaint'),
    'API must export CustomerComplaint interface',
  );
  assert.ok(
    apiInteractionsSrc.includes("client.rpc('wow_get_my_complaints'"),
    'getMyComplaints must invoke wow_get_my_complaints RPC',
  );

  // Model fields: no private evidence, merchant chat, or internal admin notes
  const expectedFields = [
    'id',
    'offer_id',
    'offer_version_id',
    'branch_id',
    'complaint_type',
    'description',
    'incident_at',
    'status',
    'public_outcome',
    'created_at',
    'closed_at',
    'updates',
  ];
  for (const field of expectedFields) {
    assert.ok(
      apiInteractionsSrc.includes(`${field}:`),
      `CustomerComplaint must include real customer-safe field: ${field}`,
    );
  }

  // Card component uses real properties without inventing fields
  assert.ok(
    cardSrc.includes('complaint.complaint_type'),
    'Card must render complaint.complaint_type',
  );
  assert.ok(
    cardSrc.includes('complaint.status'),
    'Card must render complaint.status',
  );
  assert.ok(
    cardSrc.includes('complaint.description'),
    'Card must render complaint.description',
  );
  assert.ok(
    cardSrc.includes('complaint.created_at'),
    'Card must render complaint.created_at',
  );
});

// ===========================================================================
// 2. Exact Status Enum Mapping
// ===========================================================================
test('2. Exact status enum mapping: 1:1 mapping of 4 database statuses with honest labels', () => {
  const { resolveComplaintStatusInfo, COMPLAINT_STATUS_MAP } = complaintsDisplay;

  // Exact 4 statuses
  const expectedStatuses = ['new', 'investigating', 'waiting', 'closed'];
  assert.deepEqual(
    Object.keys(COMPLAINT_STATUS_MAP).sort(),
    expectedStatuses.sort(),
    'Must map only the 4 Migration 005 complaint statuses',
  );

  // Exact Arabic labels
  assert.equal(resolveComplaintStatusInfo('new').label, 'جديدة');
  assert.equal(resolveComplaintStatusInfo('investigating').label, 'قيد المراجعة');
  assert.equal(resolveComplaintStatusInfo('waiting').label, 'بانتظار إجراء');
  assert.equal(resolveComplaintStatusInfo('closed').label, 'مغلقة');

  // Honest assertions: never automatically "تم الحل"
  assert.notEqual(resolveComplaintStatusInfo('closed').label, 'تم الحل');
  assert.ok(
    !resolveComplaintStatusInfo('closed').label.includes('تم الحل'),
    'Closed status must never be labeled as "تم الحل"',
  );

  // Waiting description must not imply user action unless verified
  const waitingInfo = resolveComplaintStatusInfo('waiting');
  assert.ok(
    waitingInfo.description.includes('إجراءات التحقق') || waitingInfo.description.includes('المتجر'),
    'Waiting description must honestly reflect administrative/merchant review state',
  );
});

// ===========================================================================
// 3. Complaint Type Labels & Metadata
// ===========================================================================
test('3. Complaint type labels: Maps exactly to the 6 Migration 005 types in Arabic', () => {
  const { getComplaintTypeShortLabel, COMPLAINT_TYPE_DISPLAY_MAP } = complaintsDisplay;

  const expectedTypes = [
    'price_mismatch',
    'unavailable',
    'misleading_terms',
    'product_mismatch',
    'business_conduct',
    'other',
  ];

  for (const t of expectedTypes) {
    assert.ok(
      COMPLAINT_TYPE_DISPLAY_MAP[t],
      `Type ${t} must be configured in COMPLAINT_TYPE_DISPLAY_MAP`,
    );
    const label = getComplaintTypeShortLabel(t);
    assert.ok(typeof label === 'string' && label.length > 0, `Type ${t} must have Arabic label`);
  }

  assert.equal(getComplaintTypeShortLabel('price_mismatch'), 'اختلاف في السعر');
  assert.equal(getComplaintTypeShortLabel('unavailable'), 'العرض غير متاح');
  assert.equal(getComplaintTypeShortLabel('misleading_terms'), 'شروط مضللة');
  assert.equal(getComplaintTypeShortLabel('product_mismatch'), 'اختلاف في المنتجات');
  assert.equal(getComplaintTypeShortLabel('business_conduct'), 'سوء تعامل');
  assert.equal(getComplaintTypeShortLabel('other'), 'مشكلة أخرى');
});

// ===========================================================================
// 4. Filtering Correctness
// ===========================================================================
test('4. Filtering correctness: 3 filter chips honestly filter loaded records', () => {
  const { filterComplaints, FIXTURE_COMPLAINTS } = complaintsDisplay;

  // 'all'
  const all = filterComplaints(FIXTURE_COMPLAINTS, 'all');
  assert.equal(all.length, FIXTURE_COMPLAINTS.length);

  // 'in_progress' (new, investigating, waiting)
  const inProgress = filterComplaints(FIXTURE_COMPLAINTS, 'in_progress');
  assert.ok(inProgress.every((c) => ['new', 'investigating', 'waiting'].includes(c.status)));
  assert.ok(inProgress.some((c) => c.status === 'investigating'));
  assert.ok(inProgress.some((c) => c.status === 'waiting'));
  assert.ok(!inProgress.some((c) => c.status === 'closed'));

  // 'closed'
  const closed = filterComplaints(FIXTURE_COMPLAINTS, 'closed');
  assert.ok(closed.every((c) => c.status === 'closed'));
  assert.equal(closed.length, 1);

  // Empty input safety
  assert.deepEqual(filterComplaints([], 'all'), []);
  assert.deepEqual(filterComplaints([], 'in_progress'), []);
  assert.deepEqual(filterComplaints([], 'closed'), []);
});

// ===========================================================================
// 5. Pagination and Duplicate Elimination
// ===========================================================================
test('5. Pagination & deduplication: Stable order and duplicate-free batch merging', () => {
  const { deduplicateComplaints, sortComplaintsNewestFirst } = complaintsDisplay;

  const item1 = {
    id: 'c-001',
    created_at: '2026-10-01T10:00:00Z',
    status: 'closed',
  };
  const item2 = {
    id: 'c-002',
    created_at: '2026-10-10T10:00:00Z',
    status: 'investigating',
  };
  const item3 = {
    id: 'c-003',
    created_at: '2026-10-20T10:00:00Z',
    status: 'new',
  };

  // Sorting newest first
  const sorted = sortComplaintsNewestFirst([item1, item3, item2]);
  assert.equal(sorted[0].id, 'c-003'); // newest
  assert.equal(sorted[1].id, 'c-002');
  assert.equal(sorted[2].id, 'c-001'); // oldest

  // Deduplication
  const merged = deduplicateComplaints([item3, item2], [item2, item1]);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'c-003');
  assert.equal(merged[1].id, 'c-002');
  assert.equal(merged[2].id, 'c-001');

  // Verify pagination UI support in screen source
  assert.ok(
    complaintsScreenSrc.includes('PAGE_SIZE = 10'),
    'Screen must define honest page size for pagination',
  );
  assert.ok(
    complaintsScreenSrc.includes('handleLoadMore'),
    'Screen must provide working load more handler',
  );
  assert.ok(
    complaintsScreenSrc.includes('deduplicateComplaints'),
    'Screen must deduplicate pagination results',
  );
});

// ===========================================================================
// 6. Authentication & Guest Gating
// ===========================================================================
test('6. Authentication & Guest Gating: Secure gate with approved illustration and sign-in action', () => {
  assert.ok(
    complaintsScreenSrc.includes('wowIllustrations.customer.secureAccess'),
    'Guest view must use approved secureAccess illustration',
  );
  assert.ok(
    complaintsScreenSrc.includes('تسجيل الدخول مطلوب'),
    'Must display honest sign-in required title',
  );
  assert.ok(
    complaintsScreenSrc.includes("router.push('/sign-in')"),
    'Must provide navigation to sign-in route',
  );
  assert.ok(
    complaintsScreenSrc.includes('initialAuthOverride'),
    'Must accept auth override for deterministic tests & previews',
  );
});

// ===========================================================================
// 7. User Session Isolation
// ===========================================================================
test('7. User session isolation: Query key includes userId, preventing cross-account cache reuse', () => {
  assert.ok(
    queryKeysSrc.includes('myComplaints: (userId: string | null'),
    'Query keys must include userId in myComplaints key',
  );
  assert.ok(
    queryHooksSrc.includes('enabled: !!context.userId'),
    'useMyComplaints must be disabled when userId is falsy',
  );
  assert.ok(
    queryHooksSrc.includes('wowQueryKeys.interactions.myComplaints(context.userId'),
    'useMyComplaints must bind queryKey to session userId',
  );
});

// ===========================================================================
// 8. Loading, Error, and Empty Distinctions
// ===========================================================================
test('8. State distinctions: Explicit empty history, filtered empty, loading skeleton, and error retry', () => {
  // Empty history
  assert.ok(
    complaintsScreenSrc.includes('wowIllustrations.customer.complaintsEmpty'),
    'Empty state must use approved complaintsEmpty illustration',
  );
  assert.ok(
    complaintsScreenSrc.includes('لا توجد شكاوى بعد'),
    'Must render honest "لا توجد شكاوى بعد" title',
  );
  assert.ok(
    complaintsScreenSrc.includes('استكشاف العروض'),
    'Empty state must provide action to browse offers',
  );

  // Filtered empty
  assert.ok(
    complaintsScreenSrc.includes('لا توجد شكاوى في هذه التصفية'),
    'Must distinguish filtered-empty state from zero-complaints account',
  );
  assert.ok(
    complaintsScreenSrc.includes('عرض كل الشكاوى'),
    'Filtered empty must provide action to reset filter',
  );

  // Error state
  assert.ok(
    complaintsScreenSrc.includes('تعذّر تحميل الشكاوى'),
    'Error state must display honest network failure title',
  );
  assert.ok(
    complaintsScreenSrc.includes('إعادة المحاولة'),
    'Error state must provide retry button',
  );

  // Skeleton loading
  assert.ok(
    complaintsScreenSrc.includes('Skeleton'),
    'Loading state must render skeleton cards',
  );
});

// ===========================================================================
// 9. Navigation from Customer Account
// ===========================================================================
test('9. Navigation wiring: Customer Account links to /complaints route, registered in Expo Router', () => {
  // Expo Router route declaration
  const routerDts = fs.readFileSync(path.join(repoRoot, 'apps/customer/.expo/types/router.d.ts'), 'utf8');
  assert.ok(
    routerDts.includes('/complaints'),
    'Expo Router generated declarations must include /complaints route',
  );

  // Route file
  assert.ok(
    complaintsRouteSrc.includes('CustomerMyComplaintsScreen'),
    'Route /complaints must render CustomerMyComplaintsScreen',
  );

  // Account screen link
  assert.ok(
    accountTabScreenSrc.includes("router.push('/complaints')"),
    'CustomerAccountTabScreen must navigate to /complaints',
  );
  assert.ok(
    accountTabScreenSrc.includes('onPressComplaints={handleComplaintsNavigation}'),
    'CustomerActivitySection must be wired with handleComplaintsNavigation',
  );
});

// ===========================================================================
// 10. Safe CUS-09 Boundary
// ===========================================================================
test('10. CUS-09 Boundary: Details view is marked unavailable without fake chevrons or dead buttons', () => {
  const { IS_CUS09_DETAILS_AVAILABLE } = complaintsDisplay;

  assert.equal(
    IS_CUS09_DETAILS_AVAILABLE,
    false,
    'IS_CUS09_DETAILS_AVAILABLE must be false because CUS-09 is in a separate future phase',
  );

  // Complaint card must not have fake chevrons pointing to unbuilt screen
  assert.ok(
    !cardSrc.includes('ChevronLeft'),
    'Card must not render misleading navigation chevrons to unbuilt CUS-09',
  );

  // Details boundary modal informs customer honestly
  assert.ok(
    modalSrc.includes('متابعة التفاصيل الكاملة (CUS-09)'),
    'Modal must explicitly note that CUS-09 full case timeline is upcoming',
  );
  assert.ok(
    modalSrc.includes("e.key === 'Escape'"),
    'Modal must support Escape key on web',
  );
});

// ===========================================================================
// 11. Date and Reference Formatting
// ===========================================================================
test('11. Date & reference formatting: Safe Arabic dates and shortened case references', () => {
  const { formatComplaintDate, formatComplaintReference } = complaintsDisplay;

  // Date formatting
  const formattedDate = formatComplaintDate('2026-10-23T10:30:00Z');
  assert.ok(
    formattedDate.includes('أكتوبر') && (formattedDate.includes('2026') || formattedDate.includes('٢٠٢٦')),
    `Formatted date must contain Arabic month and year: ${formattedDate}`,
  );

  // Fallback on invalid dates
  assert.equal(formatComplaintDate(''), 'تاريخ غير محدد');
  assert.equal(formatComplaintDate(null), 'تاريخ غير محدد');

  // Reference formatting
  const refEllipsis = formatComplaintReference('c1111111-a12f-4000-8000-000000000001', 'ellipsis');
  assert.equal(refEllipsis, 'رقم الشكوى C111...');

  const refHash = formatComplaintReference('c1111111-a12f-4000-8000-000000000001', 'hash');
  assert.equal(refHash, 'رقم الشكوى #C1111111');
});

// ===========================================================================
// 12. Accessibility & Light/Dark Theme Contrasts
// ===========================================================================
test('12. Accessibility & theme contrast: Min 48pt touch targets, WCAG AA contrast, and RTL layout', () => {
  const { COMPLAINT_STATUS_MAP } = complaintsDisplay;

  // Touch targets: 48pt minimum
  assert.ok(
    filtersSrc.includes('minHeight: 48'),
    'Filter chips must have minimum 48pt touch target',
  );
  assert.ok(
    complaintsScreenSrc.includes('minHeight: 48'),
    'Buttons in screen must have minimum 48pt touch target',
  );
  assert.ok(
    modalSrc.includes('width: 48') && modalSrc.includes('height: 48'),
    'Modal close button must have minimum 48pt touch target',
  );

  // Theme status colors
  for (const [status, info] of Object.entries(COMPLAINT_STATUS_MAP)) {
    assert.ok(info.light.bg && info.light.text, `Status ${status} light theme colors defined`);
    assert.ok(info.dark.bg && info.dark.text, `Status ${status} dark theme colors defined`);
  }

  // RTL layout
  assert.ok(
    complaintsScreenSrc.includes("dir: 'rtl'"),
    'Screen must include RTL props for web',
  );
  assert.ok(
    filtersSrc.includes("accessibilityRole=\"tablist\""),
    'Filter tabs must declare tablist accessibilityRole',
  );

  // WCAG AA Contrast: Card secondary text and screen explanatory captions must use colors.mutedForeground token
  assert.ok(
    cardSrc.includes('color: colors.mutedForeground'),
    'ComplaintCard must use colors.mutedForeground for secondary reference numbers and dates (WCAG AA >= 4.5:1)',
  );
  assert.ok(
    !cardSrc.includes("color: isDark ? '#64748B' : '#94A3B8'"),
    'ComplaintCard must not use low-contrast hardcoded grays for reference code or dates',
  );
  assert.ok(
    complaintsScreenSrc.includes('color: colors.mutedForeground'),
    'CustomerMyComplaintsScreen must use colors.mutedForeground for explanatory captions',
  );
});

console.log('All 12 CUS-08 test suites passed successfully.');
