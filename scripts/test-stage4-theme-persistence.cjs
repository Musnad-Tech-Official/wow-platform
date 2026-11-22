'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const {
  WOW_THEME_STORAGE_KEY,
  parseThemePreference,
  resolveThemePreference,
} = require('../packages/theme/src/theme-preference.ts');

test('AUD-039: only three supported persisted modes are accepted', () => {
  assert.equal(WOW_THEME_STORAGE_KEY, 'wow.theme.mode.v1');
  for (const mode of ['light', 'dark', 'system']) {
    assert.equal(parseThemePreference(mode), mode);
  }
  for (const invalid of [null, undefined, '', 'DARK', 'unexpected', '{}']) {
    assert.equal(parseThemePreference(invalid), 'system');
  }
});

test('AUD-039: explicit modes override system; system tracks OS theme', () => {
  assert.equal(resolveThemePreference('light', 'dark'), 'light');
  assert.equal(resolveThemePreference('dark', 'light'), 'dark');
  assert.equal(resolveThemePreference('system', 'dark'), 'dark');
  assert.equal(resolveThemePreference('system', 'light'), 'light');
  assert.equal(resolveThemePreference('system', null), 'light');
});

test('AUD-039: provider restores before rendering; storage failures are safe', () => {
  const s = read('packages/theme/src/ThemeProvider.tsx');
  assert.match(s, /if \(!hasHydrated\) return null/);
  assert.match(s, /storage\.getItemAsync\(WOW_THEME_STORAGE_KEY\)/);
  assert.match(s, /storage\.setItemAsync\(WOW_THEME_STORAGE_KEY, next\)/);
  assert.match(s, /window\.localStorage\.getItem\(WOW_THEME_STORAGE_KEY\)/);
  assert.match(s, /window\.localStorage\.setItem\(WOW_THEME_STORAGE_KEY, next\)/);
  assert.match(s, /if \(!active\) return/);
  assert.match(s, /Appearance\.setColorScheme\(mode === 'system' \? 'unspecified' : mode\)/);
  assert.match(s, /document\.documentElement\.classList\.toggle\('dark', isDark\)/);
  assert.match(s, /className=\{resolvedTheme === 'dark' \? 'dark' : 'light'\}/);
});

test('AUD-039: web class-driven dark variant and CSS variables match palette', () => {
  const css = read('packages/theme/theme.css');
  const tokens = read('packages/theme/src/tokens.ts');
  assert(css.includes('@custom-variant dark (&:where(.dark, .dark *));'));
  assert(css.includes(':root.dark {'));
  assert(tokens.includes("background: '#101014'"));
  assert(css.includes('--color-background: #101014;'));
  assert(css.includes('--color-foreground: #fafafa;'));
});

for (const app of ['customer', 'merchant', 'admin']) {
  test('AUD-039: ' + app + ' uses existing native preference store', () => {
    const s = read('apps/' + app + '/src/app/_layout.tsx');
    assert(s.includes("import * as SecureStore from 'expo-secure-store';"));
    assert(s.includes('<ThemeProvider storage={SecureStore}>'));
    const pkg = JSON.parse(read('apps/' + app + '/package.json'));
    assert(pkg.dependencies['expo-secure-store']);
  });
}
