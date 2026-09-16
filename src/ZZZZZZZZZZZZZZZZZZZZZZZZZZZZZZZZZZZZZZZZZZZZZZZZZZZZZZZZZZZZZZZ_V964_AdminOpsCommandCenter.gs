/** Native Elaneeru V9.6.4 — Admin Operations Command Center (read-only). */
const V964_ADMIN_OPS_VERSION='9.6.4';

function v964Rows_(name){
  try{return rows_(name)||[];}catch(e){return [];}
}
function v964Status_(v){
  return s_(v).toUpperCase().replace(/[^A-Z ]/g,'').replace(/\s+/g,' ').trim();
}
function v964OpenStatus_(v){
  const x=v964Status_(v);
  return !['DELIVERED','COMPLETED','CANCELLED','REJECTED','CLOSED'].includes(x);
}
function v964DateKey_(v){
  if(typeof v963DateKey_==='function')return v963DateKey_(v);
  if(v===null||v===undefined||v==='')return '';
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,'Asia/Kolkata','yyyy-MM-dd');
  const d=new Date(v);return isNaN(d.getTime())?s_(v).slice(0,10):Utilities.formatDate(d,'Asia/Kolkata','yyyy-MM-dd');
}
function v964AgeDays_(v){
  const key=v964DateKey_(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return null;
  const today=Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');
  const a=new Date(key+'T00:00:00+05:30'),b=new Date(today+'T00:00:00+05:30');
  return Math.max(0,Math.floor((b.getTime()-a.getTime())/86400000));
}
function v964MarketSummary_(state){
  let list=[];
  try{list=typeof v963MarketRateRows_==='function'?v963MarketRateRows_():v964Rows_(V8.SHEETS.MARKET);}catch(e){list=[];}
  const rows=list.filter(function(r){return s_(r.State).toLowerCase()===s_(state).toLowerCase();});
  const row=rows[0]||null;
  if(!row)return {state:state,available:false,rateDate:'',ageDays:null,freshness:'NO DATA',market:'',modalRate:0,unit:'',source:''};
  const raw=row['Rate Date']||row['Source Date']||row['Source Updated At']||row['Captured At'];
  const age=v964AgeDays_(raw);
  const modal=typeof v963FirstNumber_==='function'?v963FirstNumber_(row,['Estimated Per Piece','Modal Rate','Modal Price']):n_(row['Estimated Per Piece']||row['Modal Rate']||row['Modal Price']);
  return {
    state:state,available:true,rateDate:v964DateKey_(raw),ageDays:age,
    freshness:age===null?'UNKNOWN':(age<=1?'FRESH':(age<=3?'WATCH':'STALE')),
    market:s_(row.Market),district:s_(row.District),modalRate:modal,
    unit:s_(row['Rate Unit']||row.Unit),source:s_(row.Source),status:s_(row.Status),dataQuality:s_(row['Data Quality'])
  };
}
function v964VendorQuality_(rows){
  const allowed=['PENDING','APPROVED','REJECTED','CANCELLED'];
  const issues={invalidStatus:0,missingGps:0,invalidPincode:0,missingDemand:0,missingAgreedPrice:0,legacyTerminology:0};
  const examples=[];
  rows.forEach(function(r){
    const rowIssues=[];
    const status=v964Status_(r.Status);
    if(!allowed.includes(status)){issues.invalidStatus++;rowIssues.push('Invalid status: '+s_(r.Status));}
    if(!(n_(r.Latitude)&&n_(r.Longitude))){issues.missingGps++;rowIssues.push('GPS missing');}
    const pin=String(r.Pincode||'').replace(/\D/g,'');if(pin&&pin.length!==6){issues.invalidPincode++;rowIssues.push('Pincode invalid');}
    if(n_(r['Expected Daily Qty'])<=0){issues.missingDemand++;rowIssues.push('Daily demand missing');}
    if(n_(r['Agreed Price'])<=0){issues.missingAgreedPrice++;rowIssues.push('Agreed price missing');}
    if(/roadside/i.test(s_(r['Vendor Type']))){issues.legacyTerminology++;rowIssues.push('Use Local Coconut Vendor terminology');}
    if(rowIssues.length&&examples.length<8)examples.push({onboardingId:s_(r['Onboarding ID']),businessName:s_(r['Business Name']),area:s_(r.Area),status:s_(r.Status),issues:rowIssues});
  });
  issues.total=Object.keys(issues).reduce(function(sum,k){return sum+(k==='total'?0:n_(issues[k]));},0);
  return {issues:issues,examples:examples};
}
function v964ProductStatus_(){
  const out={b2c:{live:0,oos:0,notLive:0},b2b:{live:0,oos:0,notLive:0},oosProducts:[]};
  let products=[];try{products=productRows_()||[];}catch(e){}
  let stockMap={};try{if(typeof v951StockMap_==='function')stockMap=v951StockMap_();}catch(e){}
  products.forEach(function(r){
    if(!s_(r['Product ID']))return;
    ['B2C','B2B'].forEach(function(ch){
      let st='NOT LIVE';
      try{st=typeof v951EffectiveStatus_==='function'?v951EffectiveStatus_(r,ch,stockMap):(active_(r[ch+' Status'])?'LIVE':'NOT LIVE');}catch(e){}
      const bucket=ch==='B2C'?out.b2c:out.b2b;
      if(st==='OOS')bucket.oos++;else if(st==='LIVE')bucket.live++;else bucket.notLive++;
      if(st==='OOS'&&out.oosProducts.length<10)out.oosProducts.push({productId:s_(r['Product ID']),productName:s_(r['Product Name']),channel:ch});
    });
  });
  return out;
}
function getAdminOpsCommandCenterV964(email,pin){
  requireAdmin_(email,pin);
  const b2cOrders=v964Rows_(V8.SHEETS.ORDERS),b2bOrders=v964Rows_(V8.SHEETS.B2B_ORDERS);
  const onboarding=v964Rows_(V8.SHEETS.VENDOR_ONBOARD),vendors=v964Rows_(V8.SHEETS.B2B_VENDORS);
  const picker=v964Rows_(V8.SHEETS.PICKER_TASKS),routes=v964Rows_(V8.SHEETS.ROUTES),stops=v964Rows_(V8.SHEETS.STOPS);
  const tickets=v964Rows_(V8.SHEETS.SUPPORT);
  const vendorQuality=v964VendorQuality_(onboarding),products=v964ProductStatus_();
  const vendorFunnel={pending:0,approved:0,rejected:0,cancelled:0,other:0,activeVendors:vendors.filter(function(r){return active_(r.Status);}).length};
  onboarding.forEach(function(r){const x=v964Status_(r.Status);if(x==='PENDING')vendorFunnel.pending++;else if(x==='APPROVED')vendorFunnel.approved++;else if(x==='REJECTED')vendorFunnel.rejected++;else if(x==='CANCELLED')vendorFunnel.cancelled++;else vendorFunnel.other++;});
  const market=[v964MarketSummary_('Karnataka'),v964MarketSummary_('Tamil Nadu')];
  const metrics={
    openB2COrders:b2cOrders.filter(function(r){return v964OpenStatus_(r.Status);}).length,
    openB2BOrders:b2bOrders.filter(function(r){return v964OpenStatus_(r.Status);}).length,
    pendingPickerTasks:picker.filter(function(r){return v964OpenStatus_(r.Status);}).length,
    activeRoutes:routes.filter(function(r){return v964OpenStatus_(r.Status);}).length,
    pendingStops:stops.filter(function(r){return v964OpenStatus_(r.Status);}).length,
    openTickets:tickets.filter(function(r){return v964OpenStatus_(r.Status);}).length,
    pendingVendorApprovals:vendorFunnel.pending,
    activeVendors:vendorFunnel.activeVendors,
    vendorDataIssues:vendorQuality.issues.total,
    b2cOos:products.b2c.oos,b2bOos:products.b2b.oos
  };
  const blockers=[];
  function add(severity,title,detail,target){blockers.push({severity:severity,title:title,detail:detail,target:target||''});}
  if(metrics.openB2COrders)add('ACTION','B2C orders waiting',metrics.openB2COrders+' order(s) are not completed.','orders');
  if(metrics.openB2BOrders)add('ACTION','B2B orders waiting',metrics.openB2BOrders+' business order(s) are not completed.','orders');
  if(metrics.pendingPickerTasks)add('ACTION','Picking queue',metrics.pendingPickerTasks+' picker task(s) need action.','');
  if(metrics.pendingVendorApprovals)add('ACTION','Vendor approvals',metrics.pendingVendorApprovals+' onboarding(s) are pending approval.','');
  if(products.b2c.oos||products.b2b.oos)add('WARN','Products out of stock','B2C OOS '+products.b2c.oos+' • B2B OOS '+products.b2b.oos+'.','adminProductsPanel');
  market.forEach(function(m){if(!m.available||m.freshness==='STALE')add('WARN',m.state+' market rates '+(m.available?'stale':'missing'),m.available?('Latest source date '+m.rateDate+' ('+m.ageDays+' day(s) old).'):'No usable Tender Coconut market rate found.','');});
  if(vendorQuality.issues.total)add('WARN','Vendor data quality',vendorQuality.issues.total+' validation issue(s) detected in onboarding history.','');
  if(!blockers.length)add('GOOD','No immediate operational blockers','Core operational queues are clear.','');
  const pendingVendors=onboarding.filter(function(r){return v964Status_(r.Status)==='PENDING';}).sort(function(a,b){return new Date(b['Created At']||0)-new Date(a['Created At']||0);}).slice(0,8).map(function(r){return {onboardingId:s_(r['Onboarding ID']),businessName:s_(r['Business Name']),ownerName:s_(r['Owner Name']),area:s_(r.Area),dailyQty:n_(r['Expected Daily Qty']),agreedPrice:n_(r['Agreed Price']),createdAt:fmtDT_(r['Created At'])};});
  return {success:true,version:V964_ADMIN_OPS_VERSION,generatedAt:fmtDT_(new Date()),metrics:metrics,vendorFunnel:vendorFunnel,vendorQuality:vendorQuality,market:market,products:products,blockers:blockers,pendingVendors:pendingVendors,readOnly:true};
}
function getAdminOpsCommandCenterHealthV964(){return {ok:true,version:V964_ADMIN_OPS_VERSION,readOnly:true,adminAuth:true,vendorFunnel:true,marketFreshness:true,productStatus:true,dataQuality:true};}
