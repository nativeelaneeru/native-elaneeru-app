/** Native Elaneeru V9.5.3 — B2C customer registration and PIN authentication. */
const V953_B2C_AUTH_VERSION='9.5.3';
const V953_CUSTOMER_AUTH_HEADERS=['PIN Hash','PIN Updated At'];

function v953EnsureCustomerAuthHeaders_(){
  const sh=sh_(V8.SHEETS.CUSTOMERS),last=Math.max(1,sh.getLastColumn());
  const headers=sh.getRange(1,1,1,last).getValues()[0].map(s_);
  const missing=V953_CUSTOMER_AUTH_HEADERS.filter(function(h){return !headers.includes(h)});
  if(missing.length)sh.getRange(1,last+1,1,missing.length).setValues([missing]);
  return sh;
}

function v953CustomerRow_(mobile){
  mobile=digits_(mobile);
  if(!/^[6-9]\d{9}$/.test(mobile))throw new Error('Enter a valid 10 digit mobile number.');
  v953EnsureCustomerAuthHeaders_();
  return rows_(V8.SHEETS.CUSTOMERS).find(function(r){return digits_(r.Mobile)===mobile;})||null;
}

function v953CustomerProfile_(row,mobile){
  mobile=digits_(mobile||row&&row.Mobile);
  if(!row)return {exists:false,mobile:mobile};
  return {
    exists:true,
    profile:{
      customerId:s_(row['Customer ID'])||('CUST-'+mobile),
      mobile:mobile,
      name:s_(row.Name),
      address:s_(row.Address||row['Primary Address']),
      area:s_(row.Area),
      pincode:s_(row.Pincode),
      landmark:s_(row.Landmark),
      latitude:row.Latitude==null?'':row.Latitude,
      longitude:row.Longitude==null?'':row.Longitude
    }
  };
}

function getCustomerPinStatusV107(mobile){
  mobile=digits_(mobile);
  const row=v953CustomerRow_(mobile);
  return {ok:true,exists:!!row,mobile:mobile,hasPin:!!s_(row&&row['PIN Hash'])};
}

/* Compatibility used by the main B2C PWA to hydrate an already remembered device session. */
function customerLoginV95(mobile){
  mobile=digits_(mobile);
  const row=v953CustomerRow_(mobile);
  return v953CustomerProfile_(row,mobile);
}

function customerLoginWithPinV107(mobile,pin){
  mobile=digits_(mobile);pin=String(pin||'').trim();
  if(!/^\d{4}$/.test(pin))throw new Error('Enter your 4 digit PIN.');
  const row=v953CustomerRow_(mobile);
  if(!row)throw new Error('No customer account found for this mobile number.');
  const stored=s_(row['PIN Hash']);
  if(!stored)throw new Error('A PIN is not set for this mobile number.');
  if(stored!==hashV8_(pin))throw new Error('Incorrect PIN. Please try again.');
  const out=v953CustomerProfile_(row,mobile);out.ok=true;return out;
}

function setCustomerPinV107(mobile,pin,oldPin){
  mobile=digits_(mobile);pin=String(pin||'').trim();oldPin=String(oldPin||'').trim();
  if(!/^[6-9]\d{9}$/.test(mobile))throw new Error('Enter a valid 10 digit mobile number.');
  if(!/^\d{4}$/.test(pin))throw new Error('PIN must be exactly 4 digits.');
  return lockRun_(function(){
    v953EnsureCustomerAuthHeaders_();
    const rows=rows_(V8.SHEETS.CUSTOMERS),row=rows.find(function(r){return digits_(r.Mobile)===mobile;});
    const now=now_(),pinHash=hashV8_(pin);
    if(row){
      const current=s_(row['PIN Hash']);
      if(current){
        if(!/^\d{4}$/.test(oldPin)||current!==hashV8_(oldPin))throw new Error('PIN is already set. Sign in with your existing PIN.');
      }
      updateObj_(V8.SHEETS.CUSTOMERS,row._row,{'PIN Hash':pinHash,'PIN Updated At':now,'Status':'ACTIVE','Updated At':now});
      return {ok:true,created:false,mobile:mobile,hasPin:true};
    }
    append_(V8.SHEETS.CUSTOMERS,{
      'Customer ID':'CUST-'+mobile,
      Name:'',Mobile:mobile,WhatsApp:mobile,Address:'',Area:'',Pincode:'',
      'Cashback Balance':0,'Weekly Qty':0,'Monthly Qty':0,
      Status:'ACTIVE','Created At':now,'Updated At':now,
      'PIN Hash':pinHash,'PIN Updated At':now
    });
    return {ok:true,created:true,mobile:mobile,hasPin:true};
  });
}

function getB2CCustomerAuthHealthV953(){
  return {ok:true,version:V953_B2C_AUTH_VERSION,mobileRegistration:true,pinHashOnly:true,pinLength:4,rawPinStored:false};
}

/*
 * Late bridge wrapper. Authentication methods are intentionally POST-only so
 * a customer's PIN never appears in a URL/query string or JSONP request.
 */
const V953_PREVIOUS_DO_POST=doPost;
doPost=function(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge){
    let req={};
    try{
      req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
      const method=String(req.method||''),args=Array.isArray(req.args)?req.args:[];
      const auth={
        getCustomerPinStatusV107:getCustomerPinStatusV107,
        customerLoginV95:customerLoginV95,
        customerLoginWithPinV107:customerLoginWithPinV107,
        setCustomerPinV107:setCustomerPinV107,
        getB2CCustomerAuthHealthV953:getB2CCustomerAuthHealthV953
      };
      if(auth[method])return bridgeHtml_({ok:true,result:auth[method].apply(null,args),requestId:String(req.requestId||'')});
    }catch(err){
      return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:String(req&&req.requestId||'')});
    }
  }
  return V953_PREVIOUS_DO_POST(e);
};
