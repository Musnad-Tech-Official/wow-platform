'use strict';
// No network, credentials, migrations or writes; this contract runs before UI checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS ' + checks + ': ' + label); }

check('pinned lockfile and three Expo 57 app workspaces', () => {
  assert.match(read('pnpm-lock.yaml'), /lockfileVersion:\s*['"]?9\.0/);
  for (const app of ['customer','merchant','admin']) {
    const pkg = JSON.parse(read('apps/' + app + '/package.json'));
    assert.match(pkg.dependencies.expo, /57\.0\./);
    assert.match(read('apps/' + app + '/AGENTS.md'), /\.\.\/\.\.\/AGENTS\.md/);
  }
});
check('GitHub CI uses no production secrets and runs full quality gates', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci,/pull_request:/);
  assert.match(ci,/push:/);
  assert.match(ci,/pnpm install --frozen-lockfile/);
  assert.match(ci,/node scripts\/test-engineering-readiness\.cjs/);
  assert.match(ci,/bash scripts\/verify-ui-v08\.sh/);
  assert.doesNotMatch(ci,/\$\{\{\s*secrets\.|supabase db push|supabase migration up|service_role|deploy:/i);
  assert.match(ci,/contents: read/);
});
check('repo root instructions establish approved package boundaries and security gate', () => {
  const instructions = read('AGENTS.md');
  for(const text of ['W00–W09','docs/ui-workstreams.md','docs/design-approval-and-handoff.md','docs/database-test-runbook.md','explicit approval']) {
    assert(instructions.includes(text),'Missing '+text);
  }
});
check('full roadmap then first command, without allocating developers', () => {
  const handoff = read('docs/developer-handoff-protocol.md');
  assert.match(handoff,/Full map of that developer's tasks/i);
  assert.match(handoff,/first concrete executable command/);
  assert.match(handoff,/no developer assignments/i);
});
check('ready report distinguishes metadata and live security tests', () => {
  const doc = read('docs/engineering-readiness.md');
  for (const text of ['25 RLS enabled','7 RLS enabled','five','staging','010_verify.sql','MISSING FROM REPOSITORY','OPEN — release blocker']) {
    assert(doc.toLowerCase().includes(text.toLowerCase()),'Missing finding '+text);
  }
});
check('W00 inventory is SELECT-only and not mistaken for migration 010', () => {
  const sql = read('docs/sql/w00-readonly-inventory.sql');
  const uncommented = sql.replace(/--[^\n]*/g,'').trim();
  const statements = uncommented.split(';').map(s=>s.trim()).filter(Boolean);
  assert.equal(statements.length,7,'Expected seven read-only inventory result sets');
  for (const stmt of statements) {
    assert.match(stmt,/^SELECT\b/i,'Unexpected non-read-only SQL statement');
    assert.doesNotMatch(stmt,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL)\b/i);
  }
  assert(sql.includes('010_verify.sql'));
});
check('agent skill catalog is honest about connector availability', () => {
  const doc = read('docs/agent-skills.md');
  assert.match(doc,/environment-specific/);
  assert.match(doc,/Supabase/);
  assert.match(doc,/Expo/);
});
console.log('WOW engineering readiness contracts: ' + checks + '/' + checks + ' passed.');
