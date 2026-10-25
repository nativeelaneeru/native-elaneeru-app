/**
 * Native Elaneeru V11.1.0 — committed-stock availability + 2-hour manual stock cycle.
 *
 * Operating model (owner decision, 25 Oct 2026): stock is counted and entered manually
 * as bunches every ~2 hours. Orders are mostly scheduled by operations (no customer slot).
 *
 * 1. Vendors see AVAILABLE = bunch stock on hand − coconuts already promised to open
 *    B2B orders that no bunch has been assigned to yet. Nothing is written to batches:
 *    cancelling, rejecting or delivering an order releases its quantity automatically,
 *    and the picker's whole-bunch assignment flow is unchanged.
 * 2. Every COD order is checked against that number inside the order lock. Before this,
 *    the COD path never checked stock, so two vendors could both buy the last 300.
 * 3. Auto-accept treats open promises as part of the safety buffer, so it cannot hand
 *    the same coconuts to two orders.
 * 4. Each bunch entry records a stock check (B2B_Stock_Checks: Verified At / By /
 *    VERIFIED), so the 2-hour count doubles as the auto-accept stock verification.
 * 5. The Dispatcher board shows when stock was last entered; stale after 150 minutes.
 *
 * Only orders placed in the last V1110_OPEN_WINDOW_H hours count as open promises, so
 * old orders never closed in the sheet cannot zero out stock. All helpers end in '_'.
 */
const V1110_VERSION='11.1.0';
const V1110_OPEN_WINDOW_H=72;
const V1110_STALE_MIN=150;
const V1110_CLOSED=Object.freeze(['DELIVERED','COMPLETED','CANCELLED','CANCELED','REJECTED','FAILED','RETURNED']);

function v1110Closed_(status){return V1110_CLOSED.indexOf(s_(status).toUpperCase())>=0;}
function v1110Time_(v){if(v instanceof Date)return v.getTime();const t=new Date(s_(v)).getTime();return isFinite(t)?t:NaN;}
function v1110RealBatch_(b){return !/DEMO|TEST/i.test(s_(b['Batch ID'])+' '+s_(b.Barcode));}

/** Open, not-yet-bunched B2B demand per product (excluding one order id, if given). */
function v1110Committed_(excludeOrderId){
  const since=Date.now()-V1110_OPEN_WINDOW_H*3600000,open={};
  rows_(V8.SHEETS.B2B_ORDERS).forEach(function(o){
    const id=s_(o['Order ID']);if(!id||id===s_(excludeOrderId)||v1110Closed_(o.Status))return;
    const at=v1110Time_(o['Ordered At']||o['Created At']);if(!(at>=since))return;
    open[id]=true;
  });
  const assigned={};
  rows_(V8.SHEETS.ASSIGNMENTS).forEach(function(a){
    if(s_(a['Order Type']).toUpperCase()!=='B2B'||s_(a.Status).toUpperCase()==='CANCELLED')return;
    const k=s_(a['Order ID'])+'|'+s_(a['Product ID']);assigned[k]=(assigned[k]||0)+n_(a['Assigned Qty']);
  });
  const ordered={};
  rows_(V8.SHEETS.B2B_ORDER_ITEMS).forEach(function(i){
    const oid=s_(i['Order ID']);if(!open[oid])return;
    const k=oid+'|'+s_(i['Product ID']);ordered[k]=(ordered[k]||0)+n_(i.Quantity);
  });
  const out={};
  Object.keys(ordered).forEach(function(k){
    const need=Math.max(0,ordered[k]-(assigned[k]||0)),pid=k.split('|')[1];
    if(need>0)out[pid]=(out[pid]||0)+need;
  });
  return out;
}

/** Raw bunch totals (no commitments), fresh from the sheet. */
function v1110BunchTotals_(){
  const sum={};let last=NaN;
  rows_(V8.SHEETS.BATCHES).forEach(function(b){
    const id=s_(b['Product ID']);if(!id)return;
    if(!sum[id])sum[id]={productId:id,tracked:true,availableQty:0,reservedQty:0,deliveredQty:0};
    sum[id].availableQty+=n_(b['Available Qty']);sum[id].reservedQty+=n_(b['Reserved Qty']);sum[id].deliveredQty+=n_(b['Delivered Qty']);
    if(v1110RealBatch_(b)){const t=v1110Time_(b['Created At']);if(isFinite(t)&&!(t<=last))last=t;}
  });
  return {sum,lastStockAt:last};
}

// 1 — vendor-facing availability (B2B app, B2C app, admin product list all read this).
getBunchStockV944=function(){
  const cache=CacheService.getScriptCache(),hit=cache.get('V944:BUNCH_STOCK');
  if(hit){try{return JSON.parse(hit)}catch(e){}}
  const t=v1110BunchTotals_(),committed=v1110Committed_('');
  const out=Object.keys(t.sum).map(function(k){
    const x=t.sum[k],c=committed[k]||0;
    x.onHandQty=x.availableQty;x.committedQty=c;x.availableQty=Math.max(0,x.availableQty-c);
    x.stockStatus=x.availableQty>0?'IN_STOCK':'OOS';return x;
  });
  try{cache.put('V944:BUNCH_STOCK',JSON.stringify(out),20)}catch(e){}
  return out;
};

