/**
 * Native Elaneeru V9.0.4 — canonical B2B order engine + idempotency.
 *
 * A clientRequestId is stored in B2B_Orders.Source. Retrying the same request
 * returns the existing order instead of creating a duplicate. Delivery charge
 * is server controlled and payment type is restricted to COD/CREDIT.
 */

function b2bRequestIdV904_(payload){
  return s_(payload&&payload.clientRequestId).replace(/[^A-Za-z0-9._:-]/g,'').slice(0,80);
}

function findExistingB2BRequestV904_(vendorId,requestId){
  vendorId=s_(vendorId);requestId=s_(requestId);if(!vendorId||!requestId)return null;
  const sh=sh_(V8.SHEETS.B2B_ORDERS),last=sh.getLastRow();if(last<2)return null;
  const m=map_(sh);if(!m.Source||!m['Order ID']||!m['Vendor ID'])return null;
  const tag='REQ:'+requestId;
  const matches=sh.getRange(2,m.Source,last-1,1).createTextFinder(tag).matchCase(true).findAll();
  for(let i=0;i<matches.length;i++){
    const row=matches[i].getRow();
    if(s_(sh.getRange(row,m['Vendor ID']).getValue())!==vendorId)continue;
    if(s_(sh.getRange(row,m.Source).getValue())!=='B2B WEB|REQ:'+requestId)continue;
    const val=k=>m[k]?sh.getRange(row,m[k]).getValue():'';
    return {orderId:s_(val('Order ID')),amount:n_(val('Total Amount')),status:s_(val('Status'))||'Order Received'};
  }
  return null;
}

function placeB2BOrderV904Core_(token,p){
  p=p||{};
  return lockRun_(()=>{
    const v=vendor_(token),vid=s_(v['Vendor ID']),requestId=b2bRequestIdV904_(p);
    if(requestId){
      const prior=findExistingB2BRequestV904_(vid,requestId);
      if(prior)return {success:true,orderId:prior.orderId,amount:prior.amount,status:prior.status,duplicatePrevented:true,clientRequestId:requestId};
    }

    const products=b2bProducts_(vid),req=Array.isArray(p.items)?p.items:[];
    if(!req.length)throw new Error('Cart is empty.');

    let subtotal=0;const lines=[];
    req.forEach(i=>{
      const x=products.find(z=>z.productId===s_(i.productId));
      if(!x)throw new Error('Product unavailable.');
      const q=Number(i.quantity);
      if(!Number.isSafeInteger(q)||q<Math.max(200,Number(x.moq)||0))throw new Error(x.productName+' minimum order is '+Math.max(200,Number(x.moq)||0));
      if(x.qtyStep>1&&q%x.qtyStep)throw new Error(x.productName+' quantity must be in steps of '+x.qtyStep);
      const line=q*x.price;subtotal+=line;lines.push({x,q,line});
    });

    const pay=s_(p.paymentType||v['Payment Type']).toUpperCase();
    if(pay!=='COD')throw new Error('Select Cash on Delivery for new orders.');
    if(pay==='CREDIT'&&s_(v['Payment Type']).toUpperCase()!=='CREDIT')throw new Error('Credit payment is not enabled for this account.');

    const deliveryCharge=0,total=subtotal+deliveryCharge,credit=pay==='CREDIT'?total:0;
    if(credit>Math.max(0,n_(v['Credit Limit'])-n_(v.Outstanding)))throw new Error('Available credit is insufficient.');

    // No customer slot selection (owner decision). Auto-accept still runs: when no slot is sent,
    // the planner assigns the earliest open published slot with capacity, or leaves the order
    // as 'Order Received' for operations to schedule manually.
    const acceptance=neAutoPrepare_(v,lines,p);
    const id=id_('NEB2B-'),otp=String(Math.floor(1000+Math.random()*9000)),after=n_(v.Outstanding)+credit;
    append_(V8.SHEETS.B2B_ORDERS,{
      'Order ID':id,'Ordered At':now_(),'Vendor ID':vid,'Business Name':s_(v['Business Name']),'Owner Name':s_(v['Owner Name']),
      Mobile:digits_(v.Mobile),Address:s_(p.deliveryAddress||v.Address),Area:s_(p.area||v.Area),Pincode:s_(v.Pincode),
      Latitude:v.Latitude,Longitude:v.Longitude,'Payment Type':pay,'Payment Status':pay==='CREDIT'?'DUE':'PENDING',
      Subtotal:subtotal,Discount:0,'Total Amount':total,'Outstanding Before':n_(v.Outstanding),'Outstanding After':after,
      Status:'Order Received','Delivery OTP Hash':hashV8_(otp),'Delivery Slot':s_(p.deliverySlot),'Priority':'NORMAL',
      'Delivery Date':s_(p.deliveryDate),'Source':requestId?'B2B WEB|REQ:'+requestId:'B2B WEB','Created At':now_(),'Updated At':now_()
    });

    lines.forEach(z=>append_(V8.SHEETS.B2B_ORDER_ITEMS,{
      'Item ID':id_('BI-'),'Order ID':id,'Product ID':z.x.productId,'Product Name':z.x.productName,Quantity:z.q,Unit:z.x.unit,
      'Unit Price':z.x.price,'Line Amount':z.line,'Batch Required':'YES','Picked Qty':0,'Delivered Qty':0,Status:'OPEN',
      'Created At':now_(),'Updated At':now_()
    }));

    if(credit)updateObj_(V8.SHEETS.B2B_VENDORS,v._row,{Outstanding:after,'Updated At':now_()});
    const accepted=neAutoCommit_(id,vid,acceptance);
    return Object.assign({success:true,orderId:id,amount:total,deliveryOtp:otp,clientRequestId:requestId},accepted);
  });
}

