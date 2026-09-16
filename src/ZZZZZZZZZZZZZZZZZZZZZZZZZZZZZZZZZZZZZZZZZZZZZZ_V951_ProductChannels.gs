/** Native Elaneeru V9.5.7 — channel-aware product administration + operational status. */
const V951_CHANNEL_IMAGE_HEADERS=[
  'B2C Image URL','B2B Image URL','B2C Base Price','B2B Base Price',
  'Channel Availability','B2C Stock Override','B2B Stock Override'
];

function v951EnsureChannelImageHeaders_(){
  const sh=sh_(V8.SHEETS.PRODUCTS),lc=sh.getLastColumn();
  if(lc<1)return sh;
  const h=sh.getRange(1,1,1,lc).getValues()[0].map(s_);
  const missing=V951_CHANNEL_IMAGE_HEADERS.filter(function(x){return !h.includes(x)});
  if(missing.length)sh.getRange(1,lc+1,1,missing.length).setValues([missing]);
  return sh;
}
function v951Rows_(){v951EnsureChannelImageHeaders_();return rows_(V8.SHEETS.PRODUCTS)}
function v951ChannelImage_(row,channel){
  row=row||{};channel=s_(channel).toUpperCase();
  const preferred=channel==='B2B'?row['B2B Image URL']:row['B2C Image URL'];
  return safeImageUrl_(preferred)||safeImageUrl_(row['Image URL']);
}
function v951CleanAvailability_(v){
  v=s_(v).toUpperCase();return ['B2C','B2B','BOTH'].includes(v)?v:'';
}
function v951Availability_(row){
  row=row||{};
  const id=s_(row['Product ID']).toUpperCase();if(id==='TC')return 'BOTH';
  const saved=v951CleanAvailability_(row['Channel Availability']);if(saved)return saved;
  const b2c=active_(row['B2C Status']),b2b=active_(row['B2B Status']);
  if(b2c&&b2b)return 'BOTH';
  if(b2b)return 'B2B';
  if(b2c)return 'B2C';
  if(n_(row['B2C Price'])>0&&n_(row['B2B Default Price'])>0)return 'BOTH';
  if(n_(row['B2B Default Price'])>0)return 'B2B';
  return 'B2C';
}
function v951BasePrice_(row,channel){
  row=row||{};channel=s_(channel).toUpperCase();
  if(channel==='B2B')return n_(row['B2B Base Price'])||n_(row['B2B Default Price']);
  return n_(row['B2C Base Price'])||n_(row['B2C Price']);
}
function v951CleanOperationalStatus_(v){
  v=s_(v).toUpperCase().replace(/_/g,' ');
  if(v==='OOS'||v==='OUT OF STOCK')return 'OOS';
  if(v==='NOT LIVE'||v==='OFF'||v==='INACTIVE')return 'NOT LIVE';
  return 'LIVE';
}
function v951ManualStatus_(row,channel){
  row=row||{};channel=s_(channel).toUpperCase();
  const av=v951Availability_(row),member=channel==='B2C'?(av==='B2C'||av==='BOTH'):(av==='B2B'||av==='BOTH');
  if(!member)return 'NOT LIVE';
  if(!active_(row[channel+' Status']))return 'NOT LIVE';
  if(s_(row[channel+' Stock Override']).toUpperCase()==='OOS')return 'OOS';
  return 'LIVE';
}
function v951StockMap_(){
  const out={};
  try{
    if(typeof getBunchStockV944==='function')getBunchStockV944().forEach(function(x){out[s_(x.productId)]=x});
  }catch(e){}
  return out;
}
function v951EffectiveStatus_(row,channel,stockMap){
  const manual=v951ManualStatus_(row,channel);if(manual!=='LIVE')return manual;
  const x=(stockMap||{})[s_(row&&row['Product ID'])];
  return x&&x.tracked&&s_(x.stockStatus).toUpperCase()==='OOS'?'OOS':'LIVE';
}
function v951AdminDto_(row,stockMap){
  const base=v928ProductDto_(row),av=v951Availability_(row);
  base.availability=av;
  base.b2cImageUrl=s_(row['B2C Image URL'])||s_(row['Image URL']);
  base.b2bImageUrl=s_(row['B2B Image URL']);
  base.sharedImageUrl=s_(row['Image URL']);
  base.b2cBasePrice=v951BasePrice_(row,'B2C');
  base.b2bBasePrice=v951BasePrice_(row,'B2B');
  base.b2cOperationalStatus=v951ManualStatus_(row,'B2C');
  base.b2bOperationalStatus=v951ManualStatus_(row,'B2B');
  base.b2cEffectiveStatus=v951EffectiveStatus_(row,'B2C',stockMap);
  base.b2bEffectiveStatus=v951EffectiveStatus_(row,'B2B',stockMap);
  const stock=(stockMap||{})[s_(row['Product ID'])];
  base.stockTracked=!!(stock&&stock.tracked);
  base.availableQty=stock?n_(stock.availableQty):null;
  return base;
}

function getProductsAdminV951(email,pin){
  requireAdmin_(email,pin);
  const stockMap=v951StockMap_();
  const list=v951Rows_().filter(function(r){return s_(r['Product ID'])}).sort(function(a,b){return n_(a['Sort Order'])-n_(b['Sort Order'])||s_(a['Product Name']).localeCompare(s_(b['Product Name']))});
  return {success:true,version:'9.5.7',products:list.map(function(r){return v951AdminDto_(r,stockMap)})};
}

