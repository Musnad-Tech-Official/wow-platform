'use strict';
// AUD-052 / Stage 4 gate: test a REAL compiled Customer Expo web SPA.
// Does not use preview fixtures, test-user credentials or mutating APIs.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const exportDir = process.env.WOW_CUSTOMER_WEB_EXPORT_DIR;
if (!exportDir) throw new Error('WOW_CUSTOMER_WEB_EXPORT_DIR is required: supply a fresh Customer Expo Web export.');
const root = path.resolve(exportDir);
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Customer export must contain index.html.');

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
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

let server;
let browser;
let origin;

before(async () => {
  server = http.createServer((req, res) => {
    let route;
    try { route = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400); res.end('Malformed request path'); return; }
    if (route.includes('\0')) { res.writeHead(400); res.end('Invalid path'); return; }

    const candidate = path.resolve(root, '.' + route);
    if (candidate !== root && !candidate.startsWith(root + path.sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    let target = candidate;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    if (!fs.existsSync(target) && !path.extname(route)) {
      // The production CDN must perform this same history-fallback rewrite
      // for application route paths, not for missing JS/CSS/image assets.
      target = path.join(root, 'index.html');
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(target).on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }).pipe(res);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

test('AUD-052: unknown-at-build-time Customer URLs serve SPA HTML; assets keep 404', async () => {
  const id = '11111111-2222-4333-8444-555555555555';
  for (const route of ['/business/' + id, '/offer/' + id, '/complaints/' + id, '/offer/' + id + '/complaint']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route + ' must return the SPA document');
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const body = await response.text();
    assert.match(body, /<html|<!doctype html/i, 'Application route should return actual HTML');
  }
  const missingAsset = await fetch(origin + '/_expo/does-not-exist-stage4.js');
  assert.equal(missingAsset.status, 404, 'Missing JS assets must never return index.html');
});

for (const [route, width] of [
  ['/business/11111111-2222-4333-8444-555555555555', 390],
  ['/offer/11111111-2222-4333-8444-555555555555', 1440],
  ['/complaints/11111111-2222-4333-8444-555555555555', 390],
]) {
  test('AUD-052: fresh unauthenticated Customer deep link is gated by onboarding: ' + route, async () => {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => {
      const url = req.url();
      if (!/\/rest\/v1\//.test(url)) return;
      const method = req.method();
      if (['PUT', 'PATCH', 'DELETE'].includes(method) ||
          (method === 'POST' && !/\/rest\/v1\/rpc\//.test(url))) {
        writes.push(method + ' ' + new URL(url).pathname);
      }
    });
    try {
      const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      assert.equal(response.status(), 200, 'Direct navigation must serve actual exported SPA');
      await page.waitForURL(url => url.pathname === '/welcome', { timeout: 30_000 });
      assert.deepEqual(errors, [], 'Guest deep link caused an uncaught React error');
      assert.deepEqual(writes, [], 'Unauthenticated onboarding attempted a database mutation');
      assert(!page.url().includes('preview='), 'No synthetic preview may unlock real routes');
    } finally {
      await context.close();
    }
  });
}

test('AUD-052: production-style forged preview cannot bypass Customer onboarding', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(origin + '/offer/11111111-2222-4333-8444-555555555555?preview=1',
      { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForURL(url => url.pathname === '/welcome', { timeout: 30_000 });
  } finally {
    await context.close();
  }
});
