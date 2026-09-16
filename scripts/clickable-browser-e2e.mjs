import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const rawBase=process.env.SITE_URL||process.argv[2]||'';
if(!rawBase)throw new Error('SITE_URL or base URL argument is required.');
const BASE=rawBase.endsWith('/')?rawBase:rawBase+'/';
let PORT=0;
const passes=[];
function pass(m){passes.push(m);console.log('✓',m)}
function assert(v,m){if(!v)throw new Error(m);pass(m)}

function findChrome(){
  for(const name of [process.env.CHROME_PATH,'google-chrome-stable','google-chrome','chromium','chromium-browser'].filter(Boolean)){
    if(name.includes('/')&&fs.existsSync(name))return name;
    const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw new Error('Chrome/Chromium not found.');
}

async function waitForDebugger(profile){
  const f=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<160;i++){if(fs.existsSync(f)){PORT=Number(fs.readFileSync(f,'utf8').split(/\r?\n/)[0]);if(PORT)break}await sleep(250)}
  if(!PORT)throw new Error('Chrome DevTools port was not published.');
  for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)return}catch{}await sleep(250)}
  throw new Error('Chrome DevTools endpoint did not start.');
}

class Page{
  constructor(target,ws){this.target=target;this.ws=ws;this.seq=0;this.pending=new Map();this.errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});return}if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params?.exceptionDetails?.exception?.description||m.params?.exceptionDetails?.text||'Runtime exception')})}
  static async create(){const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'});const t=await r.json();const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});const p=new Page(t,ws);await p.send('Page.enable');await p.send('Runtime.enable');return p}
  send(method,params={}){const id=++this.seq;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.pending.delete(id))reject(new Error(`CDP timeout: ${method}`))},30000).unref?.()})}
  async eval(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Browser evaluation failed');return r.result?.value}
  async nav(url){await this.send('Page.navigate',{url});await this.wait(`document.readyState==='complete'`,25000,'document ready')}
  async wait(expression,timeout=20000,label=expression){const start=Date.now();let last;while(Date.now()-start<timeout){try{if(await this.eval(`Boolean(${expression})`))return}catch(e){last=e}await sleep(250)}throw last||new Error(`Timed out: ${label}`)}
  async close(){try{this.ws.close()}catch{}try{await fetch(`http://127.0.0.1:${PORT}/json/close/${this.target.id}`,{method:'PUT'})}catch{}}
}

async function click(page,selector,label){
  const ok=await page.eval(`(()=>{const x=document.querySelector(${JSON.stringify(selector)});if(!x)return false;x.scrollIntoView({block:'center'});x.click();return true})()`);
  assert(ok,`${label}: clickable exists and accepted a real DOM click`);
}

async function login(page){
  await page.nav(`${BASE}b2c/login/?click-e2e=${Date.now()}`);
  await page.wait(`!!document.getElementById('continueBtn')`,10000,'login button');
  await page.eval(`document.getElementById('mobile').value='6000000000';document.getElementById('continueBtn').click();true`);
  await page.wait(`!document.getElementById('noPinStep').classList.contains('hide')||!document.getElementById('pinLoginStep').classList.contains('hide')`,35000,'login decision');
  const noPin=await page.eval(`!document.getElementById('noPinStep').classList.contains('hide')`);
  if(noPin){
    await click(page,'#skipPinBtn','Continue without PIN');
    await page.wait(`location.pathname.endsWith('/b2c/')`,12000,'customer app redirect');
  }else{
    await page.eval(`localStorage.setItem('nel_b2c_session_mobile','6000000000');localStorage.setItem('nel_b2c_profile',JSON.stringify({mobile:'6000000000'}));localStorage.setItem('nel_profile_v9',JSON.stringify({mobile:'6000000000'}));location.replace('../?click-e2e=read-only-session')`);
    await page.wait(`location.pathname.endsWith('/b2c/')`,12000,'read-only customer app redirect');
  }
  await page.wait(`typeof S!=='undefined'&&S.cfg&&Array.isArray(S.cfg.products)&&S.cfg.products.length>0`,45000,'catalogue');
  await page.wait(`window.NEL_UX_POLISH_V10561===true&&window.NEL_SIMPLE_CATALOG_V10580===true`,10000,'B2C UX modules');
  pass('B2C customer app renders without renderer crash');
}

