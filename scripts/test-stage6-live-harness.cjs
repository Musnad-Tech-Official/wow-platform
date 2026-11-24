'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {spawnSync}=require('node:child_process');
const file=path.resolve(__dirname,'test-merchant-live-auth-playwright.cjs');
test('Stage 6 live harness parses, refreshes tokens and signs out isolated contexts',()=>{
 const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 const src=fs.readFileSync(file,'utf8');
 assert.match(src,/getToken\(\{skipCache:true\}\)/);
 assert.match(src,/const token=await resolveToken\(source\)/);
 assert.match(src,/await clerk\.signOut\(\)/);
 assert.match(src,/await endSession\(s\.page\)/);
 assert.match(src,/if\(uploadedByThisRun\)/);
 assert.doesNotMatch(src,/if\(uploadAttempted\)/);
});
