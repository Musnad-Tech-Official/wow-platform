'use strict';
// Dedicated Clerk Development test accounts only. Real OTP, real JWT, read-only Supabase.
// No bearer tokens, cookie jars or session headers must be logged.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const {resolveStorageSignedUrl}=require('./lib/resolve-storage-signed-url.cjs');
const pk=process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const supabase=process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey=process.env.EXPO_PUBLIC_SUPABASE_KEY;
const dir=process.env.WOW_MERCHANT_WEB_EXPORT_DIR;
if(!pk?.startsWith('pk_test_') || !supabase || !publicKey?.startsWith('sb_publishable_') || !dir)
  throw Error('Missing or invalid public development configuration.');
const domain=Buffer.from(pk.slice(8),'base64').toString('utf8').replace(/\$$/,'');
if(!/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(domain))
  throw Error('Only Clerk development domains are accepted.');
if(new URL(supabase).hostname!=='jfqmdnffqwkqevdhmtfi.supabase.co')
  throw Error('Only the approved WOW development database is accepted.');
const users=[
 ['wow-merchant-a+clerk_test@example.com','user_3Lu62fhmntVfPUGUTuX05TO4mIz'],
 ['wow-merchant-b+clerk_test@example.com','user_3Lu62ldAYl5V6AI6ytTayeRzwyq'],
 ['wow-admin+clerk_test@example.com','user_3Lu69csg3PeHmXa5Y8bqXn0jyQ8'],
];
const adminDir=process.env.WOW_ADMIN_WEB_EXPORT_DIR;
let root=path.resolve(dir);
if(!fs.existsSync(path.join(root,'index.html')))throw Error('Missing Expo web export.');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.ico':'image/x-icon'};
const html='<!doctype html><html><head><meta charset="utf-8"></head><body><script async crossorigin="anonymous" data-clerk-publishable-key="'+pk+'" src="https://'+domain+'/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script></body></html>';
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 if(p==='/__wow_e2e_auth'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
 let f=path.resolve(root,p.replace(/^\/+/,''));
 if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)&&!path.extname(f)&&fs.existsSync(f+'.html'))f+='.html';
 if(!fs.existsSync(f))f=path.join(root,'index.html');
 res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');
 fs.createReadStream(f).on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end();}).pipe(res);
});
const origin=()=> 'http://127.0.0.1:'+server.address().port;
async function rows(token,table,params){
 const url=new URL('/rest/v1/'+table,supabase);url.searchParams.set('select','id');
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 const r=await fetch(url,{headers:{apikey:publicKey,Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw Error('Authenticated read '+table+' returned HTTP '+r.status);
 const data=await r.json();assert.ok(Array.isArray(data));return data;
}
async function login(page,email){
 await page.goto(origin()+'/__wow_e2e_auth',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.Clerk),null,{timeout:30000});
 return page.evaluate(async email=>{
   const clerk=window.Clerk;if(!clerk.loaded)await clerk.load();
   const si=clerk.client.signIn;
   const created=await si.create({identifier:email});
   if(created?.error)throw Error('Sign-in create rejected: '+created.error.code);
   const flow=created&&typeof created.prepareFirstFactor==='function'?created:si;
   if(flow.emailCode&&typeof flow.emailCode.sendCode==='function'){
     const sent=await flow.emailCode.sendCode();if(sent?.error)throw Error('Email code refused: '+sent.error.code);
     const tried=await flow.emailCode.verifyCode({code:'424242'});if(tried?.error)throw Error('OTP rejected: '+tried.error.code);
     if(flow.status!=='complete')throw Error('OTP sign-in not complete: '+flow.status);
     await flow.finalize({navigate:async()=>{}});
   }else{
     const factor=(flow.supportedFirstFactors||[]).find(f=>f.strategy==='email_code');
     if(!factor)throw Error('Clerk email code not offered.');
     await flow.prepareFirstFactor({strategy:'email_code',emailAddressId:factor.emailAddressId});
     const result=await flow.attemptFirstFactor({strategy:'email_code',code:'424242'});
     if(result.status!=='complete')throw Error('OTP not complete: '+result.status);
     await clerk.setActive({session:result.createdSessionId});
   }
   const token=await clerk.session?.getToken();
   if(!token)throw Error('Clerk session token unavailable.');
   return token;
 },email);
}
function sub(token){
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token shape');
 const c=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
 if(!c.sub || !c.exp || c.exp*1000<Date.now()+10000)throw Error('Missing subject or expired token');
 return c.sub;
}

const E2E_NAME='WOW E2E QA Business - Merchant A';
const E2E_BRANCH='WOW E2E Main Branch';
async function rpcResult(token,method,body){
 const r=await fetch(new URL('/rest/v1/rpc/'+method,supabase),{
  method:'POST',redirect:'error',
  headers:{apikey:publicKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
 const data=await r.json().catch(()=>({}));
 return {ok:r.ok,status:r.status,code:data?.code??null,data};
}
async function rpc(token,method,body){
 const r=await rpcResult(token,method,body);
 if(!r.ok)throw Error('Scoped '+method+' failed: HTTP '+r.status+' code '+String(r.code));
 return r.data;
}
function uuid(x){return typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);}
async function ensureFixture(ownerToken,ownerUserId){
 // Deliberately limited to the one managed E2E owner, in one fixed dev project.
 assert.equal(ownerUserId,users[0][1]);
 const businesses=await rows(ownerToken,'businesses',{owner_user_id:'eq.'+ownerUserId,name:'eq.'+E2E_NAME});
 if(businesses.length>1)throw Error('Multiple same-name E2E businesses: stop to avoid ambiguous fixture.');
 let businessId=businesses[0]?.id;
 if(!businessId){
  if(process.env.WOW_E2E_ALLOW_FIXTURE_CREATION!=='true')throw Error('Dedicated E2E business absent and creation was not opted in.');
  businessId=await rpc(ownerToken,'wow_create_business',{
   p_name:E2E_NAME,p_description:'Development E2E fixture only; not a real business, not for publication.'});
  assert.ok(uuid(businessId),'Business RPC did not return a UUID; inspect outcome before retrying.');
 }
 assert.deepEqual(await rows(ownerToken,'businesses',{id:'eq.'+businessId}),[{id:businessId}]);
 const branches=await rows(ownerToken,'business_branches',{business_id:'eq.'+businessId,name:'eq.'+E2E_BRANCH});
 if(branches.length>1)throw Error('Multiple same-name E2E branches: stop to avoid ambiguous fixture.');
 let branchId=branches[0]?.id;
 if(!branchId){
  if(process.env.WOW_E2E_ALLOW_FIXTURE_CREATION!=='true')throw Error('Dedicated E2E branch absent and creation not opted in.');
  branchId=await rpc(ownerToken,'wow_create_branch',{
   p_business_id:businessId,p_name:E2E_BRANCH,p_city:'صنعاء',
   p_address_line:'موقع تجريبي للاختبارات الآلية فقط',p_district:'بيانات اختبار'});
  assert.ok(uuid(branchId),'Branch RPC did not return a UUID; inspect outcome before retrying.');
 }
 assert.deepEqual(await rows(ownerToken,'business_branches',{id:'eq.'+branchId}),[{id:branchId}]);
 if(process.env.WOW_E2E_ALLOW_FIXTURE_CREATION==='true'){
   // Idempotent saved draft. No official review submission.
   const saved=await rpc(ownerToken,'wow_save_business_representative_draft',{
    p_business_id:businessId,p_name:'WOW E2E Representative',p_role:'owner'});
   assert.equal(saved,true,'Representative draft RPC must return true.');
 }
 return {businessId,branchId};
}
async function verifyIsolation(owner,nonowner,admin,fixture){
 for(const reader of [nonowner,admin]){
  assert.deepEqual(await rows(reader.token,'businesses',{id:'eq.'+fixture.businessId}),[],
    'Cross-account business exposure.');
  assert.deepEqual(await rows(reader.token,'business_branches',{id:'eq.'+fixture.branchId}),[],
    'Cross-account branch exposure.');
 }
 // Attempt to create another branch as a nonmember, and verify denial and absence.
 const deniedName='WOW E2E Forbidden Branch Attempt';
 const before=await rows(owner.token,'business_branches',{business_id:'eq.'+fixture.businessId,name:'eq.'+deniedName});
 assert.deepEqual(before,[],'Unexpected existing unauthorized branch attempt.');
 const denied=await rpcResult(nonowner.token,'wow_create_branch',{
   p_business_id:fixture.businessId,p_name:deniedName,p_city:'صنعاء',
   p_address_line:'موقع ممنوع خاص باختبار الصلاحيات'});
 assert.equal(denied.ok,false,'SECURITY: nonowner branch creation succeeded.');
 assert.equal(String(denied.code),'42501','Denial must be from authorization, not validation/schema.');
 assert.deepEqual(await rows(owner.token,'business_branches',{
  business_id:'eq.'+fixture.businessId,name:'eq.'+deniedName}),[],
  'SECURITY: denied nonowner RPC nevertheless wrote a branch.');
 const missingEvidence=await rpcResult(owner.token,'wow_submit_business_verification',{
   p_business_id:fixture.businessId,p_branch_id:fixture.branchId,
   p_request_type:'initial',p_evidence_refs:[]});
 assert.equal(missingEvidence.ok,false,'SECURITY: verification without evidence unexpectedly submitted.');
 assert.equal(String(missingEvidence.code),'22023','Expected evidence validation denial.');
}

async function verifyNoAdmin(token){
 const response=await fetch(new URL('/rest/v1/rpc/wow_admin_list_business_verifications',supabase),{
  method:'POST',headers:{apikey:publicKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({p_status:null,p_limit:1,p_offset:0}),signal:AbortSignal.timeout(16000)});
 if([401,403].includes(response.status))return;
 const d=await response.json().catch(()=>({}));
 if(response.status>=400&&['P0001','42501'].includes(String(d.code)))return;
 throw Error('Unprivileged account reached administrator RPC, HTTP '+response.status);
}
async function verifyW06Reviewer(reviewerToken,nonAdminToken) {
 // These are REAL Clerk development JWTs; no synthetic database claims.
 const role = await rpcResult(reviewerToken,'wow_admin_get_effective_role',{});
 assert.equal(role.ok,true,'Dedicated reviewer rejected by role RPC; HTTP '+role.status);
 assert.equal(role.data,'reviewer','Dedicated E2E account must have reviewer role only.');
 const calls = [
   ['wow_admin_list_business_verifications',{p_status:'submitted',p_limit:25,p_offset:0}],
   ['wow_admin_list_profile_revisions',{p_limit:25,p_offset:0}],
   ['wow_admin_list_subscription_payments',{p_status:'submitted',p_limit:25,p_offset:0}],
 ];
 for(const [name,args] of calls) {
   const result = await rpcResult(reviewerToken,name,args);
   assert.equal(result.ok,true,'Reviewer RPC '+name+' rejected HTTP '+result.status+' code '+result.code);
   assert.ok(Array.isArray(result.data),'Reviewer list must return an array of records.');
 }
 await verifyNoAdmin(nonAdminToken);
 const denied = await rpcResult(nonAdminToken,'wow_admin_get_effective_role',{});
 assert.equal(denied.ok,false,'Merchant account unexpectedly obtained an admin role.');
 assert.ok(['42501','P0001'].includes(String(denied.code)),
   'Non-admin role RPC failed for unexpected reason: '+denied.code);
 console.log('PASS: signed Clerk reviewer role and all three W06 read RPCs; non-admin access denied.');
}


async function captureW06AdminViews(browser, adminIdentity) {
  if (process.env.WOW_E2E_CAPTURE_ADMIN_VIEWS !== 'true') return;
  if (!adminDir || !fs.existsSync(path.join(adminDir,'index.html'))) {
    throw Error('Fresh Admin Expo export is required for W06 real-session screenshots.');
  }
  const priorRoot=root;
  root=path.resolve(adminDir);
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    const signed=await login(page,adminIdentity[0]);
    assert.equal(sub(signed),adminIdentity[1]);
    const shots=[
      ['/verifications','الأنشطة والفروع وطلبات المراجعة','01_adm03_verifications_desktop.png',1440],
      ['/verification/76500000-0000-4000-8000-000000000006','مراجعة النشاط والفرع','02_adm04_details_desktop.png',1440],
      ['/profile-revisions','مراجعة تغييرات الملف المعتمد','03_w06_profile_revisions_desktop.png',1440],
      ['/payments','الاشتراكات وتأكيد الدفعات','04_adm10_payments_desktop.png',1440],
      ['/verifications','الأنشطة والفروع وطلبات المراجعة','05_adm03_verifications_mobile.png',390],
      ['/payments','الاشتراكات وتأكيد الدفعات','06_adm10_payments_mobile.png',390],
    ];
    const dest=path.resolve('artifacts/admin-w06-real-clerk-screenshots');
    fs.mkdirSync(dest,{recursive:true});
    for (const [route,title,name,width] of shots) {
      await page.setViewportSize({width,height:width===390?844:900});
      const response=await page.goto(origin()+route,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,route+' failed to serve Admin app');
      await page.getByText(title,{exact:false}).first().waitFor({timeout:35000});
      assert.deepEqual(errors,[],route+' threw browser errors');
      if(width===390) {
        const over=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
        assert.equal(over,false,route+' overflowed the mobile viewport');
      }
      await page.screenshot({path:path.join(dest,name),fullPage:true});
    }
    console.log('PASS: signed Clerk reviewer opened six real W06 Expo Web views.');
  } finally {
    root=priorRoot;
    await context.close();
  }
}

// Opt-in one-object Storage E2E. Use ONLY in the pre-launch project while the
// exact-object temporary DELETE policy and reviewer fixture are present.
// Never log real bearer JWTs or signed URLs; no SDK service role key is used.
async function verifyW06StorageHttp(owner,nonowner,reviewer,fixture) {
  assert.equal(process.env.WOW_E2E_EXPECT_ADMIN_REVIEWER,'true','Reviewer must be scoped to temporary QA fixture.');
  assert.equal(fixture.businessId,'ea9a5297-c677-4e61-84c9-94414fe8ec74','Unapproved E2E business.');
  assert.equal(owner.id,users[0][1]);
  assert.equal(reviewer.id,users[2][1]);
  const bucket='wow-verification-evidence';
  const objectKey='business-verifications/'+fixture.businessId+'/'+owner.id+'/'+'7a'.repeat(24)+'.pdf';
  const doc=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
  const storageUrl=new URL('/storage/v1/object/'+bucket+'/'+objectKey,supabase);
  const baseUrl=new URL('/storage/v1/object/'+bucket,supabase);
  const keyHeaders=(token)=>({apikey:publicKey,Authorization:'Bearer '+token});
  const signedRequest=async(token)=>{
    const endpoint=new URL('/storage/v1/object/sign/'+bucket+'/'+objectKey,supabase);
    const response=await fetch(endpoint,{method:'POST',headers:{...keyHeaders(token),'Content-Type':'application/json'},
      body:JSON.stringify({expiresIn:60}),redirect:'error',signal:AbortSignal.timeout(20000)});
    const data=await response.json().catch(()=>({}));
    return {ok:response.ok,status:response.status,url:data?.signedURL||data?.signedUrl||null};
  };
  const cleanup=async()=>{
    const response=await fetch(baseUrl,{method:'DELETE',
      headers:{...keyHeaders(owner.token),'Content-Type':'application/json'},
      body:JSON.stringify({prefixes:[objectKey]}),redirect:'error',signal:AbortSignal.timeout(22000)});
    if(!response.ok) {
      const err=await response.json().catch(()=>({}));
      throw Error('Exact-key Storage API cleanup failed: HTTP '+response.status+' / '+String(err?.error||err?.message||'unknown'));
    }
    return response;
  };
  let uploadAttempted=false;
  try {
    uploadAttempted=true;
    const upload=await fetch(storageUrl,{method:'POST',
      headers:{...keyHeaders(owner.token),'Content-Type':'application/pdf','x-upsert':'false'},
      body:doc,redirect:'error',signal:AbortSignal.timeout(22000)});
    if(!upload.ok) {
      const err=await upload.json().catch(()=>({}));
      throw Error('Owner private evidence upload failed: HTTP '+upload.status+' / '+String(err?.error||err?.message||'unknown'));
    }
    const ownerSign=await signedRequest(owner.token);
    assert.equal(ownerSign.ok,true,'Owner could not sign own real private file: HTTP '+ownerSign.status);
    assert.ok(ownerSign.url,'Signed URL was absent for owner');
    const [independent,unrelated]=await Promise.all([signedRequest(reviewer.token),signedRequest(nonowner.token)]);
    assert.equal(independent.ok,true,'Independent reviewer could not sign private evidence: HTTP '+independent.status);
    assert.ok(independent.url,'Signed URL absent for reviewer');
    assert.equal(unrelated.ok,false,'SECURITY: unrelated authenticated merchant signed private evidence.');
    const unsigned=await fetch(new URL('/storage/v1/object/authenticated/'+bucket+'/'+objectKey,supabase),{
      method:'GET',headers:keyHeaders(nonowner.token),redirect:'error',signal:AbortSignal.timeout(18000)});
    assert.equal(unsigned.ok,false,'SECURITY: unrelated merchant fetched private evidence.');
    // A signed URL is a short-lived bearer credential. Prove it retrieves the
    // exact uploaded bytes; do not serialize/log the URL itself.
    const content=await fetch(resolveStorageSignedUrl(independent.url,supabase,bucket,objectKey),{redirect:'error',signal:AbortSignal.timeout(18000)});
    assert.equal(content.ok,true,'Real signed URL download failed: HTTP '+content.status);
    assert.deepEqual(Buffer.from(await content.arrayBuffer()),doc,'Signed URL returned different bytes.');
    console.log('PASS: real Clerk owner upload + owner/reviewer signing + nonowner deny + signed read.');
  } finally {
    if(uploadAttempted){
      await cleanup();
      console.log('PASS: Storage API removed exact temporary evidence key.');
    }
  }
}

test('real Clerk OTP and Supabase RLS use distinct live identities',{timeout:300000},async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const sessions=[];
 let fixture=null;
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
 try{
  for(let i=0;i<users.length;i++){
    const [email,id]=users[i];
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    try{
      const token=await login(page,email);
      assert.equal(sub(token),id,'Test account subject changed.');
      assert.deepEqual(await rows(token,'users',{id:'eq.'+id}),[{id}]);
      sessions.push({id,token});
      if(i===0){
        fixture=await ensureFixture(token,id);
        await page.goto(origin()+'/',{waitUntil:'domcontentloaded'});
        await page.getByText('لوحة التاجر',{exact:true}).first().waitFor({timeout:30000});
        assert.equal(await page.getByText('تسجيل الدخول مطلوب').count(),0);
        await page.getByText(E2E_NAME,{exact:true}).first().waitFor({timeout:30000});
        await page.goto(origin()+'/offers',{waitUntil:'domcontentloaded'});
        await page.getByText('إدارة العروض',{exact:true}).first().waitFor({timeout:30000});
      }
    }finally{await context.close();}
  }
  for(const s of sessions)for(const [,otherId] of users)
    if(s.id!==otherId)assert.deepEqual(await rows(s.token,'users',{id:'eq.'+otherId}),[],'RLS profile leak.');
  await verifyIsolation(sessions[0],sessions[1],sessions[2],fixture);
  if (process.env.WOW_E2E_EXPECT_ADMIN_REVIEWER === 'true') {
    await verifyW06Reviewer(sessions[2].token,sessions[1].token);
    if (process.env.WOW_E2E_STORAGE_VERIFICATION === 'true') {
      await verifyW06StorageHttp(sessions[0],sessions[1],sessions[2],fixture);
    }
    await captureW06AdminViews(browser, users[2]);
  } else {
    await verifyNoAdmin(sessions[2].token);
  }
  console.log('PASS: real OTP, profiles, actual business and branch RLS, denied unauthorized branch, evidence-required gate, and merchant UI.');
  console.log('DEDICATED_TEST_FIXTURE business='+fixture.businessId+' branch='+fixture.branchId);
 }finally{
   for(const s of sessions)s.token=null;
   await browser.close();
   await new Promise(resolve=>server.close(resolve));
 }
});
