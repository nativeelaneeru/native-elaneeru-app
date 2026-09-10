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
  if(!clean||/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(clean))return null;
  const rel=path.normalize(path.join(baseDir,clean));
  return rel.replaceAll('\\','/');
}

for(const app of APPS){
  const dir=app;
  const index=`${dir}/index.html`;
  const manifestPath=`${dir}/manifest.webmanifest`;
  const swPath=`${dir}/sw.js`;

  for(const required of [index,manifestPath,swPath,`${dir}/config.js`]){
    exists(required)?pass(`${app}: ${required} exists`):fail(`${app}: missing ${required}`);
  }
  if(!exists(index)||!exists(manifestPath)||!exists(swPath))continue;

  let manifest;
  try{manifest=JSON.parse(read(manifestPath));pass(`${app}: manifest JSON is valid`)}
  catch(e){fail(`${app}: invalid manifest JSON: ${e.message}`);continue}

  const start=resolveLocal(dir,manifest.start_url||'./');
  if(start){
    const startPath=start.endsWith('/')?`${start}index.html`:start;
    exists(startPath)?pass(`${app}: manifest start_url resolves to ${startPath}`):fail(`${app}: manifest start_url target missing: ${startPath}`);
  }
  if(app==='b2b'&&String(manifest.start_url||'').includes('v96'))fail('b2b: manifest must not launch legacy v96.html');

  const html=read(index);
  const refs=[...html.matchAll(/<(?:script|link|img|a)\b[^>]*?(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const ref of refs){
    const local=resolveLocal(dir,ref);
    if(!local)continue;
    let target=local;
    if(target.endsWith('/'))target+=`index.html`;
    if(!exists(target))fail(`${app}: broken local reference ${ref} -> ${target}`);
  }
  pass(`${app}: checked ${refs.length} HTML references`);

  const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  scripts.forEach((code,i)=>{
    try{new vm.Script(code,{filename:`${index}#inline-${i+1}`});pass(`${app}: inline script ${i+1} parses`)}
    catch(e){fail(`${app}: inline script ${i+1} syntax error: ${e.message}`)}
  });

  const sw=read(swPath);
  try{new vm.Script(sw,{filename:swPath});pass(`${app}: service worker parses`)}
  catch(e){fail(`${app}: service worker syntax error: ${e.message}`)}
  if(app==='b2b'&&/v96\.html/.test(sw))fail('b2b: service worker still references legacy v96.html');
}

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const abs=path.join(dir,entry.name);
    if(entry.isDirectory())walk(abs);
    else if(entry.isFile()&&entry.name.endsWith('.js')){
      const rel=path.relative(ROOT,abs).replaceAll('\\','/');
      try{new vm.Script(fs.readFileSync(abs,'utf8'),{filename:rel})}
      catch(e){fail(`${rel}: JavaScript syntax error: ${e.message}`)}
    }
  }
}
for(const app of APPS)walk(path.join(ROOT,app));

if(failures.length){
  console.error(`\nSmoke check failed with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log(`\nSmoke check passed: ${ok.length} checks, 0 failures.`);
