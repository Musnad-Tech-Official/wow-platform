'use strict';
// MUSNAD-WOW — CUS-01 Live Supabase Discovery Integration Tests
// Verifies live mapping, authorized RPCs, security boundaries, and honest empty states.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, symlinkSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { createRequire } = require('node:module');

const apiRequire = createRequire(path.resolve(root, 'packages/api/package.json'));
const output = mkdtempSync(path.resolve(tmpdir(), 'wow-discovery-test-'));
execFileSync(
  process.execPath,
  [
    apiRequire.resolve('typescript/lib/tsc.js'),
    '--target', 'ES2022',
    '--module', 'Node16',
    '--moduleResolution', 'Node16',
    '--ignoreDeprecations', '6.0',
    '--skipLibCheck',
    '--strict',
    '--jsx', 'react-jsx',
    '--outDir', output,
    '--rootDir', 'packages/api/src',
    'packages/api/src/index.ts',
  ],
  { cwd: root, stdio: 'inherit' },
);
symlinkSync(
  path.resolve(root, 'packages/api/node_modules'),
  path.resolve(output, 'node_modules'),
  process.platform === 'win32' ? 'junction' : 'dir',
);

// Read source files to verify contracts & no direct raw table reads
const homeScreenSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/home/CustomerHomeScreen.tsx'),
  'utf8',
);
const homeDataSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/home/home-data.ts'),
  'utf8',
);
const merchantCardSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/home/MerchantGridCard.tsx'),
  'utf8',
);
const offerMediaImageSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/home/OfferMediaImage.tsx'),
  'utf8',
);
const regionSheetSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/home/RegionSelectorSheet.tsx'),
  'utf8',
);
const discoverRouteSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/app/discover/index.tsx'),
  'utf8',
);
const discoverScreenSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/discovery/CustomerDiscoverScreen.tsx'),
  'utf8',
);
const discoveryDataSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/discovery/discovery-data.ts'),
  'utf8',
);
const searchMerchantCardSrc = fs.readFileSync(
  path.join(root, 'apps/customer/src/features/discovery/SearchMerchantCard.tsx'),
  'utf8',
);

