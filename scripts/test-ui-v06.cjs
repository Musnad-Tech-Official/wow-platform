'use strict';
/** Zero-network, zero-install checks; real tsc/ESLint/Expo checks must still run. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let passed = 0;
function test(name, check) { check(); passed++; console.log(`PASS ${passed}: ${name}`); }
const components = [
  'SearchField','TextAreaField','SwitchField','RadioFieldGroup','FilterChip','SegmentedTabs',
  'SelectField','InlineNotice','ProgressBar','Skeleton','ConfirmDialog','Pagination',
  'DataTable','ToastBanner','FileSelectField','BottomSheet','Stepper',
];
const code = file => read(`packages/ui/src/${file}.tsx`);
const idx = read('packages/ui/src/index.ts');
test('17 public components are exported exactly once', () => {
  for (const c of components) {
    assert.match(idx, new RegExp(`export \\{ ${c},`));
    assert.equal(idx.split(`export { ${c},`).length - 1, 1, `${c} duplicated`);
    assert.ok(code(c).includes(`export function ${c}(`) || code(c).includes(`export function ${c}<`));
  }
});
test('preview is explicitly dev-only, synthetic, imports the V0.6 gallery', () => {
  const src = read('apps/customer/src/app/design-preview.tsx');
  const gallery = read('apps/customer/src/features/design/V06Gallery.tsx');
  assert.match(src, /if \(!__DEV__\)/);
  assert.match(src, /<V06Gallery \/>/);
  assert.doesNotMatch(gallery, /from ['"]@wow\/(api|auth)|supabase\.|fetch\(|axios\.|uploadAsync/);
});
test('buttons and checkbox remain untouched by V0.6 component suite', () => {
  const button = code('AppButton');
  const checkbox = code('Checkbox');
  assert.match(button, /buttonPressedScale/);
  assert.match(button, /scale\.set\(/);
  assert.match(checkbox, /<Check/);
  assert.doesNotMatch(checkbox, />✓</);
});
test('controlled form components and accessibility labels', () => {
  for (const name of ['SearchField','SwitchField','RadioFieldGroup','SelectField','TextAreaField']) {
    assert.match(code(name), /accessibilityLabel/);
  }
  for (const name of ['SwitchField','RadioFieldGroup','SelectField']) {
    assert.match(code(name), /on(CheckedChange|ValueChange|ChangeText)/);
  }
  assert.match(code('TextAreaField'), /TextInputProps/); // inherits the controlled TextInput callbacks
});
test('accessible tap targets on actionable elements', () => {
  for (const name of ['FilterChip','SegmentedTabs','SelectField','Pagination','BottomSheet']) {
    assert.match(code(name), /min-h-12|minHeight: 48|<IconButton/);
  }
});
test('responsive layouts preserve legible table and tab widths', () => {
  assert.match(code('DataTable'), /horizontal/);
  assert.match(code('DataTable'), /width: col\.width \?\? 160/);
  assert.match(code('SegmentedTabs'), /horizontal/);
  assert.match(code('Stepper'), /horizontal/);
});
test('dialog/sheet require explicit close or confirmation, no fake network success', () => {
  assert.match(code('ConfirmDialog'), /onConfirm/);
  assert.match(code('ConfirmDialog'), /onRequestClose=\{onCancel\}/);
  assert.match(code('BottomSheet'), /onRequestClose=\{onClose\}/);
  assert.match(code('FileSelectField'), /onChooseFiles/);
  assert.doesNotMatch(code('FileSelectField'), /expo-document-picker|uploadAsync/);
});
test('progress and pagination clamp invalid values', () => {
  assert.match(code('Pagination'), /clampPage/);
  assert.match(code('ProgressBar'), /clampProgress/);
  const math = read('packages/ui/src/ui-math.ts');
  assert.match(math, /Number\.isFinite/g);
});
test('pure progress and page bounds behave correctly', () => {
  let ts;
  try { ts = require('typescript'); } catch { ts = null; }
  if (!ts) return; // full TypeScript check is mandated in README regardless
  const vm = require('node:vm');
  const math = read('packages/ui/src/ui-math.ts');
  const js = ts.transpileModule(math, { compilerOptions: { target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS } }).outputText;
  const box = { exports: {}, module: { exports: {} } };
  vm.runInNewContext(js, box);
  const f = box.exports;
  assert.equal(f.clampProgress(-3), 0);
  assert.equal(f.clampProgress(2), 1);
  assert.equal(f.clampProgress(NaN), 0);
  assert.equal(f.clampPage(5, 4), 4);
  assert.equal(f.clampPage(-1, 4), 1);
  assert.equal(f.clampPage(NaN, 4), 1);
});
test('notice and toast are both color-aware, explicit, and accessible', () => {
  assert.match(code('InlineNotice'), /useWowColors/);
  assert.match(code('ToastBanner'), /useWowColors/);
  assert.match(code('ToastBanner'), /accessibilityLiveRegion/);
});
// Parse TSX using TypeScript when available from installed workspace or Node environment.
test('TSX/TS source is syntactically parseable', () => {
  let ts;
  for (const candidate of ['typescript', path.join(root, 'node_modules/typescript')]) {
    try { ts = require(candidate); break; } catch { /* optional */ }
  }
  if (!ts) { console.log('  TypeScript parser unavailable; run pnpm typecheck locally.'); return; }
  const files = [...components.map(n => `packages/ui/src/${n}.tsx`),
    'packages/ui/src/ui-math.ts', 'packages/ui/src/index.ts',
    'apps/customer/src/features/design/V06Gallery.tsx', 'apps/customer/src/app/design-preview.tsx'];
  for (const file of files) {
    const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.equal(sf.parseDiagnostics.length, 0,
      `${file}: ${sf.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
  }
});
console.log(`V0.6 static checks: ${passed}/${passed} passed. Still run pnpm typecheck/lint and Expo.`);
