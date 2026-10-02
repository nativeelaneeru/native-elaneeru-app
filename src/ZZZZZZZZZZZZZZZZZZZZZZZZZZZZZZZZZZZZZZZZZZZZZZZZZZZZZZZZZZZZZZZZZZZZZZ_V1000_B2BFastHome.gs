/**
 * Native Elaneeru V10.0.0 — fast B2B home payload.
 *
 * The launch B2B PWA does not need order history, order items and target
 * aggregation before it can show Home. This endpoint returns only the data
 * required to paint Home quickly. Heavy order/target data stays on the
 * existing getB2BAppDataV9 path and is fetched on demand by the PWA.
 */
const V1000_B2B_FAST_VERSION='10.0.0';

function v1000JsonCache_(key,ttl,loader){
  const cache=CacheService.getScriptCache();
  const hit=cache.get(key);
  if(hit){
    try{return JSON.parse(hit);}catch(err){}
  }
  const value=loader();
  try{
    const json=JSON.stringify(value);
    if(json.length<95000) cache.put(key,json,ttl);
  }catch(err){}
  return value;
}

/* Reuse a freshly validated vendor row for a few seconds only. This removes
 * duplicate B2B_Vendors sheet reads during login -> Home -> first action,
 * while keeping account-status changes effectively immediate. */
const V1000_PREVIOUS_VENDOR_=vendor_;
vendor_=function(token){
  const cache=CacheService.getScriptCache(),t=s_(token),id=cache.get('VENDOR:'+t);
  if(id){
    const raw=cache.get('V1000_VENDOR_ROW:'+id);
    if(raw){
      try{
        const v=JSON.parse(raw);
        if(v&&active_(v.Status)) return v;
      }catch(err){}
    }
  }
  const v=V1000_PREVIOUS_VENDOR_(token);
  try{cache.put('V1000_VENDOR_ROW:'+s_(v['Vendor ID']),JSON.stringify(v),10);}catch(err){}
  return v;
};

function v1000B2BProducts_(vendorId){
  return v1000JsonCache_('V1000_B2B_PRODUCTS:'+s_(vendorId),30,function(){
    return b2bProducts_(vendorId);
  });
}

function v1000B2BBanners_(){
  return v1000JsonCache_('V1000_B2B_BANNERS',300,function(){
    return rows_(V8.SHEETS.BANNERS)
      .filter(function(r){
        const audience=s_(r.Audience).toUpperCase(),status=s_(r.Status).toUpperCase();
        return ['B2B','ALL',''].includes(audience) && ['LIVE','ACTIVE','YES','TRUE','1'].includes(status);
      })
      .sort(function(a,b){return n_(a['Display Order'])-n_(b['Display Order']);})
      .map(function(r){
        return {
          bannerId:s_(r['Banner ID']),title:s_(r.Title),offerText:s_(r['Offer Text']),
          subtitle:s_(r.Subtitle),imageUrl:safeImageUrl_(r['Image URL']),
          redirectType:s_(r['Redirect Type']),redirectValue:s_(r['Redirect Value'])
        };
      });
  });
}

function v1000MarketRates_(){
  return v1000JsonCache_('V1000_MARKET_RATES',600,function(){
    if(typeof getAllLatestMarketRates==='function') return getAllLatestMarketRates();
    return [];
  });
}

function getB2BHomeFastV1000(token){
  const v=vendor_(token),vid=s_(v['Vendor ID']),rates=v1000MarketRates_();
  const creditLimit=n_(v['Credit Limit']);
  const outstanding=n_(v.Outstanding||v['Outstanding Amount']);
  return {
    fast:true,version:V1000_B2B_FAST_VERSION,
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

/* Narrow authenticated bridge extension. Everything else delegates to the
 * existing hardened bridge chain. */
const V1000_PREVIOUS_DO_POST=doPost;
doPost=function(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(!isBridge) return V1000_PREVIOUS_DO_POST(e);
  let req={};
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    if(String(req.method||'')!=='getB2BHomeFastV1000') return V1000_PREVIOUS_DO_POST(e);
    const args=Array.isArray(req.args)?req.args:[];
    return bridgeHtml_({ok:true,result:getB2BHomeFastV1000.apply(null,args),requestId:String(req.requestId||'')});
  }catch(err){
    return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:String(req&&req.requestId||'')});
  }
};
