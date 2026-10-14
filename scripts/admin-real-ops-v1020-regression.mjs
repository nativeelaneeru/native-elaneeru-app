import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const backend=fs.readFileSync('src/NE_AdminOpsRealDashboardV1020.gs','utf8');
const ui=fs.readFileSync('src/NE_AdminOpsLiveDashboardV1020.html','utf8');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');
const nav=fs.readFileSync('src/AdminNavigationV957.html','utf8');
const bridge=fs.readFileSync('src/ZZZZZZZZZZZ_V900_PwaBridge.gs','utf8');
new Function(backend);
for(const match of ui.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(match[1]);

assert.match(backend,/function getNEOpsLiveSnapshotV1020\(email,pin\)\{\s*requireAdmin_\(email,pin\)/);
assert.match(ui,/getNEOpsLiveSnapshotV1020\(E,P\)/);
assert.match(routes,/HtmlService\.createTemplateFromFile\('NE_AdminOpsLiveDashboardV1020'\)/);
assert.match(nav,/var PANELS=\['neLiveOpsPanel'/);
assert.doesNotMatch(bridge,/getNEOpsLiveSnapshotV1020/);
assert.doesNotMatch(backend,/\b(?:appendRow|setValue|setValues|deleteRow|append_|updateObj_)\s*\(/);
assert.doesNotMatch(ui,/fetch\s*\(|script\.google\.com|supabase\.co/);

const data={
 Orders:[
  {'Order ID':'NEL-1','Ordered At':'14/10/2026 12:00','Status':'Delivered','Total Amount':'550','Payment Status':'PENDING'},
  {'Order ID':'NEL-2','Ordered At':'2026-10-13','Status':'Order Received','Total Amount':'475','Payment Status':'PENDING'},
  {'Order ID':'NEL-2','Status':'Order Received','Total Amount':'475','Payment Status':'PENDING'},
  {'Order ID':'NEL-DEMO-001','Status':'Delivered','Total Amount':'9999','Payment Status':'PENDING'}
 ],
 B2B_Orders:[
  {'Order ID':'NEB2B-1','Status':'Order Received','Total Amount':'3360000','Payment Status':'PENDING'},
  {'Order ID':'NEB2B-2','Status':'Delivered','Total Amount':'8400','Payment Status':'PENDING'}
 ],
 Purchase_Orders:[{'PO ID':'PO-1','Status':'ISSUED','Supplier Name':'Partner A','Sub Total':'26000','Expected Date':''}],
 Purchase_Order_Items:[{'PO ID':'PO-1','Quantity':'1000','Received Qty':'0'}],
 Coconut_Batches:[{'Batch ID':'BAT-1','Original Qty':'600','Available Qty':'400','Reserved Qty':'200','Delivered Qty':'0'}],
 Inventory_Ledger:[],
 B2B_Collections:[],
 Payment_Ledger:[],
 Delivery_Routes:[{'Route ID':'RT-1','Status':'ACTIVE'}],
 Route_Stops:[{'Stop ID':'ST-1','Status':'PENDING'}]
};
const sheets={ORDERS:'Orders',B2B_ORDERS:'B2B_Orders',BATCHES:'Coconut_Batches',INVENTORY:'Inventory_Ledger',COLLECTIONS:'B2B_Collections',PAYMENTS:'Payment_Ledger',ROUTES:'Delivery_Routes',STOPS:'Route_Stops'};
let reads=0;
const context={
 V8:{SHEETS:sheets},
 rows_:name=>{reads++;if(!Object.hasOwn(data,name))throw Error('Missing sheet '+name);return data[name]},
 requireAdmin_:(email,pin)=>{if(email!=='qa@example.invalid'||pin!=='correct')throw Error('Invalid admin credentials.')},
 Utilities:{formatDate:(value,tz,pattern)=>{const iso=new Date(value).toISOString();return pattern==='yyyy-MM-dd'?iso.slice(0,10):iso.slice(0,19).replace('T',' ')}},
 Date,Number,String,Array,Object,Math,RegExp,isNaN
};
vm.runInNewContext(backend,context,{filename:'NE_AdminOpsRealDashboardV1020.gs'});
assert.throws(()=>context.getNEOpsLiveSnapshotV1020('unauthorized','bad'),/Invalid admin/);
assert.equal(reads,0,'Unauthorized caller cannot read any sheet');
const live=context.getNEOpsLiveSnapshotV1020('qa@example.invalid','correct');
assert.equal(live.success,true);
assert.equal(live.readOnly,true);
assert.equal(live.metrics.bookedGmv,8950);
assert.equal(live.metrics.deliveredGmv,8950);
assert.equal(live.metrics.duplicateRows,1);
assert.equal(live.metrics.duplicateIds,1);
assert.equal(live.metrics.highValueOrders,1);
assert.equal(live.metrics.demoRowsExcluded,1);
assert.equal(live.metrics.poPending,1000);
assert.equal(live.metrics.poMissingExpected,1);
assert.equal(live.metrics.recordedAvailable,400);
assert.equal(live.metrics.recordedReserved,200);
assert.equal(live.delivery.pendingStops,1);
assert.equal(live.sales.orders.find(x=>x.id==='NEL-1').date,'2026-10-14','Indian date must remain 14 Oct, not Feb 10');
for(const code of ['DUPLICATE_ORDERS','HIGH_VALUE_ORDER','LEDGER_EMPTY','COLLECTIONS_EMPTY','PAYMENT_PENDING'])assert.ok(live.issues.some(x=>x.code===code),'Missing gate '+code);
assert.ok(!JSON.stringify(live).includes('Mobile'),'No private contact data in API payload');
assert.match(live.verification.stock,/UNVERIFIED/);
assert.equal(live.inward.recordCount,0);
console.log('✓ Native Elaneeru real Ops V10.2.0: auth first, 24+ integrations and anomaly checks passed (mock fixtures).');
