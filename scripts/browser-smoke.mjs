import {spawn, spawnSync} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg=(name,def='')=>{const i=process.argv.indexOf(name);return i>=0&&process.argv[i+1]?process.argv[i+1]:def};
const base=(arg('--base-url','https://nativeelaneeru.github.io/native-elaneeru-app/')).replace(/\/+$/,'')+'/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const failures=[];
function pass(s){console.log('✓',s)}
function fail(s){failures.push(s);console.error('✗',s)}
function chromePath(){
  const env=process.env.CHROME_PATH||process.env.CHROMIUM_PATH;
  const candidates=[env,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
  for(const p of candidates) if(fs.existsSync(p)) return p;
  for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const r=spawnSync('bash',['-lc',`command -v ${cmd}`],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw new Error('Chrome/Chromium was not found on the runner.');
}

class CDP {
  constructor(wsUrl){this.wsUrl=wsUrl;this.id=0;this.pending=new Map();this.events=[];}
  async connect(){
    this.ws=new WebSocket(this.wsUrl);
    await new Promise((resolve,reject)=>{this.ws.addEventListener('open',resolve,{once:true});this.ws.addEventListener('error',reject,{once:true})});
    this.ws.addEventListener('message',ev=>{
      let m;try{m=JSON.parse(ev.data)}catch{return}
      if(m.id&&this.pending.has(m.id)){const {resolve,reject}=this.pending.get(m.id);this.pending.delete(m.id);m.error?reject(new Error(m.error.message||'CDP error')):resolve(m.result);return}
      if(m.method)this.events.push(m);
    });
  }
  call(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expr,{awaitPromise=false,returnByValue=true}={}){
    const r=await this.call('Runtime.evaluate',{expression:expr,awaitPromise,returnByValue,userGesture:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||r.exceptionDetails.exception?.description||'Runtime exception');
    return r.result?.value;
  }
  close(){try{this.ws.close()}catch{}}
}

async function waitFor(fn,label,timeout=15000,interval=250){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){try{const v=await fn();if(v)return v;last=v}catch(e){last=e}await sleep(interval)}
  throw new Error(`${label} timed out${last instanceof Error?': '+last.message:''}`);
}

async function newPage(port){
  const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});
  if(!r.ok)throw new Error(`Cannot create browser tab: HTTP ${r.status}`);
  return r.json();
}

async function testB2C(port){
  const url=base+'b2c/?smoke='+Date.now();
  const loginUrl=base+'b2c/login/?smoke='+Date.now();
  const target=await newPage(port);const c=new CDP(target.webSocketDebuggerUrl);await c.connect();
  try{
    await c.call('Runtime.enable');await c.call('Page.enable');await c.call('Log.enable');
    await c.call('Page.navigate',{url:loginUrl});
    await waitFor(()=>c.eval(`location.href!=='about:blank'`),'B2C login navigation',15000);
    await waitFor(()=>c.eval(`document.readyState==='complete'&&!!document.getElementById('continueBtn')`),'B2C login page load',15000);
    pass('B2C login page loads in a real browser');
    const loginCopy=await c.eval(`document.body.innerText.includes('Continue without PIN')`);
    if(!loginCopy)fail('B2C optional-PIN login flow is missing');else pass('B2C optional-PIN login flow is present');
    await c.eval(`localStorage.setItem('nel_b2c_session_mobile','9999999998');localStorage.setItem('nel_profile_v9',JSON.stringify({mobile:'9999999998'}));true`);
    await c.call('Page.navigate',{url});
    await waitFor(()=>c.eval(`location.pathname.includes('/b2c/')&&!location.pathname.includes('/login/')`),'B2C app navigation',15000);
    await waitFor(()=>c.eval(`document.readyState==='complete'`),'B2C page load',15000);
    pass('B2C customer app loads in a real browser');
    const version=await waitFor(()=>c.eval(`window.NEL_CONFIG&&window.NEL_CONFIG.appVersion`),'B2C config',10000);
    if(version!=='10.31.0-pwa')fail(`B2C production version mismatch: ${version}`);else pass('B2C Checkout Engine V2 version 10.31.0-pwa is active');

    const productCount=await waitFor(()=>c.eval(`document.querySelectorAll('#products .product').length`),'B2C live catalogue',20000,400);
    if(productCount<1)fail('B2C catalogue has no live products');else pass(`B2C live catalogue renders ${productCount} product card(s)`);
    const tc=await c.eval(`document.body.innerText.includes('Tender Coconut')`);
    if(!tc)fail('B2C Tender Coconut is not visible');else pass('B2C Tender Coconut is visible');

    await c.eval(`go('shop');true`);
    const shopVisible=await c.eval(`!document.getElementById('shopPage').classList.contains('hide')`);
    if(!shopVisible)fail('B2C Shop navigation failed');else pass('B2C Shop navigation works');

    const added=await c.eval(`(()=>{const b=document.querySelector('#products .add');if(!b)return false;b.click();return true})()`);
    if(!added)fail('B2C could not find an Add button');
    else {
      await waitFor(()=>c.eval(`document.getElementById('cartBar').classList.contains('show')`),'B2C cart update',5000);
      const count=await c.eval(`document.getElementById('cartCount').textContent`);pass(`B2C add-to-cart works (${count})`);
      await c.eval(`openCart();true`);
      const cartOpen=await c.eval(`document.getElementById('cartSheet').classList.contains('show')&&document.getElementById('checkout').innerText.length>0`);
      if(!cartOpen)fail('B2C cart/checkout sheet failed to open');else pass('B2C cart and checkout sheet render without placing an order');
    }

    await c.eval(`go('account');true`);
    const accountOk=await c.eval(`!document.getElementById('accountPage').classList.contains('hide')&&!!document.getElementById('mobile')&&!!document.getElementById('address')`);
    if(!accountOk)fail('B2C Account navigation/form failed');else pass('B2C Account form is accessible');

    const sw=await waitFor(()=>c.eval(`navigator.serviceWorker&&navigator.serviceWorker.getRegistrations().then(r=>r.length)`,{awaitPromise:true}),'B2C service worker',10000).catch(()=>0);
    if(sw<1)fail('B2C service worker is not registered');else pass('B2C service worker is registered');

    const fatal=c.events.filter(e=>e.method==='Runtime.exceptionThrown');
    if(fatal.length)fail(`B2C browser reported ${fatal.length} uncaught exception(s)`);else pass('B2C browser has no uncaught runtime exceptions');
  } finally {c.close();}
}

