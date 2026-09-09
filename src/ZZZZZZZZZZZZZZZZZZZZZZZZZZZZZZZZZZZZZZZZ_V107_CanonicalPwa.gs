/*******************************************************************************
 * NATIVE ELANEERU V10.9 — CANONICAL CUSTOMER PWA RPC + OPTIONAL PIN
 * JSONP removes the fragile cross-domain iframe/postMessage dependency.
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
  return {success:true,exists:true,mobile:x.mobile,customerId:s_(x.customer['Customer ID']),hasPin:!!s_(x.customer['PIN Hash'])};
}

function setCustomerPinV107(mobile,newPin,currentPin){
  newPin=s_(newPin); currentPin=s_(currentPin);
  if(!/^\d{4}$/.test(newPin)) throw new Error('PIN must be exactly 4 digits.');
  return lockRun_(function(){
    let x=customerByMobileV107_(mobile);
    if(!x.customer){ createMinimalCustomerV1081_(x.mobile); x=customerByMobileV107_(x.mobile); }
    const existing=s_(x.customer['PIN Hash']);
    if(existing && existing!==hashV8_(currentPin)) throw new Error('Current PIN is incorrect.');
    const sh=sh_(V8.SHEETS.CUSTOMERS),m=ensureCustomerPinColumnsV107_();
    set_(sh,x.customer._row,m,'PIN Hash',hashV8_(newPin));
    set_(sh,x.customer._row,m,'PIN Updated At',now_());
    set_(sh,x.customer._row,m,'Updated At',now_());
    return {success:true,mobile:x.mobile,hasPin:true,changed:!!existing};
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
  return {success:true,exists:true,hasPin:true,customerId:s_(x.customer['Customer ID']),mobile:x.mobile,profile:customerProfileV107_(x.customer,x.mobile)};
}

function getB2CBootstrapV107(mobile){
  const app=getB2CAppDataV9();
  mobile=digits_(mobile);
  let auth={success:true,exists:false,mobile:mobile},dashboard=null,pin={hasPin:false};
  if(/^[6-9]\d{9}$/.test(mobile)){
    auth=customerLoginV95(mobile);
    pin=getCustomerPinStatusV107(mobile);
    if(auth&&auth.exists){ try{dashboard=getCustomerDashboard(mobile);}catch(e){dashboard=null;} }
  }
  return {success:true,app:app,auth:auth,dashboard:dashboard,pin:pin,serverTime:fmtDT_(new Date())};
}

function pwaCustomerRpcV109_(method,args){
  const allowed={
    customerLoginV95:customerLoginV95,
    getCustomerPinStatusV107:getCustomerPinStatusV107,
    setCustomerPinV107:setCustomerPinV107,
    customerLoginWithPinV107:customerLoginWithPinV107,
    getB2CAppDataV9:getB2CAppDataV9,
    getB2CBootstrapV107:getB2CBootstrapV107,
    saveCustomerProfile:saveCustomerProfile,
    checkDeliveryLocation:checkDeliveryLocation,
    saveOrder:saveOrder,
    getCustomerDashboard:getCustomerDashboard,
    getCustomerLiveTracking:getCustomerLiveTracking,
    getB2CInvoiceV91:getB2CInvoiceV91,
    getCompliancePublicV91:getCompliancePublicV91
  };
  if(!Object.prototype.hasOwnProperty.call(allowed,method)) throw new Error('Customer RPC method not allowed: '+method);
  return allowed[method].apply(null,args||[]);
}

function pwaJsonpV109_(e){
  const cb=String(e&&e.parameter&&e.parameter.callback||'').trim();
  if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cb)){
    return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  let req={},payload;
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    const method=s_(req.method),args=Array.isArray(req.args)?req.args:[];
    if(!method) throw new Error('RPC method is required.');
    payload={ok:true,result:pwaCustomerRpcV109_(method,args),requestId:s_(req.requestId)};
  }catch(err){
    payload={ok:false,error:String(err&&err.message||err),requestId:s_(req&&req.requestId)};
  }
  const safe=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return ContentService.createTextOutput(cb+'('+safe+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function pwaBridgeHtmlV108_(payload){
  let data=JSON.stringify({nelBridge:true,payload:payload}).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
  const js='(function(){var m='+data+';try{window.top.postMessage(m,"*");}catch(e){}try{window.parent.postMessage(m,"*");}catch(e){}})();';
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>'+js+'<\/script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPostV109_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(!isBridge) return pwaBridgeHtmlV108_({ok:false,error:'Unknown endpoint.',requestId:''});
  let req={};
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    const method=s_(req.method),args=Array.isArray(req.args)?req.args:[];
    const result=pwaCustomerRpcV109_(method,args);
    return pwaBridgeHtmlV108_({ok:true,result:result,requestId:s_(req.requestId)});
  }catch(err){
    return pwaBridgeHtmlV108_({ok:false,error:String(err&&err.message||err),requestId:s_(req&&req.requestId)});
  }
}

function doGetV109_(e){
  if(String(e&&e.parameter&&e.parameter.jsonp||'')==='1') return pwaJsonpV109_(e);
  if(String(e&&e.parameter&&e.parameter.pwaBridge||'')==='1') return pwaBridgePageV106_();
  return doGetV104_(e);
}

doPost=doPostV109_;
doGet=doGetV109_;
