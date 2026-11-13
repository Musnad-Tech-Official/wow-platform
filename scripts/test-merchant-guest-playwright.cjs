'use strict';
// Real running Expo Web application, real Clerk guest state, no preview=1 and NO cloud writes.
// Opt in: WOW_MERCHANT_WEB_URL=http://127.0.0.1:8081 node scripts/test-merchant-guest-playwright.cjs
const { test, before, after } = require('node:test');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const rootUrl = process.env.WOW_MERCHANT_WEB_URL;
const exportDir = process.env.WOW_MERCHANT_WEB_EXPORT_DIR;
const expectProductionPreviewDenied = process.env.WOW_EXPECT_PRODUCTION_PREVIEW_DENIED === '1';
if (!rootUrl && !exportDir) {
  throw new Error('Provide WOW_MERCHANT_WEB_URL or WOW_MERCHANT_WEB_EXPORT_DIR.');
}
let origin = rootUrl ? new URL(rootUrl).origin : null;
if (rootUrl && process.env.WOW_ALLOW_REMOTE_GUEST_TEST !== '1' &&
    !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) {
  throw new Error('Guest browser testing is limited to localhost by default.');
}

let staticServer = null;
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
  if (!exportDir) return;
  const root = path.resolve(exportDir);
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    throw new Error('Expo web export does not contain index.html.');
  }
  staticServer = http.createServer((request, response) => {
    let requestedPath;
    try { requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); response.end(); return; }
    const relativePath = requestedPath.replace(/^\/+/, '');
    let target = path.resolve(root, relativePath);
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403); response.end(); return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target) && !path.extname(target) && fs.existsSync(target + '.html')) target += '.html';
    if (!fs.existsSync(target)) target = path.join(root, 'index.html');
    try {
      response.setHeader('Content-Type', mime[path.extname(target).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(target).on('error', () => { if (!response.headersSent) response.writeHead(500); response.end(); }).pipe(response);
    } catch { response.writeHead(500); response.end(); }
  });
  await new Promise((resolve, reject) => {
    staticServer.once('error', reject);
    staticServer.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${staticServer.address().port}`;
});
let browserPromise;
async function browser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true, args: ['--no-sandbox'] });
  return browserPromise;
}
after(async () => {
  if (browserPromise) await (await browserPromise).close();
  if (staticServer) await new Promise(resolve => staticServer.close(resolve));
});

const routes = [
  ['/', 'MER-03'],
  ['/offers', 'MER-04'],
  ['/business/onboarding', 'MER-02-01'],
  ['/business/onboarding/representative', 'MER-02-02'],
  ['/business/onboarding/branches', 'MER-02-03'],
  ['/business/onboarding/review', 'MER-02-04'],
  ['/business/onboarding/status', 'MER-02-05'],
];

for (const [pathname, screen] of routes) {
  test(`${screen}: real guest cannot access merchant workspace (${pathname})`, async () => {
    const context = await (await browser()).newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const unintendedWrites = [];
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('request', request => {
      const url = request.url();
      const method = request.method();
      const tableMutation = /\/rest\/v1\//.test(url) && ['PATCH', 'PUT', 'DELETE'].includes(method);
      const postTable = /\/rest\/v1\//.test(url) && method === 'POST' && !/\/rpc\//.test(url);
      const mutationRpc = /\/rest\/v1\/rpc\/wow_(?:create|update|delete|save|submit|set|approve|reject|upload)/.test(url);
      if (tableMutation || postTable || mutationRpc) unintendedWrites.push(`${method} ${new URL(url).pathname}`);
    });
    try {
      const pageUrl = new URL(pathname, origin);
      if (expectProductionPreviewDenied) pageUrl.searchParams.set('preview', '1');
      assert.equal(pageUrl.searchParams.get('preview'), expectProductionPreviewDenied ? '1' : null);
      await page.goto(pageUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.getByText('تسجيل الدخول مطلوب').first().waitFor({ timeout: 20_000 });
      await page.getByRole('button', { name: 'تسجيل الدخول عبر Google' }).first().waitFor({ timeout: 10_000 });
      await page.getByRole('button', { name: 'تسجيل الدخول عبر Facebook' }).first().waitFor({ timeout: 10_000 });
      assert.equal(unintendedWrites.length, 0, `Unexpected guest mutations: ${unintendedWrites.join(', ')}`);
      assert.deepEqual(runtimeErrors, [], `Browser errors: ${runtimeErrors.join('; ')}`);
    } finally {
      await context.close();
    }
  });
}


// Synthetic rendering checks complement, but never replace, authenticated E2E.
const previewScreens = [
  ['/business/onboarding', 'لنبدأ بإضافة نشاطك التجاري', 'MER-02-01'],
  ['/business/onboarding/representative', 'حدّد ممثلك المفوض', 'MER-02-02'],
  ['/business/onboarding/branches', 'أضف فروع نشاطك', 'MER-02-03'],
  ['/business/onboarding/review', 'ملخص الطلب', 'MER-02-04'],
  ['/business/onboarding/status', 'حالة التأهيل', 'MER-02-05'],
];
for (const [pathname, expected, name] of previewScreens) {
  test(name + ': development preview renders without cloud writes', { skip: expectProductionPreviewDenied }, async () => {
    const context = await (await browser()).newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const unintendedWrites = [];
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('request', request => {
      const url = request.url();
      const method = request.method();
      const postTable = /\/rest\/v1\//.test(url) && method === 'POST' && !/\/rpc\//.test(url);
      const tableWrite = /\/rest\/v1\//.test(url) && ['PATCH','PUT','DELETE'].includes(method);
      const writeRpc = method === 'POST' && /\/rest\/v1\/rpc\/wow_(?:create|update|delete|save|submit|set|approve|reject|upload)/.test(url);
      if (postTable || tableWrite || writeRpc) unintendedWrites.push(method+' '+new URL(url).pathname);
    });
    try {
      const url = new URL(pathname, origin);
      url.searchParams.set('preview', '1');
      url.searchParams.set('businessId', 'dev-synthetic-business-uuid');
      await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.getByText(expected, { exact: false }).first().waitFor({ timeout: 20_000 });
      assert.deepEqual(unintendedWrites, [], 'Synthetic preview attempted a cloud mutation.');
      assert.deepEqual(runtimeErrors, [], 'Preview browser runtime errors.');
    } finally {
      await context.close();
    }
  });
}

test('MER-01-02 account recovery is reachable from unauthenticated merchant sign-in', async () => {
  const context = await (await browser()).newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  try {
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.getByRole('button', { name: 'استعادة الوصول إلى الحساب' }).waitFor({ timeout: 20_000 });
    await page.getByRole('button', { name: 'استعادة الوصول إلى الحساب' }).click();
    await page.getByText('استعادة الوصول إلى حساب التاجر').waitFor({ timeout: 20_000 });
    await page.getByRole('button', { name: 'استعادة حساب Google' }).waitFor();
    await page.getByRole('button', { name: 'استعادة حساب Facebook' }).waitFor();
    await page.getByText(/لا تعيد ملكية نشاط أو تفويضًا ملغى/).waitFor();
    assert.deepEqual(runtimeErrors, [], 'Recovery page must have no runtime errors');
  } finally {
    await context.close();
  }
});
