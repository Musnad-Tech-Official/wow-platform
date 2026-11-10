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
      assert.equal(pageUrl.searchParams.get('preview'), null);
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
