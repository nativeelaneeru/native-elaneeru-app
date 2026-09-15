/** Native Elaneeru V9.5.2 — simple channel-aware product administration with customer-visible base prices. */
const V951_CHANNEL_IMAGE_HEADERS=['B2C Image URL','B2B Image URL','B2C Base Price','B2B Base Price'];

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
function v951Availability_(row){
  const b2c=active_(row&&row['B2C Status']),b2b=active_(row&&row['B2B Status']);
  if(b2c&&b2b)return 'BOTH';
  if(b2b)return 'B2B';
  return 'B2C';
}
function v951BasePrice_(row,channel){
  row=row||{};channel=s_(channel).toUpperCase();
  if(channel==='B2B')return n_(row['B2B Base Price'])||n_(row['B2B Default Price']);
  return n_(row['B2C Base Price'])||n_(row['B2C Price']);
}
function v951AdminDto_(row){
  const base=v928ProductDto_(row);
  base.availability=v951Availability_(row);
  base.b2cImageUrl=s_(row['B2C Image URL'])||s_(row['Image URL']);
  base.b2bImageUrl=s_(row['B2B Image URL']);
  base.sharedImageUrl=s_(row['Image URL']);
  base.b2cBasePrice=v951BasePrice_(row,'B2C');
  base.b2bBasePrice=v951BasePrice_(row,'B2B');
  return base;
}

function getProductsAdminV951(email,pin){
  requireAdmin_(email,pin);
  const list=v951Rows_().filter(function(r){return s_(r['Product ID'])}).sort(function(a,b){return n_(a['Sort Order'])-n_(b['Sort Order'])||s_(a['Product Name']).localeCompare(s_(b['Product Name']))});
  return {success:true,version:'9.5.2',products:list.map(v951AdminDto_)};
}

function saveProductAdminV951(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  const id=s_(p.productId).toUpperCase();
  let availability=s_(p.availability).toUpperCase();
  if(!['B2C','B2B','BOTH'].includes(availability))availability='B2C';
  if(id==='TC')availability='BOTH';
  const hasB2C=availability==='B2C'||availability==='BOTH',hasB2B=availability==='B2B'||availability==='BOTH';
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
    b2cStatus:hasB2C?'LIVE':'NOT LIVE',
    b2bStatus:hasB2B?'LIVE':'NOT LIVE'
  });
  const saved=saveProductAdminV928(email,pin,basePayload);
  lockRun_(function(){
    v951EnsureChannelImageHeaders_();
    const hit=v951Rows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
    if(!hit)throw new Error('Product was saved but could not be reloaded.');
    updateObj_(V8.SHEETS.PRODUCTS,hit._row,{
      'B2C Image URL':b2cImage,'B2B Image URL':b2bImage,
      'B2C Base Price':b2cBase,'B2B Base Price':b2bBase,'Updated At':now_()
    });
    v928ClearCatalogCache_();
  });
  const fresh=v951Rows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
  return {success:true,created:!!(saved&&saved.created),product:v951AdminDto_(fresh)};
}

/* Preserve all existing catalogue/order safeguards; replace only channel presentation metadata. */
const V951_BASE_GET_APP_CONFIG=getAppConfig;
getAppConfig=function(){
  const out=V951_BASE_GET_APP_CONFIG.apply(this,arguments);
  try{
    const byId={};v951Rows_().forEach(function(r){byId[s_(r['Product ID'])]=r});
    if(out&&Array.isArray(out.products))out.products=out.products.map(function(p){
      const r=byId[s_(p.productId)];
      return r?Object.assign({},p,{imageUrl:v951ChannelImage_(r,'B2C'),basePrice:v951BasePrice_(r,'B2C'),b2cBasePrice:v951BasePrice_(r,'B2C')}):p;
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
      const r=byId[s_(p.productId)];
      return r?Object.assign({},p,{imageUrl:v951ChannelImage_(r,'B2B'),basePrice:v951BasePrice_(r,'B2B'),b2bBasePrice:v951BasePrice_(r,'B2B')}):p;
    });
  }catch(e){return out}
};

function getProductChannelHealthV951(){
  return {ok:true,version:'9.5.2',singleMaster:true,independentVisibility:true,b2cOnlySupported:true,b2bOnlySupported:true,separateChannelImages:true,b2bImageFallsBackToShared:true,channelBasePrices:true,basePriceCustomerVisible:true};
}