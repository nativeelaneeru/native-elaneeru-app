/**
 * Native Elaneeru V10.0.1 — single-request B2B login + Home.
 *
 * Removes the old login-time vendor-sheet write and returns the lightweight
 * Home payload together with the token. Existing callers remain compatible
 * because token/vendorId are preserved.
 */
const V1001_B2B_FAST_LOGIN_VERSION='10.0.1';

function v1001VendorByMobile_(mobile){
  mobile=digits_(mobile);
  const cache=CacheService.getScriptCache();
  const key='V1001_VENDOR_MOBILE:'+mobile;
  const hit=cache.get(key);
  if(hit){
    try{
      const v=JSON.parse(hit);
      if(v&&active_(v.Status)) return v;
    }catch(err){}
  }
  const v=rows_(V8.SHEETS.B2B_VENDORS).find(function(x){
    return digits_(x.Mobile)===mobile&&active_(x.Status);
  })||null;
  if(v){
    try{cache.put(key,JSON.stringify(v),30);}catch(err){}
  }
  return v;
}

function v1001HomeFromVendor_(v){
  const vid=s_(v['Vendor ID']),rates=v1000MarketRates_();
  const creditLimit=n_(v['Credit Limit']);
  const outstanding=n_(v.Outstanding||v['Outstanding Amount']);
  return {
    fast:true,version:V1001_B2B_FAST_LOGIN_VERSION,
    vendor:{
      vendorId:vid,
      businessName:s_(v['Business Name']),ownerName:s_(v['Owner Name']),
      mobile:digits_(v.Mobile),address:s_(v.Address),area:s_(v.Area),
      paymentType:s_(v['Payment Type']||'COD'),creditLimit:creditLimit,
      outstanding:outstanding,availableCredit:Math.max(0,creditLimit-outstanding)
    },
    products:v1000B2BProducts_(vid),
    banners:v1000B2BBanners_(),
    marketRates:rates,
    marketPrices:rates,
    marketRatesUpdatedAt:rates.length?(rates[0].rateDate||rates[0].updatedAt||''):'',
    orders:[],target:null
  };
}

/* Intentional override: bridge callers continue using vendorLogin. */
vendorLogin=function(mobile,pin){
  mobile=digits_(mobile);
  const v=v1001VendorByMobile_(mobile);
  if(!v||s_(v['PIN Hash'])!==hashV8_(pin)) throw new Error('Invalid mobile or PIN.');

  const token=Utilities.getUuid(),cache=CacheService.getScriptCache(),vid=s_(v['Vendor ID']);
  cache.put('VENDOR:'+token,vid,21600);
  try{cache.put('V1000_VENDOR_ROW:'+vid,JSON.stringify(v),30);}catch(err){}

  neB2BRememberSession_(token,v);
  return {
    token:token,
    vendorId:vid,
    fast:true,
    version:V1001_B2B_FAST_LOGIN_VERSION,
    home:v1001HomeFromVendor_(v)
  };
};

/** Durable remembered sessions survive cache eviction and deployment changes.
 * Store only a token hash, vendor ID and credential version; never the PIN.
 * Active use renews a 30-day expiry. Logout and PIN changes invalidate it.
 */
const NE_B2B_SESSION_DAYS=30;
function neB2BSessionKey_(token){
  token=s_(token);if(!/^[a-f0-9-]{36}$/i.test(token))throw new Error('Session has expired. Please login again.');
  return 'NE_B2B_SESSION:'+hashV8_(token);
}
function neB2BRememberSession_(token,v){
  const props=PropertiesService.getScriptProperties(),now=Date.now();
  props.setProperty(neB2BSessionKey_(token),JSON.stringify({vendorId:s_(v['Vendor ID']),credentialVersion:hashV8_(v['PIN Hash']),expiresAt:now+NE_B2B_SESSION_DAYS*86400000}));
}
vendor_=function(token){
  token=s_(token);const key=neB2BSessionKey_(token),props=PropertiesService.getScriptProperties(),cache=CacheService.getScriptCache();
  let record;try{record=JSON.parse(props.getProperty(key)||'null')}catch(e){}
  // Migrate a still-valid session issued before durable storage was deployed.
  let id=record&&record.vendorId;
  if(record&&!(Number(record.expiresAt)>Date.now())){props.deleteProperty(key);cache.remove('VENDOR:'+token);throw new Error('Session has expired. Please login again.');}
  if(!record)id=cache.get('VENDOR:'+token);
  if(!id)throw new Error('Session has expired. Please login again.');
  const v=find_(V8.SHEETS.B2B_VENDORS,'Vendor ID',id);
  if(!v||!active_(v.Status))throw new Error('Vendor is inactive or unavailable.');
  if(record&&record.credentialVersion!==hashV8_(v['PIN Hash'])){props.deleteProperty(key);cache.remove('VENDOR:'+token);throw new Error('Session is invalid. Please login again.');}
  if(!record||Number(record.expiresAt)<Date.now()+29*86400000)neB2BRememberSession_(token,v);
  cache.put('VENDOR:'+token,id,21600);
  return v;
};
vendorLogout=function(token){
  token=s_(token);CacheService.getScriptCache().remove('VENDOR:'+token);
  try{PropertiesService.getScriptProperties().deleteProperty(neB2BSessionKey_(token))}catch(e){}
  return true;
};