async function testB2B(port){
  const url=base+'b2b/?smoke='+Date.now();
  const target=await newPage(port);const c=new CDP(target.webSocketDebuggerUrl);await c.connect();
  try{
    await c.call('Runtime.enable');await c.call('Page.enable');await c.call('Log.enable');
    await c.call('Page.navigate',{url});
    await waitFor(()=>c.eval(`location.href!=='about:blank'`),'B2B navigation',15000);
    await waitFor(()=>c.eval(`document.readyState==='complete'`),'B2B page load',15000);
    pass('B2B page loads in a real browser');
    const version=await waitFor(()=>c.eval(`window.NEL_B2B_CONFIG&&window.NEL_B2B_CONFIG.appVersion`),'B2B config',10000);
    if(version!=='9.8.0')fail(`B2B production version mismatch: ${version}`);else pass('B2B version 9.8.0 is active');

    const loginVisible=await c.eval(`!!document.getElementById('mobile')&&!!document.getElementById('pin')&&!!document.getElementById('loginBtn')&&!document.getElementById('login').classList.contains('hidden')`);
    if(!loginVisible)fail('B2B login screen is not usable');else pass('B2B login screen is usable');

    await c.eval(`document.getElementById('mobile').value='0000000000';document.getElementById('pin').value='0000';document.getElementById('loginBtn').click();true`);
    const msg=await waitFor(()=>c.eval(`document.getElementById('msg').textContent`),'B2B invalid-login response',20000,400);
    if(!/Invalid mobile or PIN/i.test(msg))fail(`B2B invalid login returned unexpected message: ${msg}`);else pass('B2B live vendor login bridge rejects invalid credentials correctly');
    const stillLogin=await c.eval(`!document.getElementById('login').classList.contains('hidden')&&document.getElementById('app').classList.contains('hidden')`);
    if(!stillLogin)fail('B2B invalid login incorrectly opened the app');else pass('B2B remains safely logged out after invalid credentials');

    const orderButtonExists=await c.eval(`Array.from(document.querySelectorAll('button')).some(b=>/Place Order/i.test(b.textContent))`);
    if(!orderButtonExists)fail('B2B order UI is missing');else pass('B2B order UI is present; smoke test does not click Place Order');

    const sw=await waitFor(()=>c.eval(`navigator.serviceWorker&&navigator.serviceWorker.getRegistrations().then(r=>r.length)`,{awaitPromise:true}),'B2B service worker',10000).catch(()=>0);
    if(sw<1)fail('B2B service worker is not registered');else pass('B2B service worker is registered');

    const fatal=c.events.filter(e=>e.method==='Runtime.exceptionThrown');
    if(fatal.length)fail(`B2B browser reported ${fatal.length} uncaught exception(s)`);else pass('B2B browser has no uncaught runtime exceptions');
  } finally {c.close();}
}

const tmp=await mkdtemp(path.join(os.tmpdir(),'nel-browser-'));
let chrome;
try{
  const exe=chromePath();console.log(`Using browser: ${exe}`);console.log(`Testing production base URL: ${base}`);
  chrome=spawn(exe,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',
    '--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  const portFile=path.join(tmp,'DevToolsActivePort');
  await waitFor(()=>fs.existsSync(portFile),'Chrome DevTools port',10000,100);
  const port=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
  if(!port)throw new Error('Chrome did not expose a DevTools port.');
  await testB2C(port);
  await testB2B(port);
} catch(e){fail(e.stack||e.message)} finally {
  try{chrome?.kill('SIGTERM')}catch{}
  await rm(tmp,{recursive:true,force:true}).catch(()=>{});
}
if(failures.length){console.error(`\nBrowser smoke failed with ${failures.length} issue(s).`);process.exit(1)}
console.log('\nBrowser smoke passed. No production order was placed.');
