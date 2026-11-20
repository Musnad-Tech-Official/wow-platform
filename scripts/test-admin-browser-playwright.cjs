// Real Expo Web smoke for Admin Batch 01. Tests development-only fixture rendering,
// React hydration, mobile overflow, and production preview URL denial.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = process.env.WOW_ADMIN_WEB_EXPORT_DIR;
const production = process.env.WOW_EXPECT_PRODUCTION_PREVIEW_DENIED === '1';
if (!root || !fs.existsSync(path.join(root, 'index.html'))) {
  throw new Error('WOW_ADMIN_WEB_EXPORT_DIR must point to a fresh Expo Web export.');
}
const rootPath = path.resolve(root);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://127.0.0.1'); }
  catch { res.writeHead(400); res.end(); return; }
  let route;
  try { route = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400); res.end('Invalid path'); return; }
  const rawPath = path.resolve(rootPath, '.' + (route === '/' ? '/index.html' : route));
  if (!rawPath.startsWith(rootPath + path.sep)) {
    res.writeHead(403); res.end(); return;
  }
  let pathname = rawPath;
  if (!path.extname(pathname)) {
    if (fs.existsSync(pathname + '.html')) {
      pathname += '.html';
    } else if (fs.existsSync(path.join(pathname, 'index.html'))) {
      pathname = path.join(pathname, 'index.html');
    } else if (new RegExp('^/verification/[0-9a-f-]{36}$', 'i').test(route) ||
               new RegExp('^/offer-review/[0-9a-f-]{36}$', 'i').test(route) ||
               new RegExp('^/complaints/[0-9a-f-]{36}$', 'i').test(route)) {
      // Expo static HTML cannot preregister an arbitrary verification UUID;
      // the actual client router still enforces the protected route guard.
      pathname = path.join(rootPath, 'index.html');
    }
  }
  if (!fs.existsSync(pathname) || !fs.statSync(pathname).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(pathname)] || 'application/octet-stream' });
  fs.createReadStream(pathname).pipe(res);
});

