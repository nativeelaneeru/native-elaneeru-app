/** B2B sheet-controlled auto acceptance. Runs inside the canonical order lock. */
const NE_AUTO = {config:'B2B_Auto_Accept', stock:'B2B_Stock_Checks', slots:'B2B_Delivery_Capacity', log:'B2B_Acceptance_Log'};
function neAutoText_(v){return String(v==null?'':v).trim();}
function neAutoNumber_(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function neAutoDate_(v){if(v instanceof Date&&!isNaN(v))return Utilities.formatDate(v,'Asia/Kolkata','yyyy-MM-dd');return neAutoText_(v);}
function neAutoTime_(v){if(v instanceof Date)return v.getTime();const s=neAutoText_(v);if(!s)return NaN;return new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)?s+'+05:30':s).getTime();}
function neAutoEnabled_(v){return v===true||['TRUE','YES','1'].includes(neAutoText_(v).toUpperCase());}
function neAutoPlan_(input,ctx,now){
  const hold=reason=>({accepted:false,reason,allocations:[]});
  if(!neAutoEnabled_(ctx.config.Enabled))return hold('AUTO_ACCEPT_DISABLED');
  if(!['ACTIVE','APPROVED','LIVE'].includes(neAutoText_(input.vendor.Status).toUpperCase()))return hold('VENDOR_NOT_ACTIVE');
  const area=neAutoText_(input.area).toLowerCase();if(!area)return hold('DELIVERY_AREA_MISSING');
  const requested={};
  for(const line of input.lines){const id=neAutoText_(line.x.productId),q=Number(line.q);if(!id||!Number.isInteger(q)||q<=0)return hold('INVALID_QUANTITY');requested[id]=(requested[id]||0)+q;}
  const total=Object.values(requested).reduce((a,b)=>a+b,0);if(!total)return hold('EMPTY_ORDER');
  const allocations=[];
  const maxHours=Number(ctx.config.StockCheckMaxHours);if(!(maxHours>0&&maxHours<=168))return hold('STOCK_CHECK_WINDOW_INVALID');
  for(const id of Object.keys(requested)){
    const check=ctx.checks.find(r=>neAutoText_(r['Product ID'])===id);
    if(!check||!neAutoText_(check['Verified By'])||neAutoText_(check.Status).toUpperCase()!=='VERIFIED')return hold('STOCK_NOT_VERIFIED:'+id);
    const at=neAutoTime_(check['Verified At']);if(!Number.isFinite(at)||at>now||now-at>maxHours*3600000)return hold('STOCK_CHECK_EXPIRED:'+id);
    const buffer=Number(check['Safety Qty']);if(!Number.isInteger(buffer)||buffer<0)return hold('STOCK_BUFFER_INVALID:'+id);
    const batches=ctx.batches.filter(b=>neAutoText_(b['Product ID'])===id&&!/DEMO|TEST/i.test(neAutoText_(b['Batch ID'])+' '+neAutoText_(b.Barcode))&&['AVAILABLE','RESERVED'].includes(neAutoText_(b.Status).toUpperCase())&&neAutoText_(b['Batch ID'])&&neAutoText_(b.Barcode)).sort((a,b)=>neAutoTime_(a['Created At'])-neAutoTime_(b['Created At'])||neAutoText_(a['Batch ID']).localeCompare(neAutoText_(b['Batch ID'])));
    if(new Set(batches.map(b=>neAutoText_(b['Batch ID']))).size!==batches.length)return hold('DUPLICATE_BATCH_ID:'+id);
    let available=0;
    for(const b of batches){const q=Number(b['Available Qty']),r=Number(b['Reserved Qty']),d=Number(b['Delivered Qty']),original=Number(b['Original Qty']);if(!Number.isInteger(q)||q<0||!Number.isInteger(r)||r<0||!Number.isInteger(d)||d<0||!Number.isInteger(original)||q+r+d>original||!Number.isFinite(neAutoTime_(b['Created At'])))return hold('STOCK_BALANCE_INVALID:'+id);available+=q;}
    if(available-buffer<requested[id])return hold('INSUFFICIENT_STOCK:'+id);
    let needed=requested[id];for(const b of batches){const qty=Math.min(needed,Number(b['Available Qty']));if(qty){allocations.push({batch:b,qty});needed-=qty;}if(!needed)break;}
  }
  const candidates=ctx.slots.filter(r=>neAutoEnabled_(r.Enabled)&&neAutoText_(r.Area).toLowerCase()===area&&/^\d{4}-\d{2}-\d{2}$/.test(neAutoDate_(r['Delivery Date']))&&neAutoText_(r.Slot)&&(!input.date||neAutoDate_(r['Delivery Date'])===input.date)&&(!input.slot||neAutoText_(r.Slot)===input.slot)&&neAutoTime_(r['Cutoff At'])>now).sort((a,b)=>neAutoDate_(a['Delivery Date']).localeCompare(neAutoDate_(b['Delivery Date']))||neAutoText_(a.Slot).localeCompare(neAutoText_(b.Slot)));
  for(const slot of candidates){
    const date=neAutoDate_(slot['Delivery Date']),name=neAutoText_(slot.Slot),cap=Number(slot['Capacity Qty']);
    if(!Number.isInteger(cap)||cap<=0)continue;
    if(neAutoTime_(date+'T00:00:00+05:30')<=now)continue;
    // Count every booked order, including manually accepted orders, against capacity.
    if(ctx.slots.filter(r=>neAutoEnabled_(r.Enabled)&&neAutoDate_(r['Delivery Date'])===date&&neAutoText_(r.Slot)===name&&neAutoText_(r.Area).toLowerCase()===area).length!==1)return hold('DUPLICATE_DELIVERY_SLOT');
    const booked=ctx.orders.filter(o=>neAutoDate_(o['Delivery Date'])===date&&neAutoText_(o['Delivery Slot'])===name&&neAutoText_(o.Area).toLowerCase()===area&&!['CANCELLED','REJECTED'].includes(neAutoText_(o.Status).toUpperCase())).reduce((sum,o)=>sum+ctx.items.filter(i=>neAutoText_(i['Order ID'])===neAutoText_(o['Order ID'])).reduce((n,i)=>n+neAutoNumber_(i.Quantity),0),0);
    if(booked+total<=cap)return {accepted:true,reason:'STOCK_AND_SLOT_AVAILABLE',allocations,date,slot:name,total};
  }
  return hold(candidates.length?'DELIVERY_CAPACITY_FULL':'NO_AVAILABLE_DELIVERY_SLOT');
}
function neAutoContext_(){
  const config={};rows_(NE_AUTO.config).forEach(r=>config[neAutoText_(r.Setting)]=r.Value);
  return {config,checks:rows_(NE_AUTO.stock),slots:rows_(NE_AUTO.slots),batches:rows_(V8.SHEETS.BATCHES),orders:rows_(V8.SHEETS.B2B_ORDERS),items:rows_(V8.SHEETS.B2B_ORDER_ITEMS)};
}
function neAutoPrepare_(vendor,lines,payload){
  try{const p=payload||{},ctx=neAutoContext_();return neAutoPlan_({vendor,lines,area:p.area||vendor.Area,date:neAutoDate_(p.deliveryDate),slot:neAutoText_(p.deliverySlot)},ctx,Date.now());}
  catch(e){return {accepted:false,reason:'ACCEPTANCE_SETUP_UNAVAILABLE',allocations:[]};}
}
function neAutoLog_(orderId,vendorId,plan){
  try{append_(NE_AUTO.log,{'Order ID':orderId,'Vendor ID':vendorId,'Checked At':now_(),Decision:plan.accepted?'AUTO_ACCEPTED':'PENDING_REVIEW',Reason:plan.reason,'Delivery Date':plan.date||'','Delivery Slot':plan.slot||'','Reserved Qty':plan.accepted?plan.total:0});}catch(e){console.error('Acceptance log write failed for '+orderId);}
}
function neAutoCommit_(orderId,vendorId,plan){
  if(!plan.accepted){neAutoLog_(orderId,vendorId,plan);return {status:'Order Received',autoAccepted:false,acceptanceReason:plan.reason};}
  const touched=[],assignments=[];
  try{
    // Re-read within the same script lock before any stock change.
    for(const a of plan.allocations){const b=find_(V8.SHEETS.BATCHES,'Batch ID',a.batch['Batch ID']);if(!b||Number(b['Available Qty'])<a.qty)throw new Error('STOCK_CHANGED');touched.push({batch:Object.assign({},b),qty:a.qty});}
    for(const a of touched){const b=a.batch;
      updateObj_(V8.SHEETS.BATCHES,b._row,{'Available Qty':Number(b['Available Qty'])-a.qty,'Reserved Qty':Number(b['Reserved Qty'])+a.qty,Status:Number(b['Available Qty'])===a.qty?'RESERVED':'AVAILABLE','Updated At':now_()});
      const row=append_(V8.SHEETS.ASSIGNMENTS,{'Assignment ID':id_('ASN-'),'Assigned At':now_(),'Batch ID':b['Batch ID'],Barcode:b.Barcode,'Order Type':'B2B','Order ID':orderId,'Stop ID':'','Product ID':b['Product ID'],'Assigned Qty':a.qty,'Scanned Qty':0,'Delivered Qty':0,'Assigned By':'AUTO_ACCEPT',Status:'ASSIGNED','Updated At':now_()});assignments.push(row);
    }
    const order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',orderId);if(!order)throw new Error('ORDER_MISSING');
    updateObj_(V8.SHEETS.B2B_ORDERS,order._row,{'Delivery Date':plan.date,'Delivery Slot':plan.slot,Status:'Confirmed','Updated At':now_()});
    try{CacheService.getScriptCache().remove('V944:BUNCH_STOCK');}catch(e){}
    neAutoLog_(orderId,vendorId,plan);
    return {status:'Confirmed',autoAccepted:true,acceptanceReason:plan.reason,deliveryDate:plan.date,deliverySlot:plan.slot};
  }catch(e){
    let rollbackFailed=false;
    for(const a of touched){try{updateObj_(V8.SHEETS.BATCHES,a.batch._row,{'Available Qty':a.batch['Available Qty'],'Reserved Qty':a.batch['Reserved Qty'],Status:a.batch.Status,'Updated At':now_()});}catch(err){rollbackFailed=true;}}
    for(const row of assignments){try{updateObj_(V8.SHEETS.ASSIGNMENTS,row,{Status:'CANCELLED','Updated At':now_()});}catch(err){rollbackFailed=true;}}
    const order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',orderId);try{if(order)updateObj_(V8.SHEETS.B2B_ORDERS,order._row,{Status:'Order Received',Notes:rollbackFailed?'AUTO_ACCEPT_RECONCILIATION_REQUIRED':'AUTO_ACCEPT_WRITE_FAILED','Updated At':now_()});}catch(err){rollbackFailed=true;}
    if(rollbackFailed){try{const setting=find_(NE_AUTO.config,'Setting','Enabled');if(setting)updateObj_(NE_AUTO.config,setting._row,{Value:false});}catch(err){}console.error('Auto acceptance paused: stock reconciliation required');}
    const failed={accepted:false,reason:rollbackFailed?'RECONCILIATION_REQUIRED':'ACCEPTANCE_WRITE_FAILED'};neAutoLog_(orderId,vendorId,failed);
    return {status:'Order Received',autoAccepted:false,acceptanceReason:failed.reason};
  }
}
function getB2BAutoAcceptHealthV967(){return {ok:typeof neAutoPrepare_==='function'&&typeof neAutoCommit_==='function',version:'9.6.7',sheetControlled:true,atomicOrderLock:true,scope:'NEW_B2B_ORDERS_ONLY'};}
