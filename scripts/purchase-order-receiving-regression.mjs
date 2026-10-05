import fs from 'node:fs';
import assert from 'node:assert/strict';

const backend=fs.readFileSync('src/NE_Purchase_Order_Receiving_V968.gs','utf8');
const ui=fs.readFileSync('src/PurchaseOrders.html','utf8');
new Function(backend);
for(const match of ui.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))new Function(match[1]);
assert.match(ui,/recordPurchaseOrderReceiptV968/);
assert.match(ui,/Good units received/);
assert.match(ui,/po\.supplierVerified===true/);
assert.match(ui,/legacy PO supplier is not verified/);
assert.match(ui,/Storage location/);
assert.match(backend,/PURCHASE_RECEIPT/);
assert.match(backend,/V944:BUNCH_STOCK/);
assert.match(backend,/Idempotency Key/);
assert.match(backend,/PROCESSING/);
assert.match(backend,/Received Qty/);
assert.match(backend,/qty>remaining/);
assert.match(backend,/V931_SUPPLIERS_SHEET/);
assert.match(backend,/B2B customers cannot be used as suppliers/);
assert.doesNotMatch(fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V931_PurchaseOrders.gs','utf8'),/B2B_VENDORS/);

const sheets={
  Purchase_Orders:[{'PO ID':'PO-100','Supplier ID':'SUP-100','Status':'ISSUED','Updated At':'','_row':2},{'PO ID':'PO-200','Supplier ID':'VEN-CUSTOMER-1','Supplier Name':'Assha Coconut','Status':'ISSUED','Updated At':'','_row':3}],
  NE_Suppliers:[{'Supplier ID':'SUP-100','Supplier Name':'Test farm','Status':'ACTIVE','_row':2}],
  Purchase_Order_Items:[{'PO ID':'PO-100','Line No':1,'Product ID':'TC','Product Name':'Tender Coconut','Quantity':100,'Unit':'pc','Received Qty':0,'_row':2},{'PO ID':'PO-200','Line No':1,'Product ID':'TC','Product Name':'Tender Coconut','Quantity':20,'Unit':'pc','Received Qty':0,'_row':3}],
  Products:[{'Product ID':'TC','Product Name':'Tender Coconut','_row':2}],
  Coconut_Batches:[],
  Inventory_Ledger:[],
  Purchase_Receipts:[]
};
let nextId=0,failInventoryOnce=true;
const V8={SHEETS:{PRODUCTS:'Products',BATCHES:'Coconut_Batches',INVENTORY:'Inventory_Ledger'}};
const rows_=name=>sheets[name]||[];
function append_(name,obj){
  if(name==='Inventory_Ledger'&&failInventoryOnce){failInventoryOnce=false;throw new Error('simulated transient ledger write failure');}
  const list=sheets[name]||(sheets[name]=[]),row=Object.assign({},obj,{_row:list.length+2});list.push(row);return row._row;
}
function updateObj_(name,rowNo,obj){const row=(sheets[name]||[]).find(x=>x._row===rowNo);if(!row)throw new Error('row not found');Object.assign(row,obj)}
function find_(name,field,value){return rows_(name).find(x=>String(x[field]??'')===String(value??''))||null}
const id_=prefix=>String(prefix||'ID')+String(++nextId).padStart(6,'0');
const now_=()=> '2026-10-04T12:00:00Z';
const lockRun_=fn=>fn();
const requireAdmin_=(email,pin)=>{if(email!=='admin@example.com'||pin!=='1234')throw new Error('Admin login required')};
const s_=v=>String(v??'').trim();
const n_=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const v931Setup_=()=>{};
const v931Ensure_=()=>{};
const v931Rows_=rows_;
const Utilities={formatDate:()=> '261004'};
const CacheService={getScriptCache:()=>({remove:()=>{}})};
const api=new Function('V8','rows_','append_','updateObj_','find_','id_','now_','lockRun_','requireAdmin_','s_','n_','v931Setup_','v931Ensure_','v931Rows_','Utilities','CacheService',
  "const V931_PO_SHEET='Purchase_Orders';const V931_PO_ITEMS_SHEET='Purchase_Order_Items';const V931_SUPPLIERS_SHEET='NE_Suppliers';"+backend+";return recordPurchaseOrderReceiptV968;")(
  V8,rows_,append_,updateObj_,find_,id_,now_,lockRun_,requireAdmin_,s_,n_,v931Setup_,v931Ensure_,v931Rows_,Utilities,CacheService
);
const first={poId:'PO-100',lineNo:1,qty:40,location:'HALL',idempotencyKey:'RECEIPT-KEY-0001'};
assert.throws(()=>api('admin@example.com','1234',first),/simulated transient ledger write failure/);
assert.equal(sheets.Coconut_Batches.length,1,'first attempt writes exactly one batch before simulated failure');
assert.equal(sheets.Inventory_Ledger.length,0);
const recovered=api('admin@example.com','1234',first);
assert.equal(recovered.success,true);
assert.equal(recovered.qty,40);
assert.equal(recovered.poStatus,'PARTIALLY RECEIVED');
assert.equal(recovered.remainingQty,60);
assert.equal(sheets.Coconut_Batches.length,1,'retry must reuse the batch');
assert.equal(sheets.Inventory_Ledger.length,1,'retry must add only one inventory movement');
assert.equal(sheets.Inventory_Ledger[0]['Qty In'],40);
assert.equal(sheets.Purchase_Order_Items[0]['Received Qty'],40);
assert.equal(sheets.Purchase_Receipts[0].Status,'COMPLETE');
assert.throws(()=>api('admin@example.com','1234',{poId:'PO-100',lineNo:1,qty:61,location:'HUB',idempotencyKey:'RECEIPT-KEY-0004'}),/exceeds the 60 unit/);
assert.throws(()=>api('wrong@example.com','1234',first),/Admin login required/);
const retry=api('admin@example.com','1234',first);
assert.equal(retry.idempotent,true);
assert.equal(sheets.Coconut_Batches.length,1);
assert.equal(sheets.Inventory_Ledger.length,1);
const second=api('admin@example.com','1234',{poId:'PO-100',lineNo:1,qty:60,location:'BEDROOM',idempotencyKey:'RECEIPT-KEY-0002'});
assert.equal(second.poStatus,'RECEIVED');
assert.equal(second.remainingQty,0);
assert.equal(sheets.Purchase_Order_Items[0]['Received Qty'],100);
assert.equal(sheets.Coconut_Batches.length,2);
assert.equal(sheets.Inventory_Ledger.length,2);
assert.throws(()=>api('admin@example.com','1234',{poId:'PO-100',lineNo:1,qty:1,location:'HUB',idempotencyKey:'RECEIPT-KEY-0003'}),/issued or partially received/);
assert.throws(()=>api('admin@example.com','1234',{poId:'PO-100',lineNo:1,qty:1,location:'HUB',idempotencyKey:'bad'}),/request key is invalid/);
const batchesBeforeLegacy=sheets.Coconut_Batches.length,ledgerBeforeLegacy=sheets.Inventory_Ledger.length,receiptsBeforeLegacy=sheets.Purchase_Receipts.length;
assert.throws(()=>api('admin@example.com','1234',{poId:'PO-200',lineNo:1,qty:20,location:'HUB',idempotencyKey:'RECEIPT-LEGACY-0001'}),/not linked to an active NE supplier record/);
assert.equal(sheets.Coconut_Batches.length,batchesBeforeLegacy,'unverified legacy PO must not create a stock batch');
assert.equal(sheets.Inventory_Ledger.length,ledgerBeforeLegacy,'unverified legacy PO must not change inventory');
assert.equal(sheets.Purchase_Receipts.length,receiptsBeforeLegacy,'unverified legacy PO must not create a receipt');
console.log('Purchase order receiving regression passed: partial receipt, locked stock linkage, retry recovery, idempotency and over-receipt guards.');
