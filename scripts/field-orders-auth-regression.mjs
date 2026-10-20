import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const field=read('src/NE_Field_Orders_V1021.gs');
const canonical=read('src/ZZZZZZZZZZZZZ_V904_B2BOrder.gs');
const html=read('src/VendorFieldVisitsV1020.html');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const s_=v=>String(v??'').trim();
const future=new Date(Date.now()+6*864e5).toISOString().slice(0,10);
const cutoff=new Date(Date.now()+5*864e5).toISOString();
const slot={Enabled:true,'Delivery Date':future,Slot:'08:00-10:00',Area:'Test Area','Capacity Qty':5000,'Cutoff At':cutoff};
const vendor={'Vendor ID':'VEN-TEST','Business Name':'Test Vendor','Owner Name':'Test Owner',Mobile:'9999999999',
  Area:'Test Area',Address:'Test address',Pincode:'560000',Latitude:12.8,Longitude:77.6,
  'Payment Type':'COD',Status:'ACTIVE',Outstanding:0,'Credit Limit':0};
const onboard={'Onboarding ID':'ONB-TEST','Approved Vendor ID':'VEN-TEST',Status:'APPROVED'};
const product={productId:'TC',productName:'Tender Coconut',price:42,unit:'piece',moq:200,qtyStep:1};
const submitted={onboardingId:'ONB-TEST',productId:'TC',quantity:200,deliveryDate:future,
  deliverySlot:slot.Slot,paymentType:'COD',clientRequestId:'REQUEST-TEST-1234',price:1};
const written=[];
function sheet(){
  const orders=written.filter(x=>x.sheet==='orders');
  return {getLastRow:()=>orders.length+1,getRange:(row,col)=>({
    getValue:()=>{const o=orders[row-2]?.data;return o&&({1:o.Source,2:o['Order ID'],3:o['Vendor ID'],4:o['Total Amount'],5:o.Status})[col]},
    createTextFinder:tag=>({matchCase:()=>({findAll:()=>orders.filter(x=>String(x.data.Source).includes(tag)).map(x=>({getRow:()=>orders.indexOf(x)+2}))})})
  })};
}
const helpers={
  s_,n_:v=>Number(v)||0,digits_:v=>String(v||'').replace(/\D/g,''),now_:()=>new Date().toISOString(),
  V8:{SHEETS:{B2B_ORDERS:'orders',B2B_ORDER_ITEMS:'items',VENDOR_ONBOARD:'onboard',B2B_VENDORS:'vendors'}},
  b2bProducts_:()=>[product],lockRun_:fn=>fn(),vendor_:()=>{throw Error('Vendor-token path must not run')},
  sh_:sheet,map_:()=>({Source:1,'Order ID':2,'Vendor ID':3,'Total Amount':4,Status:5}),
  neAutoContext_:()=>({slots:[slot],orders:[],items:[]}),
  neAutoEnabled_:v=>!!v,neAutoDate_:s_,neAutoTime_:v=>new Date(v).getTime(),
  neAutoPrepare_:()=>({accepted:false,reason:'AUTO_ACCEPT_DISABLED'}),
  neAutoCommit_:()=>({status:'Order Received',autoAccepted:false}),
  id_:prefix=>prefix+'TEST-'+(written.filter(x=>x.sheet==='orders').length+1),
  hashV8_:()=> 'hashed',append_:(sheet,data)=>written.push({sheet,data}),
  updateObj_:()=>{throw Error('Unexpected credit write')},
  active_:v=>v==='ACTIVE',
  v949VendorSessionStaff_:token=>{if(token!=='VALID_STAFF_TOKEN')throw Error('Session denied');return {user:{staffId:'STAFF-TEST'}}},
  rows_:name=>name==='onboard'?[onboard]:name==='slots'?[slot]:[],
  find_:(name,key,id)=>name==='onboard'&&id==='ONB-TEST'?onboard:name==='vendors'&&id==='VEN-TEST'?vendor:null,
  NE_AUTO:{slots:'slots'}
};
const ctx=vm.createContext(helpers);
vm.runInContext(canonical,ctx,{filename:'canonical-order.gs'});
vm.runInContext(field,ctx,{filename:'field-order.gs'});
const input=()=>({...submitted});
const submit=p=>ctx.submitFieldOrderV1021('VALID_STAFF_TOKEN',p);

test('UI/backend/engine parse correctly and vendor PII is not embedded',()=>{
  assert.ok(inline.length);for(const js of inline)new Function(js);
  assert.match(html,/let VENDORS=\[\]/);
  assert.match(html,/readonly aria-readonly/);
  assert.match(html,/No enabled delivery slots configured/);
});

test('staff authorization is mandatory for read and write',()=>{
  assert.throws(()=>ctx.getFieldVendorsV1021('bad'),/Session denied/);
  assert.throws(()=>ctx.getFieldOrderOptionsV1021('bad','ONB-TEST'),/Session denied/);
  assert.throws(()=>ctx.submitFieldOrderV1021('bad',input()),/Session denied/);
});

test('known active vendor has products and delivery options',()=>{
  const o=ctx.getFieldOrderOptionsV1021('VALID_STAFF_TOKEN','ONB-TEST');
  assert.equal(o.vendorId,'VEN-TEST');assert.equal(o.products[0].price,42);
  assert.equal(o.slots[0].slot,slot.Slot);
});

test('unknown, inactive and unactivated vendors are not orderable',()=>{
  assert.throws(()=>submit({...input(),onboardingId:'UNKNOWN'}),/activated/);
  assert.throws(()=>submit({...input(),quantity:0}),/quantity/);
  assert.throws(()=>submit({...input(),quantity:10.2}),/quantity/);
  assert.throws(()=>submit({...input(),paymentType:'CREDIT'}),/COD only/);
  assert.throws(()=>submit({...input(),deliverySlot:''}),/delivery date and slot/);
  assert.equal(written.length,0);
});

test('canonical validation rejects bad products, MOQ and unavailable delivery',()=>{
  assert.throws(()=>submit({...input(),productId:'INVALID'}),/unavailable/);
  assert.throws(()=>submit({...input(),quantity:199}),/minimum order/);
  assert.throws(()=>submit({...input(),deliverySlot:'Unknown'}),/unavailable/);
  assert.equal(written.length,0);
});

test('one authorized order writes order and item at SERVER price, not client price',()=>{
  const result=submit(input());
  assert.ok(result.orderId);assert.equal(result.amount,8400);
  assert.equal(written.length,2);
  assert.equal(written[0].data['Total Amount'],8400);
  assert.equal(written[0].data.Source.startsWith('FIELD STAFF|REQ:'),true);
  assert.equal(written[1].data.Quantity,200);
});

test('replayed request returns the existing order without duplicate rows',()=>{
  const result=submit(input());
  assert.equal(result.duplicatePrevented,true);
  assert.equal(result.amount,8400);
  assert.equal(written.length,2);
});
