// scripts/test-merchant-final-8-playwright.cjs
// Playwright Browser Test & Screenshot Capture for MUSNAD-WOW Merchant Final 8 Screens
// Screens: MER-12, MER-07, MER-07-01, MER-10, MER-11, MER-11-01, MER-08, MER-09
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { chromium } = require('playwright');

const rootUrl = process.env.WOW_MERCHANT_WEB_URL;
const exportDir = process.env.WOW_MERCHANT_WEB_EXPORT_DIR || path.resolve(__dirname, '../apps/merchant/dist');
const screenshotDir = path.resolve(__dirname, '../rendered_screenshots');
const fullPageScreenshotDir = path.resolve(__dirname, '../rendered_screenshots_full');

let staticServer = null;
let origin = rootUrl ? new URL(rootUrl).origin : null;
let browser = null;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

before(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(fullPageScreenshotDir)) {
    fs.mkdirSync(fullPageScreenshotDir, { recursive: true });
  }

  if (!rootUrl) {
    const root = path.resolve(exportDir);
    if (!fs.existsSync(path.join(root, 'index.html'))) {
      throw new Error(`Expo web export does not contain index.html at ${root}`);
    }

    staticServer = http.createServer((request, response) => {
      let requestedPath;
      try {
        requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      } catch {
        response.writeHead(400);
        response.end();
        return;
      }
      const relativePath = requestedPath.replace(/^\/+/, '');
      let target = path.resolve(root, relativePath);
      if (target !== root && !target.startsWith(root + path.sep)) {
        response.writeHead(403);
        response.end();
        return;
      }
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index.html');
      }
      if (!fs.existsSync(target) && !path.extname(target) && fs.existsSync(target + '.html')) {
        target += '.html';
      }
      if (!fs.existsSync(target)) {
        target = path.join(root, 'index.html');
      }
      try {
        response.setHeader(
          'Content-Type',
          mime[path.extname(target).toLowerCase()] || 'application/octet-stream'
        );
        fs.createReadStream(target)
          .on('error', () => {
            if (!response.headersSent) response.writeHead(500);
            response.end();
          })
          .pipe(response);
      } catch {
        response.writeHead(500);
        response.end();
      }
    });

    await new Promise((resolve) => {
      staticServer.listen(0, '127.0.0.1', () => {
        origin = `http://127.0.0.1:${staticServer.address().port}`;
        resolve();
      });
    });
  }

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
});

after(async () => {
  if (browser) await browser.close();
  if (staticServer) await new Promise((resolve) => staticServer.close(resolve));
});

const final8Screens = [
  { id: 'MER-12', path: '/business/account', name: 'Business Account & Revisions', screenshot: 'MER-12_LIGHT_PHONE.png' },
  { id: 'MER-07', path: '/business/branches', name: 'Branches Management', screenshot: 'MER-07_LIGHT_PHONE.png' },
  { id: 'MER-07-01', path: '/business/branches/editor', name: 'Branch Editor', screenshot: 'MER-07-01_LIGHT_PHONE.png' },
  { id: 'MER-10', path: '/business/subscription', name: 'Subscription & Entitlements', screenshot: 'MER-10_LIGHT_PHONE.png' },
  { id: 'MER-11', path: '/business/team', name: 'Team & Delegated Roles', screenshot: 'MER-11_LIGHT_PHONE.png' },
  { id: 'MER-11-01', path: '/business/team/editor', name: 'Team Permissions Editor', screenshot: 'MER-11-01_LIGHT_PHONE.png' },
  { id: 'MER-08', path: '/complaints', name: 'Merchant Complaints List', screenshot: 'MER-08_LIGHT_PHONE.png' },
  { id: 'MER-09', path: '/complaints/details', name: 'Complaint Details & Official Response', screenshot: 'MER-09_LIGHT_PHONE.png' },
];

