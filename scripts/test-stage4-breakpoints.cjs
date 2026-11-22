'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = (path) => readFileSync(resolve(__dirname, '..', path), 'utf8');

test('AUD-062: responsive utility breakpoints match JS layout contract at boundary widths', () => {
  const ts = read('packages/theme/src/tokens.ts');
  const css = read('packages/theme/theme.css');
  const keys = [
    ['sm', 'compact'],
    ['md', 'desktop'],
    ['lg', 'wide'],
  ];
  const pairs = keys.map(([className, name]) => {
    const tsMatch = ts.match(new RegExp('\\b' + name + ':\\s*(\\d+)'));
    const cssMatch = css.match(new RegExp('--breakpoint-' + className + ':\\s*([\\d.]+)rem'));
    assert(tsMatch, 'Missing JS breakpoint: ' + name);
    assert(cssMatch, 'Missing CSS breakpoint: ' + className);
    const jsPx = Number(tsMatch[1]);
    const cssPx = Number(cssMatch[1]) * 16;
    assert.equal(cssPx, jsPx, className + ' should match ' + name);
    return cssPx;
  });
  assert.deepEqual(pairs, [600, 1024, 1440]);
  for (const width of [599, 600, 639, 640, 1023, 1024, 1439, 1440]) {
    assert.equal(width >= pairs[0], width >= 600, 'sm mismatch at ' + width);
    assert.equal(width >= pairs[1], width >= 1024, 'md mismatch at ' + width);
    assert.equal(width >= pairs[2], width >= 1440, 'lg mismatch at ' + width);
  }
  const xl = css.match(/--breakpoint-xl:\s*([\d.]+)rem/);
  const xxl = css.match(/--breakpoint-2xl:\s*([\d.]+)rem/);
  assert(xl && xxl, 'Keep higher utility breakpoints explicit');
  assert(Number(xl[1]) > 90 && Number(xxl[1]) > Number(xl[1]), 'CSS breakpoints must be monotonic');
});

test('AUD-062: Admin desktop shell and auth panel switch at JS desktop width', () => {
  const shell = read('apps/admin/src/features/shell/AdminShell.tsx');
  const access = read('apps/admin/src/features/screens/AdminAccessScreen.tsx');
  assert.match(shell, /className="hidden md:flex"/);
  assert.match(shell, /absolute inset-0 z-50 flex-row md:hidden/);
  assert.match(shell, /bg-surface flex md:hidden/);
  assert.doesNotMatch(shell, /hidden lg:flex|flex-row lg:hidden/);
  assert.match(access, /md:flex-row md:min-h-\[580px\]/);
  assert.match(access, /md:w-5\/12/);
  assert.match(access, /md:w-7\/12/);
});
