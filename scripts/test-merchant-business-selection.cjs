'use strict';
// Runs with Node 22 --experimental-strip-types against the real TS selection engine.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { resolveMerchantBusinessId } = require('../apps/merchant/src/features/business/context/merchant-business-selection.ts');

const selected = (overrides = {}) => resolveMerchantBusinessId({
  allowedBusinessIds: ['business-a', 'business-b'],
  routeBusinessId: null,
  selectedBusinessId: null,
  selectionBelongsToSession: false,
  isSignedIn: true,
  isSyntheticPreview: false,
  ...overrides,
});

test('AUD-048: authorized deep-link ID takes precedence over a stale local selection', () => {
  assert.equal(selected({
    routeBusinessId: 'business-b',
    selectedBusinessId: 'business-a',
    selectionBelongsToSession: true,
  }), 'business-b');
});

test('AUD-048: unknown deep-link ID never silently picks a different merchant', () => {
  assert.equal(selected({ routeBusinessId: 'forged-business' }), null);
  assert.equal(selected({ routeBusinessId: 'forged-business', selectedBusinessId: 'business-a',
    selectionBelongsToSession: true }), null);
});

test('AUD-048: local selection survives only within its exact session scope', () => {
  assert.equal(selected({ selectedBusinessId: 'business-b', selectionBelongsToSession: true }), 'business-b');
  assert.equal(selected({ selectedBusinessId: 'business-b', selectionBelongsToSession: false }), 'business-a');
  assert.equal(selected({ selectedBusinessId: 'forged-business', selectionBelongsToSession: true }), 'business-a');
});

test('AUD-048: sign-out clears effective selection irrespective of cached list or URL', () => {
  assert.equal(selected({ isSignedIn: false, routeBusinessId: 'business-a' }), null);
  assert.equal(selected({ isSignedIn: false, selectedBusinessId: 'business-b',
    selectionBelongsToSession: true }), null);
});

test('AUD-048: preview uses explicitly permitted fixtures but never forged IDs', () => {
  assert.equal(selected({ isSignedIn: false, isSyntheticPreview: true,
    routeBusinessId: 'business-b' }), 'business-b');
  assert.equal(selected({ isSignedIn: false, isSyntheticPreview: true,
    routeBusinessId: 'forged-business' }), null);
});

test('AUD-048: source updates the browser URL and Clerk-session selection together', () => {
  const s = readFileSync(resolve(__dirname,
    '../apps/merchant/src/features/business/context/ActiveBusinessContext.tsx'),'utf8');
  assert.match(s, /sessionScopeKey = isSignedIn && userId && sessionId/);
  assert.match(s, /selectionBelongsToSession: selection\.sessionScopeKey === sessionScopeKey/);
  assert.match(s, /router\.setParams\(\{ businessId: id \}\)/);
  assert.match(s, /if \(id && !businesses\.some/);
});
