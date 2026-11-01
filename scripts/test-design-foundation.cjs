/* Contract and asset-integrity checks. No database, network or user data. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const content = (path) => readFileSync(resolve(root, path), 'utf8');

test('approved yellow is the single light/dark token and CSS default', () => {
  const ts = content('packages/theme/src/tokens.ts');
  const css = content('packages/theme/theme.css');
  assert.equal((ts.match(/primary: '#FACC15'/g) || []).length, 2);
  assert.match(css, /--color-primary: #facc15/);
  assert.doesNotMatch(ts, /#F5B700|#FFD23F/);
});

test('all packaged media files match the recorded SHA256 manifest', () => {
  const manifest = JSON.parse(content('packages/assets/asset-manifest.json'));
  const paths = manifest.items;
  assert.ok(Array.isArray(paths) && paths.length >= 20, 'asset manifest must enumerate actual files');
  for (const item of paths) {
    assert.ok(typeof item.targetPath === 'string' && typeof item.sha256 === 'string');
    const f = resolve(root, 'packages/assets', item.targetPath);
    assert.ok(existsSync(f), `Missing asset: ${item.targetPath}`);
    const digest = createHash('sha256').update(readFileSync(f)).digest('hex');
    assert.equal(digest, item.sha256, `Changed approved asset: ${item.targetPath}`);
  }
});

test('static require paths exist, are Metro-friendly and avoid remote URLs', () => {
  const registryPath = 'packages/assets/src/index.ts';
  const registry = content(registryPath);
  const paths = [...registry.matchAll(/require\(["']([^"']+)["']\)/g)].map(x => x[1]);
  assert.ok(paths.length >= 25);
  for (const path of paths) assert.ok(existsSync(resolve(root, 'packages/assets/src', path)), path);
  assert.doesNotMatch(registry, /https?:\/\//);
});

test('responsive logic is by viewport, not web-only platform label', () => {
  assert.match(content('packages/theme/src/useWowViewport.ts'), /useWindowDimensions/);
  assert.match(content('packages/ui/src/PageScaffold.tsx'), /pageMaxWidth\[app\]/);
});
