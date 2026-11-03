'use strict';
// Repository integrity: runtime paths, package metadata and public-only configuration.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));

test('three applications have valid Expo resources and public-only env examples', () => {
  for(const app of ['customer','merchant','admin']){
    const cfg = JSON.parse(read('apps/'+app+'/app.json')).expo;
    assert.match(cfg.name,/WOW/);
    assert.equal(cfg.android.adaptiveIcon.backgroundColor,'#FACC15');
    const imgs = [
      cfg.icon,
      cfg.ios.icon,
      cfg.android.adaptiveIcon.foregroundImage,
      cfg.web.favicon,
      cfg.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-splash-screen')[1].image
    ];
    for(const p of imgs) {
      assert(p.startsWith('./assets/'),'Unexpected asset path: '+p);
      assert(exists('apps/'+app+'/'+p.slice(2)),'Missing '+app+' asset '+p);
    }
    assert.equal(cfg.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-splash-screen')[1].backgroundColor,'#FACC15');
    const e=read('apps/'+app+'/.env.example');
    assert.match(e,/EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=/);
    assert.match(e,/EXPO_PUBLIC_SUPABASE_URL=/);
    assert.match(e,/EXPO_PUBLIC_SUPABASE_KEY=/);
    assert.doesNotMatch(e,/service_role|db_password|private_key/i);
  }
});
test('workspace dependencies and declared package entry points actually exist', () => {
  const lock=read('pnpm-lock.yaml');
  assert.match(lock,/lockfileVersion: '9\.0'/);
  const apps=['customer','merchant','admin'];
  for(const app of apps){
    const pkg=JSON.parse(read('apps/'+app+'/package.json'));
    assert.match(pkg.dependencies.expo,/57\.0\./);
    assert.equal(pkg.scripts['reset-project'],undefined);
    assert(!pkg.dependencies['@wow/types']&&!pkg.dependencies['@wow/utils']);
    for(const [name,version] of Object.entries(pkg.dependencies)){
      if(!name.startsWith('@wow/'))continue;
      assert.equal(version,'workspace:*');
      const dir='packages/'+name.split('/')[1];
      assert(exists(dir+'/package.json'),name+' package missing');
      const internal=JSON.parse(read(dir+'/package.json'));
      const main=(internal.main||'./src/index.ts').replace(/^\.\//,'');
      assert(exists(dir+'/'+main),name+' entry missing '+main);
    }
  }
  assert(!exists('packages/types/package.json')&&!exists('packages/utils/package.json'));
  assert.doesNotMatch(lock,/packages\/(?:types|utils)\b|\@wow\/(?:types|utils)/);
});
test('CI has no secret-dependent tests and calls the actual verification suite', () => {
  const ci=read('.github/workflows/ci.yml');
  assert.match(ci,/pull_request:/);
  assert.match(ci,/pnpm install --frozen-lockfile/);
  assert.match(ci,/scripts\/test-repository-integrity\.cjs/);
  assert.match(ci,/scripts\/test-design-foundation\.cjs/);
  assert.match(ci,/scripts\/verify-ui-v08\.sh/);
  assert.doesNotMatch(ci,/\$\{\{\s*secrets\.|supabase db push|service_role|deploy:/i);
});

test('Codex and Antigravity discover the same focused WOW skills', () => {
  const agents=read('AGENTS.md');
  for (const skill of ['wow-screen-fidelity','wow-data-security','wow-change-verification']) {
    const skillFile='.agents/skills/'+skill+'/SKILL.md';
    assert(exists(skillFile),'Missing '+skillFile);
    const content=read(skillFile);
    assert.match(content,new RegExp('^---\\s*\\nname: '+skill+'\\s*\\n', 'm'),'Missing skill name metadata: '+skill);
    assert.match(content,/^description:\s*Use when\s+.{40,}/m,'Missing trigger description: '+skill);
    assert.match(agents,new RegExp('\\b'+skill+'\\b'),'AGENTS.md must route to '+skill);
  }
});
