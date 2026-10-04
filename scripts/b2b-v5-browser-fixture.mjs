import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const rawBase = process.env.SITE_URL || process.argv[2] || '';
// Local fixture tests do not call production services.
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
    for(let i=0;i<160;i++){
      if(fs.existsSync(portFile)){
        PORT=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
        if(PORT)break;
      }
      await sleep(250);
    }
    if(!PORT)throw new Error('Chrome did not publish a DevTools port within 40 seconds.');
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
    const timeout=method==='Runtime.evaluate'?90000:30000;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
      setTimeout(()=>{if(this.pending.delete(id))reject(new Error(`CDP timeout: ${method}`))},timeout).unref?.();
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


async function testV5(){
 const page=await CdpPage.create();
 try{
  await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await page.navigate('file://'+process.cwd()+'/b2b/index.html');
  await page.waitFor(`typeof show==='function'`,5000,'v5 runtime');
  assert(await page.evaluate(`!document.getElementById('login').classList.contains('hidden') && document.querySelectorAll('.screen:not(.hidden)').length===1`),'v5: only login is visible before authentication');
  assert(await page.evaluate(`document.getElementById('loginPhone').value==='' && !document.body.textContent.includes('Demo PIN')`),'v5: no sample credentials are present');
  await page.evaluate(`document.getElementById('loginPhone').value='123';goPin();true`);
  assert(/registered 10-digit/.test(await page.evaluate(`document.getElementById('toast').textContent`)),'v5: invalid mobile is blocked');
  assert(await page.evaluate(`document.getElementById('mainNavigation').classList.contains('hidden')`),'v5: navigation stays hidden before authentication');
  assert(await page.evaluate(`document.querySelector('.loginBrandLogo').complete&&document.querySelector('.loginBrandLogo').naturalWidth>0`),'v5: official login logo loads');
  assert(await page.evaluate(`document.querySelector('.loginHero').getBoundingClientRect().height<240`),'v5: login branding uses compact height');
  await page.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  for(const viewport of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:412,height:915},{width:430,height:932},{width:844,height:390}]){
   await page.send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:true});
   assert(await page.evaluate(`(()=>{const phone=document.querySelector('.phone').getBoundingClientRect(),screen=document.getElementById('login'),input=document.getElementById('loginPhone').getBoundingClientRect();return Math.abs(phone.width-innerWidth)<1&&Math.abs(phone.height-innerHeight)<1&&document.documentElement.scrollWidth<=innerWidth&&input.left>=0&&input.right<=innerWidth&&screen.scrollHeight>=screen.clientHeight})()`),'v5: login fits '+viewport.width+'×'+viewport.height+' mobile viewport');
  }
  await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const fixture={vendor:{vendorId:'QA_VENDOR',ownerName:'QA Owner',businessName:'QA Business',mobile:'6111111111',address:'QA Address',area:'QA Area',paymentType:'COD',creditLimit:0,outstanding:0,availableCredit:0},products:[{productId:'TC',productName:'Tender Coconut',unit:'piece',price:44,moq:50,qtyStep:50,stockTracked:true,availableQty:180},{productId:'MIX',productName:'Mixed Coconut',unit:'piece',price:42,moq:50,qtyStep:10,stockTracked:true,availableQty:0}],orders:[{orderId:'QA_OLD',orderedAt:'01 Oct 2026',amount:2000,status:'Delivered',paymentType:'COD',paymentStatus:'PAID',items:[{productId:'TC',productName:'Tender Coconut',quantity:50,unitPrice:40,lineAmount:2000}]}],banners:[],marketRates:[],tickets:[],payments:[],target:null,deliverySlots:[],paymentConfig:{methods:['COD']}};
  await page.evaluate(`window.qaFixture=${JSON.stringify(fixture)};window.qaCalls=[];rpc=async(method,args)=>{qaCalls.push({method,args});if(method==='vendorLogin')return {token:'qa-local-token'};if(method==='getB2BWorkspaceV5')return structuredClone(qaFixture);if(method==='saveB2BProfileV5'){Object.assign(qaFixture.vendor,args[1]);return {success:true}};if(method==='createB2BTicketV5'){qaFixture.tickets.unshift({ticketId:'QA_TICKET',...args[1],status:'OPEN',createdAt:'Today'});return {success:true,ticketId:'QA_TICKET'}};if(method==='getVendorLiveTracking')return {active:false,message:'Delivery schedule pending'};if(method==='placeB2BOrderV9')return {success:true,orderId:'QA_NEW',amount:2200,status:'Order Received',autoAccepted:false};throw Error('Fixture blocked unexpected method: '+method)};document.getElementById('loginPhone').value='6111111111';goPin();document.getElementById('loginPin').value='9876';doLogin();true`);
  await page.waitFor(`CURRENT==='home'`,5000,'fixture login');
  assert(await page.evaluate(`document.querySelector('.greet h2').textContent.includes('QA')`),'v5: Home displays authenticated vendor name');
  await page.evaluate(`document.querySelector('#mainNavigation button:nth-child(2)').click();true`);
  assert(await page.evaluate(`CURRENT==='products'&&document.querySelectorAll('#plist .product').length===2`),'v5: Products navigation renders live catalogue');
  assert(await page.evaluate(`document.querySelector('[data-add="MIX"]').disabled`),'v5: unavailable stock cannot be added');
  await page.evaluate(`document.querySelector('[data-add="TC"]').click();document.querySelector('#mainNavigation button:nth-child(3)').click();true`);
  assert(await page.evaluate(`CURRENT==='cart'&&document.getElementById('ta').textContent==='₹2,200'`),'v5: Cart contains correct quantity and price');
  await page.evaluate(`document.getElementById('checkoutBtn').click();true`);await page.waitFor(`CURRENT==='place'`,5000,'checkout');
  assert(await page.evaluate(`document.querySelector('#place .card:nth-child(2)').textContent.includes('No delivery slots')&&document.querySelector('input[value="UPI"]').disabled&&document.querySelector('input[value="CREDIT"]').disabled`),'v5: checkout uses unpublished-slot state and actual payment eligibility');
  await page.evaluate(`document.getElementById('confirmOrderBtn').click();true`);await page.waitFor(`CURRENT==='confirmation'`,5000,'order confirmation');
  assert(await page.evaluate(`document.querySelector('#confirmation .card').textContent.includes('QA_NEW')&&document.querySelector('#confirmation .card').textContent.includes('Operations will confirm')`),'v5: confirmation displays server order and pending acceptance');
  assert(await page.evaluate(`qaCalls.filter(c=>c.method==='placeB2BOrderV9').length===1&&qaCalls.find(c=>c.method==='placeB2BOrderV9').args[1].clientRequestId.length>=16`),'v5: one order submission with retry-safe ID');
  await page.evaluate(`show('orders');true`);assert(await page.evaluate(`document.getElementById('orderList').textContent.includes('₹2,000')`),'v5: history retains original order amount');
  await page.evaluate(`document.querySelector('[data-reorder="QA_OLD"]').click();true`);assert(await page.evaluate(`CURRENT==='cart'&&document.getElementById('ta').textContent==='₹2,200'`),'v5: reorder uses current vendor price');
  await page.evaluate(`show('account');document.querySelector('#account .menu button').click();document.querySelector('#profile input:not(#profilePhone)').value='Updated Owner';document.querySelector('#profile .wide').click();true`);await page.waitFor(`qaFixture.vendor.ownerName==='Updated Owner'`,5000,'profile save');
  assert(await page.evaluate(`document.getElementById('profilePhone').readOnly`),'v5: registered mobile is locked');
  await page.evaluate(`show('shop');document.querySelector('#shop input').value='Updated Shop';document.querySelector('#shop .wide').click();true`);await page.waitFor(`qaFixture.vendor.businessName==='Updated Shop'`,5000,'shop save');
  await page.evaluate(`show('address');document.querySelector('#address .wide').click();document.getElementById('addressText').value='Updated Address';document.querySelector('#addressEdit .wide').click();true`);await page.waitFor(`qaFixture.vendor.address==='Updated Address'`,5000,'address save');
  await page.evaluate(`show('support');document.getElementById('issue').value='Delivery was late';document.querySelector('#support .pad > .wide').click();true`);assert(await page.evaluate(`!document.getElementById('draft').classList.contains('hidden')&&document.getElementById('cat').value==='Delivery Issue'`),'v5: ticket draft is editable and categorized');
  await page.evaluate(`document.querySelector('#draft .wide').click();true`);await page.waitFor(`document.getElementById('tickets').textContent.includes('QA_TICKET')`,5000,'ticket persistence');
  for(const screen of ['place','confirmation','addressEdit','history','legal','upi','home','products','cart','orders','schemes','payments','credit','account','profile','shop','address','support','notifications']){
   await page.evaluate(`show('${screen}');true`);
   assert(await page.evaluate(`document.querySelectorAll('.screen:not(.hidden)').length===1&&CURRENT==='${screen}'`),'v5: '+screen+' screen opens correctly');
   assert(await page.evaluate(`(()=>{const nav=document.getElementById('mainNavigation');const before=nav.getBoundingClientRect();document.getElementById('${screen}').scrollTop=10000;const after=nav.getBoundingClientRect();return document.querySelectorAll('.nav').length===1&&!nav.classList.contains('hidden')&&nav.parentElement.classList.contains('phone')&&Math.abs(after.bottom-844)<1&&before.top===after.top&&after.height>=67})()`),'v5: fixed navigation survives '+screen+' and scrolling');
  }
  await page.evaluate(`openTrack('QA_OLD');true`);await page.waitFor(`document.getElementById('liveTracking').textContent.includes('pending')`,5000,'tracking');
  assert(await page.evaluate(`!document.getElementById('liveTracking').textContent.includes('45')`),'v5: tracking has no sample ETA');
  assert(await page.evaluate(`!document.getElementById('mainNavigation').classList.contains('hidden')`),'v5: tracking retains navigation');
  await page.evaluate(`document.querySelector('#mainNavigation [data-page="products"]').click();true`);
  assert(await page.evaluate(`CURRENT==='products'&&document.querySelector('#mainNavigation [aria-current="page"]').dataset.page==='products'`),'v5: shared navigation returns from detail pages and marks current tab');
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`
   window.qaRestoreCalls=[];
   HTMLFormElement.prototype.submit=function(){
    const req=JSON.parse(this.querySelector('[name="payload"]').value);qaRestoreCalls.push(req.method);
    queueMicrotask(()=>{const h=pending.get(req.requestId);if(!h)return;pending.delete(req.requestId);h.cleanup();
     if(localStorage.getItem('qaRestoreFailure'))h.reject(new Error('Connection unavailable'));
     else if(req.method==='getB2BWorkspaceV5')h.resolve(${JSON.stringify(fixture)});
     else h.reject(new Error('Unexpected restore RPC '+req.method));
    });
   };
  `});
  await page.navigate('file://'+process.cwd()+'/b2b/index.html');
  await page.waitFor(`CURRENT==='home'`,5000,'remembered account after reload');
  assert(await page.evaluate(`TOKEN==='qa-local-token'&&qaRestoreCalls.every(m=>m!=='vendorLogin')`),'v5: reload restores remembered account without PIN or login RPC');
  await page.evaluate(`localStorage.setItem('qaRestoreFailure','1');true`);
  await page.navigate('file://'+process.cwd()+'/b2b/index.html');
  await page.waitFor(`!!document.getElementById('recoverSession')`,5000,'temporary connection recovery');
  assert(await page.evaluate(`localStorage.getItem('nel_b2b_token')==='qa-local-token'&&getComputedStyle(document.getElementById('phoneStep')).display==='none'`),'v5: connection failure keeps session and hides repeat login form');
  await page.evaluate(`localStorage.removeItem('qaRestoreFailure');rpc=async()=>(${JSON.stringify(fixture)});retrySession();true`);
  await page.waitFor(`CURRENT==='home'`,5000,'remembered account retry');
  assert(await page.evaluate(`!document.getElementById('mainNavigation').classList.contains('hidden')`),'v5: retry restores account and navigation without credentials');
  await page.evaluate(`logout(false);true`);assert(await page.evaluate(`document.getElementById('mainNavigation').classList.contains('hidden')&&CURRENT==='login'&&!localStorage.getItem('nel_b2b_token')`),'v5: logout clears remembered session');
  const errors=page.runtimeErrors();assert(errors.length===0,'v5: no browser exceptions ('+(errors[0]||'clean')+')');
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
  await testV5();
}finally{
  browser.kill('SIGTERM');
  await sleep(300);
  try{fs.rmSync(profileDir,{recursive:true,force:true})}catch{}
}

if(failures.length){
  console.error(`\nLive browser E2E failed with ${failures.length} issue(s).`);
  if(stderr.trim())console.error(stderr.slice(-3000));
  process.exit(1);
}
console.log(`\nLive browser E2E passed: ${passes.length} checks.`);