const tests = [
  ['/?preview=adm01', 'الدخول إلى منصة الإدارة', 1440],
  ['/?preview=adm02', production ? 'الدخول إلى منصة الإدارة' : 'نظرة واضحة على ما يحتاج إجراء', 1440],
  ['/roles?preview=adm14', production ? 'الدخول إلى منصة الإدارة' : 'المشرفون وأدوار الإدارة', 1440],
  ['/roles?preview=adm14-gap', production ? 'الدخول إلى منصة الإدارة' : 'حالة اختبار القيود', 1440],
  ['/?preview=adm02', production ? 'الدخول إلى منصة الإدارة' : 'نظرة واضحة على ما يحتاج إجراء', 390],
  ['/roles?preview=adm14', production ? 'الدخول إلى منصة الإدارة' : 'المشرفون وأدوار الإدارة', 390],
  // W06 pages are never unlocked by guest links, including dev-only preview fixtures.
  ['/verifications?preview=adm02', 'الدخول إلى منصة الإدارة', 1440],
  ['/profile-revisions?preview=adm14', 'الدخول إلى منصة الإدارة', 1440],
  ['/payments?preview=adm02', 'الدخول إلى منصة الإدارة', 390],
  ['/verification/00000000-0000-0000-0000-000000000000?preview=adm14', 'الدخول إلى منصة الإدارة', 1440],
  // W07 routes must stay fail-closed, including development preview query parameters.
  ['/offer-review?preview=adm02', 'الدخول إلى منصة الإدارة', 1440],
  ['/categories?preview=adm14', 'الدخول إلى منصة الإدارة', 390],
  ['/offer-review/00000000-0000-0000-0000-000000000000?preview=adm02', 'الدخول إلى منصة الإدارة', 390],
  ['/offer-review', 'الدخول إلى منصة الإدارة', 390],
  ['/categories', 'الدخول إلى منصة الإدارة', 1440],
  ['/offer-review/00000000-0000-0000-0000-000000000000', 'الدخول إلى منصة الإدارة', 1440],
  // W08 complaint and rating routes must deny unsigned guests.
  ['/complaints', 'الدخول إلى منصة الإدارة', 1440],
  ['/ratings', 'الدخول إلى منصة الإدارة', 390],
  ['/complaints/00000000-0000-0000-0000-000000000000', 'الدخول إلى منصة الإدارة', 1440],
  // Direct guest navigation must be denied too, even without forged preview parameters.
  ['/verifications', 'الدخول إلى منصة الإدارة', 390],
  ['/profile-revisions', 'الدخول إلى منصة الإدارة', 1440],
  ['/payments', 'الدخول إلى منصة الإدارة', 390],
  ['/verification/00000000-0000-0000-0000-000000000000', 'الدخول إلى منصة الإدارة', 1440],
];

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const [url, expected, width] of tests) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && /hydration|uncaught|error during hydration/i.test(message.text())) {
          errors.push(message.text());
        }
      });
      try {
        const response = await page.goto(base + url, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, 'HTML route should load');
        await page.waitForTimeout(600);
        const body = await page.locator('body').innerText();
        assert(body.includes(expected), url + ' did not render expected screen: ' + expected);
        assert(!/Hydration failed|server rendered HTML didn't match|Uncaught Error/i.test(body),
          url + ' shows a React runtime error overlay');
        if (production) {
          assert(!body.includes('المشرفون وأدوار الإدارة'), 'Production guest saw roles content');
          assert(!body.includes('نظرة واضحة على ما يحتاج إجراء'), 'Production guest saw dashboard');
        }
        if (width === 390) {
          const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > window.innerWidth + 2);
          assert(!overflow, url + ' has horizontal overflow at 390px');
          if (!production && url.startsWith('/roles?preview=adm14')) {
            // A one-line breadcrumb can be truncated without changing document.scrollWidth.
            const title = page.getByText('المشرفون والصلاحيات', { exact: true });
            assert.equal(await title.count(), 1, 'ADM-14 mobile breadcrumb should be present once');
            const textFits = await title.evaluate((element) =>
              element.scrollWidth <= element.clientWidth + 2);
            assert(textFits, 'ADM-14 mobile breadcrumb title was truncated at 390px');
            for (const mode of ['فاتح', 'تلقائي', 'داكن']) {
              const control = page.locator('[aria-label="المظهر: ' + mode + '"]');
              assert.equal(await control.count(), 1, 'Mobile theme mode must remain accessible: ' + mode);
            }
          }
        }
        assert.deepEqual(errors, [], url + ' generated runtime/hydration errors');
        console.log('PASS', production ? 'production' : 'development', width, url);
      } finally {
        await page.close();
      }
    }
    // NativeWind v5 web dark: utilities track the OS preference. The WOW theme
    // switch must not leave a dark canvas behind after selecting manual Light.
    if (!production) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      });
      try {
        const verifyCanvas = async (testId, expectedColor) => {
          await page.waitForFunction(({ testId, expectedColor }) => {
            const canvas = document.querySelector('[data-testid="' + testId + '"]');
            return canvas && getComputedStyle(canvas).backgroundColor === expectedColor;
          }, { testId, expectedColor }, { timeout: 15000 });
        };
        await page.goto(base + '/?preview=adm02', { waitUntil: 'networkidle' });
        await page.getByText('نظرة واضحة على ما يحتاج إجراء', { exact: true }).waitFor();
        await verifyCanvas('wow-admin-canvas', 'rgb(16, 16, 20)');
        await page.getByRole('button', { name: 'المظهر: فاتح' }).click();
        await verifyCanvas('wow-admin-canvas', 'rgb(246, 247, 246)');
        await page.getByRole('button', { name: 'المظهر: داكن' }).click();
        await verifyCanvas('wow-admin-canvas', 'rgb(16, 16, 20)');
        console.log('PASS development: manual theme overrides dark system preference on Admin canvas');

        await page.goto(base + '/?preview=adm01', { waitUntil: 'networkidle' });
        await page.getByText('الدخول إلى منصة الإدارة', { exact: true }).waitFor();
        await verifyCanvas('wow-admin-login-canvas', 'rgb(16, 16, 20)');
        await page.getByRole('button', { name: 'المظهر: فاتح' }).click();
        await verifyCanvas('wow-admin-login-canvas', 'rgb(246, 247, 246)');
        console.log('PASS development: manual Light overrides dark system preference on login canvas');
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((err) => { console.error(err); process.exitCode = 1; server.close(); });
