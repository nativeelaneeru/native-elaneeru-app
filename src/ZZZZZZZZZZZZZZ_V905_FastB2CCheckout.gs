/**
 * Native Elaneeru V9.0.5 — B2C Checkout Engine V2.
 *
 * Goals:
 * - open the spreadsheet once per checkout
 * - targeted customer lookup (no full Customers scan)
 * - short final-write lock only
 * - batch order-item writes
 * - cached product snapshot for warm checkouts
 * - request-id idempotency preserved
 */

function v905NowMs_(){ return new Date().getTime(); }

function v905HeaderMeta_(sh,key){
  const cache=CacheService.getScriptCache();
  const cacheKey='V905:H:'+String(key||sh.getName());
  let headers=null;
  try{ headers=JSON.parse(cache.get(cacheKey)||'null'); }catch(e){}
  const lastCol=sh.getLastColumn();
  if(!Array.isArray(headers)||headers.length!==lastCol){
    headers=sh.getRange(1,1,1,lastCol).getValues()[0].map(s_);
    try{ cache.put(cacheKey,JSON.stringify(headers),600); }catch(e){}
  }
  const columns={};
  headers.forEach(function(h,i){ if(h&&columns[h]===undefined) columns[h]=i; });
  return {headers:headers,columns:columns};
}

function v905RowFromObject_(meta,obj){
  const row=Array(meta.headers.length).fill('');
  Object.keys(obj||{}).forEach(function(k){
    if(meta.columns[k]!==undefined) row[meta.columns[k]]=obj[k];
  });
  return row;
}

function v905FindExactRow_(sh,columnIndex0,value){
  const last=sh.getLastRow();
  if(last<2||columnIndex0===undefined) return 0;
  const hit=sh.getRange(2,columnIndex0+1,last-1,1)
    .createTextFinder(String(value)).matchEntireCell(true).findNext();
  return hit?hit.getRow():0;
}

function v905CustomerSnapshot_(customerSh,meta,o){
  const mobile=digits_(o.mobile);
  const name=s_(o.name),address=s_(o.address),area=s_(o.area),pincode=s_(o.pincode);
  if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10 digit mobile number.');
  if(!name||!address||!area) throw new Error('Please complete your name, address and area before placing the order.');

  const row=v905FindExactRow_(customerSh,meta.columns.Mobile,mobile);
  const latitude=o.latitude===''||o.latitude==null?'':Number(o.latitude);
  const longitude=o.longitude===''||o.longitude==null?'':Number(o.longitude);

  if(!row){
    const values=v905RowFromObject_(meta,{
      'Customer ID':'CUST-'+mobile,Name:name,Mobile:mobile,WhatsApp:mobile,
      Address:address,Area:area,Pincode:pincode,Latitude:latitude,Longitude:longitude,
      'Cashback Balance':0,'Weekly Qty':0,'Monthly Qty':0,Status:'ACTIVE',
      'Created At':now_(),'Updated At':now_()
    });
    return {isNew:true,row:0,values:values,mobile:mobile,customerId:'CUST-'+mobile,wallet:0};
  }

  const values=customerSh.getRange(row,1,1,meta.headers.length).getValues()[0];
  const c=meta.columns;
  let changed=false;
  function put(k,v){
    if(c[k]===undefined) return;
    const old=values[c[k]];
    if(String(old==null?'':old)!==String(v==null?'':v)){ values[c[k]]=v;changed=true; }
  }
  put('Name',name);put('Address',address);put('Area',area);put('Pincode',pincode);
  put('Latitude',latitude);put('Longitude',longitude);put('Status','ACTIVE');
  if(changed){ put('Updated At',now_()); customerSh.getRange(row,1,1,meta.headers.length).setValues([values]); }

  return {
    isNew:false,row:row,values:values,mobile:mobile,
    customerId:c['Customer ID']!==undefined?s_(values[c['Customer ID']]):'CUST-'+mobile,
    wallet:c['Cashback Balance']!==undefined?n_(values[c['Cashback Balance']]):0
  };
}

