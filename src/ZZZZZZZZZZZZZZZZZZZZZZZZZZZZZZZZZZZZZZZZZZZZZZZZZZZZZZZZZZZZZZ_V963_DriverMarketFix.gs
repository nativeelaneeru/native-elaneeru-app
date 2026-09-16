/**
 * Native Elaneeru V9.6.3 — Driver route/date + market-rate freshness fixes.
 *
 * 1) Google Sheets can materialize Route Date as a Date object even when the
 *    route was originally written as yyyy-MM-dd. The V8 driver reader compared
 *    String(Date) directly with the PWA's yyyy-MM-dd value, causing a valid
 *    assigned route to disappear after login. This wrapper retries with the
 *    exact stored representation after matching on a normalized local date.
 *
 * 2) Market_Rates now has both legacy and current column names. The canonical
 *    reader below accepts both schemas, excludes TEST rows, sorts by the actual
 *    market/source date, and feeds the same fresh list to marketRates and
 *    marketPrices so the B2B PWA cannot read a stale alias.
 */
const V963_DRIVER_MARKET_FIX_VERSION='9.6.3';

function v963DateKey_(value){
  if(value===null||value===undefined||value==='')return '';
  if(Object.prototype.toString.call(value)==='[object Date]'&&!isNaN(value.getTime())){
    return Utilities.formatDate(value,'Asia/Kolkata','yyyy-MM-dd');
  }
  const raw=s_(value).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const parsed=new Date(value);
  if(!isNaN(parsed.getTime()))return Utilities.formatDate(parsed,'Asia/Kolkata','yyyy-MM-dd');
  return raw.slice(0,10);
}

const V963_PREVIOUS_GET_DRIVER_DAY_ROUTE=getDriverDayRouteV8;
getDriverDayRouteV8=function(mobile,pin,type,date){
  const initial=V963_PREVIOUS_GET_DRIVER_DAY_ROUTE(mobile,pin,type,date);
  if(!date||(initial&&initial.route))return initial;

  const d=driverAuth_(mobile,pin,type);
  const driverId=s_(d['Driver ID']);
  const routeType=s_(type).toUpperCase();
  const requested=v963DateKey_(date);
  const candidate=rows_(V8.SHEETS.ROUTES)
    .filter(function(r){
      return s_(r['Driver ID'])===driverId &&
        s_(r['Route Type']).toUpperCase()===routeType &&
        !['COMPLETED','CANCELLED'].includes(s_(r.Status).toUpperCase()) &&
        v963DateKey_(r['Route Date'])===requested;
    })
    .sort(function(a,b){return new Date(b['Created At']||0)-new Date(a['Created At']||0);})[0];

  if(!candidate)return initial;
  return V963_PREVIOUS_GET_DRIVER_DAY_ROUTE(mobile,pin,type,s_(candidate['Route Date']));
};

function v963FirstNumber_(r,keys){
  for(let i=0;i<keys.length;i++){
    const raw=r[keys[i]];
    if(raw!==''&&raw!==null&&raw!==undefined){
      const value=n_(raw);
      if(isFinite(value)&&value>0)return value;
    }
  }
  return 0;
}

function v963MarketTimestamp_(r){
  const raw=r['Rate Date']||r['Source Date']||r['Source Updated At']||r['Fetched At']||r['Captured At']||'';
  const d=new Date(raw);
  return isNaN(d.getTime())?0:d.getTime();
}

function v963MarketRateRows_(){
  return rows_(V8.SHEETS.MARKET)
    .filter(function(r){
      const commodity=s_(r.Commodity||r['Product Name']).toLowerCase();
      const productId=s_(r['Product ID']).toUpperCase();
      const status=s_(r.Status).toUpperCase();
      const quality=s_(r['Data Quality']).toUpperCase();
      const source=s_(r.Source).toUpperCase();
      const isTender=commodity.indexOf('tender')>=0||productId==='TC';
      const isVisible=!status||['LIVE','ACTIVE','REVIEW'].includes(status);
      const isTest=status==='TEST'||quality.indexOf('DEMO')>=0||source.indexOf('DEMO')>=0;
      const modal=v963FirstNumber_(r,['Estimated Per Piece','Modal Rate','Modal Price']);
      return isTender&&isVisible&&!isTest&&modal>0;
    })
    .sort(function(a,b){
      const d=v963MarketTimestamp_(b)-v963MarketTimestamp_(a);
      if(d!==0)return d;
      return new Date(b['Captured At']||0)-new Date(a['Captured At']||0);
    });
}

getAllLatestMarketRates=function(){
  return v963MarketRateRows_().slice(0,50).map(function(r){
    const min=v963FirstNumber_(r,['Min Rate','Min Price']);
    const max=v963FirstNumber_(r,['Max Rate','Max Price']);
    const modal=v963FirstNumber_(r,['Estimated Per Piece','Modal Rate','Modal Price']);
    const unit=s_(r['Rate Unit']||r.Unit);
    const dateRaw=r['Rate Date']||r['Source Date']||r['Source Updated At']||r['Captured At'];
    return {
      rateId:s_(r['Rate ID']),
      productId:s_(r['Product ID']||'TC'),
      productName:s_(r['Product Name']||r.Commodity||'Tender Coconut'),
      market:s_(r.Market),district:s_(r.District),state:s_(r.State),
      minRate:min,maxRate:max,modalRate:modal,rateUnit:unit,
      source:s_(r.Source),sourceUrl:s_(r['Source URL']),
      rateDate:fmtDate_(dateRaw),
      fetchedAt:fmtDT_(r['Fetched At']||r['Captured At']),
      dataQuality:s_(r['Data Quality']),status:s_(r.Status)
    };
  });
};

const V963_PREVIOUS_GET_B2B_APP_DATA_V9=getB2BAppDataV9;
getB2BAppDataV9=function(token){
  const data=V963_PREVIOUS_GET_B2B_APP_DATA_V9(token)||{};
  const rates=getAllLatestMarketRates();
  data.marketRates=rates;
  data.marketPrices=rates;
  data.marketRatesUpdatedAt=rates.length?rates[0].rateDate:'';
  data.marketRatesVersion=V963_DRIVER_MARKET_FIX_VERSION;
  return data;
};

function getDriverMarketFixHealthV963(){
  const rates=getAllLatestMarketRates();
  return {
    ok:true,version:V963_DRIVER_MARKET_FIX_VERSION,
    driverRouteDateNormalized:true,
    marketSchemaNormalized:true,
    testRowsExcluded:true,
    marketRateCount:rates.length,
    latestMarketRateDate:rates.length?rates[0].rateDate:''
  };
}
