'use strict';
// Real running Expo Web application, real Clerk guest state, no preview=1 and NO cloud writes.
// Opt in: WOW_MERCHANT_WEB_URL=http://127.0.0.1:8081 node scripts/test-merchant-guest-playwright.cjs
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const rootUrl = process.env.WOW_MERCHANT_WEB_URL;
if (!rootUrl) throw new Error('WOW_MERCHANT_WEB_URL must point to a running merchant Expo web app.');
const origin = new URL(rootUrl).origin;
if (process.env.WOW_ALLOW_REMOTE_GUEST_TEST !== '1' && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) {
  throw new Error('Guest browser testing is limited to localhost by default.');
}

let browserPromise;
async function browser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true, args: ['--no-sandbox'] });
  return browserPromise;
}
after(async () => { if (browserPromise) await (await browserPromise).close(); });

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
      assert.equal(unintendedWrites.length, 0, `Unexpected guest mutations: ${unintendedWrites.join(', ')}`);
      assert.deepEqual(runtimeErrors, [], `Browser errors: ${runtimeErrors.join('; ')}`);
    } finally {
      await context.close();
    }
  });
}
