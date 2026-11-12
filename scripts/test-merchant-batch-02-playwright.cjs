// scripts/test-merchant-batch-02-playwright.cjs
// Playwright Browser Test for MUSNAD-WOW Merchant Batch 02 (MER-05-01 through MER-06)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const rootUrl = process.env.WOW_MERCHANT_WEB_URL;
const exportDir = process.env.WOW_MERCHANT_WEB_EXPORT_DIR || path.resolve(__dirname, '../apps/merchant/dist');

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

const batch02Routes = [
  ['/offers/editor', 'MER-05-01 Offer Definition'],
  ['/offers/editor/pricing', 'MER-05-02 Offer Pricing & Terms'],
  ['/offers/editor/branches', 'MER-05-03 Offer Branches & Dates'],
  ['/offers/editor/evidence', 'MER-05-04 Offer Private Evidence'],
  ['/offers/editor/review', 'MER-05-05 Offer Review & Submit'],
  ['/offers/details', 'MER-06 Offer Details & Review Status'],
];

for (const [pathname, name] of batch02Routes) {
  test(`PLAYWRIGHT: ${name} (${pathname}) gates real guest access with sign-in boundary`, async () => {
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
      const pageUrl = new URL(pathname, origin);
      await page.goto(pageUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.getByText('تسجيل الدخول مطلوب').first().waitFor({ timeout: 20_000 });
      await page.getByRole('button', { name: 'تسجيل الدخول عبر Google' }).first().waitFor({ timeout: 10_000 });
      await page.getByRole('button', { name: 'تسجيل الدخول عبر Facebook' }).first().waitFor({ timeout: 10_000 });

      assert.equal(
        unintendedWrites.length,
        0,
        `Unexpected guest mutations on ${pathname}: ${unintendedWrites.join(', ')}`
      );
      assert.deepEqual(runtimeErrors, [], `Browser runtime errors on ${pathname}: ${runtimeErrors.join('; ')}`);
    } finally {
      await context.close();
    }
  });
}

