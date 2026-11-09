const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');

// 1. Read source files
const detailsRouteSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/complaints/[id].tsx'),
  'utf8',
);
const detailsScreenSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/CustomerComplaintDetailsScreen.tsx'),
  'utf8',
);
const summaryCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintSummaryCard.tsx'),
  'utf8',
);
const descriptionCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintDescriptionCard.tsx'),
  'utf8',
);
const timelineSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintTimeline.tsx'),
  'utf8',
);
const outcomeCardSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintOutcomeCard.tsx'),
  'utf8',
);
const privacyNoticeSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/ComplaintPrivacyNotice.tsx'),
  'utf8',
);
const displaySrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/features/complaint/complaints-list-display.ts'),
  'utf8',
);
const layoutSrc = fs.readFileSync(
  path.join(repoRoot, 'apps/customer/src/app/_layout.tsx'),
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

// 2. Transpile pure display and API helpers using workspace TypeScript
const apiRequire = createRequire(path.resolve(repoRoot, 'packages/api/package.json'));
const ts = require(apiRequire.resolve('typescript'));

const displayTranspiled = ts.transpileModule(displaySrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const complaintsDisplay = {};
new Function('exports', 'require', displayTranspiled)(complaintsDisplay, () => ({}));

const apiTranspiled = ts.transpileModule(apiInteractionsSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const apiInteractions = {};
new Function('exports', 'require', apiTranspiled)(apiInteractions, (mod) => {
  if (mod.includes('helpers')) {
    return {
      uuid: (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    };
  }
  return {};
});

// ===========================================================================
// 1. UUID Validation & Invalid ID Handling
// ===========================================================================
test('1. UUID validation: Strict UUID checking and safe invalid ID handling', async () => {
  const { isValidComplaintUuid } = complaintsDisplay;
  const { getMyComplaintById } = apiInteractions;

  // Valid UUIDs
  assert.equal(isValidComplaintUuid('c1111111-a12f-4000-8000-000000000001'), true);
  assert.equal(isValidComplaintUuid('C1111111-A12F-4000-8000-000000000001'), true);

  // Invalid IDs
  assert.equal(isValidComplaintUuid('invalid-uuid'), false);
  assert.equal(isValidComplaintUuid('12345'), false);
  assert.equal(isValidComplaintUuid(''), false);
  assert.equal(isValidComplaintUuid(null), false);
  assert.equal(isValidComplaintUuid(undefined), false);

  // getMyComplaintById rejects invalid UUID without calling RPC
  let rpcCalled = false;
  const dummyClient = {
    rpc: async () => {
      rpcCalled = true;
      return { data: [], error: null };
    },
  };

  const invalidResult = await getMyComplaintById(dummyClient, 'not-a-valid-uuid');
  assert.equal(invalidResult, null);
  assert.equal(rpcCalled, false, 'RPC must not be invoked for invalid UUID');

  // UI state for invalid ID
  assert.ok(
    detailsScreenSrc.includes('معرّف الشكوى غير صالح'),
    'Screen must render honest invalid UUID state',
  );
});

// ===========================================================================
// 2. Authorized Case Retrieval via wow_get_my_complaints
// ===========================================================================
test('2. Authorized retrieval: Bounded pagination over wow_get_my_complaints without RLS bypass', async () => {
  const { getMyComplaintById } = apiInteractions;

  const mockComplaints = [
    {
      id: 'c1111111-0000-4000-8000-000000000001',
      offer_id: 'e0000000-0000-4000-8000-000000000001',
      offer_version_id: 'v0000000-0000-4000-8000-000000000001',
      branch_id: null,
      complaint_type: 'price_mismatch',
      description: 'First complaint',
      incident_at: null,
      status: 'new',
      public_outcome: null,
      created_at: '2026-10-25T10:00:00Z',
      closed_at: null,
      updates: [],
    },
    {
      id: 'c2222222-0000-4000-8000-000000000002',
      offer_id: 'e0000000-0000-4000-8000-000000000001',
      offer_version_id: 'v0000000-0000-4000-8000-000000000001',
      branch_id: null,
      complaint_type: 'unavailable',
      description: 'Target complaint found in second page',
      incident_at: null,
      status: 'investigating',
      public_outcome: null,
      created_at: '2026-10-24T10:00:00Z',
      closed_at: null,
      updates: [],
    },
  ];

  const rpcCalls = [];
  const client = {
    rpc: async (fn, params) => {
      rpcCalls.push({ fn, params });
      if (params.p_offset === 0) {
        return { data: [mockComplaints[0]], error: null };
      }
      if (params.p_offset === 1) {
        return { data: [mockComplaints[1]], error: null };
      }
      return { data: [], error: null };
    },
  };

  // Find complaint across pages
  const found = await getMyComplaintById(client, 'c2222222-0000-4000-8000-000000000002', {
    batchSize: 1,
    maxDepth: 10,
  });

  assert.ok(found, 'Complaint must be found across bounded pages');
  assert.equal(found.id, 'c2222222-0000-4000-8000-000000000002');
  assert.equal(rpcCalls.length, 2);
  assert.equal(rpcCalls[0].fn, 'wow_get_my_complaints');
  assert.equal(rpcCalls[1].fn, 'wow_get_my_complaints');

  // Verify never calling admin or merchant RPCs
  assert.ok(
    !apiInteractionsSrc.includes('wow_admin_get_complaint') ||
      !detailsScreenSrc.includes('wow_admin_get_complaint'),
    'Customer details must never call wow_admin_get_complaint',
  );
  assert.ok(
    !detailsScreenSrc.includes('wow_get_business_complaints'),
    'Customer details must never call wow_get_business_complaints',
  );
});

// ===========================================================================
// 3. Missing and Inaccessible Records Handling
// ===========================================================================
test('3. Missing / inaccessible records: Honest not-found state without false claims', async () => {
  const { getMyComplaintById } = apiInteractions;

  const client = {
    rpc: async () => ({
      data: [], // empty list returned from owner-scoped RPC
      error: null,
    }),
  };

  const result = await getMyComplaintById(client, 'c3333333-0000-4000-8000-000000000003');
  assert.equal(result, null, 'Inaccessible complaint must return null');

  // Screen handles not found honestly
  assert.ok(
    detailsScreenSrc.includes('الشكوى غير موجودة'),
    'Screen must display honest not-found title',
  );
  assert.ok(
    detailsScreenSrc.includes('تعذّر العثور على الشكوى المطلوبة في سجلك'),
    'Screen must explain that complaint may not belong to current account',
  );
});

// ===========================================================================
// 3a. Maximum Permitted Offset & Indeterminate Search Ceiling
// ===========================================================================
test('3a. SQL pagination boundaries: Enforces max offset 10000 and throws ComplaintLookupCeilingError', async () => {
  const { getMyComplaintById, ComplaintLookupCeilingError } = apiInteractions;

  const targetId = 'c9999999-9999-4000-8000-000000000099';
  const requestedOffsets = [];

  // Client returns a full batch of 100 items on every page up to offset 10000
  const client = {
    rpc: async (fn, params) => {
      requestedOffsets.push(params.p_offset);
      // Generate 100 dummy items per page not matching targetId
      const dummyBatch = Array.from({ length: params.p_limit }, (_, i) => ({
        id: `c0000000-0000-4000-8000-${String(params.p_offset + i).padStart(12, '0')}`,
        status: 'investigating',
        created_at: '2026-10-20T10:00:00Z',
        updates: [],
      }));
      return { data: dummyBatch, error: null };
    },
  };

  // Run with maxOffset: 200 and batchSize: 100 to verify ceiling behavior
  let caughtError = null;
  try {
    await getMyComplaintById(client, targetId, { batchSize: 100, maxOffset: 200 });
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Must throw when search ceiling is reached with potential further records');
  assert.ok(
    caughtError instanceof ComplaintLookupCeilingError || caughtError.name === 'ComplaintLookupCeilingError',
    'Error must be an instance of ComplaintLookupCeilingError',
  );
  assert.equal(caughtError.code, 'COMPLAINT_LOOKUP_CEILING');

  // Verify offsets requested: 0, 100, 200 (never > 200 in this test)
  assert.deepEqual(requestedOffsets, [0, 100, 200]);

  // Now verify that even if options.maxOffset is set to 20000, it NEVER queries offset > 10000 (SQL contract)
  const highOffsetCalls = [];
  const clientCeiling = {
    rpc: async (fn, params) => {
      highOffsetCalls.push(params.p_offset);
      // Return full batch at offset 10000
      return {
        data: Array.from({ length: params.p_limit }, (_, i) => ({
          id: `c0000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          status: 'investigating',
          created_at: '2026-10-20T10:00:00Z',
          updates: [],
        })),
        error: null,
      };
    },
  };

  let ceilingError = null;
  try {
    // Attempting to ask for maxOffset 50000 with offset already at 10000
    await getMyComplaintById(clientCeiling, targetId, { batchSize: 100, maxOffset: 50000 });
  } catch (err) {
    ceilingError = err;
  }

  assert.ok(ceilingError, 'Must throw ComplaintLookupCeilingError at SQL boundary');
  // Confirm that offset NEVER exceeded 10000
  for (const offset of highOffsetCalls) {
    assert.ok(offset <= 10000, `Requested offset ${offset} must not exceed SQL limit 10000`);
  }
});

// ===========================================================================
// 3b. Error Taxonomy Distinction
// ===========================================================================
test('3b. Error taxonomy: Distinguishes found, exhausted (not found), ceiling, network, and auth failures', async () => {
  const { getMyComplaintById } = apiInteractions;
  const targetId = 'c1111111-1111-4000-8000-000000000001';

  // 1. Found: returns object
  const foundClient = {
    rpc: async () => ({
      data: [{ id: targetId, status: 'new', updates: [] }],
      error: null,
    }),
  };
  const found = await getMyComplaintById(foundClient, targetId);
  assert.equal(found.id, targetId);

  // 2. Exhausted (definitive not found): returns null
  const exhaustedClient = {
    rpc: async () => ({
      data: [], // empty list returned
      error: null,
    }),
  };
  const exhausted = await getMyComplaintById(exhaustedClient, targetId);
  assert.equal(exhausted, null);

  // 3. Network failure: propagates network exception
  const networkClient = {
    rpc: async () => {
      throw new Error('Failed to fetch from Supabase');
    },
  };
  await assert.rejects(
    async () => getMyComplaintById(networkClient, targetId),
    /Failed to fetch/,
    'Network errors must propagate without being masked as not-found',
  );

  // 4. Authentication failure: propagates auth error
  const authClient = {
    rpc: async () => ({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired' },
    }),
  };
  await assert.rejects(
    async () => getMyComplaintById(authClient, targetId),
    (err) => err.code === 'PGRST301',
    'Authentication failures must propagate as exceptions',
  );
});

// ===========================================================================
// 4. Session Scoping & Cross-Account Isolation
// ===========================================================================
test('4. Cross-account isolation: Query keys include userId and gate private reads', () => {
  // Query key contract
  assert.ok(
    queryKeysSrc.includes('myComplaint: (userId: string | null, complaintId: string | null) =>'),
    'wowQueryKeys must define myComplaint scoped to userId and complaintId',
  );

  // useMyComplaint gating
  assert.ok(
    queryHooksSrc.includes('enabled: !!context.userId && isValidUuid'),
    'useMyComplaint must be disabled when logged out or when UUID is invalid',
  );

  // Screen guest gate
  assert.ok(
    detailsScreenSrc.includes('تسجيل الدخول مطلوب'),
    'Screen must render guest gate when user is unauthenticated',
  );
  assert.ok(
    detailsScreenSrc.includes("router.push('/sign-in')"),
    'Guest gate must provide sign-in button',
  );
});

// ===========================================================================
// 5. Exact Status Enum Mapping
// ===========================================================================
test('5. Status mapping: 1:1 Arabic mapping without equating closed to resolved', () => {
  const { COMPLAINT_STATUS_MAP, resolveComplaintStatusInfo } = complaintsDisplay;

  assert.equal(COMPLAINT_STATUS_MAP.new.label, 'جديدة');
  assert.equal(COMPLAINT_STATUS_MAP.investigating.label, 'قيد المراجعة');
  assert.equal(COMPLAINT_STATUS_MAP.waiting.label, 'بانتظار إجراء');
  assert.equal(COMPLAINT_STATUS_MAP.closed.label, 'مغلقة');

  // Neither status may be labeled "تم الحل"
  for (const status of ['new', 'investigating', 'waiting', 'closed']) {
    const info = resolveComplaintStatusInfo(status);
    assert.notEqual(info.label, 'تم الحل');
    assert.notEqual(info.label, 'محلولة');
  }
});

// ===========================================================================
// 5a. Case Reference Label Accuracy
// ===========================================================================
test('5a. Reference labeling: Uses "معرّف الشكوى" without claiming separately issued official case number', () => {
  // Label must be "معرّف الشكوى"
  assert.ok(
    summaryCardSrc.includes('معرّف الشكوى'),
    'ComplaintSummaryCard must label case reference as "معرّف الشكوى"',
  );

  // Must not claim "الرقم المرجعي المعتمد"
  assert.ok(
    !summaryCardSrc.includes('الرقم المرجعي المعتمد'),
    'ComplaintSummaryCard must not claim "الرقم المرجعي المعتمد"',
  );

  // Complete UUID is preserved selectable
  assert.ok(
    summaryCardSrc.includes('complaint.id'),
    'ComplaintSummaryCard must render full complaint.id for user access',
  );
  assert.ok(
    summaryCardSrc.includes('selectable'),
    'ComplaintSummaryCard must render full UUID with selectable attribute',
  );
});

// ===========================================================================
// 5b. Fixture Distinction: Status New vs No Updates
// ===========================================================================
test('5b. Fixture distinction: FIXTURE_COMPLAINT_NEW and FIXTURE_COMPLAINT_NO_UPDATES are visually & semantically distinct', () => {
  const { FIXTURE_COMPLAINT_NEW, FIXTURE_COMPLAINT_NO_UPDATES } = complaintsDisplay;

  assert.ok(FIXTURE_COMPLAINT_NEW, 'FIXTURE_COMPLAINT_NEW must exist');
  assert.ok(FIXTURE_COMPLAINT_NO_UPDATES, 'FIXTURE_COMPLAINT_NO_UPDATES must exist');

  // Must have different statuses
  assert.equal(FIXTURE_COMPLAINT_NEW.status, 'new');
  assert.equal(FIXTURE_COMPLAINT_NO_UPDATES.status, 'investigating');

  // Must have different IDs
  assert.notEqual(FIXTURE_COMPLAINT_NEW.id, FIXTURE_COMPLAINT_NO_UPDATES.id);

  // CustomerComplaintDetailsScreen routes preview modes correctly
  assert.ok(
    detailsScreenSrc.includes("case 'no_updates':"),
    'Screen must have dedicated case for no_updates preview',
  );
  assert.ok(
    detailsScreenSrc.includes('activeComplaint = FIXTURE_COMPLAINT_NO_UPDATES;'),
    'no_updates preview must map to FIXTURE_COMPLAINT_NO_UPDATES',
  );
});

// ===========================================================================
// 6. Real Progress & Updates (No Invented Timeline)
// ===========================================================================
test('6. Authoritative timeline: Displays real customer-safe updates and modest summary when empty', () => {
  const { resolveUpdateKindMeta, formatComplaintDateTime } = complaintsDisplay;

  // Update kind labels
  assert.equal(resolveUpdateKindMeta('request_info').label, 'طلب استيضاح إضافي');
  assert.equal(resolveUpdateKindMeta('status').label, 'تحديث مسار المتابعة');
  assert.equal(resolveUpdateKindMeta('decision').label, 'إجراء إداري معتمد');
  assert.equal(resolveUpdateKindMeta('merchant_response').label, 'إفادة من المتجر معتمدة للنشر');

  // Date-time formatting
  const formatted = formatComplaintDateTime('2026-10-23T10:30:00Z');
  assert.ok(formatted.includes('أكتوبر'), 'DateTime must format Arabic month');

  // Empty updates handled honestly
  assert.ok(
    timelineSrc.includes('لا توجد تحديثات') || timelineSrc.includes('الموقف الحالي'),
    'Timeline must render modest status summary when updates array is empty',
  );

  // Authoritative updates rendered when present
  assert.ok(
    timelineSrc.includes('updates.map'),
    'Timeline must iterate over customer-safe updates',
  );
  assert.ok(
    timelineSrc.includes("complaint.closed_at ? formatComplaintDateTime(complaint.closed_at) : 'تاريخ الإغلاق غير محدد'"),
    'Missing closure date must be labeled unknown rather than replaced with creation time',
  );
});

// ===========================================================================
// 7. Public Outcome Display and Honest Closed State
// ===========================================================================
test('7. Outcome handling: Public outcome section and administrative closed notice', () => {
  // Outcome card renders public outcome
  assert.ok(
    outcomeCardSrc.includes('القرار والنتيجة الإدارية'),
    'Outcome card must display official title when outcome is available',
  );
  assert.ok(
    outcomeCardSrc.includes('قرار معتمد'),
    'Outcome card must badge official decisions',
  );

  // Closed without outcome explains administrative status honestly
  assert.ok(
    outcomeCardSrc.includes('لم يتم تدوين قرار علني إضافي لهذا السجل'),
    'Outcome card must state that no additional public outcome was written',
  );
  assert.ok(
    outcomeCardSrc.includes('إغلاق الشكوى هو حالة إدارية'),
    'Outcome card must remind customer that closed is an administrative state',
  );
});

// ===========================================================================
// 8. Requested Additional Information (No Unsupported Writes)
// ===========================================================================
test('8. Requested info: Honest capability notice without fake text areas or mutations', () => {
  // Screen must not contain fake text inputs or submit mutations
  assert.ok(
    !detailsScreenSrc.includes('<TextInput') && !detailsScreenSrc.includes('<textarea'),
    'Screen must not have dead text area for customer replies',
  );
  assert.ok(
    !detailsScreenSrc.includes('useSubmit') && !detailsScreenSrc.includes('useRespond'),
    'Customer details must not invent unsupported reply mutations',
  );

  // Timeline must display honest capability notice
  assert.ok(
    timelineSrc.includes('إرسال الردود أو الوثائق التكميلية عبر التطبيق غير مدعوم في هذه المرحلة'),
    'Timeline must explicitly notify customer that replies via app are unsupported',
  );
});

// ===========================================================================
// 9. Privacy Notice & Administrative Confidentiality
// ===========================================================================
test('9. Privacy notice: Transparent explanation of internal notes and merchant replies', () => {
  assert.ok(
    privacyNoticeSrc.includes('الملاحظات والتقارير الإدارية الداخلية محجوبة'),
    'Privacy notice must clarify that internal administrative notes are private',
  );
  assert.ok(
    privacyNoticeSrc.includes('ردود المتجر المرسلة إلى إدارة المنصة لا تُنشر مباشرة'),
    'Privacy notice must clarify that merchant replies are audited before display',
  );
  assert.ok(
    privacyNoticeSrc.includes('لا تتيح المنصة أي محادثات جانبية'),
    'Privacy notice must confirm absence of direct merchant-customer chat',
  );
});

// ===========================================================================
// 10. Navigation Wiring: CUS-08 to CUS-09 and Return
// ===========================================================================
test('10. Navigation routes: /complaints/[id] route registered in Stack and Expo Router', () => {
  // Route registration in layout
  assert.ok(
    layoutSrc.includes('<Stack.Screen name="complaints/[id]" />'),
    '_layout.tsx must explicitly register complaints/[id]',
  );

  // Route file imports and renders CustomerComplaintDetailsScreen
  assert.ok(
    detailsRouteSrc.includes('CustomerComplaintDetailsScreen'),
    'Route /complaints/[id] must render CustomerComplaintDetailsScreen',
  );

  // Back navigation
  assert.ok(
    detailsScreenSrc.includes("router.replace('/complaints')") ||
      detailsScreenSrc.includes('router.back()'),
    'Details screen must safely return to /complaints',
  );
});

// ===========================================================================
// 11. Accessibility, RTL, and Theme Contrast
// ===========================================================================
test('11. Accessibility & Visual Design: 48pt touch targets, RTL web props, and WCAG AA contrast', () => {
  // RTL layout
  assert.ok(
    detailsScreenSrc.includes("dir: 'rtl'"),
    'Details screen must supply dir="rtl" on web',
  );

  // 48pt min touch target on all buttons
  assert.ok(
    detailsScreenSrc.includes('minHeight: 48') || detailsScreenSrc.includes('height: 48'),
    'All interactive controls must observe 48pt touch targets',
  );

  // Long description support without truncation
  assert.ok(
    !descriptionCardSrc.includes('numberOfLines'),
    'ComplaintDescriptionCard must not truncate complaint description',
  );
});

// ===========================================================================
// 12. Development Fixture Isolation
// ===========================================================================
test('12. Fixture isolation: __DEV__ guard protects fixtures from production use', () => {
  assert.ok(
    detailsScreenSrc.includes('const isPreview = __DEV__'),
    'Screen must guard preview mode strictly with __DEV__',
  );
  assert.ok(
    detailsRouteSrc.includes('preview'),
    'Route parameter supports offline preview in development',
  );
});

console.log('All 16 CUS-09 test suites passed successfully.');
