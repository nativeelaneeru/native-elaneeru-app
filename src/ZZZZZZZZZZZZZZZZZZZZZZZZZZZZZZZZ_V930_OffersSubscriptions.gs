const V930_OFFER_HEADERS=['Banner ID','Title','Subtitle','Offer Text','Image URL','Audience','Product ID','Start Date','End Date','Display Order','Status','Redirect Type','Redirect Value','Created At','Updated At'];

function v930EnsureSheet_(name,headers){
  let sh=ss_().getSheetByName(name);
  if(!sh){sh=ss_().insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);return sh;}
  const lc=Math.max(sh.getLastColumn(),1),existing=sh.getRange(1,1,1,lc).getValues()[0].map(s_),missing=headers.filter(h=>!existing.includes(h));
  if(missing.length)sh.getRange(1,lc+1,1,missing.length).setValues([missing]);
  return sh;
}
function v930Rows_(sh){const lr=sh.getLastRow(),lc=sh.getLastColumn();if(lr<2)return [];const a=sh.getRange(1,1,lr,lc).getValues(),h=a[0].map(s_);return a.slice(1).map((r,i)=>{const o={_row:i+2};h.forEach((x,j)=>o[x]=r[j]);return o});}
function v930OfferDto_(r){return {bannerId:s_(r['Banner ID']),title:s_(r.Title),subtitle:s_(r.Subtitle),offerText:s_(r['Offer Text']),imageUrl:s_(r['Image URL']),audience:s_(r.Audience)||'B2C',productId:s_(r['Product ID']),startDate:isoDate_(r['Start Date']),endDate:isoDate_(r['End Date']),displayOrder:n_(r['Display Order']),status:s_(r.Status).toUpperCase()==='LIVE'?'LIVE':'PAUSED',redirectType:s_(r['Redirect Type']),redirectValue:s_(r['Redirect Value'])};}
function v930SubDto_(r){return {subscriptionId:s_(r['Subscription ID']),mobile:digits_(r.Mobile),productId:s_(r['Product ID']),quantity:n_(r.Quantity),frequency:s_(r.Frequency),startDate:isoDate_(r['Start Date']),preferredSlot:s_(r['Preferred Slot']),status:s_(r.Status),nextDeliveryDate:isoDate_(r['Next Delivery Date']),autoOrder:s_(r['Auto Order'])};}

function getOffersSubscriptionsAdminV930(email,pin){
  requireAdmin_(email,pin);
  const offers=v930Rows_(v930EnsureSheet_(V8.SHEETS.BANNERS,V930_OFFER_HEADERS)).filter(r=>s_(r['Banner ID'])).sort((a,b)=>n_(a['Display Order'])-n_(b['Display Order'])).map(v930OfferDto_);
  const products=v928ProductRows_().filter(r=>s_(r['Product ID'])).map(r=>({productId:s_(r['Product ID']),productName:s_(r['Product Name'])}));
  const subs=v930Rows_(v910EnsureSheet_(ss_(),V910_SUBSCRIPTION_SHEET,V910_SUB_HEADERS)).filter(r=>s_(r['Subscription ID'])).sort((a,b)=>b._row-a._row).map(v930SubDto_);
  return {success:true,offers,products,subscriptions:subs,autoOrderEnabled:false};
}
function saveOfferAdminV930(email,pin,p){
  requireAdmin_(email,pin);p=p||{};return lockRun_(()=>{
    const sh=v930EnsureSheet_(V8.SHEETS.BANNERS,V930_OFFER_HEADERS),id=s_(p.bannerId)||id_('OFR-'),title=s_(p.title),audience=s_(p.audience).toUpperCase()||'B2C';
    if(!title)throw new Error('Offer title is required.');if(['B2C','B2B','ALL'].indexOf(audience)<0)throw new Error('Choose B2C, B2B or ALL.');
    const status=s_(p.status).toUpperCase()==='LIVE'?'LIVE':'PAUSED',img=s_(p.imageUrl);if(img&&!/^https?:\/\//i.test(img))throw new Error('Image URL must start with https:// or http://');
    const obj={'Banner ID':id,Title:title,Subtitle:s_(p.subtitle),'Offer Text':s_(p.offerText),'Image URL':img,Audience:audience,'Product ID':s_(p.productId),'Start Date':s_(p.startDate),'End Date':s_(p.endDate),'Display Order':Math.max(0,n_(p.displayOrder)),Status:status,'Redirect Type':s_(p.redirectType),'Redirect Value':s_(p.redirectValue),'Updated At':now_()};
    const hit=v930Rows_(sh).find(r=>s_(r['Banner ID'])===id);if(hit)updateObj_(V8.SHEETS.BANNERS,hit._row,obj);else{obj['Created At']=now_();append_(V8.SHEETS.BANNERS,obj);}
    v928ClearCatalogCache_();return {success:true,bannerId:id,created:!hit};
  });
}
function setSubscriptionStatusAdminV930(email,pin,subscriptionId,status){
  requireAdmin_(email,pin);const next=s_(status).toUpperCase();if(['ACTIVE','PAUSED','CANCELLED'].indexOf(next)<0)throw new Error('Invalid subscription status.');
  const sh=v910EnsureSheet_(ss_(),V910_SUBSCRIPTION_SHEET,V910_SUB_HEADERS),hit=v930Rows_(sh).find(r=>s_(r['Subscription ID'])===s_(subscriptionId));if(!hit)throw new Error('Subscription not found.');
  v910UpdateRow_(sh,hit._row,{Status:next,'Updated At':now_()});return {success:true,status:next};
}