// 2 + 3 — inside the order lock: refuse more than is really free, and protect promises from auto-accept.
const V1110_PREVIOUS_AUTO_PREPARE=neAutoPrepare_;
neAutoPrepare_=function(vendor,lines,payload){
  const t=v1110BunchTotals_(),committed=v1110Committed_(''),want={};
  (lines||[]).forEach(function(l){const id=s_(l.x&&l.x.productId);want[id]=(want[id]||0)+n_(l.q);});
  Object.keys(want).forEach(function(id){
    const x=t.sum[id];if(!x)return; // product not stock-tracked yet (no bunch ever created)
    const free=Math.max(0,x.availableQty-(committed[id]||0));
    if(want[id]>free){
      const name=s_((lines.find(function(l){return s_(l.x.productId)===id})||{x:{}}).x.productName)||'Product';
      throw new Error('Only '+free+' '+name+' available right now. Reduce the quantity or try after the next stock update.');
    }
  });
  return V1110_PREVIOUS_AUTO_PREPARE.apply(this,arguments);
};
const V1110_PREVIOUS_AUTO_CONTEXT=neAutoContext_;
neAutoContext_=function(){
  const ctx=V1110_PREVIOUS_AUTO_CONTEXT.apply(this,arguments),committed=v1110Committed_('');
  ctx.checks=(ctx.checks||[]).map(function(r){
    const c=committed[s_(r['Product ID'])]||0;if(!c)return r;
    const copy=Object.assign({},r);copy['Safety Qty']=(Number(r['Safety Qty'])||0)+c;return copy;
  });
  return ctx;
};
const V1110_PREVIOUS_PLACE_B2B_ORDER=placeB2BOrder;
placeB2BOrder=function(){
  try{return V1110_PREVIOUS_PLACE_B2B_ORDER.apply(this,arguments);}
  finally{try{CacheService.getScriptCache().remove('V944:BUNCH_STOCK');}catch(e){}}
};

// 4 — each manual bunch entry is also the stock verification for auto-accept.
function v1110RecordStockCheck_(productId,who){
  const ss=ss_(),sh=ss.getSheetByName(NE_AUTO.stock);if(!sh)return false;
  const at=new Date(); // stored as a Sheets date-time; auto-accept reads Date values directly
  const row=rows_(NE_AUTO.stock).find(function(r){return s_(r['Product ID'])===s_(productId)});
  if(row)updateObj_(NE_AUTO.stock,row._row,{'Verified At':at,'Verified By':s_(who),Status:'VERIFIED'});
  else append_(NE_AUTO.stock,{'Product ID':s_(productId),'Verified At':at,'Verified By':s_(who),Status:'VERIFIED','Safety Qty':0});
  return true;
}
const V1110_PREVIOUS_CREATE_BUNCH=createBunchV944;
createBunchV944=function(mobile,pin,payload){
  const out=V1110_PREVIOUS_CREATE_BUNCH.apply(this,arguments);
  try{
    let who='STAFF:'+digits_(mobile);try{const u=v944User_(mobile,pin);who=s_(u.name)+' ('+s_(u.staffId)+')';}catch(e){}
    v1110RecordStockCheck_(s_(payload&&payload.productId),who);
  }catch(e){console.error('Stock check record failed: '+e);}
  try{CacheService.getScriptCache().remove('V944:BUNCH_STOCK');}catch(e){}
  return out;
};

// 5 — freshness for operations.
function v1110Freshness_(){
  const t=v1110BunchTotals_(),committed=v1110Committed_(''),now=Date.now();
  const mins=isFinite(t.lastStockAt)?Math.floor((now-t.lastStockAt)/60000):null;
  return {lastStockAt:isFinite(t.lastStockAt)?fmtDT_(new Date(t.lastStockAt)):'',minutesSince:mins,stale:mins==null||mins>V1110_STALE_MIN,staleAfterMinutes:V1110_STALE_MIN,
    products:Object.keys(t.sum).map(function(k){const x=t.sum[k],c=committed[k]||0;return {productId:k,onHand:x.availableQty,committed:c,available:Math.max(0,x.availableQty-c)};})};
}
if(typeof d1GetDispatchBoardV1100==='function'){
  const V1110_PREVIOUS_D1_BOARD=d1GetDispatchBoardV1100;
  d1GetDispatchBoardV1100=function(auth,date){
    const out=V1110_PREVIOUS_D1_BOARD.apply(this,arguments);
    try{out.stock=v1110Freshness_();}catch(e){out.stock=null;}
    return out;
  };
}
function getStockFreshnessV1110(email,pin){requireAdmin_(email,pin);return v1110Freshness_();}
function getStockCommitmentsHealthV1110(){return {ok:true,version:V1110_VERSION,openWindowHours:V1110_OPEN_WINDOW_H,staleAfterMinutes:V1110_STALE_MIN,writesBatches:false};}
