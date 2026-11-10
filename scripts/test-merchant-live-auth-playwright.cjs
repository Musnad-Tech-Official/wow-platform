'use strict';
// Dedicated Clerk Development test accounts only. Real OTP, real JWT, read-only Supabase.
// No bearer tokens, cookie jars or session headers must be logged.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
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
const root=path.resolve(dir);
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
async function verifyNoAdmin(token){
 const response=await fetch(new URL('/rest/v1/rpc/wow_admin_list_business_verifications',supabase),{
  method:'POST',headers:{apikey:publicKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({p_status:null,p_limit:1,p_offset:0}),signal:AbortSignal.timeout(16000)});
 if([401,403].includes(response.status))return;
 const d=await response.json().catch(()=>({}));
 if(response.status>=400&&['P0001','42501'].includes(String(d.code)))return;
 throw Error('Unprivileged account reached administrator RPC, HTTP '+response.status);
}
test('real Clerk OTP and Supabase RLS use distinct live identities',{timeout:220000},async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const sessions=[];
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
        await page.goto(origin()+'/',{waitUntil:'domcontentloaded'});
        await page.getByText('لوحة التاجر',{exact:true}).first().waitFor({timeout:30000});
        assert.equal(await page.getByText('تسجيل الدخول مطلوب').count(),0);
      }
    }finally{await context.close();}
  }
  for(const s of sessions)for(const [,otherId] of users)
    if(s.id!==otherId)assert.deepEqual(await rows(s.token,'users',{id:'eq.'+otherId}),[],'RLS profile leak.');
  await verifyNoAdmin(sessions[2].token);
  console.log('PASS: 3 live Clerk OTP sessions, own-profile access, cross-user profile isolation and admin denial.');
 }finally{
   for(const s of sessions)s.token=null;
   await browser.close();
   await new Promise(resolve=>server.close(resolve));
 }
});
