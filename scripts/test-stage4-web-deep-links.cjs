'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');

// Production web routes can have UUIDs not known at export time. In Expo SDK 58
// static exports require generated params; a single-page export must be hosted
// behind an SPA history-fallback rewrite.
for (const app of ['customer', 'merchant', 'admin']) {
  test('AUD-052: ' + app + ' exports an SPA for arbitrary deep-link IDs', () => {
    const config = JSON.parse(read('apps/' + app + '/app.json'));
    assert.equal(config.expo.web.output, 'single');
    assert(config.expo.plugins.some(x => x === 'expo-router'));
  });
}

test('AUD-052: customer dynamic business, offer and complaint screens remain routable', () => {
  for (const path of [
    'apps/customer/src/app/business/[id].tsx',
    'apps/customer/src/app/offer/[id].tsx',
    'apps/customer/src/app/offer/[id]/complaint.tsx',
    'apps/customer/src/app/complaints/[id].tsx',
  ]) {
    assert(existsSync(resolve(root, path)), 'Missing deep-link route: ' + path);
  }
});

test('AUD-052: web deployment contract requires SPA fallback and explicitly gates hosting acceptance', () => {
  const doc = read('docs/implementation/stage4-aud052-web-spa-routing.md');
  assert.match(doc, /rewrite/);
  assert.match(doc, /index\.html/);
  assert.match(doc, /200/);
  assert.match(doc, /NOT VERIFIED/);
});
