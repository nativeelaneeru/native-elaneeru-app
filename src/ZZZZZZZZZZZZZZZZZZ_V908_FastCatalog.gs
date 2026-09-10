/**
 * Native Elaneeru V9.0.8 — fast public catalogue.
 *
 * The legacy getAppConfig chain opens the same spreadsheet repeatedly through
 * rows_()/sh_(), and the V8.3.4 catalogue guard performs an additional Products
 * repair read before the normal Products/Banners reads. On a large workbook
 * that can push a simple public catalogue request past the PWA timeout.
 *
 * This late compatibility override keeps the public response contract but
 * opens the workbook once, reads Products and Offers_Banners from that same
 * Spreadsheet object, and caches the assembled read-only payload briefly.
 * Tender Coconut remains visible to B2C even if its sheet status is accidentally
 * disabled; persistent sheet repair is still available through the existing
 * repairNativeElaneeruV834() helper and B2B guard.
 */

const V908_CATALOG_CACHE_KEY = 'NEL_PUBLIC_CATALOG_V908';

function v908RowsFromSheet_(sh){
  if(!sh)return [];
  const lr=sh.getLastRow(),lc=sh.getLastColumn();
  if(lr<2||lc<1)return [];
  const values=sh.getRange(1,1,lr,lc).getValues();
  const headers=values[0].map(s_);
  return values.slice(1).map(function(row,i){
    const out={_row:i+2};
    headers.forEach(function(header,j){if(header)out[header]=row[j]});
    return out;
  });
}

function v908TenderFallback_(){
  return {
    'Product ID':'TC',
    'Product Name':'Tender Coconut',
    'Category':'Coconuts',
    'Unit':'pc',
    'B2C Price':50,
    'B2C MOQ':1,
    'Bundle Qty 1':5,
    'Bundle Price 1':240,
    'Bundle Qty 2':10,
    'Bundle Price 2':475,
    'B2C Status':'LIVE',
    'Sort Order':1,
    'Description':''
  };
}

function getAppConfigV908_(){
  const cache=CacheService.getScriptCache();
  const hit=cache.get(V908_CATALOG_CACHE_KEY);
  if(hit){
    try{return JSON.parse(hit)}catch(error){}
  }

  // One spreadsheet open for the complete public catalogue request.
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const productSh=ss.getSheetByName(V8.SHEETS.PRODUCTS);
  const bannerSh=ss.getSheetByName(V8.SHEETS.BANNERS);
  if(!productSh)throw new Error('Missing sheet: '+V8.SHEETS.PRODUCTS);

  let productRows=v908RowsFromSheet_(productSh);
  const tcIndex=productRows.findIndex(function(p){return s_(p['Product ID']).toUpperCase()==='TC'});
  if(tcIndex<0){
    productRows.unshift(v908TenderFallback_());
  }else{
    const tc=Object.assign({},productRows[tcIndex]);
    tc['B2C Status']='LIVE';
    if(!s_(tc['Product Name']))tc['Product Name']='Tender Coconut';
    if(!s_(tc.Category))tc.Category='Coconuts';
    if(!s_(tc.Unit))tc.Unit='pc';
    if(!n_(tc['B2C Price']))tc['B2C Price']=50;
    if(!n_(tc['B2C MOQ']))tc['B2C MOQ']=1;
    if(!n_(tc['Sort Order']))tc['Sort Order']=1;
    productRows[tcIndex]=tc;
  }

  const banners=v908RowsFromSheet_(bannerSh)
    .filter(function(r){
      return bannerActiveNow_(r)&&['','B2C','ALL'].includes(s_(r.Audience).toUpperCase());
    })
    .sort(function(a,b){return n_(a['Display Order'])-n_(b['Display Order'])})
    .map(function(r){
      return {
        bannerId:s_(r['Banner ID']),
        title:s_(r.Title),
        subtitle:s_(r.Subtitle),
        offerText:s_(r['Offer Text']),
        imageUrl:safeImageUrl_(r['Image URL']),
        redirectType:s_(r['Redirect Type']),
        redirectValue:s_(r['Redirect Value']),
        productId:s_(r['Product ID'])
      };
    });

  const products=productRows
    .filter(function(p){return active_(p['B2C Status'])||s_(p['Product ID']).toUpperCase()==='TC'})
    .map(function(p){
      const isTender=s_(p['Product ID']).toUpperCase()==='TC';
      return {
        productId:s_(p['Product ID']),
        productName:s_(p['Product Name']),
        category:s_(p.Category),
        unit:s_(p.Unit),
        price:n_(p['B2C Price']),
        offerQty1:n_(p['Bundle Qty 1']),
        offerPrice1:n_(p['Bundle Price 1']),
        offerQty2:n_(p['Bundle Qty 2']),
        offerPrice2:n_(p['Bundle Price 2']),
        status:isTender?'LIVE':s_(p['B2C Status']),
        displayOrder:n_(p['Sort Order']),
        imageUrl:safeImageUrl_(p['Image URL']),
        description:s_(p.Description||'')
      };
    })
    .sort(function(a,b){
      if(s_(a.productId).toUpperCase()==='TC')return -1;
      if(s_(b.productId).toUpperCase()==='TC')return 1;
      return n_(a.displayOrder)-n_(b.displayOrder);
    });

  const out={
    brand:V8.BRAND,
    parentCompany:V8.COMPANY,
    deliveryRadiusKm:V8.DELIVERY_RADIUS_KM,
    cashbackMaxPercent:V8.CASHBACK_MAX_PERCENT,
    weeklyTargetQty:V8.WEEKLY_TARGET_QTY,
    weeklyReward:V8.WEEKLY_REWARD,
    monthlyTargetQty:V8.MONTHLY_TARGET_QTY,
    monthlyReward:V8.MONTHLY_REWARD,
    hub:V8.HUB,
    pickupPoints:[{id:'HUB',name:V8.HUB.name,lat:V8.HUB.lat,lng:V8.HUB.lng}],
    products:products,
    banners:banners,
    appVersion:'9.0.8'
  };

  try{
    const json=JSON.stringify(out);
    if(json.length<95000)cache.put(V908_CATALOG_CACHE_KEY,json,120);
  }catch(error){}
  return out;
}

// Canonical public catalogue implementation.
getAppConfig = getAppConfigV908_;
