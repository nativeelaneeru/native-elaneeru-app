/**
 * Build a deployable, isolated copy of Native Elaneeru V8 and B2B PWA.
 * This script never writes to Google, deploys Apps Script, or changes main.
 * All generated artifacts live inside staging-build/ (not committed).
 */
import fs from 'node:fs';
import path from 'node:path';

const LIVE_SHEET = '1t42vRvte6Y9E0Eh8MACET8_ZC7x3eio5RLlhIeVGB-8';
const QA_SHEET = process.env.NE_B2B_STAGING_SHEET_ID || '1HO6Mshh2wxJj7iDxTFb-eCIskbklpQwBlGd4yPs49FA';
const LIVE_API = 'https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec';
const QA_API = process.env.NE_B2B_STAGING_API_URL || 'https://b2b-staging-not-configured.invalid/exec';
const out = path.resolve(process.env.NE_B2B_STAGING_OUT || 'staging-build');

function stop(message){throw Error('ISOLATION GUARD: ' + message)}
if (!/^[\w-]{20,}$/.test(QA_SHEET) || QA_SHEET === LIVE_SHEET) stop('missing or production spreadsheet ID');
if (QA_API === LIVE_API) stop('staging API points to the live Apps Script deployment');
if (!/^https:\/\//.test(QA_API)) stop('staging API must be HTTPS');
if (process.env.NE_B2B_STAGING_API_URL && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(QA_API)) stop('staging API is not a published Apps Script web app');

fs.rmSync(out,{recursive:true,force:true});
for(const p of ['src','b2b','icons','images','b2c/images']){
  if(fs.existsSync(p))fs.cpSync(p,path.join(out,p),{recursive:true});
}

const codePath=path.join(out,'src','Code.gs');
let code=fs.readFileSync(codePath,'utf8');
const marker="SPREADSHEET_ID: '" + LIVE_SHEET + "'";
if(code.split(marker).length!==2)stop('expected exactly one main spreadsheet reference in Code.gs');
code=code.replace(marker,"SPREADSHEET_ID: '" + QA_SHEET + "'");
fs.writeFileSync(codePath,code);

for(const p of ['app-v5.js','config.js']){
  const file=path.join(out,'b2b',p);
  let src=fs.readFileSync(file,'utf8');
  if(!src.includes(LIVE_API))stop(p+' did not contain the known live endpoint; inspect before proceeding');
  src=src.replaceAll(LIVE_API,QA_API);
  fs.writeFileSync(file,src);
}
// The staging web page is visibly differentiated from customer production.
const htmlPath=path.join(out,'b2b','index.html');
let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('</body>'))stop('B2B HTML body marker missing');
html=html.replace('</body>','<div id="qa-staging-marker" style="position:fixed;top:0;left:0;right:0;z-index:99999;text-align:center;font:bold 11px sans-serif;padding:5px;background:#fff3cd;color:#704d00">NE B2B QA STAGING — SYNTHETIC ORDERS ONLY</div></body>');
fs.writeFileSync(htmlPath,html);

// If another server file hardcodes the production spreadsheet, refuse deployment.
for(const name of fs.readdirSync(path.join(out,'src'))){
  if(!name.endsWith('.gs'))continue;
  if(fs.readFileSync(path.join(out,'src',name),'utf8').includes(LIVE_SHEET))stop('production sheet reference remains in src/'+name);
}
for(const p of ['app-v5.js','config.js']){
  if(fs.readFileSync(path.join(out,'b2b',p),'utf8').includes(LIVE_API))stop('production API remains in B2B/'+p);
}
const meta={mode:'STAGING_ONLY',spreadsheetId:QA_SHEET,apiUrl:QA_API,sourceBranch:'staging/b2b-order-recovery-20261030',requiresSeparateAppsScriptProject:true,productionModified:false};
fs.writeFileSync(path.join(out,'STAGING-MANIFEST.json'),JSON.stringify(meta,null,2)+'\n');
console.log('PASS: isolated B2B staging build; sheet='+QA_SHEET+'; backend='+QA_API+'; no live backend references');