function v951PublishState_(operational,member){
  if(!member)return {publish:'NOT LIVE',override:'AUTO'};
  operational=v951CleanOperationalStatus_(operational);
  if(operational==='NOT LIVE')return {publish:'NOT LIVE',override:'AUTO'};
  if(operational==='OOS')return {publish:'LIVE',override:'OOS'};
  return {publish:'LIVE',override:'AUTO'};
}

function saveProductAdminV951(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  const id=s_(p.productId).toUpperCase();
  let availability=v951CleanAvailability_(p.availability)||'B2C';
  if(id==='TC')availability='BOTH';
  const hasB2C=availability==='B2C'||availability==='BOTH',hasB2B=availability==='B2B'||availability==='BOTH';
  const b2cOperational=v951CleanOperationalStatus_(p.b2cOperationalStatus||p.b2cStatus||'LIVE');
  const b2bOperational=v951CleanOperationalStatus_(p.b2bOperationalStatus||p.b2bStatus||'LIVE');
  if(id==='TC'&&(b2cOperational==='NOT LIVE'||b2bOperational==='NOT LIVE'))throw new Error('Tender Coconut stays configured in both apps. Use OOS when stock is unavailable.');
  const b2cState=v951PublishState_(b2cOperational,hasB2C),b2bState=v951PublishState_(b2bOperational,hasB2B);
  const b2cSell=Math.max(0,n_(p.b2cPrice)),b2bSell=Math.max(0,n_(p.b2bPrice));
  const requestedB2CBase=Math.max(0,n_(p.b2cBasePrice)),requestedB2BBase=Math.max(0,n_(p.b2bBasePrice));
  if(hasB2C&&requestedB2CBase>0&&requestedB2CBase<b2cSell)throw new Error('B2C Base Price must be equal to or higher than the B2C Selling Price.');
  if(hasB2B&&requestedB2BBase>0&&requestedB2BBase<b2bSell)throw new Error('B2B Base Price must be equal to or higher than the B2B Selling Price.');
  const b2cBase=hasB2C?(requestedB2CBase||b2cSell):requestedB2CBase;
  const b2bBase=hasB2B?(requestedB2BBase||b2bSell):requestedB2BBase;
  const b2cImage=v928CleanUrl_(p.b2cImageUrl),b2bImage=v928CleanUrl_(p.b2bImageUrl);
  const legacyImage=b2cImage||b2bImage||v928CleanUrl_(p.imageUrl);
  const basePayload=Object.assign({},p,{
    imageUrl:legacyImage,
    b2cStatus:b2cState.publish,
    b2bStatus:b2bState.publish
  });
  const saved=saveProductAdminV928(email,pin,basePayload);
  lockRun_(function(){
    v951EnsureChannelImageHeaders_();
    const hit=v951Rows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
    if(!hit)throw new Error('Product was saved but could not be reloaded.');
    updateObj_(V8.SHEETS.PRODUCTS,hit._row,{
      'Channel Availability':availability,
      'B2C Stock Override':b2cState.override,'B2B Stock Override':b2bState.override,
      'B2C Image URL':b2cImage,'B2B Image URL':b2bImage,
      'B2C Base Price':b2cBase,'B2B Base Price':b2bBase,'Updated At':now_()
    });
    v928ClearCatalogCache_();
  });
  const fresh=v951Rows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
  return {success:true,created:!!(saved&&saved.created),product:v951AdminDto_(fresh,v951StockMap_())};
}

function v951ApplyManualStock_(product,row,channel){
  const out=Object.assign({},product||{});if(!row)return out;
  const manual=v951ManualStatus_(row,channel);
  if(manual==='OOS'){
    out.stockTracked=true;out.stockStatus='OOS';out.availableQty=0;out.manualStockOverride=true;
  }
  return out;
}

/* Preserve existing catalogue/order safeguards while enriching channel presentation and manual OOS. */
const V951_BASE_GET_APP_CONFIG=getAppConfig;
getAppConfig=function(){
  const out=V951_BASE_GET_APP_CONFIG.apply(this,arguments);
  try{
    const byId={};v951Rows_().forEach(function(r){byId[s_(r['Product ID'])]=r});
    if(out&&Array.isArray(out.products))out.products=out.products.map(function(p){
      const r=byId[s_(p.productId)];if(!r)return p;
      return v951ApplyManualStock_(Object.assign({},p,{
        imageUrl:v951ChannelImage_(r,'B2C'),basePrice:v951BasePrice_(r,'B2C'),b2cBasePrice:v951BasePrice_(r,'B2C')
      }),r,'B2C');
    });
  }catch(e){}
  return out;
};

const V951_BASE_B2B_PRODUCTS=b2bProducts_;
b2bProducts_=function(vendorId){
  const out=V951_BASE_B2B_PRODUCTS.apply(this,arguments);
  try{
    const byId={};v951Rows_().forEach(function(r){byId[s_(r['Product ID'])]=r});
    return (out||[]).map(function(p){
      const r=byId[s_(p.productId)];if(!r)return p;
      return v951ApplyManualStock_(Object.assign({},p,{
        imageUrl:v951ChannelImage_(r,'B2B'),basePrice:v951BasePrice_(r,'B2B'),b2bBasePrice:v951BasePrice_(r,'B2B')
      }),r,'B2B');
    });
  }catch(e){return out}
};

function getProductChannelHealthV951(){
  return {ok:true,version:'9.5.7',singleMaster:true,independentVisibility:true,b2cOnlySupported:true,b2bOnlySupported:true,separateChannelImages:true,b2bImageFallsBackToShared:true,channelBasePrices:true,basePriceCustomerVisible:true,fastB2CPresentation:true,explicitOperationalStatus:true,liveNotLiveOos:true,manualOosKeepsProductPublished:true};
}