function v905B2CProducts_(productSh){
  const cache=CacheService.getScriptCache();
  const key='V905:B2C_PRODUCTS';
  try{
    const hit=JSON.parse(cache.get(key)||'null');
    if(Array.isArray(hit)&&hit.length) return hit;
  }catch(e){}

  const meta=v905HeaderMeta_(productSh,'Products');
  const last=productSh.getLastRow();
  if(last<2) return [];
  const vals=productSh.getRange(2,1,last-1,meta.headers.length).getValues();
  const c=meta.columns;
  const out=[];
  vals.forEach(function(r){
    const status=c['B2C Status']!==undefined?s_(r[c['B2C Status']]):'';
    if(!active_(status)) return;
    out.push({
      productId:c['Product ID']!==undefined?s_(r[c['Product ID']]):'',
      productName:c['Product Name']!==undefined?s_(r[c['Product Name']]):'',
      unit:c.Unit!==undefined?s_(r[c.Unit]):'pc',
      price:c['B2C Price']!==undefined?n_(r[c['B2C Price']]):0,
      bundleQty1:c['Bundle Qty 1']!==undefined?n_(r[c['Bundle Qty 1']]):0,
      bundlePrice1:c['Bundle Price 1']!==undefined?n_(r[c['Bundle Price 1']]):0,
      bundleQty2:c['Bundle Qty 2']!==undefined?n_(r[c['Bundle Qty 2']]):0,
      bundlePrice2:c['Bundle Price 2']!==undefined?n_(r[c['Bundle Price 2']]):0,
      barcodeRequired:c['Barcode Required']!==undefined?s_(r[c['Barcode Required']]):'NO'
    });
  });
  try{ cache.put(key,JSON.stringify(out),20); }catch(e){}
  return out;
}

function v905Price_(p,q){
  q=n_(q);
  if(p.bundleQty2&&q===p.bundleQty2) return p.bundlePrice2/q;
  if(p.bundleQty1&&q===p.bundleQty1) return p.bundlePrice1/q;
  return n_(p.price);
}

function v905RequestId_(o){
  return s_(o&&o.clientRequestId).replace(/[^A-Za-z0-9._:-]/g,'').slice(0,80);
}

function v905FindExisting_(ordersSh,ordersMeta,requestId){
  requestId=s_(requestId);if(!requestId)return null;
  const cache=CacheService.getScriptCache(),cacheKey='V905:REQ:'+requestId;
  try{
    const cached=JSON.parse(cache.get(cacheKey)||'null');
    if(cached&&cached.orderId) return cached;
  }catch(e){}

  const sourceCol=ordersMeta.columns.Source,last=ordersSh.getLastRow();
  if(sourceCol===undefined||last<2)return null;
  const tag='REQ:'+requestId;
  const cell=ordersSh.getRange(2,sourceCol+1,last-1,1).createTextFinder(tag).matchCase(true).findNext();
  if(!cell)return null;
  const row=ordersSh.getRange(cell.getRow(),1,1,ordersMeta.headers.length).getValues()[0],c=ordersMeta.columns;
  const result={
    orderId:c['Order ID']!==undefined?s_(row[c['Order ID']]):'',
    finalAmount:c['Total Amount']!==undefined?n_(row[c['Total Amount']]):0,
    status:c.Status!==undefined?s_(row[c.Status])||'Order Received':'Order Received',
    duplicatePrevented:true,clientRequestId:requestId
  };
  try{ cache.put(cacheKey,JSON.stringify(result),21600); }catch(e){}
  return result;
}

function v905TryWriteLock_(fn){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(2500)) throw new Error('Order traffic is high. Please retry in a moment.');
  try{return fn();}finally{lock.releaseLock();}
}

