/** Native Elaneeru V9.5.0 — lightweight live storefront pricing. */
const V950_LIVE_PRICING_VERSION='9.5.0';

function v950SheetRows_(sh){
  if(!sh)return [];
  const lr=sh.getLastRow(),lc=sh.getLastColumn();
  if(lr<2||lc<1)return [];
  const values=sh.getRange(1,1,lr,lc).getValues(),headers=values[0].map(s_);
  return values.slice(1).map(function(row,i){const out={_row:i+2};headers.forEach(function(h,j){if(h)out[h]=row[j]});return out;});
}

function v950Millis_(v){
  if(!v)return 0;
  const d=v instanceof Date?v:new Date(v);
  return isNaN(d.getTime())?0:d.getTime();
}

function getB2CLivePricingV950(){
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID),sh=ss.getSheetByName(V8.SHEETS.PRODUCTS);
  if(!sh)throw new Error('Missing sheet: '+V8.SHEETS.PRODUCTS);
  const products=v950SheetRows_(sh)
    .filter(function(p){return active_(p['B2C Status'])||s_(p['Product ID']).toUpperCase()==='TC';})
    .map(function(p){return {
      productId:s_(p['Product ID']),productName:s_(p['Product Name']),unit:s_(p.Unit)||'pc',
      price:n_(p['B2C Price']),offerQty1:n_(p['Bundle Qty 1']),offerPrice1:n_(p['Bundle Price 1']),
      offerQty2:n_(p['Bundle Qty 2']),offerPrice2:n_(p['Bundle Price 2']),
      updatedAt:v950Millis_(p['Updated At'])
    };});
  return {ok:true,version:V950_LIVE_PRICING_VERSION,checkedAt:Date.now(),products:products};
}

function getB2BLivePricingV950(token){
  token=s_(token);const cachedVendorId=CacheService.getScriptCache().get('VENDOR:'+token);
  if(!cachedVendorId)throw new Error('Session has expired. Please login again.');

  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID),vendorSh=ss.getSheetByName(V8.SHEETS.B2B_VENDORS),productSh=ss.getSheetByName(V8.SHEETS.PRODUCTS),pricingSh=ss.getSheetByName(V8.SHEETS.VENDOR_PRICING);
  if(!vendorSh||!productSh||!pricingSh)throw new Error('Live pricing source is unavailable.');
  const vendorId=s_(cachedVendorId),vendor=v950SheetRows_(vendorSh).find(function(v){return s_(v['Vendor ID'])===vendorId;});
  if(!vendor||!active_(vendor.Status))throw new Error('Vendor is inactive or unavailable.');

  const now=new Date(),pricing=v950SheetRows_(pricingSh),products=v950SheetRows_(productSh)
    .filter(function(p){return active_(p['B2B Status']);})
    .map(function(p){
      const pid=s_(p['Product ID']);
      const agreed=pricing.find(function(x){
        const from=x['Valid From']?new Date(x['Valid From']):null,to=x['Valid To']?new Date(x['Valid To']):null;
        return s_(x['Vendor ID'])===vendorId&&s_(x['Product ID'])===pid&&active_(x.Status)&&
          (!from||isNaN(from.getTime())||from<=now)&&(!to||isNaN(to.getTime())||to>=now);
      });
      return {
        productId:pid,productName:s_(p['Product Name']),unit:s_(p.Unit)||'pc',
        price:agreed?n_(agreed['Agreed Price']):n_(p['B2B Default Price']),
        moq:agreed?(n_(agreed.MOQ)||n_(p['B2B MOQ'])||1):(n_(p['B2B MOQ'])||1),
        qtyStep:agreed?(n_(agreed['Qty Step'])||n_(p['Qty Step'])||1):(n_(p['Qty Step'])||1),
        pricingType:agreed?'AGREED':'DEFAULT',
        updatedAt:Math.max(v950Millis_(p['Updated At']),agreed?v950Millis_(agreed['Updated At']):0)
      };
    });
  return {ok:true,version:V950_LIVE_PRICING_VERSION,checkedAt:Date.now(),vendorId:vendorId,products:products};
}

function getLivePricingHealthV950(){
  return {ok:true,version:V950_LIVE_PRICING_VERSION,b2cLivePricing:true,b2bVendorPricing:true,serverAuthoritative:true};
}

const V950_PREVIOUS_DO_POST=doPost;
doPost=function(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge){
    let req={};
    try{
      req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
      const method=String(req.method||''),args=Array.isArray(req.args)?req.args:[];
      const live={getB2CLivePricingV950:getB2CLivePricingV950,getB2BLivePricingV950:getB2BLivePricingV950,getLivePricingHealthV950:getLivePricingHealthV950};
      if(live[method])return bridgeHtml_({ok:true,result:live[method].apply(null,args),requestId:String(req.requestId||'')});
    }catch(err){
      return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:String(req&&req.requestId||'')});
    }
  }
  return V950_PREVIOUS_DO_POST(e);
};