for (const screen of final8Screens) {
  test(`PLAYWRIGHT GUEST: ${screen.id} (${screen.path}) gates real unauthenticated access`, async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const unintendedWrites = [];
    const runtimeErrors = [];

    page.on('pageerror', (err) => runtimeErrors.push(err.message));
    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();
      const tableMutation = /\/rest\/v1\//.test(url) && ['PATCH', 'PUT', 'DELETE'].includes(method);
      const postTable = /\/rest\/v1\//.test(url) && method === 'POST' && !/\/rpc\//.test(url);
      const mutationRpc =
        /\/rest\/v1\/rpc\/wow_(?:create|update|delete|save|submit|set|approve|reject|upload)/.test(url);
      if (tableMutation || postTable || mutationRpc) {
        unintendedWrites.push(`${method} ${new URL(url).pathname}`);
      }
    });

    try {
      const pageUrl = new URL(screen.path, origin);
      await page.goto(pageUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.getByText('تسجيل الدخول مطلوب').first().waitFor({ timeout: 20_000 });
      await page.getByRole('button', { name: 'تسجيل الدخول عبر Google' }).first().waitFor({ timeout: 10_000 });
      await page.getByRole('button', { name: 'تسجيل الدخول عبر Facebook' }).first().waitFor({ timeout: 10_000 });

      assert.equal(
        unintendedWrites.length,
        0,
        `Unexpected guest mutations on ${screen.path}: ${unintendedWrites.join(', ')}`
      );
      assert.deepEqual(runtimeErrors, [], `Browser runtime errors on ${screen.path}: ${runtimeErrors.join('; ')}`);
    } finally {
      await context.close();
    }
  });

  test(`PLAYWRIGHT PREVIEW & SCREENSHOT: ${screen.id} renders in 390x844 light mode`, async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (err) => runtimeErrors.push(err.message));

    try {
      const pageUrl = new URL(screen.path + '?preview=1', origin);
      await page.goto(pageUrl.href, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(1000); // Allow fonts and images to settle

      const screenshotPath = path.join(screenshotDir, screen.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      // Full-page diagnostic is separate from the required eight phone screenshots.
      await page.screenshot({
        path: path.join(fullPageScreenshotDir, screen.id + '_LIGHT_FULL_PAGE.png'),
        fullPage: true,
      });

      assert(fs.existsSync(screenshotPath), `Screenshot missing: ${screenshotPath}`);
      const stats = fs.statSync(screenshotPath);
      assert(stats.size > 10000, `Screenshot suspiciously small (${stats.size} bytes) for ${screen.id}`);
      assert.deepEqual(runtimeErrors, [], `Runtime errors in preview mode on ${screen.path}: ${runtimeErrors.join('; ')}`);
    } finally {
      await context.close();
    }
  });
}


test('PLAYWRIGHT INTERACTION: complaint filters show only selected status', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(new URL('/complaints?preview=1', origin).href, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'مغلقة' }).click();
    await page.getByText('CASE-008').waitFor();
    assert.equal(await page.getByText('CASE-018').count(), 0);
    await page.getByRole('tab', { name: 'الكل' }).click();
    await page.getByText('CASE-018').waitFor();
  } finally {
    await context.close();
  }
});

test('PLAYWRIGHT INTERACTION: delegated team active/former tabs remain separate', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(new URL('/business/team?preview=1', origin).href, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /السابقون/ }).click();
    await page.getByText('موظف سابق').waitFor();
    await page.getByRole('tab', { name: /النشطون/ }).click();
    await page.getByText('موظف المبيعات').waitFor();
  } finally {
    await context.close();
  }
});

test('PLAYWRIGHT INTERACTION: merchant reply requires explicit review before send', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(new URL('/complaints/details?preview=1', origin).href, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('رد موضوعي يستند إلى الوقائع المتاحة')
      .fill('أوضح تفاصيل العرض وسياسة السعر المعلن للإدارة.');
    await page.getByRole('button', { name: 'معاينة إرسال الرد' }).click();
    await page.getByText('تأكيد إرسال الرد للإدارة').waitFor();
    await page.getByRole('button', { name: 'تعديل الرد' }).click();
    assert.equal(await page.getByText('تم تسجيل الرد وإشعار فريق المراجعة الإدارية.').count(), 0);
  } finally {
    await context.close();
  }
});

test('PLAYWRIGHT RESPONSIVE: subscription card does not expand document horizontally', async () => {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme });
    const page = await context.newPage();
    try {
      await page.goto(new URL('/business/subscription?preview=1', origin).href, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        windowWidth: window.innerWidth,
      }));
      assert(metrics.documentWidth <= metrics.windowWidth + 2,
        `Subscription horizontal overflow in ${colorScheme} mode: ${JSON.stringify(metrics)}`);
    } finally {
      await context.close();
    }
  }
});

test('PLAYWRIGHT: Package all 8 screenshots into WOW_MERCHANT_FINAL_8_RENDERED_SCREENSHOTS.zip', () => {
  const zipPath = path.resolve(__dirname, '../WOW_MERCHANT_FINAL_8_RENDERED_SCREENSHOTS.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Create ZIP using standard zip command
  execSync(
    `cd "${screenshotDir}" && zip -9 "${zipPath}" MER-12_LIGHT_PHONE.png MER-07_LIGHT_PHONE.png MER-07-01_LIGHT_PHONE.png MER-10_LIGHT_PHONE.png MER-11_LIGHT_PHONE.png MER-11-01_LIGHT_PHONE.png MER-08_LIGHT_PHONE.png MER-09_LIGHT_PHONE.png`,
    { stdio: 'inherit' }
  );

  assert(fs.existsSync(zipPath), 'ZIP archive was not created');
  const zipStats = fs.statSync(zipPath);
  assert(zipStats.size > 50000, `ZIP archive size too small: ${zipStats.size}`);
});