function saveOrderV905_(o){
  const started=v905NowMs_();
  o=o||{};
  const requestId=v905RequestId_(o);
  const items=Array.isArray(o.items)?o.items:[];
  if(!items.length)throw new Error('Cart is empty.');

  const home=s_(o.fulfilmentType)==='Home Delivery';
  if(home){
    const lat=Number(o.latitude),lng=Number(o.longitude);
    if(!isFinite(lat)||!isFinite(lng))throw new Error('Valid delivery location is required.');
    const distance=haversine_(V8.HUB,{lat:lat,lng:lng});
    if(distance>V8.DELIVERY_RADIUS_KM)throw new Error('Delivery location is outside '+V8.DELIVERY_RADIUS_KM+' KM radius.');
  }

  // One SpreadsheetApp.openById for the full checkout request.
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const customerSh=ss.getSheetByName(V8.SHEETS.CUSTOMERS);
  const productSh=ss.getSheetByName(V8.SHEETS.PRODUCTS);
  const ordersSh=ss.getSheetByName(V8.SHEETS.ORDERS);
  const itemsSh=ss.getSheetByName(V8.SHEETS.ORDER_ITEMS);
  const cashbackSh=ss.getSheetByName(V8.SHEETS.CASHBACK);
  if(!customerSh||!productSh||!ordersSh||!itemsSh)throw new Error('Order database is unavailable.');

  const customerMeta=v905HeaderMeta_(customerSh,'Customers');
  const orderMeta=v905HeaderMeta_(ordersSh,'Orders');
  const itemMeta=v905HeaderMeta_(itemsSh,'Order_Items');
  const cashbackMeta=cashbackSh?v905HeaderMeta_(cashbackSh,'Cashback_Ledger'):null;

  const prior=v905FindExisting_(ordersSh,orderMeta,requestId);
  if(prior){prior.processingMs=v905NowMs_()-started;return prior;}

  const customer=v905CustomerSnapshot_(customerSh,customerMeta,o);
  const products=v905B2CProducts_(productSh),productMap={};
  products.forEach(function(p){productMap[p.productId]=p;});

  const lines=[];let subtotal=0;
  items.forEach(function(i){
    const p=productMap[s_(i.productId)];
    if(!p)throw new Error('Product unavailable: '+s_(i.productId));
    const q=Math.max(1,Math.floor(n_(i.quantity))),unit=v905Price_(p,q),line=unit*q;
    if(!unit||unit<0)throw new Error('Invalid live price for '+p.productName+'.');
    subtotal+=line;lines.push({p:p,q:q,unit:unit,line:line});
  });

  const requestedCashback=Math.max(0,n_(o.cashbackUsed));
  const result=v905TryWriteLock_(function(){
    // Recheck idempotency inside the short final-write lock.
    const duplicate=v905FindExisting_(ordersSh,orderMeta,requestId);
    if(duplicate)return duplicate;

    let customerRow=customer.row,customerValues=customer.values,wallet=customer.wallet;
    if(customer.isNew){
      // Another first-order request for the same mobile may have arrived while validation ran.
      const existingRow=v905FindExactRow_(customerSh,customerMeta.columns.Mobile,customer.mobile);
      if(existingRow){
        customerRow=existingRow;
        customerValues=customerSh.getRange(existingRow,1,1,customerMeta.headers.length).getValues()[0];
        wallet=customerMeta.columns['Cashback Balance']!==undefined?n_(customerValues[customerMeta.columns['Cashback Balance']]):0;
      }else{
        customerRow=customerSh.getLastRow()+1;
        customerSh.getRange(customerRow,1,1,customerMeta.headers.length).setValues([customerValues]);
      }
    }

    let cashback=0;
    if(requestedCashback>0){
      customerValues=customerSh.getRange(customerRow,1,1,customerMeta.headers.length).getValues()[0];
      wallet=customerMeta.columns['Cashback Balance']!==undefined?n_(customerValues[customerMeta.columns['Cashback Balance']]):0;
      const maxUse=Math.min(wallet,subtotal*V8.CASHBACK_MAX_PERCENT/100);
      cashback=Math.max(0,Math.min(requestedCashback,maxUse));
    }
    const total=Math.max(0,subtotal-cashback),orderId=id_('NEL-'),otp=String(Math.floor(1000+Math.random()*9000));

    const orderRow=v905RowFromObject_(orderMeta,{
      'Order ID':orderId,'Ordered At':now_(),'Customer ID':customer.customerId,
      'Customer Name':s_(o.name),Mobile:customer.mobile,WhatsApp:customer.mobile,
      'Fulfilment Type':home?'Home Delivery':'Hub Pickup',
      Address:home?s_(o.address):'Native Elaneeru Hub Pickup',Area:home?s_(o.area):'HUB',Pincode:home?s_(o.pincode):'',
      Latitude:home?Number(o.latitude):'',Longitude:home?Number(o.longitude):'',
      'Payment Type':'COD','Payment Status':'PENDING',Subtotal:subtotal,'Delivery Fee':0,
      Discount:0,'Cashback Used':cashback,'Total Amount':total,Status:'Order Received',
      'Delivery OTP Hash':hashV8_(otp),'Delivery Slot':s_(o.timeSlot),
      Source:requestId?'B2C WEB|REQ:'+requestId:'B2C WEB','Created At':now_(),'Updated At':now_()
    });
    const orderRowNo=ordersSh.getLastRow()+1;
    ordersSh.getRange(orderRowNo,1,1,orderMeta.headers.length).setValues([orderRow]);

    const itemRows=lines.map(function(x){
      return v905RowFromObject_(itemMeta,{
        'Item ID':id_('IT-'),'Order ID':orderId,'Product ID':x.p.productId,'Product Name':x.p.productName,
        Quantity:x.q,Unit:x.p.unit,'Unit Price':x.unit,'Line Amount':x.line,'Batch Required':x.p.barcodeRequired||'NO',
        'Picked Qty':0,'Delivered Qty':0,Status:'OPEN','Created At':now_(),'Updated At':now_()
      });
    });
    if(itemRows.length){
      const startRow=itemsSh.getLastRow()+1;
      itemsSh.getRange(startRow,1,itemRows.length,itemMeta.headers.length).setValues(itemRows);
    }

    if(cashback>0){
      const c=customerMeta.columns,newBal=wallet-cashback;
      if(c['Cashback Balance']!==undefined){customerValues[c['Cashback Balance']]=newBal;}
      if(c['Updated At']!==undefined){customerValues[c['Updated At']]=now_();}
      customerSh.getRange(customerRow,1,1,customerMeta.headers.length).setValues([customerValues]);
      if(cashbackSh&&cashbackMeta){
        const ledger=v905RowFromObject_(cashbackMeta,{
          'Transaction ID':id_('CB-'),'Created At':now_(),'Customer ID':customer.customerId,Mobile:customer.mobile,
          'Order ID':orderId,'Entry Type':'DEBIT',Credit:0,Debit:cashback,'Balance After':newBal,
          Scheme:'ORDER',Description:'Cashback used','Created By':'SYSTEM'
        });
        cashbackSh.getRange(cashbackSh.getLastRow()+1,1,1,cashbackMeta.headers.length).setValues([ledger]);
      }
    }

    const response={success:true,orderId:orderId,finalAmount:total,status:'Order Received',deliveryOtp:otp,whatsappStatus:'Queued',clientRequestId:requestId};
    if(requestId){try{CacheService.getScriptCache().put('V905:REQ:'+requestId,JSON.stringify(response),21600);}catch(e){}}
    return response;
  });

  try{clearB2CDashboardCacheV839_(o.mobile);}catch(e){}
  result.processingMs=v905NowMs_()-started;
  result.engineVersion='9.0.5';
  return result;
}

