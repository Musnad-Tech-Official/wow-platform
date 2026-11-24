'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

// The currently connected Clerk Development allowlist has been independently
// read via the Clerk API. This source test prevents accidental app-side drift;
// it cannot replace a future live Clerk allowlist query or OAuth E2E session.
const contracts = [
  { app: 'customer', path: 'sso-callback', source: 'apps/customer/src/app/sign-in.tsx' },
  { app: 'merchant', path: 'oauth-callback', source: 'apps/merchant/src/features/navigation/MerchantRouteGate.tsx' },
  { app: 'admin', path: 'oauth-callback', source: 'apps/admin/src/features/screens/AdminAccessScreen.tsx' },
];

for (const { app, path, source } of contracts) {
  test('AUD-058: ' + app + ' uses approved Clerk native return path', () => {
    const json = JSON.parse(read('apps/' + app + '/app.json'));
    assert.equal(json.expo.scheme, app);
    const login = read(source);
    const callback = read('apps/' + app + '/src/app/' + path + '.tsx');
    assert(login.includes("scheme: '" + app + "'"));
    assert(login.includes("path: '" + path + "'"));
    assert(login.includes('AuthSession.makeRedirectUri'));
    assert(callback.includes('WebBrowser.maybeCompleteAuthSession()'),
      'Expo web popup completion must be performed by the callback');
    assert(callback.includes("Platform.OS !== 'web'"),
      'Native completion must stay gated from the web popup');
    assert(callback.includes('isSignedIn'),
      'Callback must never grant a session from URL query parameters');
  });
}

test('AUD-058: redirect contract matches recorded Clerk Development allowlist', () => {
  const doc = read('docs/implementation/stage4-aud059-clerk-auth-policy.md');
  for (const { app, path } of contracts) {
    assert(doc.includes(app + '://' + path));
  }
  assert.match(doc, /D-02 is approved by the product owner: Google\/Facebook-only for the first release/);
  assert.match(doc, /Implementation alignment remains open/);
  assert.match(doc, /safe transition and signed-session tests/);
});
