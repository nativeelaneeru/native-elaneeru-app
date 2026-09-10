/**
 * Native Elaneeru V9.0.3 — direct B2C order engine + idempotency.
 *
 * saveOrder calls one uniquely named core function. A clientRequestId is stored
 * in Orders.Source so a retry after a network timeout returns the same order
 * instead of creating a duplicate.
 */

function b2cRequestIdV903_(order){
  return s_(order&&order.clientRequestId).replace(/[^A-Za-z0-9._:-]/g,'').slice(0,80);
}

function findExistingB2CRequestV903_(requestId){
  requestId=s_(requestId);if(!requestId)return null;
  const sh=sh_(V8.SHEETS.ORDERS),last=sh.getLastRow();if(last<2)return null;
  const m=map_(sh);if(!m.Source||!m['Order ID'])return null;
  const tag='REQ:'+requestId;
  const cell=sh.getRange(2,m.Source,last-1,1).createTextFinder(tag).matchCase(true).findNext();
  if(!cell)return null;
  const row=cell.getRow();
  const val=k=>m[k]?sh.getRange(row,m[k]).getValue():'';
  return {orderId:s_(val('Order ID')),finalAmount:n_(val('Total Amount')),status:s_(val('Status'))||'Order Received'};
}

function upsertB2CCustomerForOrderV902_(order){
  order=order||{};
  const mobile=digits_(order.mobile);
  const name=s_(order.name), address=s_(order.address), area=s_(order.area), pincode=s_(order.pincode);
  if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10 digit mobile number.');
  if(!name||!address||!area) throw new Error('Please complete your name, address and area before placing the order.');

  const all=rows_(V8.SHEETS.CUSTOMERS);
  const hit=all.find(r=>digits_(r.Mobile)===mobile);
  const latitude=order.latitude===''||order.latitude==null?'':Number(order.latitude);
  const longitude=order.longitude===''||order.longitude==null?'':Number(order.longitude);

  if(hit){
    updateObj_(V8.SHEETS.CUSTOMERS,hit._row,{
      Name:name,Address:address,Area:area,Pincode:pincode,
      Latitude:latitude,Longitude:longitude,Status:'ACTIVE','Updated At':now_()
    });
    return true;
  }

  append_(V8.SHEETS.CUSTOMERS,{
    'Customer ID':'CUST-'+mobile,Name:name,Mobile:mobile,WhatsApp:mobile,
    Address:address,Area:area,Pincode:pincode,Latitude:latitude,Longitude:longitude,
    'Cashback Balance':0,'Weekly Qty':0,'Monthly Qty':0,Status:'ACTIVE',
    'Created At':now_(),'Updated At':now_()
  });
  return true;
}