// Canonical public B2C order handler. This file loads after V9.0.3.
saveOrder=function(order){
  try{return saveOrderV905_(order||{});}
  catch(err){throw new Error('B2C checkout: '+String(err&&err.message||err));}
};

function getB2COrderEngineHealthV905(){
  const src=String(saveOrderV905_||''),pub=String(saveOrder||'');
  const checks={
    canonicalOrderHandler:pub.indexOf('saveOrderV905_')>=0,
    singleSpreadsheetOpen:(src.match(/SpreadsheetApp\.openById/g)||[]).length===1,
    targetedCustomerLookup:src.indexOf('v905CustomerSnapshot_')>=0,
    shortWriteLock:src.indexOf('v905TryWriteLock_')>=0,
    batchItemWrite:src.indexOf('itemRows.length')>=0&&src.indexOf('setValues(itemRows)')>=0,
    cachedProducts:src.indexOf('v905B2CProducts_')>=0,
    noFullCustomerRowsScan:src.indexOf('rows_(V8.SHEETS.CUSTOMERS)')<0,
    idempotency:src.indexOf('v905FindExisting_')>=0
  };
  const ok=Object.keys(checks).every(function(k){return checks[k]===true;});
  return Object.assign({ok:ok,version:'9.0.5',targetConfirmationSeconds:'1-4'},checks);
}
