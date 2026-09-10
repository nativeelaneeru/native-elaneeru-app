import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const rawBase = process.env.SITE_URL || process.argv[2] || '';
if (!rawBase) throw new Error('SITE_URL or base URL argument is required.');
const BASE = rawBase.endsWith('/') ? rawBase : rawBase + '/';
let PORT = Number(process.env.NEL_CDP_PORT || 0);
const failures = [];
const passes = [];

function pass(message){ passes.push(message); console.log('✓', message); }
function fail(message){ failures.push(message); console.error('✗', message); }
function assert(value, message){ value ? pass(message) : fail(message); }

function findChrome(){
  const candidates = [process.env.CHROME_PATH, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const candidate of candidates){
    if (candidate.includes('/') && fs.existsSync(candidate)) return candidate;
    const result = spawnSync('which', [candidate], {encoding:'utf8'});
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Chrome/Chromium is not installed on the runner.');
}

async function waitForDebugger(profileDir){
  let last;
  if(!PORT){
    const portFile=path.join(profileDir,'DevToolsActivePort');
    for(let i=0;i<80;i++){
      if(fs.existsSync(portFile)){
        PORT=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
        if(PORT)break;
      }
      await sleep(250);
    }
    if(!PORT)throw new Error('Chrome did not publish a DevTools port.');
  }
  for(let i=0;i<80;i++){
    try{
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if(response.ok) return await response.json();
    }catch(error){ last=error; }
    await sleep(250);
  }
  throw last || new Error('Chrome DevTools endpoint did not start.');
}

class CdpPage {
  constructor(target, ws){
    this.target=target; this.ws=ws; this.seq=0; this.pending=new Map(); this.events=[];
    ws.addEventListener('message', event=>{
      const msg=JSON.parse(String(event.data));
      if(msg.id){
        const p=this.pending.get(msg.id); if(!p)return; this.pending.delete(msg.id);
        if(msg.error) p.reject(new Error(msg.error.message||JSON.stringify(msg.error))); else p.resolve(msg.result||{});
        return;
      }
      this.events.push(msg);
    });
  }
  static async create(){
    const response=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'});
    if(!response.ok) throw new Error(`Unable to create Chrome target: ${response.status}`);
    const target=await response.json();
    const ws=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
    const page=new CdpPage(target,ws);
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Log.enable');
    return page;
  }
  send(method,params={}){
    const id=++this.seq;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
      setTimeout(()=>{if(this.pending.delete(id))reject(new Error(`CDP timeout: ${method}`))},30000).unref?.();
    });
  }
  async evaluate(expression,{awaitPromise=true}={}){
    const out=await this.send('Runtime.evaluate',{expression,awaitPromise,returnByValue:true,userGesture:true});
    if(out.exceptionDetails){
      const d=out.exceptionDetails;
      throw new Error(d.exception?.description||d.text||'Browser evaluation failed');
    }
    return out.result?.value;
  }
  async navigate(url){
    this.events=[];
    const r=await this.send('Page.navigate',{url});
    if(r.errorText) throw new Error(`Navigation failed for ${url}: ${r.errorText}`);
    await this.waitFor(`document.readyState==='complete'`,25000,'document complete');
  }
  async waitFor(expression,timeout=20000,label=expression){
    const started=Date.now(); let last;
    while(Date.now()-started<timeout){
      try{const value=await this.evaluate(`(async()=>Boolean(await (${expression})))()`);if(value)return true;}catch(error){last=error;}
      await sleep(250);
    }
    throw last || new Error(`Timed out waiting for ${label}`);
  }
  async close(){
    try{this.ws.close()}catch{}
    try{await fetch(`http://127.0.0.1:${PORT}/json/close/${this.target.id}`,{method:'PUT'})}catch{}
  }
  runtimeErrors(){
    return this.events.filter(e=>e.method==='Runtime.exceptionThrown').filter(e=>{const u=e.params?.exceptionDetails?.url||'';return !u||u.startsWith(BASE)}).map(e=>e.params?.exceptionDetails?.exception?.description||e.params?.exceptionDetails?.text||'Runtime exception');
  }
}

