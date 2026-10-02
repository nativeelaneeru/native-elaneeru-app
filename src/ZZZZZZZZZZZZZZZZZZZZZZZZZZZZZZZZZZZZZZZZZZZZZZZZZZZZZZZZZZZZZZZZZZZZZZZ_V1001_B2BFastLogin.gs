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

  return {
    token:token,
    vendorId:vid,
    fast:true,
    version:V1001_B2B_FAST_LOGIN_VERSION,
    home:v1001HomeFromVendor_(v)
  };
};
