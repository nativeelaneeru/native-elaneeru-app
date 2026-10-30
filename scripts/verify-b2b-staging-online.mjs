/**
 * One controlled B2B COD order against a newly created QA-only Apps Script app.
 * NEVER run with the production endpoint or spreadsheet.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const url=String(process.env.NE_B2B_STAGING_API_URL||'');
const sheet=String(process.env.NE_B2B_STAGING_SHEET_ID||'');
const liveUrl='https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec';
const liveSheet='1t42vRvte6Y9E0Eh8MACET8_ZC7x3eio5RLlhIeVGB-8';
if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)||url===liveUrl)throw Error('LIVE OR INVALID ENDPOINT BLOCKED');
if(sheet!=='1HO6Mshh2wxJj7iDxTFb-eCIskbklpQwBlGd4yPs49FA'||sheet===liveSheet)throw Error('INVALID QA SHEET ID BLOCKED');

const ping=async(method,args)=>{
 const payload={method,args,requestId:crypto.randomUUID()};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);
 try{
   const res=await fetch(url+'?bridge=1',{method:'POST',redirect:'follow',signal:controller.signal,headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({payload:JSON.stringify(payload)})});
   const html=await res.text();
   if(!res.ok)throw Error(method+' HTTP '+res.status+' '+html.slice(0,140));
   const match=html.match(/\bvar d=(\{[\s\S]*?\});/);
   if(!match)throw Error(method+' missing bridge envelope: '+html.slice(0,240));
   const answer=JSON.parse(match[1]);
   if(!answer?.nelBridge||answer.payload?.requestId!==payload.requestId)throw Error(method+' untrusted response');
   if(!answer.payload.ok)throw Error(method+' failed: '+answer.payload.error);
   return answer.payload.result;
 }finally{clearTimeout(timer)}
};
const login=await ping('vendorLogin',['6111111111','2468']);
assert.equal(login.vendorId,'QA-VENDOR-001');
assert.ok(login.token);
console.log('PASS: staging-only synthetic vendor login');

const workspace=await ping('getB2BWorkspaceV5',[login.token]);
assert.equal(workspace.vendor?.vendorId,'QA-VENDOR-001');
const product=(workspace.products||[]).find(x=>x.productId==='TC');
assert.ok(product,'Synthetic tender coconut product missing');
assert.equal(Number(product.price),40);
console.log('PASS: QA-only workspace and price');

const requestId='qa-'+crypto.randomUUID();
const payload={clientRequestId:requestId,items:[{productId:'TC',quantity:200}],paymentType:'COD',deliveryDate:'',deliverySlot:'',deliveryAddress:workspace.vendor.address,area:workspace.vendor.area};
const order=await ping('placeB2BOrderV9',[login.token,payload]);
assert.equal(order.success,true);
assert.ok(order.orderId?.startsWith('NEB2B-'));
assert.equal(order.amount,8000);
assert.equal(order.status,'Order Received');
console.log('PASS: exactly one 200-coconut COD order created in QA');

const check=await ping('getB2BOrderRequestStatusV904',[login.token,payload]);
assert.equal(check.found,true);assert.equal(check.verified,true);assert.equal(check.orderId,order.orderId);
console.log('PASS: read-only order and complete item readback');

const retry=await ping('placeB2BOrderV9',[login.token,payload]);
assert.equal(retry.orderId,order.orderId);assert.equal(retry.duplicatePrevented,true);
console.log('PASS: same request ID returns original order without duplication');

let belowMoqBlocked=false;
try{await ping('placeB2BOrderV9',[login.token,{...payload,clientRequestId:'qa-'+crypto.randomUUID(),items:[{productId:'TC',quantity:150}]}]);}
catch(e){belowMoqBlocked=/minimum order/i.test(String(e.message));}
assert.equal(belowMoqBlocked,true);
console.log('PASS: 150 coconuts rejected at server-side MOQ');

await ping('vendorLogout',[login.token]);
console.log('PASS: QA staging E2E completed without production access');