async function checkServiceWorker(page, scopeLabel){
  await page.waitFor(`navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r=>!!r)`,12000,`${scopeLabel} service worker registration`);
  const sw=await page.evaluate(`navigator.serviceWorker.getRegistration().then(r=>r?({scope:r.scope,active:!!r.active,waiting:!!r.waiting,installing:!!r.installing}):null)`);
  assert(sw && /\/native-elaneeru-app\//.test(sw.scope), `${scopeLabel}: service worker is registered on the live origin`);
}

async function checkManifest(page, app){
  const manifest=await page.evaluate(`(async()=>{const l=document.querySelector('link[rel="manifest"]');if(!l)return null;const r=await fetch(l.href,{cache:'no-store'});return {status:r.status,json:await r.json()}})()`);
  assert(manifest?.status===200, `${app}: live manifest returns HTTP 200`);
  assert(Boolean(manifest?.json?.name), `${app}: live manifest is valid and named`);
}

async function testRoot(){
  const page=await CdpPage.create();
  try{
    await page.navigate(`${BASE}?e2e=${Date.now()}`);
    await page.waitFor(`location.pathname.includes('/b2c/')`,10000,'root redirect to B2C');
    assert((await page.evaluate('location.pathname')).includes('/b2c/'), 'root: redirects into the current B2C PWA flow');
  }finally{await page.close()}
}

async function testB2C(){
  const page=await CdpPage.create();
  try{
    await page.navigate(`${BASE}b2c/login/?e2e=${Date.now()}`);
    assert(/Native Elaneeru Login/i.test(await page.evaluate('document.title')), 'b2c: customer login renders in Chrome');
    await page.evaluate(`document.getElementById('mobile').value='123';document.getElementById('continueBtn').click();true`);
    await page.waitFor(`/valid 10 digit mobile/i.test(document.getElementById('msg').textContent)`,5000,'B2C invalid-mobile guard');
    assert(/valid 10 digit mobile/i.test(await page.evaluate(`document.getElementById('msg').textContent`)),'b2c: login validates mobile before backend access');

    await page.evaluate(`document.getElementById('mobile').value='6000000000';document.getElementById('continueBtn').click();true`);
    await page.waitFor(`!document.getElementById('noPinStep').classList.contains('hide')||!document.getElementById('pinLoginStep').classList.contains('hide')`,35000,'B2C login decision');
    const noPin=await page.evaluate(`!document.getElementById('noPinStep').classList.contains('hide')`);
    if(noPin){
      await page.evaluate(`document.getElementById('skipPinBtn').click();true`);
      await page.waitFor(`location.pathname.endsWith('/b2c/')`,12000,'B2C login redirect');
      pass('b2c: continue-without-PIN login reaches the customer app');
    }else{
      await page.evaluate(`localStorage.setItem('nel_b2c_session_mobile','6000000000');localStorage.setItem('nel_b2c_profile',JSON.stringify({mobile:'6000000000'}));localStorage.setItem('nel_profile_v9',JSON.stringify({mobile:'6000000000'}));location.replace('../?e2e=pin-status-read-only')`);
      await page.waitFor(`location.pathname.endsWith('/b2c/')`,12000,'B2C test session redirect');
      pass('b2c: PIN status is reachable; test session entered without mutating a customer PIN');
    }
    await page.waitFor(`typeof S!=='undefined' && S.cfg && Array.isArray(S.cfg.products) && S.cfg.products.length>0`,25000,'B2C catalogue');
    assert(/Native Elaneeru/i.test(await page.evaluate('document.title')), 'b2c: customer PWA renders in Chrome');
    assert((await page.evaluate('window.NEL_CONFIG && NEL_CONFIG.appVersion'))==='10.31.0-pwa','b2c: production version 10.31.0-pwa is live');
    await checkManifest(page,'b2c');
    await checkServiceWorker(page,'b2c');

    const catalog=await page.evaluate(`({count:S.cfg.products.length,tc:S.cfg.products.find(p=>String(p.productId||'').toUpperCase()==='TC'||/Tender Coconut/i.test(String(p.productName||'')))})`);
    assert(catalog.count>0,'b2c: live catalogue contains products');
    assert(Boolean(catalog.tc),'b2c: Tender Coconut is live in the customer catalogue');

    const bridge=await page.evaluate(`rpc('getAppConfig',[]).then(x=>({ok:true,count:Array.isArray(x.products)?x.products.length:0})).catch(e=>({ok:false,error:String(e&&e.message||e)}))`);
    assert(bridge?.ok===true,'b2c: browser iframe/postMessage bridge reaches Apps Script');
    assert((bridge?.count||0)>0,'b2c: bridge returns the production catalogue');

    assert(await page.evaluate(`go('shop');!document.getElementById('shopPage').classList.contains('hide')`),'b2c: Shop navigation works');
    assert(await page.evaluate(`go('offers');!document.getElementById('offersPage').classList.contains('hide')`),'b2c: Offers navigation works');
    assert(await page.evaluate(`go('account');!document.getElementById('accountPage').classList.contains('hide')`),'b2c: Account navigation works');

    const cart=await page.evaluate(`(()=>{const p=S.cfg.products[0];add(p.productId);openCart();return {lines:cartLines().length,total:cartTotal(),shown:document.getElementById('cartSheet').classList.contains('show')}})()`);
    assert(cart.lines===1 && cart.total>0 && cart.shown===true,'b2c: add-to-cart and cart sheet work');

    const owner=await page.evaluate(`({name:window.placeOrder&&window.placeOrder.name,v127:!!window.NEL_UI_V127})`);
    assert(owner.v127===true && owner.name==='placeOrderV127','b2c: Checkout Engine V2 owns the live checkout');

    const guard=await page.evaluate(`(async()=>{localStorage.removeItem('nel_profile_v9');localStorage.removeItem('nel_b2c_profile');localStorage.removeItem('nel_b2c_session_mobile');['mobile','name','area','pincode','address'].forEach(id=>{const x=document.getElementById(id);if(x)x.value=''});const originalRpc=window.rpc;let saveOrderCalled=false;window.rpc=async function(method,args){if(method==='saveOrder'){saveOrderCalled=true;throw new Error('E2E blocked saveOrder');}return originalRpc(method,args)};try{await window.placeOrder()}finally{window.rpc=originalRpc}const box=document.getElementById('nel127Status');return {text:box?box.textContent:'',saveOrderCalled,placed:!!window.NEL_LAST_ORDER_METRICS}})()`);
    assert(/valid 10-digit mobile/i.test(guard.text||'') && guard.saveOrderCalled===false && guard.placed===false,'b2c: checkout validation stops before saveOrder; no production order is sent');

    const errors=page.runtimeErrors();
    assert(errors.length===0,`b2c: no uncaught JavaScript exceptions (${errors[0]||'clean'})`);
  }finally{await page.close()}
}

async function testB2B(){
  const page=await CdpPage.create();
  try{
    await page.navigate(`${BASE}b2b/?e2e=${Date.now()}`);
    assert(/Native Elaneeru/i.test(await page.evaluate('document.title')), 'b2b: business PWA renders in Chrome');
    assert((await page.evaluate('window.NEL_B2B_CONFIG && NEL_B2B_CONFIG.appVersion'))==='9.8.0','b2b: production version 9.8.0 is live');
    await checkManifest(page,'b2b');
    await checkServiceWorker(page,'b2b');
    assert(await page.evaluate(`!document.getElementById('login').classList.contains('hidden')`),'b2b: business login screen is visible');

    const health=await page.evaluate(`rpc('getB2BOrderEngineHealthV904',[]).then(x=>({ok:true,x})).catch(e=>({ok:false,error:String(e&&e.message||e)}))`);
    assert(health?.ok===true,'b2b: browser iframe/postMessage bridge reaches Apps Script');
    assert(Boolean(health?.x?.canonicalOrderHandler)&&Boolean(health?.x?.idempotency)&&Boolean(health?.x?.serverControlledDeliveryCharge),'b2b: canonical duplicate-safe order engine is live');

    await page.evaluate(`document.getElementById('mobile').value='0000000000';document.getElementById('pin').value='__bad_pin__';document.getElementById('loginBtn').click();true`);
    await page.waitFor(`/Invalid mobile or PIN/i.test(document.getElementById('msg').textContent)`,20000,'invalid B2B login response');
    assert(/Invalid mobile or PIN/i.test(await page.evaluate(`document.getElementById('msg').textContent`)),'b2b: invalid login is rejected without creating a session');
    assert(await page.evaluate(`!sessionStorage.getItem('nel_b2b_token')`),'b2b: failed login does not persist a vendor token');

    const errors=page.runtimeErrors();
    assert(errors.length===0,`b2b: no uncaught JavaScript exceptions (${errors[0]||'clean'})`);
  }finally{await page.close()}
}

const chrome=findChrome();
const profileDir=fs.mkdtempSync(path.join(os.tmpdir(),'nel-browser-e2e-'));
const browser=spawn(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',
  '--remote-allow-origins=*',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profileDir}`,'about:blank'
],{stdio:['ignore','pipe','pipe']});
let stderr='';browser.stderr.on('data',b=>{stderr+=String(b)});

try{
  await waitForDebugger(profileDir);
  await testRoot();
  await testB2C();
  await testB2B();
}finally{
  browser.kill('SIGTERM');
  await sleep(300);
  try{fs.rmSync(profileDir,{recursive:true,force:true})}catch{}
}

if(failures.length){
  console.error(`\nLive browser E2E failed with ${failures.length} issue(s).`);
  if(stderr)console.error(stderr.slice(-2500));
  process.exit(1);
}
console.log(`\nLive browser E2E passed: ${passes.length} checks, 0 failures.`);
