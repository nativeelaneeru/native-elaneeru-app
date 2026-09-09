/*******************************************************************************
 * NATIVE ELANEERU V10.8.1 — CANONICAL PWA BRIDGE + OPTIONAL CUSTOMER PIN
 ******************************************************************************/

function ensureCustomerPinColumnsV107_(){
  const sh=sh_(V8.SHEETS.CUSTOMERS);
  let m=map_(sh);
  ['PIN Hash','PIN Updated At'].forEach(function(k){
    if(!m[k]){
      sh.getRange(1,sh.getLastColumn()+1).setValue(k);
      m=map_(sh);
    }
  });
  return m;
}

function customerByMobileV107_(mobile){
  mobile=digits_(mobile);
  if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10 digit mobile number.');
  ensureCustomerPinColumnsV107_();
  const c=rows_(V8.SHEETS.CUSTOMERS).find(function(x){
    return digits_(x.Mobile)===mobile && active_(x.Status||x['Customer Status']||'ACTIVE');
  });
  return {mobile:mobile,customer:c||null};
}

function customerProfileV107_(c,mobile){
  c=c||{};
  return {
    mobile:mobile,
    name:s_(c.Name),
    area:s_(c.Area),
    pincode:s_(c.Pincode),
    address:s_(c.Address||c['Primary Address']),
    latitude:c.Latitude===''?'':n_(c.Latitude),
    longitude:c.Longitude===''?'':n_(c.Longitude)
  };
}

function createMinimalCustomerV1081_(mobile){
  const now=now_();
  append_(V8.SHEETS.CUSTOMERS,{
    'Customer ID':'CUST-'+mobile,
    'Mobile':mobile,
    'WhatsApp':mobile,
    'Status':'ACTIVE',
    'Customer Status':'ACTIVE',
    'Created At':now,
    'Updated At':now
  });
  return customerByMobileV107_(mobile).customer;
}

function getCustomerPinStatusV107(mobile){
  const x=customerByMobileV107_(mobile);
  if(!x.customer) return {success:true,exists:false,mobile:x.mobile,hasPin:false};
  return {
    success:true,
    exists:true,
    mobile:x.mobile,
    customerId:s_(x.customer['Customer ID']),
    hasPin:!!s_(x.customer['PIN Hash'])
  };
}

function setCustomerPinV107(mobile,newPin,currentPin){
  newPin=s_(newPin);
  currentPin=s_(currentPin);
  if(!/^\d{4}$/.test(newPin)) throw new Error('PIN must be exactly 4 digits.');
  return lockRun_(function(){
    let x=customerByMobileV107_(mobile);
    if(!x.customer){
      createMinimalCustomerV1081_(x.mobile);
      x=customerByMobileV107_(x.mobile);
    }
    const existing=s_(x.customer['PIN Hash']);
    if(existing && existing!==hashV8_(currentPin)) throw new Error('Current PIN is incorrect.');
    const sh=sh_(V8.SHEETS.CUSTOMERS),m=ensureCustomerPinColumnsV107_();
    set_(sh,x.customer._row,m,'PIN Hash',hashV8_(newPin));
    set_(sh,x.customer._row,m,'PIN Updated At',now_());
    set_(sh,x.customer._row,m,'Updated At',now_());
    return {success:true,mobile:x.mobile,hasPin:true,changed:!!existing,createdAccount:!existing&&!s_(x.customer.Name)};
  });
}

function customerLoginWithPinV107(mobile,pin){
  pin=s_(pin);
  if(!/^\d{4}$/.test(pin)) throw new Error('Enter your 4 digit PIN.');
  const x=customerByMobileV107_(mobile);
  if(!x.customer) throw new Error('Customer account not found.');
  const h=s_(x.customer['PIN Hash']);
  if(!h) throw new Error('No PIN is set for this customer. Use mobile login.');
  if(h!==hashV8_(pin)) throw new Error('Incorrect PIN.');
  return {
    success:true,
    exists:true,
    hasPin:true,
    customerId:s_(x.customer['Customer ID']),
    mobile:x.mobile,
    profile:customerProfileV107_(x.customer,x.mobile)
  };
}

function getB2CBootstrapV107(mobile){
  const app=getB2CAppDataV9();
  mobile=digits_(mobile);
  let auth={success:true,exists:false,mobile:mobile},dashboard=null,pin={hasPin:false};
  if(/^[6-9]\d{9}$/.test(mobile)){
    auth=customerLoginV95(mobile);
    pin=getCustomerPinStatusV107(mobile);
    if(auth&&auth.exists){
      try{dashboard=getCustomerDashboard(mobile);}catch(e){dashboard=null;}
    }
  }
  return {success:true,app:app,auth:auth,dashboard:dashboard,pin:pin,serverTime:fmtDT_(new Date())};
}

function pwaBridgeHtmlV108_(payload){
  let data=JSON.stringify({nelBridge:true,payload:payload})
    .replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
    .replace(/\\u2028/g,'\\\\u2028').replace(/\\u2029/g,'\\\\u2029');
  const js='(function(){var m='+data+';try{window.top.postMessage(m,"*");}catch(e){}try{window.parent.postMessage(m,"*");}catch(e){}})();';
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>'+js+'<\/script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPostV108_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(!isBridge) return pwaBridgeHtmlV108_({ok:false,error:'Unknown endpoint.',requestId:''});
  let req={};
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    const method=s_(req.method),args=Array.isArray(req.args)?req.args:[];
    if(!method) throw new Error('RPC method is required.');
    const result=rpcV9(method,args);
    return pwaBridgeHtmlV108_({ok:true,result:result,requestId:s_(req.requestId)});
  }catch(err){
    return pwaBridgeHtmlV108_({ok:false,error:String(err&&err.message||err),requestId:s_(req&&req.requestId)});
  }
}

function doGetV108_(e){
  if(String(e&&e.parameter&&e.parameter.pwaBridge||'')==='1') return pwaBridgePageV106_();
  return doGetV104_(e);
}

doPost=doPostV108_;
doGet=doGetV108_;