const ts = require(apiRequire.resolve('typescript'));
const homeDataTranspiled = ts.transpileModule(homeDataSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const homeData = {};
new Function('exports', 'require', homeDataTranspiled)(homeData, (req) =>
  req === '@wow/api' ? {} : require(req),
);

const discoveryDataTranspiled = ts.transpileModule(discoveryDataSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const discoveryData = {};
new Function('exports', 'require', discoveryDataTranspiled)(discoveryData, (req) => {
  if (req === '@wow/api') return {};
  if (req.includes('home-data')) return homeData;
  return require(req);
});

const { Module } = require('node:module');

const native = {
  Platform: { OS: 'web' },
  AppState: { currentState: 'active', addEventListener() { return { remove() {} }; } },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  return request === 'react-native' ? native : originalLoad.call(this, request, parent, isMain);
};

const {
  createWowPublicSupabaseClient,
  listPublicCategories,
  searchPublicBusinesses,
  getPublicBusiness,
  getPublicOffer,
  getPublicOfferMedia,
  signPublicOfferMedia,
  wowStorageBuckets,
} = require(path.join(output, 'index.js'));
Module._load = originalLoad;

const sampleCategoryUuid = '11111111-1111-4111-8111-111111111111';
const sampleBusinessUuid = '22222222-2222-4222-8222-222222222222';
const sampleOfferUuid = '33333333-3333-4333-8333-333333333333';

// ---------------------------------------------------------------------------
// 1. Correct category UUID mapping
// ---------------------------------------------------------------------------
test('1. Category UUID mapping: preserves genuine UUIDs, "الكل" as null, and Arabic names', () => {
  // Check homeScreenSrc maps categories with { id: null, label: 'الكل' }
  assert.match(
    homeScreenSrc,
    /\{\s*id:\s*null,\s*label:\s*['"]الكل['"]\s*\}/,
    'Category rail must always provide "الكل" with id null',
  );
  assert.doesNotMatch(
    homeScreenSrc,
    /id:\s*['"]food['"]|id:\s*['"]fashion['"]/,
    'Live home screen must not use hardcoded category IDs',
  );

  // Verify listPublicCategories RPC contract
  assert.equal(typeof listPublicCategories, 'function');
});

// ---------------------------------------------------------------------------
// 2. Merchant and offer response mapping
// ---------------------------------------------------------------------------
test('2. Merchant & offer response mapping: authentic values, formatted prices, no fabricated descriptions', () => {
  // Extract and test formatDiscoveryPrice
  assert.match(
    homeDataSrc,
    /export function formatDiscoveryPrice/,
    'home-data must export formatDiscoveryPrice',
  );
  assert.match(
    homeDataSrc,
    /export function mapPublicBusinessToCard/,
    'home-data must export mapPublicBusinessToCard',
  );

  // Test mapping behavior from source
  assert.match(
    homeDataSrc,
    /card\.categories\?\.find\(\(c\)\s*=>\s*c\.is_primary\)/,
    'Must use primary category or first category from API',
  );
  assert.match(
    homeDataSrc,
    /trimmedName\.charAt\(0\)/,
    'Must derive initial from authentic merchant name',
  );
  assert.match(
    homeDataSrc,
    /areaName:\s*null/,
    'Card preview must not fabricate a fake areaName if not provided by backend',
  );
});

// ---------------------------------------------------------------------------
// 3. Search/category/location query behavior
// ---------------------------------------------------------------------------
test('3. Search, category, and location query behavior: passes active parameters and updates query keys', async () => {
  const rpcCalls = [];
  const mockClient = {
    rpc(name, params) {
      rpcCalls.push({ name, params });
      if (name === 'wow_public_search_businesses') {
        return Promise.resolve({
          data: { total: 0, limit: 20, offset: 0, items: [] },
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    },
  };

  await searchPublicBusinesses(mockClient, {
    query: 'شاورما',
    categoryId: sampleCategoryUuid,
    city: 'تعز',
    sort: 'recent',
    limit: 20,
    offset: 0,
  });

  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, 'wow_public_search_businesses');
  assert.deepEqual(rpcCalls[0].params, {
    p_query: 'شاورما',
    p_city: 'تعز',
    p_district: null,
    p_category_id: sampleCategoryUuid,
    p_sort: 'recent',
    p_limit: 20,
    p_offset: 0,
  });

  // Verify CustomerHomeScreen binds activeSearchFilter, selectedCategoryId, and activeCity
  assert.match(homeScreenSrc, /usePublicSearchBusinesses\(\{/);
  assert.match(homeScreenSrc, /query:\s*activeSearchFilter\.trim\(\)\s*\|\|\s*null/);
  assert.match(homeScreenSrc, /categoryId:\s*selectedCategoryId/);
  assert.match(homeScreenSrc, /city:\s*activeCity/);
});

// ---------------------------------------------------------------------------
// 4. Empty result handling
// ---------------------------------------------------------------------------
test('4. Empty result handling: distinguishes filtered empty state from honest empty database', () => {
  // Check CustomerHomeScreen handles empty database without falling back to mock data
  assert.match(
    homeScreenSrc,
    /لا توجد عروض منشورة حالياً/,
    'Must render honest empty database state when not filtered',
  );
  assert.match(
    homeScreenSrc,
    /لا توجد عروض مطابقة/,
    'Must render filtered empty state when user has active filters',
  );
  assert.match(
    homeScreenSrc,
    /إلغاء التصفية/,
    'Must provide reset-filters button',
  );
});

// ---------------------------------------------------------------------------
// 5. Network and configuration failures
// ---------------------------------------------------------------------------
test('5. Network and configuration failures: provides error recovery UI with refetch', () => {
  assert.match(
    homeScreenSrc,
    /تعذر الاتصال بالخادم/,
    'Must render dedicated server/network error state',
  );
  assert.match(
    homeScreenSrc,
    /إعادة المحاولة/,
    'Must provide retry button calling refetch',
  );
  assert.match(
    homeScreenSrc,
    /searchQueryObj\.refetch\(\)/,
    'Retry button must refetch queries',
  );
});

// ---------------------------------------------------------------------------
// 6. Guest discovery without Clerk authentication
// ---------------------------------------------------------------------------
test('6. Guest discovery without Clerk authentication: public client uses anon key, never Clerk token', () => {
  const publicClient = createWowPublicSupabaseClient(
    'https://example.supabase.co',
    'sb_publishable_test_key_1234567890',
  );
  assert(publicClient, 'Must create public Supabase client');
  assert.equal(typeof publicClient.rpc, 'function');

  // Verify secret keys are rejected
  assert.throws(
    () => createWowPublicSupabaseClient('https://example.supabase.co', 'sb_secret_forbidden'),
    /keys are prohibited/,
    'Secret/service_role keys must be rejected in public client',
  );
});

// ---------------------------------------------------------------------------
// 7. Authorized media and signed URL handling
// ---------------------------------------------------------------------------
test('7. Authorized media and signed URL handling: short-lived URLs, rejects private evidence buckets', async () => {
  assert.equal(wowStorageBuckets.offer, 'wow-offer-media');
  assert.equal(wowStorageBuckets.verification, 'wow-verification-evidence');
  assert.equal(wowStorageBuckets.complaint, 'wow-complaint-evidence');

  let signedKey = null;
  let signedExpiry = null;
  const mockPublicClient = {
    storage: {
      from(bucket) {
        assert.equal(bucket, 'wow-offer-media', 'Only offer media may be signed via public helper');
        return {
          createSignedUrl(key, expiresIn) {
            signedKey = key;
            signedExpiry = expiresIn;
            return Promise.resolve({
              data: { signedUrl: `https://example.supabase.co/storage/v1/object/sign/${bucket}/${key}?token=xyz` },
              error: null,
            });
          },
        };
      },
    },
  };

  const validMedia = {
    bucket: 'wow-offer-media',
    key: `${sampleBusinessUuid}/${sampleOfferUuid}/user_abc/${'a'.repeat(48)}.webp`,
    alt_text: 'صورة العرض',
    is_cover: true,
    sort_order: 0,
  };

  const signed = await signPublicOfferMedia(mockPublicClient, validMedia, 120);
  assert.match(signed, /https:\/\/example\.supabase\.co\/storage\/v1\/object\/sign\/wow-offer-media\//);
  assert.equal(signedExpiry, 120);

  // Reject unauthorized bucket (verification evidence)
  const invalidBucketMedia = {
    bucket: 'wow-verification-evidence',
    key: `business-verifications/${sampleBusinessUuid}/user_abc/${'a'.repeat(48)}.pdf`,
    alt_text: null,
    is_cover: false,
    sort_order: 0,
  };
  await assert.rejects(
    () => signPublicOfferMedia(mockPublicClient, invalidBucketMedia, 60),
    /Invalid approved offer image reference/,
  );

  // OfferMediaImage checks
  assert.match(
    offerMediaImageSrc,
    /signPublicOfferMedia/,
    'OfferMediaImage must use signPublicOfferMedia',
  );
  assert.doesNotMatch(
    offerMediaImageSrc,
    /console\.log.*signed/i,
    'Must never log signed media URLs',
  );
});

// ---------------------------------------------------------------------------
// 8. No fallback to fake production content
// ---------------------------------------------------------------------------
test('8. No fallback to fake production content: APPROVED_MERCHANTS not rendered in live mode', () => {
  assert.doesNotMatch(
    homeScreenSrc,
    /APPROVED_MERCHANTS/,
    'CustomerHomeScreen must not use APPROVED_MERCHANTS in live discovery',
  );
  assert.match(
    homeScreenSrc,
    /searchItems\.map\(mapPublicBusinessToCard\)/,
    'Must map live API items to card presentation models',
  );
});

// ---------------------------------------------------------------------------
// 9. No restricted raw table reads
// ---------------------------------------------------------------------------
test('9. No restricted raw table reads: home screen uses RPCs only, never raw table SELECTs', () => {
  const restrictedTables = [
    'businesses',
    'offers',
    'categories',
    'business_branches',
    'offer_media',
    'user_profiles',
    'business_verifications',
    'commercial_agreements',
  ];

  for (const table of restrictedTables) {
    const rawPattern = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`);
    assert.doesNotMatch(
      homeScreenSrc,
      rawPattern,
      `Home screen must never query raw table "${table}" directly`,
    );
    assert.doesNotMatch(
      homeDataSrc,
      rawPattern,
      `home-data must never query raw table "${table}" directly`,
    );
    assert.doesNotMatch(
      merchantCardSrc,
      rawPattern,
      `MerchantGridCard must never query raw table "${table}" directly`,
    );
    assert.doesNotMatch(
      offerMediaImageSrc,
      rawPattern,
      `OfferMediaImage must never query raw table "${table}" directly`,
    );
  }
});

// ---------------------------------------------------------------------------
// 10. Positive-Data Fixtures: Merchant Card, multiple offers, carousel state, and Arabic pricing
// ---------------------------------------------------------------------------
test('10. Positive-Data Fixtures: Merchant Card, multiple offers, carousel state, and Arabic pricing', () => {
  const syntheticBusiness = {
    id: sampleBusinessUuid,
    name: 'مطعم السعيد',
    categories: [{ id: sampleCategoryUuid, name_ar: 'مطاعم وكافيهات', is_primary: true }],
    offer_count: 2,
    offers: [
      {
        offer_id: sampleOfferUuid,
        title: 'وجبة غداء فاخرة',
        final_price: 3500,
        original_price: 4500,
        currency: 'YER',
        discount_percent: 22,
        starts_at: '2026-11-01T00:00:00Z',
        ends_at: '2026-12-01T00:00:00Z',
      },
      {
        offer_id: '44444444-4444-4444-8444-444444444444',
        title: 'عشاء لشخصين',
        final_price: 6000,
        original_price: null,
        currency: 'YER',
        discount_percent: null,
        starts_at: '2026-11-01T00:00:00Z',
        ends_at: '2026-12-01T00:00:00Z',
      },
    ],
  };

  const card = homeData.mapPublicBusinessToCard(syntheticBusiness);

  assert.equal(card.id, sampleBusinessUuid);
  assert.equal(card.name, 'مطعم السعيد');
  assert.equal(card.initial, 'م');
  assert.equal(card.categoryName, 'مطاعم وكافيهات');
  assert.equal(card.offerCount, 2);
  assert.equal(card.offers.length, 2);

  // Offer 1: formatted price and discount
  assert.match(card.offers[0].price, /[٣3][٬,،][٥5][٠0][٠0]\s*ر\.ي/);
  assert.match(card.offers[0].originalPrice, /[٤4][٬,،][٥5][٠0][٠0]\s*ر\.ي/);
  assert.equal(card.offers[0].discountPercent, 22);
  assert.equal(card.offers[0].benefit, 'خصم 22%');
  assert.equal(card.offers[0].areaName, null);

  // Offer 2: no discount percent fallback to title
  assert.match(card.offers[1].price, /[٦6][٬,،][٠0][٠0][٠0]\s*ر\.ي/);
  assert.equal(card.offers[1].originalPrice, null);
  assert.equal(card.offers[1].discountPercent, null);
  assert.equal(card.offers[1].benefit, 'عشاء لشخصين');

  // Verify carousel behavior in MerchantGridCard component source
  assert.match(merchantCardSrc, /offerIndex/);
  assert.match(merchantCardSrc, /offers\.length > 1/);
  assert.match(merchantCardSrc, /\(prev \+ 1\) % offers\.length/);
  assert.match(merchantCardSrc, /\(prev - 1 \+ offers\.length\) % offers\.length/);
  assert.match(merchantCardSrc, /\\u200E/); // Isolated LTR counter markers
});

// ---------------------------------------------------------------------------
// 11. Positive-Data Fixtures: Category UUID filtering and search parameters
// ---------------------------------------------------------------------------
test('11. Positive-Data Fixtures: Category UUID filtering and search parameters', async () => {
  const capturedRpcCalls = [];
  const syntheticList = [
    {
      id: sampleBusinessUuid,
      name: 'متجر الأناقة',
      categories: [{ id: sampleCategoryUuid, name_ar: 'أزياء', is_primary: true }],
      offers: [],
    },
  ];

  const mockClient = {
    rpc(name, params) {
      capturedRpcCalls.push({ name, params });
      return Promise.resolve({
        data: { total: 1, limit: 20, offset: 0, items: syntheticList },
        error: null,
      });
    },
  };

  const res = await searchPublicBusinesses(mockClient, {
    query: 'قميص',
    categoryId: sampleCategoryUuid,
    sort: 'recent',
    limit: 10,
    offset: 0,
  });

  assert.equal(capturedRpcCalls.length, 1);
  assert.equal(capturedRpcCalls[0].name, 'wow_public_search_businesses');
  assert.deepEqual(capturedRpcCalls[0].params, {
    p_query: 'قميص',
    p_city: null,
    p_district: null,
    p_category_id: sampleCategoryUuid,
    p_sort: 'recent',
    p_limit: 10,
    p_offset: 0,
  });

  assert.equal(res.total, 1);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].name, 'متجر الأناقة');
});

// ---------------------------------------------------------------------------
// 12. Region Filtering Integrity: No invented regions or unsupported filters
// ---------------------------------------------------------------------------
test('12. Region Filtering Integrity: No invented regions or unsupported filters', () => {
  // APPROVED_AREAS must contain only 'all' (كل المناطق)
  assert.deepEqual(
    homeData.APPROVED_AREAS,
    [{ id: 'all', label: 'كل المناطق', city: null }],
    'Only "all" (كل المناطق) is authoritative until public region directory RPC exists',
  );

  // RegionSelectorSheet must present clear unavailable state for granular city filtering
  assert.match(
    regionSheetSrc,
    /دليل المناطق قيد الاعتماد/,
    'RegionSelectorSheet must display honest unavailable state for granular region filtering',
  );
  assert.match(
    regionSheetSrc,
    /لا نستخدم موقع جهازك تلقائياً/,
    'RegionSelectorSheet must preserve privacy notice',
  );

  // CustomerHomeScreen must pass activeCity as null to avoid sending unsupported filters
  assert.match(
    homeScreenSrc,
    /const activeCity = null/,
    'CustomerHomeScreen must not send fabricated city parameters to public search RPC',
  );
});

// ---------------------------------------------------------------------------
// 13. Live database integration: local isolated Supabase PostgreSQL environment
// ---------------------------------------------------------------------------
test('13. Live database integration: local isolated Supabase PostgreSQL environment', async (t) => {
  const KONG_URL = 'http://127.0.0.1:54321';
  const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

  // 1. Probe local container availability
  let isAvailable = false;
  try {
    const probe = execFileSync(
      'docker',
      ['exec', '-i', 'supabase_db_wow-platform', 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-c', 'SELECT 1;'],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    );
    if (probe.trim() === '1') isAvailable = true;
  } catch {
    isAvailable = false;
  }

  if (!isAvailable) {
    t.skip('Local Supabase container (supabase_db_wow-platform) is not accessible on this host.');
    return;
  }

  function localPsql(sql) {
    return execFileSync(
      'docker',
      ['exec', '-i', 'supabase_db_wow-platform', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
      { input: sql, encoding: 'utf8' },
    );
  }

  async function localRpc(name, params = {}) {
    const res = await fetch(`${KONG_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: LOCAL_ANON_KEY,
        Authorization: `Bearer ${LOCAL_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`RPC ${name} failed (${res.status}): ${errText}`);
    }
    return res.json();
  }

  async function localGetRaw(table) {
    const res = await fetch(`${KONG_URL}/rest/v1/${table}`, {
      headers: {
        apikey: LOCAL_ANON_KEY,
        Authorization: `Bearer ${LOCAL_ANON_KEY}`,
      },
    });
    return { status: res.status, body: await res.text() };
  }

  const initialCategories = await localRpc('wow_public_list_categories');

  const setupSql = `
    BEGIN;
    SET LOCAL request.jwt.claims = '{"sub":"user_synth_local_test","role":"service_role"}';

    -- 1. Synthetic user
    INSERT INTO public.users (id, email, full_name, account_status)
    VALUES ('user_synth_local_test', 'synth@example.com', 'تاجر تجريبي', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Synthetic categories
    INSERT INTO public.categories (id, slug, name_ar, name_en, sort_order, is_active)
    VALUES ('a0000000-0000-4000-8000-000000000001', 'synth-food', 'مطاعم وكافيهات', 'Restaurants', 1, true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.categories (id, parent_id, slug, name_ar, name_en, sort_order, is_active)
    VALUES ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'synth-burgers', 'برجر وسريع', 'Burgers', 2, true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.categories (id, slug, name_ar, name_en, sort_order, is_active)
    VALUES ('a0000000-0000-4000-8000-000000000003', 'synth-fashion', 'أزياء وموضة', 'Fashion', 3, true)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Synthetic business
    INSERT INTO public.businesses (id, owner_user_id, name, description, contact_phone, status, approved_at)
    VALUES ('b0000000-0000-4000-8000-000000000001', 'user_synth_local_test', 'متجر البرجر التجريبي', 'أشهى وجبات البرجر الطازجة', '777000111', 'approved', now())
    ON CONFLICT (id) DO NOTHING;

    -- 3b. Synthetic business member (owner)
    INSERT INTO public.business_members (id, business_id, user_id, role, status, can_draft, can_submit, can_pause, can_monitor)
    VALUES ('10000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'user_synth_local_test', 'owner', 'active', true, true, true, true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Synthetic branch
    INSERT INTO public.business_branches (id, business_id, name, city, district, address_line, is_primary, status, approved_at)
    VALUES ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'فرع حدة', 'صنعاء', 'حدة', 'شارع حدة العام', true, 'approved', now())
    ON CONFLICT (id) DO NOTHING;

    -- 5. Link category to business
    INSERT INTO public.business_categories (business_id, category_id, is_primary, approved_by_user_id)
    VALUES ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', true, 'user_synth_local_test')
    ON CONFLICT DO NOTHING;

    -- 6. Subscription trial (gives publication entitlement)
    INSERT INTO public.business_subscriptions (id, business_id, kind, status, starts_at, ends_at)
    VALUES ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'trial', 'active', now(), now() + interval '30 days')
    ON CONFLICT (id) DO NOTHING;

    -- 7. Synthetic Offer 1
    INSERT INTO public.offers (id, business_id, created_by_user_id, status, merchant_available)
    VALUES ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'user_synth_local_test', 'active', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.offer_versions (
      id, business_id, offer_id, version_no, title, description,
      offer_kind, original_price, final_price, currency, benefit_details, terms,
      starts_at, ends_at, review_status, created_by_user_id, submitted_at, approved_at
    )
    VALUES (
      'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'e0000000-0000-4000-8000-000000000001', 1, 'وجبة برجر التوفير', 'وجبة برجر شهية مع بطاطس ومشروب',
      'product', 3500.00, 2800.00, 'YER', 'خصم 20% على الوجبة', 'العرض ساري لفرع حدة فقط',
      now() - interval '1 hour', now() + interval '30 days', 'draft',
      'user_synth_local_test', now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.offer_branches (business_id, offer_version_id, branch_id)
    VALUES ('b0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')
    ON CONFLICT DO NOTHING;

    INSERT INTO storage.objects (id, bucket_id, name, owner_id)
    VALUES (
      '11111111-2222-3333-4444-555555555555',
      'wow-offer-media',
      'b0000000-0000-4000-8000-000000000001/f0000000-0000-4000-8000-000000000001/user_synth_local_test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp',
      'user_synth_local_test'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.offer_media (id, offer_version_id, storage_key, alt_text, is_cover, sort_order)
    VALUES (
      '22222222-3333-4444-5555-666666666666',
      'f0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000001/f0000000-0000-4000-8000-000000000001/user_synth_local_test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp',
      'صورة وجبة برجر التوفير',
      true,
      0
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.offer_versions
    SET review_status = 'pending', submitted_at = now()
    WHERE id = 'f0000000-0000-4000-8000-000000000001';

    UPDATE public.offer_versions
    SET review_status = 'approved', approved_at = now()
    WHERE id = 'f0000000-0000-4000-8000-000000000001';

    UPDATE public.offers
    SET current_version_id = 'f0000000-0000-4000-8000-000000000001'
    WHERE id = 'e0000000-0000-4000-8000-000000000001';

    -- 8. Synthetic Offer 2
    INSERT INTO public.offers (id, business_id, created_by_user_id, status, merchant_available)
    VALUES ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'user_synth_local_test', 'active', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.offer_versions (
      id, business_id, offer_id, version_no, title, description,
      offer_kind, original_price, final_price, currency, benefit_details, terms,
      starts_at, ends_at, review_status, created_by_user_id, submitted_at, approved_at
    )
    VALUES (
      'f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
      'e0000000-0000-4000-8000-000000000002', 1, 'عشاء عائلي فاخر', 'وجبة تكفي 4 أشخاص بخصم خاص',
      'product', 12000.00, 9600.00, 'YER', 'خصم 20%', 'العرض ساري في كافة الفروع',
      now() - interval '1 hour', now() + interval '30 days', 'draft',
      'user_synth_local_test', now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.offer_branches (business_id, offer_version_id, branch_id)
    VALUES ('b0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001')
    ON CONFLICT DO NOTHING;

    UPDATE public.offer_versions
    SET review_status = 'pending', submitted_at = now()
    WHERE id = 'f0000000-0000-4000-8000-000000000002';

    UPDATE public.offer_versions
    SET review_status = 'approved', approved_at = now()
    WHERE id = 'f0000000-0000-4000-8000-000000000002';

    UPDATE public.offers
    SET current_version_id = 'f0000000-0000-4000-8000-000000000002'
    WHERE id = 'e0000000-0000-4000-8000-000000000002';

    COMMIT;
  `;

  const cleanupSql = `
    BEGIN;
    SET session_replication_role = replica;
    SET storage.allow_delete_query = 'true';
    DELETE FROM storage.objects WHERE bucket_id = 'wow-offer-media' AND name LIKE 'b0000000%';
    DELETE FROM public.offer_media WHERE offer_version_id IN ('f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002');
    DELETE FROM public.offer_branches WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    UPDATE public.offers SET current_version_id = NULL WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.offer_versions WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.offers WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.business_subscriptions WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.business_categories WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.business_members WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.business_branches WHERE business_id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.businesses WHERE id = 'b0000000-0000-4000-8000-000000000001';
    DELETE FROM public.categories WHERE id IN ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003');
    DELETE FROM public.users WHERE id = 'user_synth_local_test';
    SET session_replication_role = DEFAULT;
    COMMIT;
  `;

  localPsql(setupSql);

  try {
    // 1. Verify list categories via RPC
    const categories = await localRpc('wow_public_list_categories');
    assert(categories.length >= 3, 'Categories must include synthetic items');
    const foodCat = categories.find((c) => c.id === 'a0000000-0000-4000-8000-000000000001');
    assert.equal(foodCat?.name_ar, 'مطاعم وكافيهات');

    // 2. Search businesses - discoverability, multi-offers, pricing
    const searchAll = await localRpc('wow_public_search_businesses');
    assert.equal(searchAll.total, 1, 'Search all must discover the approved synthetic merchant');
    const biz = searchAll.items[0];
    assert.equal(biz.name, 'متجر البرجر التجريبي');
    assert.equal(biz.offers.length, 2, 'Merchant must return multiple offer previews for carousel');
    assert.equal(biz.offers[0].title, 'وجبة برجر التوفير');
    assert.equal(biz.offers[0].final_price, 2800);
    assert.equal(biz.offers[0].discount_percent, 20);
    assert.equal(biz.offers[1].title, 'عشاء عائلي فاخر');

    // 3. Search query filtering
    const searchMatch = await localRpc('wow_public_search_businesses', { p_query: 'برجر' });
    assert.equal(searchMatch.total, 1, 'Query "برجر" must match');
    const searchNoMatch = await localRpc('wow_public_search_businesses', { p_query: 'خياطة' });
    assert.equal(searchNoMatch.total, 0, 'Unrelated query must return 0 results');

    // 4. Category filtering (parent & child)
    const matchParent = await localRpc('wow_public_search_businesses', {
      p_category_id: 'a0000000-0000-4000-8000-000000000001',
    });
    assert.equal(matchParent.total, 1, 'Parent category filter must match businesses in child categories');

    const matchChild = await localRpc('wow_public_search_businesses', {
      p_category_id: 'a0000000-0000-4000-8000-000000000002',
    });
    assert.equal(matchChild.total, 1, 'Child category filter must match directly assigned businesses');

    const noMatchCat = await localRpc('wow_public_search_businesses', {
      p_category_id: 'a0000000-0000-4000-8000-000000000003',
    });
    assert.equal(noMatchCat.total, 0, 'Unrelated category must return 0 results');

    // 5. Get business details
    const bizDetail = await localRpc('wow_public_get_business', {
      p_business_id: 'b0000000-0000-4000-8000-000000000001',
    });
    assert.equal(bizDetail.name, 'متجر البرجر التجريبي');
    assert.equal(bizDetail.branches.length, 1);
    assert.equal(bizDetail.branches[0].city, 'صنعاء');

    // 6. Get offer details
    const offerDetail = await localRpc('wow_public_get_offer', {
      p_offer_id: 'e0000000-0000-4000-8000-000000000001',
    });
    assert.equal(offerDetail.title, 'وجبة برجر التوفير');
    assert.equal(offerDetail.original_price, 3500);
    assert.equal(offerDetail.final_price, 2800);

    // 7. Get offer media
    const offerMedia = await localRpc('wow_public_get_offer_media', {
      p_offer_id: 'e0000000-0000-4000-8000-000000000001',
    });
    assert.equal(offerMedia.length, 1);
    assert.equal(offerMedia[0].bucket, 'wow-offer-media');
    assert.equal(offerMedia[0].is_cover, true);

    // 8. Confirm anonymous users cannot read protected raw tables (HTTP 401)
    const tables = ['businesses', 'offers', 'categories', 'business_branches', 'offer_media'];
    for (const table of tables) {
      const rawRes = await localGetRaw(table);
      assert.equal(rawRes.status, 401, `Anonymous request to raw table "${table}" must be denied (401)`);
    }
  } finally {
    // 9. Documented cleanup execution
    localPsql(cleanupSql);

    // Verify complete cleanup
    const postCategories = await localRpc('wow_public_list_categories');
    const postSearch = await localRpc('wow_public_search_businesses');
    assert.equal(postCategories.length, initialCategories.length, 'Categories must be restored to initial state');
    assert.equal(postSearch.total, 0, 'No synthetic businesses must remain in discovery');
  }
});

// ---------------------------------------------------------------------------
// 14. CUS-02 Navigation & Route Architecture
// ---------------------------------------------------------------------------
test('14. CUS-02 Navigation: CUS-01 search icon navigates directly to /discover route', () => {
  // CUS-01 Home search icon must route immediately to /discover without interim bottom sheet
  assert.match(
    homeScreenSrc,
    /onOpenSearch=\{\(\)\s*=>\s*router\.push\(['"]\/discover['"]\)\}/,
    'CUS-01 HomeHeader onOpenSearch must call router.push("/discover")',
  );
  assert.doesNotMatch(
    homeScreenSrc,
    /<SearchSheet/,
    'Obsolete SearchSheet modal must not be rendered on CUS-01 Home',
  );

  // Discover route file must export default rendering CustomerDiscoverScreen
  assert.match(
    discoverRouteSrc,
    /export default function DiscoverRoute\(\)/,
    '/discover route must export default DiscoverRoute',
  );
  assert.match(
    discoverRouteSrc,
    /<CustomerDiscoverScreen\s*\/>/,
    '/discover route must render CustomerDiscoverScreen',
  );
});

// ---------------------------------------------------------------------------
// 15. CUS-02 Search Field: Max Length, Autofocus, and Clear Affordance
// ---------------------------------------------------------------------------
test('15. CUS-02 Search field: safe autofocus, 100 char limit, and clear affordance', () => {
  assert.match(
    discoverScreenSrc,
    /placeholder=['"]ابحث عن تاجر أو عرض\.\.\.['"]/,
    'Search input must have approved Arabic placeholder',
  );
  assert.match(
    discoverScreenSrc,
    /maxLength=\{100\}/,
    'Search input must enforce maximum 100 character limit',
  );
  assert.match(
    discoverScreenSrc,
    /autoFocus=\{true\}/,
    'Search input must be safely auto-focused on arrival',
  );
  assert.match(
    discoverScreenSrc,
    /query:\s*trimmedQuery\.length\s*>\s*0\s*\?\s*trimmedQuery\s*:\s*null/,
    'Search query must be trimmed and empty query browsing all businesses (null)',
  );
});

// ---------------------------------------------------------------------------
// 16. CUS-02 Category UUID Mapping & Sorting Contracts
// ---------------------------------------------------------------------------
test('16. CUS-02 Category UUID mapping and sorting options: genuine UUIDs and recent/discount/name', () => {
  // Persistent "الكل" chip mapping to null
  assert.match(
    discoverScreenSrc,
    /\{\s*id:\s*null,\s*label:\s*['"]الكل['"]\s*\}/,
    'Category rail must persistent "الكل" with null ID',
  );
  assert.match(
    discoverScreenSrc,
    /usePublicCategories\(\)/,
    'Categories must use public usePublicCategories hook',
  );

  // Sorting options must match API exactly
  assert.equal(discoveryData.SORT_OPTIONS.length, 3);
  assert.deepEqual(
    discoveryData.SORT_OPTIONS.map((o) => o.value),
    ['recent', 'discount', 'name'],
    'Sort options must strictly map to recent, discount, and name',
  );
});

// ---------------------------------------------------------------------------
// 17. CUS-02 Merchant Count Formatting & Card Presentation Model
// ---------------------------------------------------------------------------
test('17. CUS-02 Merchant count formatting: authentic Arabic inflection (تاجر / تجار)', () => {
  const { formatMerchantCount, mapPublicBusinessToDiscoveryCard } = discoveryData;

  assert.equal(formatMerchantCount(0), '0 تاجر');
  assert.equal(formatMerchantCount(1), 'تاجر واحد');
  assert.equal(formatMerchantCount(2), 'تاجران');
  assert.equal(formatMerchantCount(3), '٣ تجار');
  assert.equal(formatMerchantCount(10), '١٠ تجار');
  assert.equal(formatMerchantCount(15), '١٥ تاجر');

  // Test mapPublicBusinessToDiscoveryCard
  const mockCard = {
    id: 'b1111111-1111-4111-8111-111111111111',
    name: '  مطعم الرافدين  ',
    description: 'أشهى المأكولات',
    logo_url: null,
    cover_url: null,
    offer_count: 2,
    max_discount_percent: 25,
    newest_offer_start: '2026-01-01',
    categories: [{ id: 'c1', name_ar: 'مطاعم وكافيهات', is_primary: true }],
    offers: [
      {
        offer_id: 'o1',
        title: 'وجبة غداء كاملة',
        final_price: 3500,
        original_price: 4500,
        currency: 'YER',
        discount_percent: 22,
        starts_at: '2026-01-01',
        ends_at: '2026-02-01',
      },
    ],
  };

  const mapped = mapPublicBusinessToDiscoveryCard(mockCard);
  assert.equal(mapped.id, mockCard.id);
  assert.equal(mapped.name, 'مطعم الرافدين');
  assert.equal(mapped.initial, 'م');
  assert.equal(mapped.categoryName, 'مطاعم وكافيهات');
  assert.equal(mapped.offerCount, 2);
  assert.equal(mapped.offers.length, 1);
  assert.equal(mapped.offers[0].id, 'o1');
  assert.equal(mapped.offers[0].price, '٣٬٥٠٠ ر.ي');
  assert.equal(mapped.offers[0].originalPrice, '٤٬٥٠٠ ر.ي');
  assert.equal(mapped.offers[0].discountPercent, 22);
});

// ---------------------------------------------------------------------------
// 18. CUS-02 Landscape Card & Offer Preview Carousel
// ---------------------------------------------------------------------------
test('18. CUS-02 Landscape card: authorized OfferMediaImage, isolated LTR counter, accessible controls', () => {
  // Landscape card structure in SearchMerchantCard
  assert.match(
    searchMerchantCardSrc,
    /<OfferMediaImage/,
    'SearchMerchantCard must render authorized OfferMediaImage',
  );
  assert.match(
    searchMerchantCardSrc,
    /\\u200E\$\{String\(safeIndex \+ 1\)/,
    'Carousel counter must isolate LTR numerals 01 / 02 with \\u200E marks',
  );
  assert.match(
    searchMerchantCardSrc,
    /accessibilityLabel=['"]العرض السابق['"]/,
    'Carousel must provide accessible previous label',
  );
  assert.match(
    searchMerchantCardSrc,
    /accessibilityLabel=['"]العرض التالي['"]/,
    'Carousel must provide accessible next label',
  );
  assert.match(
    searchMerchantCardSrc,
    /title=['"]عرض التفاصيل['"]/,
    'Card must offer details view action button',
  );
  assert.match(
    searchMerchantCardSrc,
    /minWidth:\s*48,\s*minHeight:\s*48/,
    'Carousel navigation controls must enforce minimum 48pt touch targets',
  );
  assert.match(
    searchMerchantCardSrc,
    /minHeight:\s*48,\s*flexDirection:\s*['"]row['"]/,
    'Merchant header pressable must enforce minimum 48pt touch target',
  );
});

// ---------------------------------------------------------------------------
// 19. CUS-02 Pagination & Incremental Loading
// ---------------------------------------------------------------------------
test('19. CUS-02 Pagination: limit 20, deduplication on append, and reset on filter change', () => {
  assert.match(
    discoverScreenSrc,
    /limit:\s*20/,
    'Search query must use bounded page size 20',
  );
  assert.match(
    discoverScreenSrc,
    /nextOffset\s*=\s*offset\s*\+\s*20/,
    'Pagination must increment by 20 on load more',
  );
  assert.match(
    discoverScreenSrc,
    /new\s+Set\(baseList\.map\(\(m\)\s*=>\s*m\.id\)\)/,
    'Incremental loading must deduplicate cards by ID',
  );
  assert.match(
    discoverScreenSrc,
    /function handleResetFilters\(\)/,
    'Must provide handleResetFilters resetting offset and search parameters',
  );
});

// ---------------------------------------------------------------------------
// 20. CUS-02 Responsive Layout Branches & Honest States
// ---------------------------------------------------------------------------
test('20. CUS-02 Responsive layout branches and honest states', () => {
  // Responsive layout via useWowViewport
  assert.match(
    discoverScreenSrc,
    /useWowViewport\(\)/,
    'Must use responsive viewport hook useWowViewport',
  );
  assert.match(
    discoverScreenSrc,
    /isDesktop\s*\?/,
    'Must have dedicated desktop branch with sidebar',
  );
  assert.match(
    discoverScreenSrc,
    /width:\s*260/,
    'Desktop must provide filter sidebar',
  );

  // States
  assert.match(
    discoverScreenSrc,
    /title=['"]جاري البحث عن العروض\.\.\.['"]/,
    'Must render loading progress state',
  );
  assert.match(
    discoverScreenSrc,
    /title=['"]لا توجد عروض منشورة حاليًا['"]/,
    'Must render honest empty database state',
  );
  assert.match(
    discoverScreenSrc,
    /title=['"]لا توجد نتائج مطابقة['"]/,
    'Must render filtered no-match state',
  );
  assert.match(
    discoverScreenSrc,
    /title=['"]تعذّر تحميل نتائج البحث['"]/,
    'Must render honest error retry state',
  );
  assert.match(
    discoverScreenSrc,
    /غير متاحة حالياً حتى توفر دليل المناطق المعتمد/,
    'Must honestly explain unverified region capability',
  );

  // 48pt touch targets enforcement
  assert.match(
    discoverScreenSrc,
    /width:\s*48,\s*height:\s*48,\s*minWidth:\s*48,\s*minHeight:\s*48/,
    'Back button must strictly enforce 48pt minimum touch target',
  );
  assert.match(
    discoverScreenSrc,
    /minHeight:\s*48,\s*minWidth:\s*56/,
    'Category chips must enforce 48pt minimum touch target',
  );
  assert.match(
    discoverScreenSrc,
    /minHeight:\s*48,\s*flexDirection:\s*['"]row['"],\s*alignItems:\s*['"]center['"],\s*gap:\s*8/,
    'Sort button must enforce 48pt minimum touch target',
  );
});


// AUD-023: behavioral race tests against the exact request gate used by CUS-02.
const paginationSource = fs.readFileSync(path.join(root,
  'apps/customer/src/features/discovery/pagination-request.ts'), 'utf8');
const paginationExports = {};
new Function('exports', ts.transpileModule(paginationSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(paginationExports);
const { createPaginationRequestGate } = paginationExports;

test('AUD-023: old page cannot append or clear the new loading state after a filter change', async () => {
  const gate = createPaginationRequestGate();
  const rows = [];
  let loading = false;
  let resolveOld, resolveNew;
  const oldResponse = new Promise(resolve => { resolveOld = resolve; });
  const newResponse = new Promise(resolve => { resolveNew = resolve; });
  async function load(response) {
    const request = gate.begin();
    if (request === null) return;
    loading = true;
    try {
      const page = await response;
      if (gate.isCurrent(request)) rows.push(...page);
    } finally {
      if (gate.finish(request)) loading = false;
    }
  }
  const old = load(oldResponse);
  gate.invalidate();
  loading = false;
  const current = load(newResponse);
  resolveOld(['stale']);
  await old;
  assert.deepEqual(rows, []);
  assert.equal(loading, true);
  resolveNew(['current']);
  await current;
  assert.deepEqual(rows, ['current']);
  assert.equal(loading, false);
});

test('AUD-023: returning to the same filter never revives its abandoned page', () => {
  const gate = createPaginationRequestGate();
  const old = gate.begin();
  assert.ok(old);
  assert.equal(gate.begin(), null, 'Duplicate tap must not start a second page');
  gate.invalidate();
  gate.invalidate();
  const current = gate.begin();
  assert.ok(current);
  assert.notEqual(current, old);
  assert.equal(gate.isCurrent(old), false);
  assert.equal(gate.finish(old), false);
  assert.equal(gate.isCurrent(current), true);
  assert.equal(gate.finish(current), true);
  assert.equal(gate.isCurrent(current), false);
  assert.ok(gate.begin(), 'Retry can acquire the gate');
});

test('AUD-023: every filter handler resets pagination and stale commits are guarded', () => {
  assert.equal((discoverScreenSrc.match(/resetPagination\(\);/g) || []).length, 4);
  assert.match(discoverScreenSrc, /paginationGate\.invalidate\(\);\s*setOffset\(0\)/);
  assert.match(discoverScreenSrc, /if \(!paginationGate\.isCurrent\(request\)\) return;/);
  assert.match(discoverScreenSrc, /if \(paginationGate\.finish\(request\)\) setIsFetchingMore\(false\)/);
  assert.match(discoverScreenSrc, /useEffect\(\(\) => \(\) => paginationGate\.invalidate\(\)/);
});