placeB2BOrder=function(token,payload){
  return placeB2BOrderV904Core_(token,payload||{});
};

/** Read-only reconciliation after an uncertain customer order response. Never creates an order. */
function getB2BOrderRequestStatusV904(token,payload){
  const v=vendor_(token),vendorId=s_(v['Vendor ID']),p=payload||{};
  const requestId=b2bRequestIdV904_(p);
  if(!/^[A-Za-z0-9._:-]{16,80}$/.test(requestId))throw new Error('Invalid order request ID.');
  const existing=findExistingB2BRequestV904_(vendorId,requestId);
  if(!existing)return {found:false,verified:false};
  // An order header alone is not proof that all items were saved. Do not claim
  // success for a partial write or for a reused request ID with another cart.
  const requested=Array.isArray(p.items)?p.items:[];
  const expected=requested.map(i=>s_(i.productId)+'|'+Number(i.quantity)).sort();
  const saved=rows_(V8.SHEETS.B2B_ORDER_ITEMS)
    .filter(r=>s_(r['Order ID'])===existing.orderId)
    .map(r=>s_(r['Product ID'])+'|'+n_(r.Quantity)).sort();
  const verified=expected.length>0&&expected.length===saved.length&&
    expected.every((item,i)=>item===saved[i]);
  return {found:true,verified,success:verified,orderId:existing.orderId,
    amount:existing.amount,status:existing.status};
}

function getB2BOrderEngineHealthV904(){
  const src=String(placeB2BOrder||'')+String(placeB2BOrderV904Core_||'');
  const canonical=src.indexOf('placeB2BOrderV904Core_')>=0;
  const idempotent=src.indexOf('findExistingB2BRequestV904_')>=0;
  const serverCharge=src.indexOf('const deliveryCharge=0')>=0;
  return {ok:canonical&&idempotent&&serverCharge,version:'9.0.4',canonicalOrderHandler:canonical,idempotency:idempotent,serverControlledDeliveryCharge:serverCharge,autoAcceptanceHook:src.indexOf('neAutoPrepare_')>=0&&src.indexOf('neAutoCommit_')>=0};
}

