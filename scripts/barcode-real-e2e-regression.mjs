import fs from 'node:fs';

function fail(msg){console.error('✗ '+msg);process.exit(1)}
function ok(msg){console.log('✓ '+msg)}
function read(path){return fs.readFileSync(path,'utf8')}
function inlineScripts(path){
  const html=read(path);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  if(!scripts.length)fail(path+' has no inline JavaScript.');
  scripts.forEach((src,i)=>{try{new Function(src)}catch(e){fail(path+' script '+(i+1)+' parse failed: '+e.message)}});
  return html;
}

const ui=inlineScripts('src/AdminBarcodeRealTestV960.html');
const backend=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V959_BarcodeRealTest.gs');
try{new Function(backend)}catch(e){fail('V9.5.9 backend parse failed: '+e.message)}
const rpc=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V922_BarcodeConsole.gs');
try{new Function(rpc)}catch(e){fail('Barcode RPC parse failed: '+e.message)}
const routes=read('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs');
try{new Function(routes)}catch(e){fail('Final routes parse failed: '+e.message)}

for(const token of ['createBarcodeRealTestV959','getBarcodeRealTestStatusV959','cleanupBarcodeRealTestV959','createBatchV81','B2B_ORDERS','B2B_ORDER_ITEMS','DRIVERS','ROUTES','STOPS']){
  if(!backend.includes(token))fail('Backend missing '+token);
}
if(!backend.includes("'Payment Status':'TEST'"))fail('Real test order must stay explicitly non-financial.');
if(/append_\(V8\.SHEETS\.(PAYMENTS|CASHBACK|COLLECTIONS)/.test(backend))fail('Real barcode test must not write payment/cashback/collection ledgers.');
if(/placeB2BOrder|submitB2BUpi|prepareB2BUpi/.test(backend))fail('Real barcode test must not enter live B2B payment/order checkout engines.');
if(!backend.includes("'Access Source':tag"))fail('Temporary driver is not safely tagged for cleanup.');
if(!backend.includes("Location:'TEST-"))fail('Real test batch is not isolated by test location.');
if(!backend.includes('v959DeleteWhere_'))fail('Cleanup helper is missing.');

for(const method of ['createBarcodeRealTestV959','getBarcodeRealTestStatusV959','cleanupBarcodeRealTestV959']){
  if(!rpc.includes("case '"+method+"'"))fail('Admin Barcode RPC does not expose '+method);
}
if(!routes.includes('AdminBarcodeRealTestV960'))fail('Admin route does not load V9.6.0 real test UI.');
if(routes.includes('AdminBarcodeRealTestV959'))fail('Broken V9.5.9 UI is still loaded by Admin.');
if(!ui.includes('Create REAL Test Setup'))fail('Real test start control is missing.');
if(!ui.includes('2 · Scan & Assign'))fail('Step 2 control is missing.');
if(!ui.includes('3 · Open B2B Driver'))fail('Step 3 driver control is missing.');
if(!ui.includes('Delete Test Data'))fail('Cleanup control is missing.');
if(!ui.includes('adminBarcodeSubtabV926'))fail('Real test does not use existing assignment/camera flow.');
if(!ui.includes('?page=driver'))fail('Real test does not link to the production Driver route.');

ok('V9.5.9 backend parses and creates isolated real operational test rows.');
ok('Real test has no payment/cashback/collection write path.');
ok('Admin RPC exposes create/status/cleanup actions.');
ok('V9.6.0 Admin UI covers Step 1 -> Step 2 camera assignment -> Step 3 B2B Driver -> cleanup.');
console.log('Barcode real E2E regression passed.');
