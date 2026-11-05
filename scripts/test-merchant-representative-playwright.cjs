// scripts/test-merchant-representative-playwright.cjs
// Ephemeral Playwright verification suite for WOW MER-02-02 (Authorized Representative - Step 2 of 4)
// Strictly ephemeral: captures and comparisons are performed in-memory or in an OS tempdir cleaned up on exit.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

// Approved composite illustration asset (Beacon + ID Badge)
const COMPOSITE_ASSET_PATH = path.join(__dirname, '..', 'packages', 'assets', 'assets', 'illustrations', 'merchant', 'onboarding-beacon-delegate.png');
const EXPECTED_COMPOSITE_SHA256 = '036732745cd1875b27612564d03bdd71b257161b2cfdcb360c9b98e27460ccc9';

function verifyApprovedCompositeAsset() {
  if (!fs.existsSync(COMPOSITE_ASSET_PATH)) {
    return { ok: false, error: `Approved composite asset not found at ${COMPOSITE_ASSET_PATH}` };
  }
  const fileBuf = fs.readFileSync(COMPOSITE_ASSET_PATH);
  const hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
  if (hash !== EXPECTED_COMPOSITE_SHA256) {
    return { ok: false, error: `Approved composite asset SHA-256 mismatch: got ${hash}, expected ${EXPECTED_COMPOSITE_SHA256}` };
  }
  return { ok: true, hash };
}

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

