'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Contract tests run on Node without Expo; compile/runtime gates are separate.
const tokens = read('packages/theme/src/tokens.ts');
const blocks = tokens.match(/light:\s*\{([^}]+)\}\s*,\s*dark:\s*\{([^}]+)\}/s);
assert(blocks, 'Expected light/dark palettes in tokens.ts');
function parsePalette(block) {
  const entries = [...block.matchAll(/(\w+):\s*'(#[A-Fa-f0-9]{6})'/g)].map(([, key, value]) => [key, value]);
  return Object.fromEntries(entries);
}
function channel(n) {
  const v = n / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const n = [1, 3, 5].map(i => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
let checks = 0;
const pairs = [
  ['foreground', 'background'], ['foreground', 'surface'],
  ['mutedForeground', 'background'], ['mutedForeground', 'surface'],
  ['primaryForeground', 'primary'],
  ['success', 'successSurface'], ['warning', 'warningSurface'],
  ['danger', 'dangerSurface'], ['info', 'infoSurface'], ['neutral', 'neutralSurface'],
];
for (const [index, block] of [blocks[1], blocks[2]].entries()) {
  const palette = parsePalette(block);
  const mode = index ? 'dark' : 'light';
  for (const [fg, bg] of pairs) {
    assert(palette[fg] && palette[bg], `${mode}: ${fg}/${bg} missing`);
    const ratio = contrast(palette[fg], palette[bg]);
    assert(ratio >= 4.5, `${mode}: ${fg}/${bg} contrast ${ratio.toFixed(2)} below 4.5`);
    checks++;
  }
}
const text = read('packages/ui/src/AppText.tsx');
assert(!text.includes("${muted ? 'text-muted-foreground' : 'text-foreground'}"), 'Remove competing implicit text class');
assert(text.includes('useWowColors()') && text.includes('toneColors[selectedTone]'), 'Text should resolve semantic JS colors');
assert(text.includes('style={[rtlStyles.text, resolvedColor ? { color: resolvedColor } : undefined, style]}'), 'Caller style must override default color');
checks += 3;
const input = read('packages/ui/src/AppInput.tsx');
assert(input.includes('placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}'), 'Theme-aware placeholder required');
assert(input.includes('color: colors.foreground'), 'Theme-aware TextInput color required');
checks += 2;
const badge = read('packages/ui/src/Badge.tsx');
assert(badge.includes("tone={variant === 'primary' ? 'onPrimary' : 'default'}"), 'Badge must use semantic foreground');
checks++;
const gallery = read('apps/customer/src/app/design-preview.tsx');
assert(gallery.includes('<V07ThemeAudit />'), 'Gallery must mount theme audit');
checks++;
console.log(`WOW UI V0.7: ${checks} static and WCAG AA contrast checks passed`);
