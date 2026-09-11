/** Native Elaneeru V9.2.8 — scalable product administration. */
const V928_PRODUCT_HEADERS=[
  'Product ID','Product Name','Category','Unit','B2C Price','B2B Default Price','B2C MOQ','B2B MOQ','Qty Step',
  'Bundle Qty 1','Bundle Price 1','Bundle Qty 2','Bundle Price 2','Barcode Required','Image URL','B2C Status','B2B Status',
  'Sort Order','Description','Created At','Updated At'
];

function v928EnsureProductHeaders_(){
  const sh=sh_(V8.SHEETS.PRODUCTS);
  const lc=sh.getLastColumn();
  if(lc<1){sh.getRange(1,1,1,V928_PRODUCT_HEADERS.length).setValues([V928_PRODUCT_HEADERS]);return sh;}
  const existing=sh.getRange(1,1,1,lc).getValues()[0].map(s_);
  const missing=V928_PRODUCT_HEADERS.filter(function(h){return !existing.includes(h)});
  if(missing.length)sh.getRange(1,lc+1,1,missing.length).setValues([missing]);
  return sh;
}

function v928ProductRows_(){v928EnsureProductHeaders_();return rows_(V8.SHEETS.PRODUCTS)}
function v928CleanStatus_(v){return s_(v).toUpperCase()==='LIVE'?'LIVE':'NOT LIVE'}
function v928CleanUrl_(v){const x=s_(v);if(!x)return '';if(!/^https?:\/\//i.test(x))throw new Error('Image URL must start with http:// or https://');return x}
function v928ClearCatalogCache_(){try{CacheService.getScriptCache().remove('NEL_PUBLIC_CATALOG_V908')}catch(e){}}
function v928ProductDto_(r){
  return {
    row:Number(r._row||0),productId:s_(r['Product ID']),productName:s_(r['Product Name']),category:s_(r.Category),unit:s_(r.Unit),
    b2cPrice:n_(r['B2C Price']),b2bPrice:n_(r['B2B Default Price']),b2cMoq:n_(r['B2C MOQ']),b2bMoq:n_(r['B2B MOQ']),qtyStep:n_(r['Qty Step']),
    bundleQty1:n_(r['Bundle Qty 1']),bundlePrice1:n_(r['Bundle Price 1']),bundleQty2:n_(r['Bundle Qty 2']),bundlePrice2:n_(r['Bundle Price 2']),
    barcodeRequired:active_(r['Barcode Required'])?'YES':'NO',imageUrl:s_(r['Image URL']),b2cStatus:v928CleanStatus_(r['B2C Status']),b2bStatus:v928CleanStatus_(r['B2B Status']),
    sortOrder:n_(r['Sort Order']),description:s_(r.Description),createdAt:fmtDT_(r['Created At']),updatedAt:fmtDT_(r['Updated At'])
  };
}

function getProductsAdminV928(email,pin){
  requireAdmin_(email,pin);
  const rows=v928ProductRows_().filter(function(r){return s_(r['Product ID'])}).sort(function(a,b){return n_(a['Sort Order'])-n_(b['Sort Order'])||s_(a['Product Name']).localeCompare(s_(b['Product Name']))});
  return {success:true,version:'9.2.8',products:rows.map(v928ProductDto_)};
}

function saveProductAdminV928(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  return lockRun_(function(){
    v928EnsureProductHeaders_();
    const id=s_(p.productId).toUpperCase(),name=s_(p.productName),category=s_(p.category),unit=s_(p.unit)||'pc';
    if(!/^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(id))throw new Error('Product ID must be 2–30 characters using letters, numbers, hyphen or underscore.');
    if(!name)throw new Error('Product Name is required.');
    if(!category)throw new Error('Category is required.');
    const isTender=id==='TC';
    const obj={
      'Product ID':id,'Product Name':name,'Category':category,'Unit':unit,
      'B2C Price':Math.max(0,n_(p.b2cPrice)),'B2B Default Price':Math.max(0,n_(p.b2bPrice)),
      'B2C MOQ':Math.max(1,Math.floor(n_(p.b2cMoq)||1)),'B2B MOQ':Math.max(1,Math.floor(n_(p.b2bMoq)||1)),'Qty Step':Math.max(1,Math.floor(n_(p.qtyStep)||1)),
      'Bundle Qty 1':Math.max(0,Math.floor(n_(p.bundleQty1))),'Bundle Price 1':Math.max(0,n_(p.bundlePrice1)),
      'Bundle Qty 2':Math.max(0,Math.floor(n_(p.bundleQty2))),'Bundle Price 2':Math.max(0,n_(p.bundlePrice2)),
      'Barcode Required':active_(p.barcodeRequired)?'YES':'NO','Image URL':v928CleanUrl_(p.imageUrl),
      'B2C Status':isTender?'LIVE':v928CleanStatus_(p.b2cStatus),'B2B Status':isTender?'LIVE':v928CleanStatus_(p.b2bStatus),
      'Sort Order':Math.max(0,Math.floor(n_(p.sortOrder))),'Description':s_(p.description),'Updated At':now_()
    };
    const hit=v928ProductRows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
    if(hit){updateObj_(V8.SHEETS.PRODUCTS,hit._row,obj)}
    else{obj['Created At']=now_();append_(V8.SHEETS.PRODUCTS,obj)}
    v928ClearCatalogCache_();
    const fresh=v928ProductRows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
    return {success:true,created:!hit,product:v928ProductDto_(fresh)};
  });
}

function setProductChannelStatusAdminV928(email,pin,productId,channel,status){
  requireAdmin_(email,pin);
  return lockRun_(function(){
    const id=s_(productId).toUpperCase(),ch=s_(channel).toUpperCase();
    if(!['B2C','B2B'].includes(ch))throw new Error('Unknown product channel.');
    const hit=v928ProductRows_().find(function(r){return s_(r['Product ID']).toUpperCase()===id});
    if(!hit)throw new Error('Product not found.');
    const next=id==='TC'?'LIVE':v928CleanStatus_(status);
    const patch={'Updated At':now_()};patch[ch+' Status']=next;
    updateObj_(V8.SHEETS.PRODUCTS,hit._row,patch);v928ClearCatalogCache_();
    return {success:true,productId:id,channel:ch,status:next};
  });
}

function uploadProductImageAdminV928(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  const id=s_(p.productId).toUpperCase();if(!id)throw new Error('Enter Product ID before uploading an image.');
  const mime=s_(p.mimeType).toLowerCase();if(!/^image\/(png|jpeg|jpg|webp|gif)$/.test(mime))throw new Error('Use PNG, JPG, WEBP or GIF image.');
  let data=s_(p.base64);const comma=data.indexOf(',');if(comma>=0)data=data.slice(comma+1);
  const bytes=Utilities.base64Decode(data);if(bytes.length>3*1024*1024)throw new Error('Product image must be 3 MB or smaller.');
  const ext=mime.includes('png')?'png':mime.includes('webp')?'webp':mime.includes('gif')?'gif':'jpg';
  const props=PropertiesService.getScriptProperties();let folder=null,folderId=s_(props.getProperty('NEL_PRODUCT_IMAGE_FOLDER_ID'));
  if(folderId){try{folder=DriveApp.getFolderById(folderId)}catch(e){folder=null}}
  if(!folder){const it=DriveApp.getFoldersByName('Native Elaneeru Product Images');folder=it.hasNext()?it.next():DriveApp.createFolder('Native Elaneeru Product Images');props.setProperty('NEL_PRODUCT_IMAGE_FOLDER_ID',folder.getId())}
  const stamp=Utilities.formatDate(new Date(),'Asia/Kolkata','yyyyMMdd-HHmmss');
  const blob=Utilities.newBlob(bytes,mime,id+'-'+stamp+'.'+ext);const file=folder.createFile(blob);
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW)}catch(e){try{file.setSharing(DriveApp.Access.ANYONE,DriveApp.Permission.VIEW)}catch(ignore){throw new Error('Image uploaded, but public sharing is blocked by Drive policy. Use a public image URL instead.')}}
  const url='https://drive.google.com/uc?export=view&id='+encodeURIComponent(file.getId());
  return {success:true,url:url,fileId:file.getId(),name:file.getName()};
}
