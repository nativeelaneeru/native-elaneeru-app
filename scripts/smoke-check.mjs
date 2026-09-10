import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const APPS=['b2c','b2b'];
const failures=[];
const ok=[];

function fail(msg){failures.push(msg);console.error('✗',msg)}
function pass(msg){ok.push(msg);console.log('✓',msg)}
function exists(rel){return fs.existsSync(path.join(ROOT,rel))}
function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8')}

function resolveLocal(baseDir,ref){
  const clean=String(ref||'').split('#')[0].split('?')[0];
  if(!clean||clean.includes('${')||clean.includes('{{')||clean.includes('<%'))return null;
  if(/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(clean))return null;
  const rel=path.normalize(path.join(baseDir,clean));
  return rel.replaceAll('\\','/');
}

function checkRef(app,ref,label){
  const local=resolveLocal(app,ref);
  if(!local)return;
  let target=local;if(target.endsWith('/'))target+='index.html';
  exists(target)?pass(`${app}: ${label} ${ref} exists`):fail(`${app}: broken ${label} ${ref} -> ${target}`);
}

for(const app of APPS){
  const dir=app,index=`${dir}/index.html`,manifestPath=`${dir}/manifest.webmanifest`,swPath=`${dir}/sw.js`,configPath=`${dir}/config.js`;
  for(const required of [index,manifestPath,swPath,configPath])exists(required)?pass(`${app}: ${required} exists`):fail(`${app}: missing ${required}`);
  if(!exists(index)||!exists(manifestPath)||!exists(swPath)||!exists(configPath))continue;

  let manifest;
  try{manifest=JSON.parse(read(manifestPath));pass(`${app}: manifest JSON is valid`)}catch(e){fail(`${app}: invalid manifest JSON: ${e.message}`);continue}
  const start=resolveLocal(dir,manifest.start_url||'./');
  if(start){const startPath=start.endsWith('/')?`${start}index.html`:start;exists(startPath)?pass(`${app}: manifest start_url resolves to ${startPath}`):fail(`${app}: manifest start_url target missing: ${startPath}`)}
  if(app==='b2b'&&String(manifest.start_url||'').includes('v96'))fail('b2b: manifest must not launch legacy v96.html');

  const html=read(index);
  const refs=[...html.matchAll(/<(?:script|link|img|a)\b[^>]*?(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]);
  refs.forEach(ref=>checkRef(app,ref,'HTML reference'));

  const config=read(configPath);
  const configRefs=[...config.matchAll(/src=["']([^"']+)["']/g)].map(m=>m[1]);
  configRefs.forEach(ref=>checkRef(app,ref,'config script'));
  pass(`${app}: checked ${refs.length} HTML refs and ${configRefs.length} config scripts`);

  const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  scripts.forEach((code,i)=>{try{new vm.Script(code,{filename:`${index}#inline-${i+1}`});pass(`${app}: inline script ${i+1} parses`)}catch(e){fail(`${app}: inline script ${i+1} syntax error: ${e.message}`)}});

  const sw=read(swPath);
  try{new vm.Script(sw,{filename:swPath});pass(`${app}: service worker parses`)}catch(e){fail(`${app}: service worker syntax error: ${e.message}`)}
  if(app==='b2b'&&/v96\.html/.test(sw))fail('b2b: service worker still references legacy v96.html');
  for(const ref of configRefs){const local=resolveLocal(app,ref);if(local&&!sw.includes(path.basename(local)))fail(`${app}: service worker does not reference dynamic script ${path.basename(local)}`)}
}

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const abs=path.join(dir,entry.name);
    if(entry.isDirectory())walk(abs);
    else if(entry.isFile()&&entry.name.endsWith('.js')){
      const rel=path.relative(ROOT,abs).replaceAll('\\','/');
      try{new vm.Script(fs.readFileSync(abs,'utf8'),{filename:rel})}catch(e){fail(`${rel}: JavaScript syntax error: ${e.message}`)}
    }
  }
}
for(const app of APPS)walk(path.join(ROOT,app));

const b2cConfig=read('b2c/config.js');
const b2c113=read('b2c/ui-v113.js');
const b2c125=read('b2c/ui-v125.js');
const b2c127=read('b2c/ui-v127.js');
const b2cDb=read('b2c/idb-v1.js');
if(/ui-v126\.js/.test(b2cConfig))fail('b2c: legacy ui-v126 checkout patch must not be loaded');else pass('b2c: legacy ui-v126 is not loaded');
if(/window\.placeOrder\s*=/.test(b2c113))fail('b2c: ui-v113 must not own placeOrder');else pass('b2c: ui-v113 does not own placeOrder');
if(/window\.placeOrder\s*=/.test(b2c125))fail('b2c: ui-v125 must not own placeOrder');else pass('b2c: ui-v125 does not own placeOrder');
if(!/window\.placeOrder\s*=\s*placeOrderV127/.test(b2c127))fail('b2c: ui-v127 is not the canonical checkout owner');else pass('b2c: ui-v127 is the canonical checkout owner');
if(!/clearCart:function/.test(b2cDb)||!/await api\.clearCart\(\)/.test(b2cDb))fail('b2c: IndexedDB does not clear cart on confirmed order');else pass('b2c: confirmed orders clear IndexedDB cart');
if(/checkDeliveryLocation/.test(b2c127))fail('b2c: checkout still performs a redundant delivery RPC');else pass('b2c: checkout uses one server confirmation call');

const b2bConfig=read('b2b/config.js'),b2bDb=read('b2b/idb-v1.js'),b2bGuard=read('b2b/session-guard-v980.js'),b2bSync=read('b2b/order-sync-v1.js');
if(!/session-guard-v980\.js/.test(b2bConfig))fail('b2b: vendor cart guard is not loaded');else pass('b2b: vendor cart guard is loaded');
if(!/order-sync-v1\.js/.test(b2bConfig))fail('b2b: duplicate-safe order sync is not loaded');else pass('b2b: duplicate-safe order sync is loaded');
if(!/clearBusinessCache/.test(b2bDb)||!/cart_owner_mobile/.test(b2bGuard))fail('b2b: vendor-scoped cache protection is incomplete');else pass('b2b: vendor-scoped cache protection is present');
if(!/clientRequestId/.test(b2bSync))fail('b2b: order sync does not attach a request id');else pass('b2b: order sync attaches request ids');

if(failures.length){console.error(`\nSmoke check failed with ${failures.length} issue(s).`);process.exit(1)}
console.log(`\nSmoke check passed: ${ok.length} checks, 0 failures.`);