async function test(){
  const page=await Page.create();
  try{
    await login(page);

    for(const [name,id] of [['Shop','shopPage'],['Orders','ordersPage'],['Offers','offersPage'],['Account','accountPage'],['Home','homePage']]){
      await click(page,`.navIn button[data-page="${name.toLowerCase()}"]`,`${name} bottom navigation`);
      await page.wait(`!document.getElementById('${id}').classList.contains('hide')`,5000,`${name} page visible`);
      pass(`${name} bottom navigation opens the correct page`);
    }

    await click(page,'.promo .cta','Home hero CTA');
    await page.wait(`!document.getElementById('shopPage').classList.contains('hide')`,5000,'Shop after hero CTA');
    pass('Home hero CTA opens Shop');

    await click(page,'.navIn button[data-page="home"]','Home navigation');
    await sleep(900);
    const clutter=await page.eval(`(()=>{const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const bad=new Set(['ALL','FRESH','FRESH TODAY','QUICK DELIVERY','BESTSELLERS','BULK ORDER','BULK PACKS']);return [...document.querySelectorAll('button')].filter(visible).map(x=>String(x.textContent||'').replace(/\\s+/g,' ').trim().toUpperCase()).filter(x=>bad.has(x))})()`);
    assert(Array.isArray(clutter)&&clutter.length===0,'Redundant All/Fresh/Quick/Bestseller/Bulk catalogue controls are hidden');
    const offersVisible=await page.eval(`(()=>{const e=document.querySelector('.navIn button[data-page="offers"]');if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})()`);
    assert(offersVisible,'Offers remains available in bottom navigation');

    await click(page,'.navIn button[data-page="shop"]','Shop navigation');
    await page.wait(`!!document.querySelector('#products .add')`,10000,'product Add button');
    await click(page,'#products .add','Product Add');
    await page.wait(`document.getElementById('cartBar').classList.contains('show')`,5000,'cart bar after add');
    const cart=await page.eval(`({lines:cartLines().length,total:cartTotal()})`);
    assert(cart.lines>0&&cart.total>0,'Product Add changes the local cart');

    await click(page,'#cartBar button','View cart');
    await page.wait(`document.getElementById('cartSheet').classList.contains('show')`,5000,'cart sheet visible');
    pass('View cart opens the cart sheet');
    await click(page,'#cartSheet .close','Close cart');
    await page.wait(`!document.getElementById('cartSheet').classList.contains('show')`,5000,'cart sheet closed');
    pass('Cart close button closes the sheet');

    await click(page,'.navIn button[data-page="home"]','Home navigation');
    await page.wait(`!!document.getElementById('cashbar')`,5000,'NE Cash teaser');
    await click(page,'#cashbar','NE Cash teaser');
    await page.wait(`!document.getElementById('accountPage').classList.contains('hide')`,5000,'Account after NE Cash');
    pass('NE Cash teaser opens Account & plans');

    assert(page.errors.length===0,`No uncaught JavaScript errors during clickable test${page.errors[0]?': '+page.errors[0]:''}`);
    console.log(`Clickable smoke passed: ${passes.length} checks. No checkout, payment, subscription save, profile save, or production order action was clicked.`);
  }finally{await page.close()}
}

const chrome=findChrome();
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nel-click-e2e-'));
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';browser.stderr.on('data',b=>stderr+=String(b));
try{await waitForDebugger(profile);await test()}catch(e){console.error(e.stack||e);if(stderr)console.error(stderr.slice(-3000));process.exitCode=1}finally{browser.kill('SIGTERM');try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
