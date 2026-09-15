/** Native Elaneeru V9.5.1 — simple channel-aware product administration. */
const V951_CHANNEL_IMAGE_HEADERS=['B2C Image URL','B2B Image URL'];

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
function v951AdminDto_(row){
  const base=v928ProductDto_(row);
  base.availability=v951Availability_(row);
  base.b2cImageUrl=s_(row['B2C Image URL'])||s_(row['Image URL']);
  base.b2bImageUrl=s_(row['B2B Image URL']);
  base.sharedImageUrl=s_(row['Image URL']);
  return base;
}

function getProductsAdminV951(email,pin){
  requireAdmin_(email,pin);
  const list=v951Rows_().filter(function(r){return s_(r['Product ID'])}).sort(function(a,b){return n_(a['Sort Order'])-n_(b['Sort Order'])||s_(a['Product Name']).localeCompare(s_(b['Product Name']))});
  return {success:true,version:'9.5.1',products:list.map(v951AdminDto_)};
}

function saveProductAdminV951(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  const id=s_(p.productId).toUpperCase();
  let availability=s_(p.availability).toUpperCase();
  if(!['B2C','B2B','BOTH'].includes(availability))availability='B2C';
  if(id==='TC')availability='BOTH';
  const b2cImage=v928CleanUrl_(p.b2cImageUrl),b2bImage=v928CleanUrl_(p.b2bImageUrl);
  const legacyImage=b2cImage||b2bImage||v928CleanUrl_(p.imageUrl);
  const basePayload=Object.assign({},p,{
    imageUrl:legacyImage,
    b2cStatus:(availability==='B2C'||availability==='BOTH')?'LIVE':'NOT LIVE',
    b2bStatus:(availability==='B2B'||availability==='BOTH')?'LIVE':'NOT LIVE'
  });
  const saved=saveProductAdminV928(email,pin,basePayload);
  lockRun_(function(){
    v951EnsureChannelImageHeaders_();
    const hit=v951Rows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
    if(!hit)throw new Error('Product was saved but could not be reloaded.');
    updateObj_(V8.SHEETS.PRODUCTS,hit._row,{'B2C Image URL':b2cImage,'B2B Image URL':b2bImage,'Updated At':now_()});
    v928ClearCatalogCache_();
  });
  const fresh=v951Rows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
  return {success:true,created:!!(saved&&saved.created),product:v951AdminDto_(fresh)};
}

/* Preserve all existing catalogue/order safeguards; only replace presentation image by channel. */
const V951_BASE_GET_APP_CONFIG=getAppConfig;
getAppConfig=function(){
  const out=V951_BASE_GET_APP_CONFIG.apply(this,arguments);
  try{
    const byId={};v951Rows_().forEach(function(r){byId[s_(r['Product ID'])]=r});
    if(out&&Array.isArray(out.products))out.products=out.products.map(function(p){const r=byId[s_(p.productId)];return r?Object.assign({},p,{imageUrl:v951ChannelImage_(r,'B2C')}):p});
  }catch(e){}
  return out;
};

const V951_BASE_B2B_PRODUCTS=b2bProducts_;
b2bProducts_=function(vendorId){
  const out=V951_BASE_B2B_PRODUCTS.apply(this,arguments);
  try{
    const byId={};v951Rows_().forEach(function(r){byId[s_(r['Product ID'])]=r});
    return (out||[]).map(function(p){const r=byId[s_(p.productId)];return r?Object.assign({},p,{imageUrl:v951ChannelImage_(r,'B2B')}):p});
  }catch(e){return out}
};

function getProductChannelHealthV951(){
  return {ok:true,version:'9.5.1',singleMaster:true,independentVisibility:true,b2cOnlySupported:true,b2bOnlySupported:true,separateChannelImages:true,b2bImageFallsBackToShared:true};
}
