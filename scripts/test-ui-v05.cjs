const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const ts = require(require.resolve('typescript', { paths: [resolve(root, 'apps/customer'), root] }));

test('all V0.5 components parse as TypeScript or TSX', () => {
  for (const file of [
    'packages/ui/src/motion.ts',
    'packages/ui/src/responsive-action-layout.ts',
    'packages/ui/src/ResponsiveActionGroup.tsx',
    'packages/ui/src/AppButton.tsx',
    'packages/ui/src/AnimatedWowIcon.tsx',
    'packages/ui/src/AnimatedHeart.tsx',
    'packages/ui/src/AnimatedBell.tsx',
    'packages/ui/src/index.ts',
    'apps/customer/src/app/design-preview.tsx',
  ]) {
    const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.deepEqual(source.parseDiagnostics.map(d => d.messageText), [], file);
  }
});

test('buttons have restrained feedback and explicitly contrasted foregrounds', () => {
  const button = read('packages/ui/src/AppButton.tsx');
  const motion = read('packages/ui/src/motion.ts');
  assert.match(button, /withTiming\(wowMotion\.buttonPressedScale/);
  assert.match(button, /duration: wowMotion\.buttonReleaseMs/);
  assert.doesNotMatch(button, /withSpring|withSequence|translateY|shadowOpacity/);
  assert.match(button, /dark \? '#FFF2B7' : '#0F172D'/);
  assert.match(button, /color: scheme\.fg/);
  assert.match(button, /minHeight: 48/);
  assert.match(motion, /buttonPressedScale: 0\.985/);
  assert.match(motion, /iconAccentScale: 1\.055|bellAngleDeg: 8/);
});

test('icon motion is role-specific and lacks generic oscillation', () => {
  const icon = read('packages/ui/src/AnimatedWowIcon.tsx');
  const heart = read('packages/ui/src/AnimatedHeart.tsx');
  const bell = read('packages/ui/src/AnimatedBell.tsx');
  assert.match(icon, /search: 'focus'/);
  assert.match(icon, /location: 'pin'/);
  assert.match(icon, /share: 'share'/);
  assert.match(icon, /intentByIcon/);
  assert.doesNotMatch(icon, /rotate:|withSpring/);
  assert.match(heart, /if \(next\) scale\.set/);
  assert.match(bell, /bellAngleDeg/);
  for (const src of [icon, heart, bell]) assert.match(src, /ReduceMotion\.System/);
});

test('responsive layout uses parent measurement and yields accessible sizes', () => {
  const src = read('packages/ui/src/responsive-action-layout.ts');
  const compiled = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', compiled)(mod, mod.exports);
  const resolveActionLayout = mod.exports.resolveActionLayout;
  for (const [width, expectedCols] of [[288,1],[343,2],[768,4],[1140,4],[0,1]]) {
    const result = resolveActionLayout(width);
    assert.equal(result.columns, expectedCols, `width ${width}`);
    assert.ok(result.itemWidth === 0 || result.itemWidth >= 156, `min width ${width}`);
  }
  const group = read('packages/ui/src/ResponsiveActionGroup.tsx');
  assert.match(group, /onLayout=/);
  assert.match(group, /layout\.width/);
  assert.doesNotMatch(group, /useWindowDimensions/);
  assert.match(read('apps/customer/src/app/design-preview.tsx'), /ResponsiveActionGroup/);
});

test('all icon targets retain 48-point minimum and no ungrounded hover zoom', () => {
  for (const f of ['AnimatedWowIcon.tsx','AnimatedHeart.tsx','AnimatedBell.tsx']) {
    const src = read(`packages/ui/src/${f}`);
    assert.match(src, /minWidth: 48, minHeight: 48/);
    assert.doesNotMatch(src, /withSpring|1\.48|1\.32|1\.20/);
  }
});
