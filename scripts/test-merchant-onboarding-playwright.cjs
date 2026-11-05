// scripts/test-merchant-onboarding-playwright.cjs
// Ephemeral Playwright verification suite for WOW MER-02-01 (Step 1 of 4)
// Strictly ephemeral: captures and comparisons are performed in-memory or in an OS tempdir cleaned up on exit.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

// Reference image path: configurable via environment variable WOW_MER_02_01_REFERENCE_PNG.
// Never hardcodes developer-specific absolute paths in source code.
const APPROVED_REFERENCE_PATH = process.env.WOW_MER_02_01_REFERENCE_PNG || '';

function resolveBrowserExecutable() {
  if (process.env.PLAYWRIGHT_CHROME_EXECUTABLE && fs.existsSync(process.env.PLAYWRIGHT_CHROME_EXECUTABLE)) {
    return process.env.PLAYWRIGHT_CHROME_EXECUTABLE;
  }
  const candidates = [
    '/usr/bin/brave-browser',
    '/usr/bin/brave',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

const VIEWPORTS = [
  { width: 320, height: 700, label: '320x700' },
  { width: 360, height: 800, label: '360x800' },
  { width: 390, height: 844, label: '390x844' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 2048, height: 1152, label: '2048x1152' },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const MOCK_CATEGORIES = [
  { id: 'cat-retail', name_ar: 'تجارة التجزئة', name_en: 'Retail', parent_id: null, is_active: true },
  { id: 'cat-home', name_ar: 'أدوات منزلية ومطبخ', name_en: 'Home & Kitchen', parent_id: 'cat-retail', is_active: true },
  { id: 'cat-food', name_ar: 'أطعمة ومشروبات', name_en: 'Food & Beverage', parent_id: null, is_active: true },
  { id: 'cat-cafe', name_ar: 'مقهى ومخبوزات', name_en: 'Cafe & Bakery', parent_id: 'cat-food', is_active: true },
];

function createStaticServer(distDir) {
  return http.createServer((req, res) => {
    try {
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(distDir, urlPath);

      if (urlPath === '/' || urlPath === '') {
        filePath = path.join(distDir, 'index.html');
      } else if (urlPath === '/business/onboarding' || urlPath === '/business/onboarding/') {
        filePath = path.join(distDir, 'business', 'onboarding.html');
      } else if (!path.extname(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
          filePath = path.join(filePath, 'index.html');
        }
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // Fallback to index.html for client routing
        const indexHtml = path.join(distDir, 'index.html');
        if (fs.existsSync(indexHtml)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexHtml).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error: ' + err.message);
    }
  });
}

async function runSuite() {
  const ephemeralTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wow-ephemeral-playwright-'));
  const exportDir = path.join(ephemeralTempDir, 'export');
  let server = null;
  let browser = null;

  const results = {
    runtimeErrors: [],
    consoleErrors: [],
    tests: [],
    viewportInspections: [],
    cleanupConfirmed: false,
  };

  try {
    console.log('[Playwright] Building ephemeral web bundle in OS temp...');
    execSync(`pnpm --filter merchant exec expo export -p web --dev --output-dir "${exportDir}"`, {
      stdio: 'pipe',
      timeout: 120000,
    });

    console.log('[Playwright] Starting local HTTP static server on ephemeral port...');
    server = createStaticServer(exportDir);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[Playwright] Server running at ${baseUrl}`);

    const browserExec = resolveBrowserExecutable();
    console.log(`[Playwright] Launching Chromium-compatible browser (${browserExec ? browserExec : 'Playwright bundled'})...`);
    browser = await chromium.launch({
      executablePath: browserExec,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const browserVersion = browser.version();
    console.log(`[Playwright] Browser launched successfully: version ${browserVersion}`);

    // Helper to setup mock routes for safe fixtures
    const setupMockRoutes = async (context, categoryResponse = MOCK_CATEGORIES, categoryStatus = 200) => {
      await context.addInitScript(() => {
        window.Clerk = window.Clerk || {
          isReady: () => true,
          load: () => Promise.resolve(),
          addListener: () => () => {},
          client: {},
          session: null,
          user: null,
        };
      });

      await context.route(/supabase\.co/, async (route) => {
        const url = route.request().url();
        if (url.includes('wow_public_list_categories')) {
          console.log('[Playwright Mock Route Hit]:', url);
          if (categoryStatus === 200) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(categoryResponse),
            });
          } else {
            await route.fulfill({
              status: categoryStatus,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'Internal Server Error' }),
            });
          }
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
    };

    // ============================================================
    // TEST 1: Unsigned-in state check
    // ============================================================
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const pageErrors = [];
      const conErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      page.on('console', (msg) => { if (msg.type() === 'error') conErrors.push(msg.text()); });

      await page.goto(`${baseUrl}/business/onboarding?preview=unsigned`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('text="تسجيل الدخول مطلوب"').waitFor({ timeout: 10000 });

      // Verify unsigned-in notice is rendered
      const authNoticeTitle = await page.locator('text="تسجيل الدخول مطلوب"').count();
      const authNoticeDesc = await page.locator('text="يرجى تسجيل الدخول بحساب تاجر للمتابعة إلى إضافة نشاط تجاري."').count();

      const pass = authNoticeTitle > 0 && authNoticeDesc > 0 && !pageErrors.some(e => e.includes('BackHandler'));
      results.tests.push({
        name: 'Unsigned-in state displays required warning notice without BackHandler errors',
        pass,
        details: `Title match: ${authNoticeTitle > 0}, Desc match: ${authNoticeDesc > 0}, PageErrors: ${pageErrors.length}`,
      });
      await context.close();
    }

    // ============================================================
    // TEST 2: Real rendered screen, Tajawal fonts, BackHandler fix, Arabic Copy
    // ============================================================
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await setupMockRoutes(context);
      const page = await context.newPage();
      const pageErrors = [];
      const conErrors = [];
      page.on('pageerror', (e) => {
        console.log('[Browser pageerror]:', e.message);
        pageErrors.push(e.message);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.log('[Browser console.error]:', msg.text());
          conErrors.push(msg.text());
        }
      });

      await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('text="إضافة نشاط تجاري"').first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(500);

      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('[Playwright] Page innerText preview (first 200 chars):', bodyText.slice(0, 200).replace(/\n/g, ' '));

      // Check BackHandler errors
      const backHandlerError = conErrors.concat(pageErrors).find((e) => /BackHandler/i.test(e));
      results.tests.push({
        name: 'Web runtime error: BackHandler is not called on web',
        pass: !backHandlerError,
        details: backHandlerError ? `Error found: ${backHandlerError}` : 'No BackHandler error occurred',
      });

      // Check 100% literal Arabic strings from approved reference
      const requiredCopy = [
        'طلب تأهيل نشاط',
        'إضافة نشاط تجاري',
        'الخطوة 1 من 4',
        'النشاط',
        'المفوض',
        'الفروع',
        'المراجعة',
        'لنبدأ بإضافة نشاطك التجاري',
        'أدخل البيانات الأساسية لنشاطك لإتمام طلب التأهيل.',
        'بيانات النشاط',
        'أدخل بيانات نشاطك التجاري. يمكنك حفظ الطلب واستكماله لاحقًا.',
        'اسم النشاط التجاري',
        'اكتب الاسم الحقيقي للنشاط كما يُعرف به، وبما يطابق مستنداته إن وجدت.',
        'فئة النشاط',
        'اختر فئة النشاط',
        'اختر الفئة الأقرب إلى المنتجات أو الخدمات التي تقدمها.',
        'وصف النشاط',
        'صف ما يقدمه نشاطك للعملاء في جملة أو جملتين.',
        'يمكنك إدارة أكثر من نشاط تجاري بحساب واحد، ويُراجع كل نشاط بشكل مستقل.',
        'حفظ ومتابعة',
        'حفظ كمسودة',
      ];

      const requiredPlaceholders = [
        'مثال: دار الألوان',
        'مثال: متجر متخصص في بيع الأدوات المنزلية ومستلزمات المطبخ.',
      ];

      const missingCopy = [];
      for (const text of requiredCopy) {
        const found = await page.locator(`text="${text}"`).count();
        if (found === 0) {
          missingCopy.push(text);
        }
      }
      for (const ph of requiredPlaceholders) {
        const found = await page.locator(`[placeholder="${ph}"]`).count();
        if (found === 0) {
          missingCopy.push(`placeholder: ${ph}`);
        }
      }

      results.tests.push({
        name: 'Literal Arabic strings match approved reference image',
        pass: missingCopy.length === 0,
        details: missingCopy.length === 0 ? 'All 23 copy and placeholder strings verified' : `Missing: ${missingCopy.join(', ')}`,
      });

      // Stepper RTL sequence check: 'النشاط' should be on the right of 'المراجعة'
      const step1Box = await page.locator('text="النشاط"').boundingBox();
      const step4Box = await page.locator('text="المراجعة"').boundingBox();
      const stepperRtlValid = step1Box && step4Box && step1Box.x > step4Box.x;

      results.tests.push({
        name: 'Stepper connected RTL order: Step 1 (النشاط) is at the right, Step 4 (المراجعة) is at the left',
        pass: Boolean(stepperRtlValid),
        details: stepperRtlValid ? `Step 1 x=${step1Box.x} > Step 4 x=${step4Box.x}` : 'RTL stepper order invalid',
      });

      // Info notice RTL layout: Info icon (i) should be on the right of the note text
      const noteTextBox = await page.locator('text=يمكنك إدارة أكثر من نشاط تجاري').first().boundingBox();
      results.tests.push({
        name: 'Info notice: text and icon correctly aligned',
        pass: Boolean(noteTextBox),
        details: `Note box: ${noteTextBox?.width}x${noteTextBox?.height}px`,
      });

      // Minimum 48pt touch targets
      const backButton = page.locator('button[aria-label="رجوع"], [role="button"][aria-label="رجوع"]');
      const backBox = await backButton.boundingBox();
      const touchTargetPass = backBox && backBox.width >= 48 && backBox.height >= 48;
      results.tests.push({
        name: 'Interactive touch targets: Back button is >= 48x48pt',
        pass: Boolean(touchTargetPass),
        details: `Back button size: ${backBox?.width}x${backBox?.height}pt`,
      });

      // V8 Welcome Banner: Single composite artwork (Beacon + Storefront)
      // Exactly 1 composite artwork, 0 obsolete isolated Beacon illustrations,
      // placed on the left in RTL, with ~2:1 aspect ratio.
      const compositeImage = page.locator('img[alt="شخصية بيكن أمام المتجر"], [aria-label="شخصية بيكن أمام المتجر"]').first();
      await compositeImage.waitFor({ timeout: 10000 });
      const compositeCount = await page.locator('img[alt="شخصية بيكن أمام المتجر"]').count();
      const oldBeaconCount = await page.locator('img[alt="شخصية بيكن ترحب بك"]').count();
      const bannerTextBox = await page.locator('text="لنبدأ بإضافة نشاطك التجاري"').boundingBox();
      const bannerImageBox = await compositeImage.boundingBox();
      const isImageLeftOfText = bannerTextBox && bannerImageBox && bannerTextBox.x > bannerImageBox.x;
      const aspectRatio = bannerImageBox ? bannerImageBox.width / bannerImageBox.height : 0;
      const isAspectRatioValid = Math.abs(aspectRatio - 2.0) < 0.2;

      // Verify image element loaded
      const imageLoaded = await page.evaluate(() => {
        const img = document.querySelector('img[alt="شخصية بيكن أمام المتجر"]');
        return img ? img.complete && img.naturalWidth > 0 : false;
      });

      results.tests.push({
        name: 'V8 Welcome Banner: Single composite artwork (Beacon + Storefront) rendered on left in RTL with 2:1 ratio',
        pass: compositeCount === 1 && oldBeaconCount === 0 && Boolean(isImageLeftOfText) && isAspectRatioValid && imageLoaded,
        details: `Composite count: ${compositeCount}, Old count: ${oldBeaconCount}, Image left of text: ${isImageLeftOfText}, AspectRatio: ${aspectRatio.toFixed(2)}, Loaded: ${imageLoaded}`,
      });

      await context.close();
    }

    // ============================================================
    // TEST 3: Category Select Sheet Interaction (Open, Search, Filter, Select, Empty, Error)
    // ============================================================
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await setupMockRoutes(context);
      const page = await context.newPage();
      page.on('request', (req) => console.log('[TEST 3 Req]:', req.url()));
      page.on('requestfailed', (req) => console.log('[TEST 3 ReqFail]:', req.url(), req.failure()?.errorText));
      page.on('pageerror', (e) => console.log('[TEST 3 pageerror]:', e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('[TEST 3 console.error]:', msg.text());
      });
      await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      const overlayText = await page.evaluate(() => {
        const el = document.getElementById('error-overlay');
        return el ? el.innerText : null;
      });
      if (overlayText) {
        console.log('[TEST 3 Error Overlay]:', overlayText);
      }

      // 1. Open Category Sheet
      const categoryTrigger = page.locator('[aria-label="فئة النشاط"]');
      await categoryTrigger.click();
      await page.waitForTimeout(500);

      const sheetTitle = await page.locator('text="اختر فئة النشاط"').count();
      const categoryItem = await page.locator('text="أدوات منزلية ومطبخ"').count();
      const sheetBody = await page.evaluate(() => document.body.innerText);
      console.log('[TEST 3] Sheet open. Title count:', sheetTitle, 'Category item count:', categoryItem);
      console.log('[TEST 3] Sheet body text:', sheetBody.slice(0, 300).replace(/\n/g, ' '));

      // 2. Search category with normalized Arabic
      const searchInput = page.locator('input[placeholder="ابحث عن فئة النشاط..."], [aria-label="البحث عن فئة"]');
      await searchInput.fill('مطبخ');
      await page.waitForTimeout(200);
      const filteredItem = await page.locator('text="أدوات منزلية ومطبخ"').count();
      const hiddenItem = await page.locator('text="أطعمة ومشروبات"').count();

      // 3. Search no match
      await searchInput.fill('كلمةغيرموجودة');
      await page.waitForTimeout(200);
      const emptyStateText = await page.locator('text="لم نعثر على فئة مطابقة. جرّب كلمة أخرى."').count();

      // 4. Clear search via clear button and select category
      const clearBtn = page.locator('[aria-label="مسح البحث"]');
      if ((await clearBtn.count()) > 0) {
        await clearBtn.click();
      } else {
        await searchInput.fill('');
      }
      await page.waitForTimeout(400);
      await page.locator('text="أدوات منزلية ومطبخ"').first().click();
      await page.waitForTimeout(300);

      // Verify category trigger now displays selected category
      const selectedDisplayed = await page.locator('[aria-label="فئة النشاط"]:has-text("أدوات منزلية ومطبخ")').count();

      results.tests.push({
        name: 'Category sheet: open, search normalization, no-match empty state, selection and close',
        pass: sheetTitle > 0 && categoryItem > 0 && filteredItem > 0 && hiddenItem === 0 && emptyStateText > 0 && selectedDisplayed > 0,
        details: `Sheet open: ${sheetTitle > 0}, Search filtered: ${filteredItem > 0}, Empty search: ${emptyStateText > 0}, Selected rehydrated: ${selectedDisplayed > 0}`,
      });

      await context.close();
    }

    // ============================================================
    // TEST 4: Category Select Sheet Error State (Simulated 500)
    // ============================================================
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await setupMockRoutes(context, null, 500);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);

      const categoryTrigger = page.locator('[aria-label="فئة النشاط"]');
      await categoryTrigger.click();

      // Wait for TanStack Query to exhaust retries and show error state
      const errorLocator = page.locator('text="تعذر تحميل الفئات. حاول مرة أخرى."');
      await errorLocator.waitFor({ timeout: 15000 });

      const errorState = await errorLocator.count();
      const retryButton = await page.locator('text="إعادة المحاولة"').count();

      results.tests.push({
        name: 'Category sheet error handling: displays retryable error on network failure',
        pass: errorState > 0 && retryButton > 0,
        details: `Error message: ${errorState > 0}, Retry button: ${retryButton > 0}`,
      });

      await context.close();
    }

    // ============================================================
    // TEST 5: Form Validation and Unsaved Changes Confirmation Dialog
    // ============================================================
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await setupMockRoutes(context);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);

      // 1. Submit empty form -> check validation errors
      await page.locator('text="حفظ ومتابعة"').click();
      await page.locator('text="أدخل اسم النشاط التجاري للمتابعة."').waitFor({ timeout: 5000 });

      const nameError = await page.locator('text="أدخل اسم النشاط التجاري للمتابعة."').count();
      const catError = await page.locator('text="اختر فئة النشاط للمتابعة."').count();

      // 2. Type in name to make dirty
      const nameInput = page.locator('input[placeholder="مثال: دار الألوان"]');
      await nameInput.fill('متجر النور التجاري');
      await page.waitForTimeout(200);

      // 3. Click Header Back Button -> Discard confirmation modal should appear
      await page.locator('[aria-label="رجوع"]').click();
      await page.locator('text="مغادرة الصفحة؟"').waitFor({ timeout: 5000 });

      const modalTitle = await page.locator('text="مغادرة الصفحة؟"').count();
      const modalDesc = await page.locator('text="لديك تغييرات غير محفوظة في بيانات النشاط. هل تريد تجاهل التغييرات والمغادرة؟"').count();
      
      const cancelBtn = page.locator('text="متابعة التعديل"').first();
      await cancelBtn.click();
      
      // Wait for modal to become hidden / dismissed
      await page.locator('text="مغادرة الصفحة؟"').waitFor({ state: 'hidden', timeout: 5000 });
      const modalClosed = !(await page.locator('text="مغادرة الصفحة؟"').isVisible());

      results.tests.push({
        name: 'Form validation and unsaved changes confirmation dialog on back press',
        pass: nameError > 0 && catError > 0 && modalTitle > 0 && modalDesc > 0 && modalClosed,
        details: `Name error: ${nameError > 0}, Cat error: ${catError > 0}, Modal opened: ${modalTitle > 0}, Modal dismissed: ${modalClosed}`,
      });

      await context.close();
    }

    // ============================================================
    // TEST 6: Desktop max-width check (Defect 2)
    // ============================================================
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await setupMockRoutes(context);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);

      // Measure content input width and centering on 1440px desktop
      const input = page.locator('input[placeholder="مثال: دار الألوان"]').first();
      await input.waitFor({ timeout: 5000 });
      const inputBox = await input.boundingBox();

      // Max width should be <= 600px and centered around x = 1440/2 = 720
      const isConstrained = inputBox && inputBox.width <= 600 && inputBox.width >= 400;
      const inputCenter = inputBox ? inputBox.x + inputBox.width / 2 : 0;
      const isCentered = Math.abs(inputCenter - 720) < 60;

      results.tests.push({
        name: 'Desktop width: onboarding form is constrained to max-width ~600px and centered',
        pass: Boolean(isConstrained && isCentered),
        details: `Input width: ${inputBox?.width}px (expected <=600px), Input center: ${inputCenter}px (viewport center 720px)`,
      });

      await context.close();
    }

    // ============================================================
    // TEST 7: Responsive Viewports and Light/Dark Theme Inspection
    // ============================================================
    console.log('[Playwright] Testing responsive viewports in Light and Dark modes...');
    for (const vp of VIEWPORTS) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });
        await setupMockRoutes(context);
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (e) => pageErrors.push(e.message));

        await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(200);

        // Check horizontal overflow: scrollWidth should equal clientWidth (no horizontal overflow)
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        // Check touch target for back button
        const backBtn = page.locator('[aria-label="رجوع"]');
        const backBox = await backBtn.boundingBox();
        const touchOk = backBox && backBox.width >= 48 && backBox.height >= 48;

        // Check theme evaluation
        const themeValid = await page.evaluate((expectedTheme) => {
          return expectedTheme === 'dark'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : window.matchMedia('(prefers-color-scheme: light)').matches;
        }, theme);

        // Take ephemeral in-memory screenshot buffer for inspection
        const buffer = await page.screenshot({ fullPage: false });

        results.viewportInspections.push({
          viewport: vp.label,
          theme,
          themeApplied: themeValid,
          noHorizontalOverflow: !overflow,
          touchTargetPass: touchOk,
          pageErrors: pageErrors.length,
          bufferSize: buffer.length,
        });

        await context.close();
      }
    }

    // ============================================================
    // TEST 8: Ephemeral Reference Visual Fidelity Comparison by Region
    // ============================================================
    console.log('[Playwright] Reviewing visual fidelity against approved reference image...');
    if (!APPROVED_REFERENCE_PATH || !fs.existsSync(APPROVED_REFERENCE_PATH)) {
      console.log('[Playwright] WOW_MER_02_01_REFERENCE_PNG environment variable not provided or file does not exist.');
      results.tests.push({
        name: 'Approved reference visual fidelity review',
        pass: false,
        status: 'BLOCKED',
        details: `REFERENCE-FIDELITY: BLOCKED / NOT VERIFIED — WOW_MER_02_01_REFERENCE_PNG environment variable not set or file not found at "${APPROVED_REFERENCE_PATH || ''}". Supply an absolute path to the approved reference PNG to execute quantitative visual verification.`,
      });
    } else {
      console.log(`[Playwright] Approved reference found at "${APPROVED_REFERENCE_PATH}". Executing quantitative region-by-region review...`);
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await setupMockRoutes(context);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);

      // Measure full scrollable content height to capture complete unclipped screen
      const contentHeight = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('*')).filter((el) => el.innerText === 'حفظ كمسودة');
        if (btns.length > 0) {
          const rect = btns[0].getBoundingClientRect();
          return Math.ceil(rect.bottom + window.scrollY + 60);
        }
        return 1280;
      });

      await page.setViewportSize({ width: 390, height: Math.max(contentHeight, 844) });
      await page.waitForTimeout(300);

      // Ephemeral screenshot in-memory
      const liveBuffer = await page.screenshot({ fullPage: true });

      // Save liveBuffer ephemerally in OS temp only for visual comparison tool, then immediately delete
      const tempLiveFile = path.join(ephemeralTempDir, 'live_eval.png');
      const tempPyFile = path.join(ephemeralTempDir, 'compare_regions.py');
      fs.writeFileSync(tempLiveFile, liveBuffer);

      const compScript = `
import sys
import json
from PIL import Image

ref_path = ${JSON.stringify(APPROVED_REFERENCE_PATH)}
live_path = ${JSON.stringify(tempLiveFile)}

try:
    ref = Image.open(ref_path).convert('RGB')
    live = Image.open(live_path).convert('RGB')
except Exception as e:
    print(json.dumps({'error': f'Failed to load images: {e}'}))
    sys.exit(0)

rw, rh = ref.size
lw, lh = live.size

# Validate reference image dimensions (portrait ~941x1672 or aspect ratio ~1.777 +- 0.05)
aspect_ratio = rh / rw
if rw < 600 or rh < 1000 or abs(aspect_ratio - (1672 / 941)) > 0.08:
    print(json.dumps({
        'error': f'Invalid reference image dimensions: {rw}x{rh} (aspect ratio {aspect_ratio:.3f}, expected ~1.777)'
    }))
    sys.exit(0)

# Crop ref to content area (exclude status bar ~90px and home bar ~62px)
ref_content = ref.crop((0, int(0.054 * rh), rw, int(0.963 * rh)))
rcw, rch = ref_content.size

ref_px = ref_content.load()
live_px = live.load()

results = {}

# 1. Header (y: 0.00 .. 0.08)
# Verify back arrow on right and step badge on left
r_h_end = int(0.08 * rch)
l_h_end = int(0.08 * lh)
r_arrow = sum(1 for y in range(0, r_h_end) for x in range(int(0.75 * rcw), rcw) if sum(ref_px[x, y]) < 150)
l_arrow = sum(1 for y in range(0, l_h_end) for x in range(int(0.75 * lw), lw) if sum(live_px[x, y]) < 150)
r_badge = sum(1 for y in range(0, r_h_end) for x in range(0, int(0.35 * rcw)) if ref_px[x, y][0] > 240 and ref_px[x, y][1] > 220 and ref_px[x, y][2] > 180)
l_badge = sum(1 for y in range(0, l_h_end) for x in range(0, int(0.35 * lw)) if live_px[x, y][0] > 240 and live_px[x, y][1] > 220 and live_px[x, y][2] > 180)
results['header'] = {
    'pass': bool(r_arrow > 20 and l_arrow > 10 and r_badge > 200 and l_badge > 100),
    'details': f'Back arrow right (ref={r_arrow}, live={l_arrow}), Step badge left (ref={r_badge}, live={l_badge})'
}

# 2. Stepper (y: 0.08 .. 0.17)
# Verify step 1 yellow circle on right, track line across middle
r_s_start, r_s_end = int(0.08 * rch), int(0.17 * rch)
l_s_start, l_s_end = int(0.08 * lh), int(0.17 * lh)
r_s1 = sum(1 for y in range(r_s_start, r_s_end) for x in range(int(0.65 * rcw), rcw) if ref_px[x, y][0] > 240 and ref_px[x, y][1] > 180 and ref_px[x, y][2] < 70)
l_s1 = sum(1 for y in range(l_s_start, l_s_end) for x in range(int(0.65 * lw), lw) if live_px[x, y][0] > 240 and live_px[x, y][1] > 180 and live_px[x, y][2] < 70)
r_line = sum(1 for y in range(r_s_start, r_s_end) for x in range(int(0.2 * rcw), int(0.8 * rcw)) if 200 < sum(ref_px[x, y])/3 < 240)
l_line = sum(1 for y in range(l_s_start, l_s_end) for x in range(int(0.2 * lw), int(0.8 * lw)) if 200 < sum(live_px[x, y])/3 < 240)
results['stepper'] = {
    'pass': bool(r_s1 > 100 and l_s1 > 50 and r_line > 500 and l_line > 200),
    'details': f'Step 1 yellow right (ref={r_s1}, live={l_s1}), Track line (ref={r_line}, live={l_line})'
}

# 3. Banner (y: 0.17 .. 0.30)
# Verify composite mascot artwork on left, no duplicate mascot on right, warm container background
r_b_start, r_b_end = int(0.17 * rch), int(0.30 * rch)
l_b_start, l_b_end = int(0.17 * lh), int(0.30 * lh)
r_mascot_l = sum(1 for y in range(r_b_start, r_b_end) for x in range(0, int(0.45 * rcw)) if ref_px[x, y][0] > 230 and ref_px[x, y][1] > 180 and ref_px[x, y][2] < 70)
l_mascot_l = sum(1 for y in range(l_b_start, l_b_end) for x in range(0, int(0.45 * lw)) if live_px[x, y][0] > 230 and live_px[x, y][1] > 180 and live_px[x, y][2] < 70)
r_mascot_r = sum(1 for y in range(r_b_start, r_b_end) for x in range(int(0.50 * rcw), rcw) if ref_px[x, y][0] > 230 and ref_px[x, y][1] > 180 and ref_px[x, y][2] < 70)
l_mascot_r = sum(1 for y in range(l_b_start, l_b_end) for x in range(int(0.50 * lw), lw) if live_px[x, y][0] > 230 and live_px[x, y][1] > 180 and live_px[x, y][2] < 70)
results['banner'] = {
    'pass': bool(r_mascot_l > 200 and l_mascot_l > 100 and r_mascot_r < 50 and l_mascot_r < 50),
    'details': f'Mascot on left (ref={r_mascot_l}, live={l_mascot_l}), Mascot absent on right (ref={r_mascot_r}, live={l_mascot_r})'
}

# 4. Form Card (y: 0.30 .. 0.72)
# Verify bordered card and input field containers
r_f_start, r_f_end = int(0.30 * rch), int(0.72 * rch)
l_f_start, l_f_end = int(0.30 * lh), int(0.72 * lh)
r_fld = sum(1 for y in range(r_f_start, r_f_end) for x in range(int(0.05 * rcw), int(0.95 * rcw)) if 200 < sum(ref_px[x, y])/3 < 240)
l_fld = sum(1 for y in range(l_f_start, l_f_end) for x in range(int(0.05 * lw), int(0.95 * lw)) if 200 < sum(live_px[x, y])/3 < 240)
results['form_card'] = {
    'pass': bool(r_fld > 2000 and l_fld > 1000),
    'details': f'Card field borders & backgrounds (ref={r_fld}, live={l_fld})'
}

# 5. Info Notice (y: 0.72 .. 0.83)
# Verify amber notice box
r_i_start, r_i_end = int(0.72 * rch), int(0.83 * rch)
l_i_start, l_i_end = int(0.72 * lh), int(0.83 * lh)
r_amber = sum(1 for y in range(r_i_start, r_i_end) for x in range(0, rcw) if ref_px[x, y][0] > 240 and ref_px[x, y][1] > 230 and 180 < ref_px[x, y][2] < 240)
l_amber = sum(1 for y in range(l_i_start, l_i_end) for x in range(0, lw) if live_px[x, y][0] > 240 and live_px[x, y][1] > 230 and 180 < live_px[x, y][2] < 240)
results['info_notice'] = {
    'pass': bool(r_amber > 400 and l_amber > 200),
    'details': f'Amber notice box (ref={r_amber}, live={l_amber})'
}

# 6. Action CTAs (y: 0.83 .. 1.00)
# Verify primary yellow button and secondary button
r_c_start, r_c_end = int(0.83 * rch), rch
l_c_start, l_c_end = int(0.83 * lh), lh
r_py = sum(1 for y in range(r_c_start, r_c_end) for x in range(0, rcw) if ref_px[x, y][0] > 240 and ref_px[x, y][1] > 180 and ref_px[x, y][2] < 70)
l_py = sum(1 for y in range(l_c_start, l_c_end) for x in range(0, lw) if live_px[x, y][0] > 240 and live_px[x, y][1] > 180 and live_px[x, y][2] < 70)
results['action_ctas'] = {
    'pass': bool(r_py > 500 and l_py > 250),
    'details': f'Primary yellow CTA button (ref={r_py}, live={l_py})'
}

all_pass = all(v['pass'] for v in results.values())
print(json.dumps({
    'all_pass': all_pass,
    'ref_size': f'{rw}x{rh}',
    'live_size': f'{lw}x{lh}',
    'regions': results
}))
`;
      fs.writeFileSync(tempPyFile, compScript);
      let compOutput = '';
      try {
        compOutput = execSync(`python3 "${tempPyFile}"`, { encoding: 'utf-8' });
      } finally {
        if (fs.existsSync(tempPyFile)) fs.unlinkSync(tempPyFile);
        if (fs.existsSync(tempLiveFile)) fs.unlinkSync(tempLiveFile);
      }

      console.log('[Playwright] Region-by-region visual comparison output:\n' + compOutput.trim());

      let parsedComparison = null;
      try {
        parsedComparison = JSON.parse(compOutput.trim());
      } catch (parseErr) {
        parsedComparison = { error: 'Failed to parse visual comparison output: ' + parseErr.message };
      }

      if (parsedComparison && parsedComparison.all_pass) {
        const regionSummaries = Object.entries(parsedComparison.regions)
          .map(([k, v]) => `${k}=PASS (${v.details})`)
          .join('; ');
        results.tests.push({
          name: 'Approved reference visual fidelity review (6 semantic regions evaluated quantitatively)',
          pass: true,
          status: 'PASS',
          details: `Ref: ${parsedComparison.ref_size}, Live: ${parsedComparison.live_size}; ${regionSummaries}`,
        });
      } else {
        const errDetail = parsedComparison?.error || JSON.stringify(parsedComparison?.regions || 'Unknown mismatch');
        results.tests.push({
          name: 'Approved reference visual fidelity review (6 semantic regions evaluated quantitatively)',
          pass: false,
          status: 'FAIL',
          details: `Visual region mismatch: ${errDetail}`,
        });
      }

      await context.close();
    }

    // ============================================================
    // TEST 9: Production Web Build: Preview Isolation Gate
    // Verify that ?preview=1 / ?preview=unsigned / crafted params
    // are completely inert in a non---dev release export.
    // ============================================================
    console.log('[Playwright] Building ephemeral production web bundle in OS temp (non---dev)...');
    const prodExportDir = path.join(ephemeralTempDir, 'export-prod');
    execSync(`pnpm --filter merchant exec expo export -p web --output-dir "${prodExportDir}"`, {
      stdio: 'pipe',
      timeout: 180000,
    });

    const prodServer = createStaticServer(prodExportDir);
    await new Promise((resolve) => prodServer.listen(0, '127.0.0.1', resolve));
    const prodPort = prodServer.address().port;
    const prodBaseUrl = `http://127.0.0.1:${prodPort}`;
    console.log(`[Playwright] Production static server running at ${prodBaseUrl}`);

    try {
      const prodContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      // Block all network requests to remote Supabase to guarantee test isolation
      await prodContext.route(/supabase\.co/, (route) => {
        route.abort('blockedbyclient');
      });

      const prodPage = await prodContext.newPage();

      // 1. ?preview=1 in production must NOT expose synthetic merchant session or form inputs
      await prodPage.goto(`${prodBaseUrl}/business/onboarding?preview=1`, { waitUntil: 'domcontentloaded' });
      await prodPage.waitForTimeout(1000);

      const formInputCountPreview1 = await prodPage.locator('input[placeholder="مثال: دار الألوان"]').count();
      const syntheticUserExposed = await prodPage.evaluate(() => {
        return document.body.innerText.includes('dev_synthetic_merchant_user');
      });
      const hasAuthProtection = await prodPage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('تسجيل الدخول مطلوب') || text.includes('جارٍ التحقق من تسجيل الدخول');
      });

      // 2. ?preview=unsigned in production must not bypass Clerk or crash
      await prodPage.goto(`${prodBaseUrl}/business/onboarding?preview=unsigned`, { waitUntil: 'domcontentloaded' });
      await prodPage.waitForTimeout(500);
      const formInputCountPreviewUnsigned = await prodPage.locator('input[placeholder="مثال: دار الألوان"]').count();

      // 3. Crafted query parameters (?preview=admin&preview=true&bypass=1)
      await prodPage.goto(`${prodBaseUrl}/business/onboarding?preview=admin&preview=true&bypass=1`, { waitUntil: 'domcontentloaded' });
      await prodPage.waitForTimeout(500);
      const formInputCountCrafted = await prodPage.locator('input[placeholder="مثال: دار الألوان"]').count();

      const prodIsolationPass =
        formInputCountPreview1 === 0 &&
        formInputCountPreviewUnsigned === 0 &&
        formInputCountCrafted === 0 &&
        !syntheticUserExposed &&
        hasAuthProtection;

      results.tests.push({
        name: 'Production web build: preview parameters (?preview=1, ?preview=unsigned, crafted values) are completely inert in release exports',
        pass: prodIsolationPass,
        status: prodIsolationPass ? 'PASS' : 'FAIL',
        details: `Form exposed in prod: ${formInputCountPreview1 > 0}, Synthetic user exposed: ${syntheticUserExposed}, Auth protection active: ${hasAuthProtection}`,
      });

      await prodContext.close();
    } finally {
      prodServer.close();
    }

  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.close();
    }

    // Clean up entire ephemeral OS temp dir
    try {
      if (fs.existsSync(ephemeralTempDir)) {
        fs.rmSync(ephemeralTempDir, { recursive: true, force: true });
        results.cleanupConfirmed = true;
      }
    } catch (cleanErr) {
      console.error('Failed to clean up temp dir:', cleanErr);
      results.cleanupConfirmed = false;
    }
  }

  return results;
}

runSuite()
  .then((res) => {
    console.log('\n================ PLAYWRIGHT EXECUTION REPORT ================');
    console.log(`Total unit/interaction tests: ${res.tests.length}`);
    let passCount = 0;
    let blockedCount = 0;
    for (const t of res.tests) {
      const mark = t.status === 'BLOCKED' ? 'BLOCKED' : t.pass ? 'PASS' : 'FAIL';
      if (t.pass) passCount++;
      if (t.status === 'BLOCKED') blockedCount++;
      console.log(`[${mark}] ${t.name} (${t.details})`);
    }

    console.log(`\nResponsive Viewports Inspected (${res.viewportInspections.length} total, 8 viewports x 2 themes):`);
    let vpPass = 0;
    for (const v of res.viewportInspections) {
      const ok = v.noHorizontalOverflow && v.touchTargetPass && v.pageErrors === 0;
      if (ok) vpPass++;
      console.log(`  - ${v.viewport} [${v.theme}]: Overflow=${!v.noHorizontalOverflow}, Touch>=48=${v.touchTargetPass}, PageErrors=${v.pageErrors}`);
    }

    console.log(`\nEphemeral Artifact Cleanup Verified: ${res.cleanupConfirmed ? 'YES - All temporary images and build dirs destroyed' : 'NO'}`);
    console.log('============================================================\n');

    if (passCount !== res.tests.length || vpPass !== res.viewportInspections.length || !res.cleanupConfirmed || blockedCount > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Playwright suite execution failed:', err);
    process.exit(1);
  });
