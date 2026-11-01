'use strict';
// WOW V0.8 regression checks. Static checks complement, not replace, device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const tokens = read('packages/theme/src/tokens.ts');
const palettes = tokens.match(/light:\s*\{([^}]+)\}\s*,\s*dark:\s*\{([^}]+)\}/s);
assert(palettes, 'Both themes must be present');
const parse = block => Object.fromEntries([...block.matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)].map(m=>[m[1],m[2]]));
const light = parse(palettes[1]), dark = parse(palettes[2]);
const lum = hex => [1,3,5].map(i=>{
  const c=parseInt(hex.slice(i,i+2),16)/255;
  return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
const ratio = (a,b) => {const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
const textPairs = [
 ['foreground','background'],['foreground','surface'],
 ['mutedForeground','background'],['mutedForeground','surface'],
 ['actionForeground','background'],['actionForeground','surface'],
 ['primaryForeground','primary'],['success','successSurface'],
 ['warning','warningSurface'],['danger','dangerSurface'],
 ['info','infoSurface'],['neutral','neutralSurface']
];
const uiPairs = [
 ['focusRing','background'],['focusRing','surface'],
 ['controlBorder','background'],['controlBorder','surface']
];
let comparisons=0;
function verifyPair(colors,fg,bg,min,context){
 assert(colors[fg]&&colors[bg],context+': missing '+fg+'/'+bg);
 const actual=ratio(colors[fg],colors[bg]);
 assert(actual>=min,context+': '+fg+'/'+bg+' '+actual.toFixed(2)+' < '+min);
 comparisons++;
}
for(const [mode,palette] of [['light',light],['dark',dark]]){
 for(const [fg,bg] of textPairs)verifyPair(palette,fg,bg,4.5,mode);
 for(const [fg,bg] of uiPairs)verifyPair(palette,fg,bg,3,mode);
}
const canvasMatch=tokens.match(/wowAppCanvases\s*=\s*\{([^}]+)\}/s);
assert(canvasMatch,'Application canvas palette missing');
const canvases=parse(canvasMatch[1]);
for(const app of ['customer','merchant','admin']){
 const bg=canvases[app];assert(bg,app+' canvas missing');
 for(const fg of ['foreground','mutedForeground','actionForeground']){
  verifyPair({...light,canvas:bg},fg,'canvas',4.5,app);
 }
 verifyPair({...light,canvas:bg},'controlBorder','canvas',3,app);
}
assert.equal(comparisons,44);
assert.equal(light.primary,'#FACC15');
assert.equal(dark.primary,'#FACC15');
assert.notEqual(light.primary,light.actionForeground);
assert(read('packages/theme/theme.css').includes('--color-muted-foreground: #5c6b80;'));
for(const part of ['AppInput','SearchField','TextAreaField','SelectField']){
 const s=read('packages/ui/src/'+part+'.tsx');
 assert(s.includes('colors.controlBorder'),part+' missing control border');
 assert(s.includes('colors.focusRing'),part+' missing focus ring');
}
for(const part of ['ThemeSwitcher','FilterChip','SegmentedTabs','RadioFieldGroup','SwitchField']){
 assert(read('packages/ui/src/'+part+'.tsx').includes('colors.focusRing'),part+' missing selected outline');
}
for(const part of ['Card','ListRow','SearchField']){
 assert(read('packages/ui/src/'+part+'.tsx').includes('backgroundColor: colors.'),part+' missing semantic surface');
}
assert(read('packages/ui/src/ProgressBar.tsx').includes('colors.focusRing'));
assert(read('packages/ui/src/AnimatedWowIcon.tsx').includes('colors.actionForeground'));
assert(read('packages/ui/src/SectionHeader.tsx').includes('colors.actionForeground'));
assert(read('packages/ui/src/AppText.tsx').includes('primary: colors.actionForeground'));
const preview=read('apps/customer/src/app/design-preview.tsx');
const gallery=read('apps/customer/src/features/design/V08AcceptanceGallery.tsx');
assert(preview.includes('if (!__DEV__)'));
for(const name of ['V06Gallery','V07ThemeAudit','V08AcceptanceGallery']){
 assert(preview.includes('<'+name+' />'),name+' gallery missing');
}
assert(gallery.includes('wow-v08-acceptance'));
assert(gallery.includes('wow-v08-palette-light')&&gallery.includes('wow-v08-palette-dark'));
assert(!/@wow\/(?:api|auth)|supabase\.|fetch\(|uploadAsync/.test(gallery),'Audit must remain offline');
for(const name of ['AppButton','AppText','Card','ListRow','PageScaffold','SearchField','ThemeSwitcher']){
 assert(read('packages/ui/src/'+name+'.tsx').includes('rtlProps'),name+' lost RTL contract');
}
const widths=[320,375,390,768,1024,1440];
for(const width of widths){
 const parent=width<=390?width-32:width-48;
 const gap=12,min=138,max=3;
 const columns=Math.max(1,Math.min(max,Math.floor((parent+gap)/(min+gap))));
 const size=(parent-(columns-1)*gap)/columns;
 assert(size>=min&&columns*size+(columns-1)*gap<=parent+0.01,'Responsive layout invalid at '+width);
}
// pnpm isolates workspace devDependencies. Resolve TypeScript from the package
// that declares it, rather than the repository root or a machine-specific path.
const { createRequire } = require('node:module');
const uiRequire = createRequire(path.join(root, 'packages/ui/package.json'));
let ts;
try {
  ts = uiRequire('typescript');
} catch (error) {
  throw new Error(
    'Cannot resolve the TypeScript devDependency of @wow/ui. Check workspace installation with pnpm --filter @wow/ui exec tsc --version.',
    { cause: error },
  );
}
for(const file of ['packages/theme/src/tokens.ts','packages/ui/src/AppButton.tsx','packages/ui/src/AppText.tsx','packages/ui/src/AppInput.tsx','packages/ui/src/ThemeSwitcher.tsx','packages/ui/src/SegmentedTabs.tsx','packages/ui/src/FilterChip.tsx','packages/ui/src/RadioFieldGroup.tsx','packages/ui/src/SwitchField.tsx','packages/ui/src/ProgressBar.tsx','packages/ui/src/SelectField.tsx','packages/ui/src/TextAreaField.tsx','packages/ui/src/AnimatedWowIcon.tsx','packages/ui/src/SectionHeader.tsx','packages/ui/src/SearchField.tsx','packages/ui/src/Card.tsx','packages/ui/src/ListRow.tsx','packages/ui/src/PageScaffold.tsx','apps/customer/src/app/design-preview.tsx','apps/customer/src/features/design/V08AcceptanceGallery.tsx']){
 const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,file+': invalid TS/TSX syntax');
}
console.log('WOW V0.8 checks passed: 44 contrast pairs, semantic controls, RTL, responsive layouts and TS/TSX syntax.');