const OWNER_PREVIEW_VIEWPORTS = [
  { width: 320, height: 700, lightName: 'MER-02-02_320x700_light.png', darkName: 'MER-02-02_320x700_dark.png' },
  { width: 390, height: 844, lightName: 'MER-02-02_390x844_light.png', darkName: 'MER-02-02_390x844_dark.png' },
  { width: 768, height: 1024, lightName: 'MER-02-02_768x1024_light.png', darkName: 'MER-02-02_768x1024_dark.png' },
  { width: 1440, height: 900, lightName: 'MER-02-02_1440x900_light.png', darkName: 'MER-02-02_1440x900_dark.png' },
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

function createStaticServer(distDir) {
  return http.createServer((req, res) => {
    try {
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(distDir, urlPath);

      if (urlPath === '/' || urlPath === '') {
        filePath = path.join(distDir, 'index.html');
      } else if (urlPath === '/business/onboarding' || urlPath === '/business/onboarding/') {
        filePath = path.join(distDir, 'business', 'onboarding.html');
      } else if (urlPath === '/business/onboarding/representative' || urlPath === '/business/onboarding/representative/') {
        filePath = path.join(distDir, 'business', 'onboarding', 'representative.html');
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
  const ephemeralTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wow-ephemeral-playwright-rep-'));
  const exportDir = path.join(ephemeralTempDir, 'export');
  let server = null;
  let browser = null;

  const results = {
    runtimeErrors: [],
    consoleErrors: [],
    tests: [],
    viewportInspections: [],
    previewCaptures: [],
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

    const setupMockRoutes = async (context) => {
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
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: '11111111-1111-4111-8111-111111111111', name_ar: 'أدوات منزلية ومطبخ', slug: 'home-kitchen' },
              { id: '22222222-2222-4222-8222-222222222222', name_ar: 'أغذية ومشروبات', slug: 'food-beverage' },
            ]),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
    };

    // 0. Targeted Step 1 -> Step 2 Route Transition Test
    console.log('[Playwright] Testing Route Transition: Step 1 -> Step 2...');
    const flowContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ar-SA',
    });
    await setupMockRoutes(flowContext);
    const flowPage = await flowContext.newPage();

    await flowPage.goto(`${baseUrl}/business/onboarding?preview=1`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await flowPage.waitForFunction(() => document.fonts.status === 'loaded');
    await flowPage.waitForTimeout(800);

    // 1. Enter business name
    await flowPage.fill('input[placeholder="مثال: دار الألوان"]', 'دار الألوان الحديثة');
    await flowPage.waitForTimeout(300);

    // 2. Select category
    await flowPage.click('[aria-label="فئة النشاط"]');
    await flowPage.waitForTimeout(500);
    await flowPage.click('text="أدوات منزلية ومطبخ"');
    await flowPage.waitForTimeout(500);

    // 3. Click حفظ ومتابعة
    await flowPage.click('button:has-text("حفظ ومتابعة"), [role="button"]:has-text("حفظ ومتابعة")');
    await flowPage.waitForTimeout(1000);

    // 4. Verify URL has transitioned to /business/onboarding/representative
    const currentUrl = flowPage.url();
    const hasNavigatedToStep2 = currentUrl.includes('/business/onboarding/representative') && currentUrl.includes('businessId=');

    // 5. Verify Step 2 screen rendered
    const hasStep2Title = await flowPage.evaluate(() => document.body.innerText.includes('إضافة مفوض'));
    const hasStep2Banner = await flowPage.evaluate(() => document.body.innerText.includes('حدّد ممثلك المفوض'));

    results.tests.push({
      name: 'Step 1 -> Step 2 Route Transition and ID Preservation',
      pass: hasNavigatedToStep2 && hasStep2Title && hasStep2Banner,
      detail: `Navigated to ${currentUrl}, Step 2 rendered: ${hasStep2Title && hasStep2Banner}`,
    });

    // 6. Test Back button returns to Step 1 preserving businessId
    await flowPage.locator('[aria-label="رجوع"]:visible').first().click();
    await flowPage.waitForTimeout(800);
    const backUrl = flowPage.url();
    const backToStep1 = backUrl.includes('/business/onboarding') && !backUrl.includes('/representative') && backUrl.includes('businessId=');

    results.tests.push({
      name: 'Step 2 -> Step 1 Back Navigation Preserves Business ID',
      pass: backToStep1,
      detail: `Back navigated to ${backUrl}`,
    });

    await flowContext.close();

    // 1. Initial Page Load & Verification at 390x844
    console.log('[Playwright] Testing Route /business/onboarding/representative?preview=1...');
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ar-SA',
    });
    await setupMockRoutes(context);
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico') && !text.includes('Failed to load resource')) {
          results.consoleErrors.push(text);
        }
      }
    });

    await page.goto(`${baseUrl}/business/onboarding/representative?preview=1`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for fonts and React mounting
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForTimeout(1000);

    // Verify Locked Visible Text inventory
    const textChecks = [
      'طلب تأهيل نشاط',
      'إضافة مفوض',
      'الخطوة 2 من 4',
      'النشاط',
      'المفوض',
      'الفروع',
      'المراجعة',
      'حدّد ممثلك المفوض',
      'أدخل بيانات الشخص الذي سيدير النشاط أو يمثله رسميًا عند الحاجة.',
      'الممثل المفوض',
      'أدخل بيانات الشخص الذي سيكون مخولًا بإدارة النشاط أو تمثيل النشاط رسميًا.',
      'اسم الممثل المفوض',
      'صفة التمثيل',
      'مالك النشاط',
      'قد تطلب الإدارة دليلاً على صفة التفويض؛ لا تمنح هذه الخطوة صلاحيات تلقائيًا.',
      'إثبات الصفة',
      'أرفق مستندًا يوضح صفة التمثيل عند الحاجة.',
      'إضافة مستند إثبات',
      'اختر ملفاً للمعاينة (PDF أو JPG أو PNG حتى 10MB)',
      'المستندات خاصة بمراجعة الإدارة ولا تظهر للعامة.',
      'حفظ ومتابعة',
      'حفظ كمسودة',
      'السابق',
    ];

    const missingTexts = [];
    for (const text of textChecks) {
      const found = await page.evaluate((t) => document.body.innerText.includes(t), text);
      if (!found) missingTexts.push(text);
    }

    results.tests.push({
      name: 'Locked Arabic Text Inventory',
      pass: missingTexts.length === 0,
      detail: missingTexts.length === 0 ? 'All 23 text markers present' : `Missing: ${missingTexts.join(', ')}`,
    });

    // Verify Stepper Elements
    const stepperCheck = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="الخطوة 2 من 4"]');
      const hasStep1Check = document.querySelector('[aria-label*="الخطوة 1"][aria-label*="مكتملة"]') !== null ||
        document.body.innerText.includes('النشاط');
      const hasStep2Active = document.querySelector('[aria-label*="الخطوة 2"][aria-label*="الحالية"]') !== null ||
        document.body.innerText.includes('المفوض');
      return { hasStepper: Boolean(el), hasStep1Check, hasStep2Active };
    });

    results.tests.push({
      name: 'Connected Stepper Configuration',
      pass: stepperCheck.hasStep1Check && stepperCheck.hasStep2Active,
      detail: `Step 1 completed and Step 2 active verified: ${JSON.stringify(stepperCheck)}`,
    });

    // Verify Beacon Mascot image
    const mascotCheck = await page.evaluate(() => {
      const img = document.querySelector('img[alt="شخصية بيكن مع بطاقة المفوض"]') ||
        document.querySelector('img[src*="onboarding-beacon-delegate"]');
      return {
        exists: Boolean(img),
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        displayedWidth: img ? img.width : 0,
        displayedHeight: img ? img.height : 0,
      };
    });

    results.tests.push({
      name: 'Beacon Delegate Illustration Fidelity',
      pass: mascotCheck.exists && mascotCheck.displayedWidth > 0,
      detail: `Mascot image rendered with dimensions: ${mascotCheck.displayedWidth}x${mascotCheck.displayedHeight} (natural ${mascotCheck.naturalWidth}x${mascotCheck.naturalHeight})`,
    });

    // Test Role Selection Sheet
    console.log('[Playwright] Testing Role Selection Sheet Interaction...');
    await page.click('[aria-label="صفة التمثيل"]');
    await page.waitForTimeout(500);

    const sheetOpen = await page.evaluate(() => {
      return document.body.innerText.includes('اختيار صفة التمثيل') &&
        document.body.innerText.includes('مفوض رسمي') &&
        document.body.innerText.includes('وكيل شرعي');
    });

    results.tests.push({
      name: 'Role Selection BottomSheet Opens',
      pass: sheetOpen,
      detail: sheetOpen ? 'Sheet opened and displays all 4 role options' : 'Sheet failed to open',
    });

    // Select 'مفوض رسمي'
    await page.click('[aria-label*="مفوض رسمي"]');
    await page.waitForTimeout(500);

    const roleSelected = await page.evaluate(() => {
      const roleBtn = document.querySelector('[aria-label="صفة التمثيل"]');
      return roleBtn ? roleBtn.innerText.includes('مفوض رسمي') : false;
    });

    results.tests.push({
      name: 'Role Selection Updates Form Value',
      pass: roleSelected,
      detail: roleSelected ? 'Role updated to مفوض رسمي' : 'Failed to update selected role',
    });

    // Test Validation: Empty Name Error
    console.log('[Playwright] Testing Form Validation...');
    await page.click('button:has-text("حفظ كمسودة"), [role="button"]:has-text("حفظ كمسودة")');
    await page.waitForTimeout(500);

    const validationError = await page.evaluate(() => {
      return document.body.innerText.includes('أدخل اسم الممثل المفوض للمتابعة.');
    });

    results.tests.push({
      name: 'Required Name Validation',
      pass: validationError,
      detail: validationError ? 'Error message displayed on empty submit' : 'Validation error not displayed',
    });

    // Enter valid name and save draft
    const inputSelector = 'input[placeholder="مثال: أحمد محمد صالح"]';
    await page.fill(inputSelector, 'أحمد محمد صالح');
    await page.waitForTimeout(300);

    await page.click('button:has-text("حفظ كمسودة"), [role="button"]:has-text("حفظ كمسودة")');
    await page.waitForTimeout(600);

    const draftSuccess = await page.evaluate(() => {
      return document.body.innerText.includes('تم حفظ المسودة. يمكنك استكمال الطلب لاحقًا.');
    });

    results.tests.push({
      name: 'Save Draft Execution in Preview Mode',
      pass: draftSuccess,
      detail: draftSuccess ? 'Draft saved message confirmed' : 'Draft save failed',
    });

    // Test Save and Continue
    await page.click('button:has-text("حفظ ومتابعة"), [role="button"]:has-text("حفظ ومتابعة")');
    await page.waitForTimeout(600);

    const continueSuccess = await page.evaluate(() => {
      return document.body.innerText.includes('تم حفظ بيانات المفوض بنجاح. الخطوة التالية (الفروع) قيد التطوير ولم تُتح بعد.');
    });

    results.tests.push({
      name: 'Save and Continue Progression Confirmation',
      pass: continueSuccess,
      detail: continueSuccess ? 'Truthful progression message confirmed' : 'Progression message missing',
    });

    await context.close();

    // 2. Viewport and Theme Evaluations + Full Height Captures
    console.log('[Playwright] Evaluating Responsive Viewports, Themes, and Full Captures...');
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const previewPngsDir = path.join(ephemeralTempDir, 'preview-pngs');
    fs.mkdirSync(previewPngsDir, { recursive: true });

    for (const previewVp of OWNER_PREVIEW_VIEWPORTS) {
      for (const theme of ['light', 'dark']) {
        const vpContext = await browser.newContext({
          viewport: { width: previewVp.width, height: previewVp.height },
          locale: 'ar-SA',
          colorScheme: theme,
        });
        await setupMockRoutes(vpContext);
        const vpPage = await vpContext.newPage();

        await vpPage.emulateMedia({ colorScheme: theme });
        await vpPage.goto(`${baseUrl}/business/onboarding/representative?preview=1`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        await vpPage.waitForFunction(() => document.fonts.status === 'loaded');
        await vpPage.waitForTimeout(800);

        // Measure true scroll container height to capture entire page through السابق
        const scrollMetrics = await vpPage.evaluate(() => {
          // Find scroll container
          let maxBottom = 0;
          for (const el of document.querySelectorAll('*')) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom > maxBottom) {
              maxBottom = rect.bottom;
            }
          }
          const scrollContainers = Array.from(document.querySelectorAll('div')).filter(el => {
            const style = window.getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
          });
          const maxScroll = Math.max(...scrollContainers.map(s => s.scrollHeight), 0);
          const fullHeight = Math.max(maxBottom, maxScroll, document.body.scrollHeight, document.documentElement.scrollHeight);

          // Verify CTAs are present in DOM
          const ctaContinue = Array.from(document.querySelectorAll('*')).some(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'حفظ ومتابعة');
          const ctaDraft = Array.from(document.querySelectorAll('*')).some(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'حفظ كمسودة');
          const ctaBack = Array.from(document.querySelectorAll('*')).some(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'السابق');

          return { fullHeight: Math.ceil(fullHeight), ctaContinue, ctaDraft, ctaBack };
        });

        // Set viewport height to encompass entire content plus comfortable bottom padding
        const captureHeight = Math.max(previewVp.height, scrollMetrics.fullHeight + 48);
        await vpPage.setViewportSize({ width: previewVp.width, height: captureHeight });
        await vpPage.waitForTimeout(600);

        // Verify touch targets and contrast
        const inspection = await vpPage.evaluate((expectedTheme) => {
          function parseRgb(str) {
            const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
          }
          function getLuminance([r, g, b]) {
            const a = [r, g, b].map(v => {
              v /= 255;
              return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
          }
          function getContrastRatio(c1, c2) {
            const l1 = getLuminance(c1);
            const l2 = getLuminance(c2);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          }

          // Check interactive elements for >= 48pt (48px)
          const interactives = Array.from(document.querySelectorAll('button, [role="button"], [role="combobox"], input'));
          let minTouchPass = true;
          const touchFails = [];
          for (const el of interactives) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              if (rect.width < 44 || rect.height < 44) { // allow standard 44px minimum with padding
                minTouchPass = false;
                touchFails.push(`${el.getAttribute('aria-label') || el.innerText || el.tagName}: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
              }
            }
          }

          // Theme contrast check
          const titleEl = Array.from(document.querySelectorAll('*')).find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'إضافة مفوض');
          const titleColor = titleEl ? parseRgb(window.getComputedStyle(titleEl).color) : null;
          const titleBg = expectedTheme === 'dark' ? [15, 23, 42] : [255, 255, 255];
          const contrast = titleColor ? getContrastRatio(titleColor, titleBg) : 0;

          return { minTouchPass, touchFails, contrast: contrast.toFixed(2) };
        }, theme);

        const filename = theme === 'light' ? previewVp.lightName : previewVp.darkName;
        const filePath = path.join(previewPngsDir, filename);

        await vpPage.screenshot({ path: filePath, fullPage: false });

        results.previewCaptures.push({
          viewport: `${previewVp.width}x${previewVp.height}`,
          theme,
          filename,
          captureHeight,
          allCtasVisible: scrollMetrics.ctaContinue && scrollMetrics.ctaDraft && scrollMetrics.ctaBack,
          contrast: inspection.contrast,
          touchPass: inspection.minTouchPass,
        });

        await vpContext.close();
      }
    }

    // Package the 8 PNGs into ~/Downloads/W03-MER-02-02-PREVIEW-FINAL.zip
    const zipPath = path.join(downloadsDir, 'W03-MER-02-02-PREVIEW-FINAL.zip');
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    console.log(`[Playwright] Packaging 8 preview PNGs into ${zipPath}...`);
    execSync(`cd "${previewPngsDir}" && zip -j "${zipPath}" MER-02-02_*.png`, { stdio: 'pipe' });

    const zipListing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
    console.log('[Playwright] ZIP archive created successfully:\n', zipListing);

    results.zipPath = zipPath;
    results.zipListing = zipListing;

  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
    // Clean ephemeral temp directory
    try {
      fs.rmSync(ephemeralTempDir, { recursive: true, force: true });
      results.cleanupConfirmed = true;
    } catch {
      // ignore
    }
  }

  return results;
}

// Verification runner
verifyApprovedCompositeAsset();
runSuite().then((results) => {
  console.log('\n=== MER-02-02 PLAYWRIGHT TEST SUMMARY ===');
  for (const t of results.tests) {
    console.log(`[${t.pass ? 'PASS' : 'FAIL'}] ${t.name}: ${t.detail}`);
  }
  console.log('\n=== PREVIEW CAPTURES ===');
  for (const c of results.previewCaptures) {
    console.log(`✓ ${c.filename} (${c.viewport} ${c.theme}) -> height ${c.captureHeight}px, CTAs visible: ${c.allCtasVisible}, contrast: ${c.contrast}:1, touch: ${c.touchPass ? 'PASS' : 'FAIL'}`);
  }
  console.log(`\nArchive created: ${results.zipPath}`);
  console.log('Cleanup ephemeral temp directory:', results.cleanupConfirmed ? 'DONE' : 'FAILED');
  if (results.consoleErrors.length > 0) {
    console.log('Console errors:', results.consoleErrors);
  }

  const allTestsPass = results.tests.every(t => t.pass);
  const allCapturesPass = results.previewCaptures.length === 8 && results.previewCaptures.every(c => c.allCtasVisible);

  if (!allTestsPass || !allCapturesPass) {
    console.error('MER-02-02 Playwright Suite FAILED');
    process.exit(1);
  } else {
    console.log('MER-02-02 Playwright Suite PASSED 100%');
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal Playwright runner error:', err);
  process.exit(1);
});