function saveOrderV902Core_(o){
  o=o||{};
  return lockRun_(()=>{
    const mobile=digits_(o.mobile),requestId=b2cRequestIdV903_(o);
    if(requestId){
      const prior=findExistingB2CRequestV903_(requestId);
      if(prior)return {success:true,orderId:prior.orderId,finalAmount:prior.finalAmount,status:prior.status,duplicatePrevented:true,clientRequestId:requestId};
    }

    const customer=rows_(V8.SHEETS.CUSTOMERS).find(x=>digits_(x.Mobile)===mobile);
    if(!customer) throw new Error('Customer profile could not be created. Please retry.');

    const items=Array.isArray(o.items)?o.items:[];
    if(!items.length) throw new Error('Cart is empty.');

    const products=productRows_(), lines=[];
    let subtotal=0;
    items.forEach(i=>{
      const p=products.find(x=>s_(x['Product ID'])===s_(i.productId)&&active_(x['B2C Status']));
      if(!p) throw new Error('Product unavailable: '+s_(i.productId));
      const q=Math.max(1,Math.floor(n_(i.quantity)));
      const unit=b2cPrice_(p,q), line=unit*q;
      subtotal+=line;
      lines.push({p,q,unit,line});
    });

    const wallet=n_(customer['Cashback Balance']);
    const maxUse=Math.min(wallet,subtotal*V8.CASHBACK_MAX_PERCENT/100);
    const cashback=Math.max(0,Math.min(n_(o.cashbackUsed),maxUse));
    const total=Math.max(0,subtotal-cashback);
    const orderId=id_('NEL-');
    const otp=String(Math.floor(1000+Math.random()*9000));
    const home=s_(o.fulfilmentType)==='Home Delivery';

    if(home){
      const loc=checkDeliveryLocation(o.latitude,o.longitude);
      if(!loc.eligible) throw new Error('Delivery location is outside '+V8.DELIVERY_RADIUS_KM+' KM radius.');
    }

    append_(V8.SHEETS.ORDERS,{
      'Order ID':orderId,'Ordered At':now_(),'Customer ID':s_(customer['Customer ID']),
      'Customer Name':s_(customer.Name),Mobile:mobile,WhatsApp:mobile,
      'Fulfilment Type':s_(o.fulfilmentType)||'Home Delivery',Address:s_(o.address),Area:s_(o.area),
      Pincode:s_(o.pincode),Latitude:o.latitude===''?'':Number(o.latitude),Longitude:o.longitude===''?'':Number(o.longitude),
      'Payment Type':s_(o.payment)||'COD','Payment Status':'PENDING',Subtotal:subtotal,'Delivery Fee':0,
      Discount:0,'Cashback Used':cashback,'Total Amount':total,Status:'Order Received',
      'Delivery OTP Hash':hashV8_(otp),'Delivery Slot':s_(o.timeSlot),
      'Source':requestId?'B2C WEB|REQ:'+requestId:'B2C WEB',
      'Created At':now_(),'Updated At':now_()
    });

    lines.forEach(x=>append_(V8.SHEETS.ORDER_ITEMS,{
      'Item ID':id_('IT-'),'Order ID':orderId,'Product ID':s_(x.p['Product ID']),
      'Product Name':s_(x.p['Product Name']),Quantity:x.q,Unit:s_(x.p.Unit),
      'Unit Price':x.unit,'Line Amount':x.line,'Batch Required':s_(x.p['Barcode Required'])||'NO',
      'Picked Qty':0,'Delivered Qty':0,Status:'OPEN','Created At':now_(),'Updated At':now_()
    }));

    if(cashback>0){
      const newBal=wallet-cashback;
      updateObj_(V8.SHEETS.CUSTOMERS,customer._row,{'Cashback Balance':newBal,'Updated At':now_()});
      append_(V8.SHEETS.CASHBACK,{
        'Transaction ID':id_('CB-'),'Created At':now_(),'Customer ID':s_(customer['Customer ID']),
        Mobile:mobile,'Order ID':orderId,'Entry Type':'DEBIT',Credit:0,Debit:cashback,
        'Balance After':newBal,Scheme:'ORDER','Description':'Cashback used','Created By':'SYSTEM'
      });
    }

    return {success:true,orderId,finalAmount:total,status:'Order Received',deliveryOtp:otp,whatsappStatus:'Queued',clientRequestId:requestId};
  });
}

saveOrder=function(order){
  let phase='profile';
  try{
    upsertB2CCustomerForOrderV902_(order||{});
    phase='order';
    const result=saveOrderV902Core_(order||{});
    phase='cache';
    clearB2CDashboardCacheV839_(order&&order.mobile);
    return result;
  }catch(err){
    const msg=String(err&&err.message||err);
    throw new Error('B2C '+phase+': '+msg);
  }
};

function getB2COrderEngineHealthV901(){
  const publicSrc=String(saveOrder||'');
  const coreSrc=String(saveOrderV902Core_||'');
  const direct=publicSrc.indexOf('saveOrderV902Core_')>=0;
  const capturesOld=/V839_ORIGINAL_SAVE_ORDER|V841_ORIGINAL_SAVE_ORDER|V901_CORE_SAVE_ORDER/.test(publicSrc+coreSrc);
  const idempotent=coreSrc.indexOf('findExistingB2CRequestV903_')>=0;
  return {
    ok:direct&&!capturesOld&&idempotent,
    version:'9.0.3',
    canonicalOrderHandler:direct,
    recursiveWrappers:capturesOld,
    idempotency:idempotent,
    coreFunction:'saveOrderV902Core_'
  };
}
