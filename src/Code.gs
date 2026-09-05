
/*******************************************************************************
 * NATIVE ELANEERU V8 — GOOGLE APPS SCRIPT ONLY
 * Sri Govindadri Ventures
 *
 * Master DB:
 * Native Elaneeru V8 - Fresh Operations
 *
 * Core:
 * B2C + B2B ordering
 * Separate B2B Driver + B2C Delivery Partner apps
 * Real-road route sequencing with Google Directions API (when configured)
 * B2B shop Check-in -> barcode verification -> Deliver -> Check-out
 * B2C Pickup/Deliver style workflow
 * Customer/vendor live map with anonymous stops-before-you
 *******************************************************************************/

const V8 = Object.freeze({
  VERSION: '8.2.0',
  BRAND: 'Native Elaneeru',
  COMPANY: 'Sri Govindadri Ventures',
  SPREADSHEET_ID: '1t42vRvte6Y9E0Eh8MACET8_ZC7x3eio5RLlhIeVGB-8',
  HUB: {name:'Native Elaneeru Hub', lat:12.814019310794777, lng:77.58816886989186},
  DELIVERY_RADIUS_KM: 3,
  CASHBACK_MAX_PERCENT: 20,
  WEEKLY_TARGET_QTY: 5,
  MONTHLY_TARGET_QTY: 20,
  WEEKLY_REWARD: 10,
  MONTHLY_REWARD: 25,
  SHEETS: {
    ORDERS:'Orders', ORDER_ITEMS:'Order_Items', CUSTOMERS:'Customers',
    B2B_VENDORS:'B2B_Vendors', B2B_ORDERS:'B2B_Orders', B2B_ORDER_ITEMS:'B2B_Order_Items',
    PRODUCTS:'Products', BANNERS:'Offers_Banners', B2B_TARGETS:'B2B_Targets',
    ROUTES:'Delivery_Routes', STOPS:'Route_Stops', DRIVERS:'Drivers', DRIVER_LIVE:'Driver_Live',
    DELIVERY_EVENTS:'Delivery_Events', BATCHES:'Coconut_Batches', ASSIGNMENTS:'Batch_Assignments',
    PICKER_TASKS:'Picker_Tasks', INVENTORY:'Inventory_Ledger', STAFF:'Staff_Users',
    VENDOR_ONBOARD:'Vendor_Onboarding', AUDIT:'Audit_Log', COLLECTIONS:'B2B_Collections',
    MARKET:'Market_Rates', PAYMENTS:'Payment_Ledger', SUPPORT:'Support_Tickets',
    FEEDBACK:'Feedback', VENDOR_PRICING:'Vendor_Pricing', CASHBACK:'Cashback_Ledger'
  }
});

function doGet(e){
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const routes={
    '':'index','home':'index','b2c':'index','b2b':'B2B',
    'admin':'Admin','sales':'Sales','picker':'Picker','barcode':'Barcode','inventory':'Inventory',
    'vendor':'VendorOnboarding','vendoronboarding':'VendorOnboarding',
    'b2bdriver':'Driver','driver':'Driver',
    'b2cdelivery':'Delivery','delivery':'Delivery',
    'routeplanner':'Admin'
  };
  const page=routes[p]||'index';
  return HtmlService.createTemplateFromFile(page).evaluate()
    .setTitle(V8.BRAND+' - '+(page==='index'?'B2C':page))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}

/* ---------------------------- setup / security ---------------------------- */

function setupNativeElaneeruV8(){
  const ss=ss_();
  const required=Object.values(V8.SHEETS);
  required.forEach(name=>{ if(!ss.getSheetByName(name)) ss.insertSheet(name); });
  seedProductsV8_();
  return 'Native Elaneeru V8 connected to Fresh Operations workbook. Set ADMIN_EMAIL, ADMIN_PIN_HASH and GOOGLE_MAPS_API_KEY in Script Properties.';
}
function hashV8_(v){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v||''))
    .map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}
function setV8AdminCredentials(email,pin){
  email=String(email||'').trim().toLowerCase();
  pin=String(pin||'').trim();
  if(!email||pin.length<4) throw new Error('Valid email and PIN are required.');
  PropertiesService.getScriptProperties().setProperties({ADMIN_EMAIL:email,ADMIN_PIN_HASH:hashV8_(pin)});
  return true;
}
function adminOk_(email,pin){
  const p=PropertiesService.getScriptProperties();
  const e=String(p.getProperty('ADMIN_EMAIL')||'').toLowerCase();
  const h=String(p.getProperty('ADMIN_PIN_HASH')||'');
  return !!e && e===String(email||'').trim().toLowerCase() && h===hashV8_(pin);
}
function adminLogin(email,pin){ return adminOk_(email,pin); }
function requireAdmin_(email,pin){ if(!adminOk_(email,pin)) throw new Error('Invalid admin credentials.'); }

/* ------------------------------- helpers --------------------------------- */

function ss_(){ return SpreadsheetApp.openById(V8.SPREADSHEET_ID); }
function sh_(name){ const s=ss_().getSheetByName(name); if(!s) throw new Error('Missing sheet: '+name); return s; }
function s_(v){ return v==null?'':String(v).trim(); }
function n_(v){ const x=Number(v); return isFinite(x)?x:0; }
function digits_(v){ return String(v||'').replace(/\D/g,'').slice(-10); }
function id_(prefix){ return prefix+Utilities.formatDate(new Date(),'Asia/Kolkata','yyMMddHHmmss')+'-'+Math.random().toString(36).slice(2,6).toUpperCase(); }
function now_(){ return new Date(); }
function isoDate_(d){ return Utilities.formatDate(d||new Date(),'Asia/Kolkata','yyyy-MM-dd'); }
function fmtDate_(d){ if(!d) return ''; const x=new Date(d); return isNaN(x)?s_(d):Utilities.formatDate(x,'Asia/Kolkata','dd MMM yyyy'); }
function fmtDT_(d){ if(!d) return ''; const x=new Date(d); return isNaN(x)?s_(d):Utilities.formatDate(x,'Asia/Kolkata','dd MMM yyyy, hh:mm a'); }
function rows_(name){
  const sh=sh_(name), lr=sh.getLastRow(), lc=sh.getLastColumn();
  if(lr<2||lc<1) return [];
  const vals=sh.getRange(1,1,lr,lc).getValues(), h=vals[0].map(s_);
  return vals.slice(1).map((r,i)=>{const o={_row:i+2};h.forEach((k,j)=>{if(k)o[k]=r[j]});return o;});
}
function map_(sh){ const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(s_); const m={}; h.forEach((x,i)=>m[x]=i+1); return m; }
function append_(name,obj){
  const sh=sh_(name), m=map_(sh), row=Array(sh.getLastColumn()).fill('');
  Object.keys(obj||{}).forEach(k=>{if(m[k]) row[m[k]-1]=obj[k]});
  sh.appendRow(row); return sh.getLastRow();
}
function set_(sh,row,m,k,v){ if(m[k]) sh.getRange(row,m[k]).setValue(v); }
function updateObj_(name,row,obj){
  const sh=sh_(name), m=map_(sh);
  Object.keys(obj||{}).forEach(k=>set_(sh,row,m,k,obj[k]));
}
function find_(name,field,value){
  const v=s_(value); return rows_(name).find(r=>s_(r[field])===v)||null;
}
function active_(v){ return ['ACTIVE','LIVE','YES','TRUE','1'].includes(s_(v).toUpperCase()); }
function haversine_(a,b){
  const R=6371, d2r=Math.PI/180, dlat=(b.lat-a.lat)*d2r, dlng=(b.lng-a.lng)*d2r;
  const q=Math.sin(dlat/2)**2+Math.cos(a.lat*d2r)*Math.cos(b.lat*d2r)*Math.sin(dlng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function safeRound_(x,p){ const n=Number(x); if(!isFinite(n))return 0; const z=10**(p||0); return Math.round(n*z)/z; }
function lockRun_(fn){ const l=LockService.getScriptLock(); l.waitLock(20000); try{return fn();}finally{l.releaseLock();} }


function safeImageUrl_(v){
  const x=s_(v);
  if(!x) return '';
  if(/^https?:\/\//i.test(x) || /^data:image\//i.test(x)) return x;
  return '';
}
function bannerActiveNow_(r){
  if(!active_(r.Status)) return false;
  const now=new Date();
  const from=s_(r['Start Date'])?new Date(r['Start Date']):null;
  const to=s_(r['End Date'])?new Date(r['End Date']+'T23:59:59'):null;
  if(from && !isNaN(from) && now<from) return false;
  if(to && !isNaN(to) && now>to) return false;
  return true;
}

/* ------------------------------- products -------------------------------- */

function seedProductsV8_(){
  const sh=sh_(V8.SHEETS.PRODUCTS); if(sh.getLastRow()>1) return;
  append_(V8.SHEETS.PRODUCTS,{'Product ID':'TC','Product Name':'Tender Coconut','Category':'Coconuts','Unit':'pc','B2C Price':50,'B2B Default Price':39,'B2C MOQ':1,'B2B MOQ':20,'Qty Step':1,'Bundle Qty 1':5,'Bundle Price 1':240,'Bundle Qty 2':10,'Bundle Price 2':475,'Barcode Required':'YES','B2C Status':'LIVE','B2B Status':'LIVE','Sort Order':1,'Created At':now_(),'Updated At':now_()});
  append_(V8.SHEETS.PRODUCTS,{'Product ID':'DC','Product Name':'Dehusked Coconut','Category':'Coconuts','Unit':'pc','B2C Price':40,'B2B Default Price':39,'B2C MOQ':1,'B2B MOQ':20,'Qty Step':1,'Bundle Qty 1':5,'Bundle Price 1':215,'Bundle Qty 2':10,'Bundle Price 2':425,'Barcode Required':'YES','B2C Status':'LIVE','B2B Status':'LIVE','Sort Order':2,'Created At':now_(),'Updated At':now_()});
}
function productRows_(){ return rows_(V8.SHEETS.PRODUCTS); }
function b2cPrice_(p,q){
  q=n_(q); const p2=n_(p['Bundle Qty 2']),p1=n_(p['Bundle Qty 1']);
  if(p2&&q===p2) return n_(p['Bundle Price 2'])/q;
  if(p1&&q===p1) return n_(p['Bundle Price 1'])/q;
  return n_(p['B2C Price']);
}
function getAppConfig(){
  const banners=rows_(V8.SHEETS.BANNERS).filter(r=>bannerActiveNow_(r)&&['','B2C','ALL'].includes(s_(r.Audience).toUpperCase())).sort((a,b)=>n_(a['Display Order'])-n_(b['Display Order'])).map(r=>({
    bannerId:s_(r['Banner ID']),title:s_(r.Title),subtitle:s_(r.Subtitle),offerText:s_(r['Offer Text']),imageUrl:safeImageUrl_(r['Image URL']),
    redirectType:s_(r['Redirect Type']),redirectValue:s_(r['Redirect Value']),productId:s_(r['Product ID'])
  }));
  const products=productRows_().filter(p=>active_(p['B2C Status'])).sort((a,b)=>n_(a['Sort Order'])-n_(b['Sort Order'])).map(p=>({
    productId:s_(p['Product ID']),productName:s_(p['Product Name']),category:s_(p.Category),unit:s_(p.Unit),price:n_(p['B2C Price']),
    offerQty1:n_(p['Bundle Qty 1']),offerPrice1:n_(p['Bundle Price 1']),offerQty2:n_(p['Bundle Qty 2']),offerPrice2:n_(p['Bundle Price 2']),
    status:s_(p['B2C Status']),displayOrder:n_(p['Sort Order']),imageUrl:safeImageUrl_(p['Image URL']),description:s_(p.Description||'')
  }));
  return {brand:V8.BRAND,parentCompany:V8.COMPANY,deliveryRadiusKm:V8.DELIVERY_RADIUS_KM,cashbackMaxPercent:V8.CASHBACK_MAX_PERCENT,
    weeklyTargetQty:V8.WEEKLY_TARGET_QTY,weeklyReward:V8.WEEKLY_REWARD,monthlyTargetQty:V8.MONTHLY_TARGET_QTY,monthlyReward:V8.MONTHLY_REWARD,
    hub:V8.HUB,pickupPoints:[{id:'HUB',name:V8.HUB.name,lat:V8.HUB.lat,lng:V8.HUB.lng}],products,banners,appVersion:V8.VERSION};
}

/* ------------------------------- B2C ------------------------------------- */

function lookupCustomerProfile(mobile){
  mobile=digits_(mobile); if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10 digit mobile number.');
  const c=rows_(V8.SHEETS.CUSTOMERS).find(x=>digits_(x.Mobile)===mobile);
  if(!c) return {exists:false,mobile};
  return {exists:true,customerId:s_(c['Customer ID']),mobile,name:s_(c.Name),address:s_(c.Address),area:s_(c.Area),landmark:'',latitude:c.Latitude||'',longitude:c.Longitude||''};
}
function saveCustomerProfile(p){
  return lockRun_(()=>{
    const mobile=digits_(p.mobile), name=s_(p.name), address=s_(p.address), area=s_(p.area);
    if(!/^[6-9]\d{9}$/.test(mobile)||!name||!address||!area) throw new Error('Name, mobile, address and area are required.');
    const all=rows_(V8.SHEETS.CUSTOMERS), hit=all.find(x=>digits_(x.Mobile)===mobile);
    if(hit) updateObj_(V8.SHEETS.CUSTOMERS,hit._row,{Name:name,Address:address,Area:area,Latitude:p.latitude===''?'':Number(p.latitude),Longitude:p.longitude===''?'':Number(p.longitude),Status:'ACTIVE','Updated At':now_()});
    else append_(V8.SHEETS.CUSTOMERS,{'Customer ID':'CUST-'+mobile,Name:name,Mobile:mobile,WhatsApp:mobile,Address:address,Area:area,Pincode:s_(p.pincode),Latitude:p.latitude===''?'':Number(p.latitude),Longitude:p.longitude===''?'':Number(p.longitude),'Cashback Balance':0,'Weekly Qty':0,'Monthly Qty':0,Status:'ACTIVE','Created At':now_(),'Updated At':now_()});
    return lookupCustomerProfile(mobile);
  });
}
function checkDeliveryLocation(lat,lng){
  lat=Number(lat);lng=Number(lng);if(!isFinite(lat)||!isFinite(lng))throw new Error('Invalid location.');
  const d=haversine_(V8.HUB,{lat,lng});
  return {eligible:d<=V8.DELIVERY_RADIUS_KM,distanceKm:safeRound_(d,2),radiusKm:V8.DELIVERY_RADIUS_KM};
}
function saveOrder(o){
  return lockRun_(()=>{
    const mobile=digits_(o.mobile), customer=rows_(V8.SHEETS.CUSTOMERS).find(x=>digits_(x.Mobile)===mobile);
    if(!customer) throw new Error('Please save your profile first.');
    const items=Array.isArray(o.items)?o.items:[]; if(!items.length) throw new Error('Cart is empty.');
    const products=productRows_(), lines=[]; let subtotal=0;
    items.forEach(i=>{
      const p=products.find(x=>s_(x['Product ID'])===s_(i.productId)&&active_(x['B2C Status'])); if(!p) throw new Error('Product unavailable: '+s_(i.productId));
      const q=Math.max(1,Math.floor(n_(i.quantity))), unit=b2cPrice_(p,q), line=unit*q; subtotal+=line;
      lines.push({p,q,unit,line});
    });
    const wallet=n_(customer['Cashback Balance']), maxUse=Math.min(wallet, subtotal*V8.CASHBACK_MAX_PERCENT/100), cashback=Math.max(0,Math.min(n_(o.cashbackUsed),maxUse));
    const total=Math.max(0,subtotal-cashback), orderId=id_('NEL-'), otp=String(Math.floor(1000+Math.random()*9000));
    const home=s_(o.fulfilmentType)==='Home Delivery';
    if(home){
      const loc=checkDeliveryLocation(o.latitude,o.longitude); if(!loc.eligible) throw new Error('Delivery location is outside '+V8.DELIVERY_RADIUS_KM+' KM radius.');
    }
    append_(V8.SHEETS.ORDERS,{'Order ID':orderId,'Ordered At':now_(),'Customer ID':s_(customer['Customer ID']),'Customer Name':s_(customer.Name),Mobile:mobile,WhatsApp:mobile,
      'Fulfilment Type':s_(o.fulfilmentType)||'Home Delivery',Address:s_(o.address),Area:s_(o.area),Pincode:s_(o.pincode),Latitude:o.latitude===''?'':Number(o.latitude),Longitude:o.longitude===''?'':Number(o.longitude),
      'Payment Type':s_(o.payment)||'COD','Payment Status':'PENDING',Subtotal:subtotal,'Delivery Fee':0,Discount:0,'Cashback Used':cashback,'Total Amount':total,Status:'Order Received',
      'Delivery OTP Hash':hashV8_(otp),'Delivery Slot':s_(o.timeSlot),'Source':'B2C WEB','Created At':now_(),'Updated At':now_()});
    lines.forEach(x=>append_(V8.SHEETS.ORDER_ITEMS,{'Item ID':id_('IT-'),'Order ID':orderId,'Product ID':s_(x.p['Product ID']),'Product Name':s_(x.p['Product Name']),Quantity:x.q,Unit:s_(x.p.Unit),'Unit Price':x.unit,'Line Amount':x.line,'Batch Required':s_(x.p['Barcode Required'])||'NO','Picked Qty':0,'Delivered Qty':0,Status:'OPEN','Created At':now_(),'Updated At':now_()}));
    if(cashback>0){
      const newBal=wallet-cashback; updateObj_(V8.SHEETS.CUSTOMERS,customer._row,{'Cashback Balance':newBal,'Updated At':now_()});
      append_(V8.SHEETS.CASHBACK,{'Transaction ID':id_('CB-'),'Created At':now_(),'Customer ID':s_(customer['Customer ID']),Mobile:mobile,'Order ID':orderId,'Entry Type':'DEBIT',Credit:0,Debit:cashback,'Balance After':newBal,Scheme:'ORDER','Description':'Cashback used','Created By':'SYSTEM'});
    }
    return {success:true,orderId,finalAmount:total,status:'Order Received',deliveryOtp:otp,whatsappStatus:'Queued'};
  });
}
function customerOrders_(mobile){
  const os=rows_(V8.SHEETS.ORDERS).filter(o=>digits_(o.Mobile)===digits_(mobile)).sort((a,b)=>new Date(b['Ordered At'])-new Date(a['Ordered At']));
  const items=rows_(V8.SHEETS.ORDER_ITEMS);
  return os.map(o=>({orderId:s_(o['Order ID']),date:fmtDT_(o['Ordered At']),amount:n_(o['Total Amount']),status:s_(o.Status),fulfilment:s_(o['Fulfilment Type']),payment:s_(o['Payment Type']),
    items:items.filter(i=>s_(i['Order ID'])===s_(o['Order ID'])).map(i=>({name:s_(i['Product Name']),qty:n_(i.Quantity),lineTotal:n_(i['Line Amount'])}))}));
}
function getCustomerTargets(mobile){
  const delivered=rows_(V8.SHEETS.ORDERS).filter(o=>digits_(o.Mobile)===digits_(mobile)&&s_(o.Status)==='Delivered');
  const item=rows_(V8.SHEETS.ORDER_ITEMS); const now=new Date();
  const monday=new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-((now.getDay()+6)%7));
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  function qtySince(d){ const ids=new Set(delivered.filter(o=>new Date(o['Ordered At'])>=d).map(o=>s_(o['Order ID']))); return item.filter(i=>ids.has(s_(i['Order ID']))&&s_(i['Product ID'])==='TC').reduce((a,b)=>a+n_(b.Quantity),0); }
  const w=qtySince(monday),m=qtySince(monthStart);
  return {weekly:{achieved:w,target:V8.WEEKLY_TARGET_QTY,status:w>=V8.WEEKLY_TARGET_QTY?'Completed':'In Progress',reward:V8.WEEKLY_REWARD},monthly:{achieved:m,target:V8.MONTHLY_TARGET_QTY,status:m>=V8.MONTHLY_TARGET_QTY?'Completed':'In Progress',reward:V8.MONTHLY_REWARD}};
}
function getCustomerDashboard(mobile){
  const c=rows_(V8.SHEETS.CUSTOMERS).find(x=>digits_(x.Mobile)===digits_(mobile)); if(!c) throw new Error('Customer not found.');
  const ord=customerOrders_(mobile), t=getCustomerTargets(mobile);
  return {customer:{name:s_(c.Name),mobile:digits_(c.Mobile),cashback:n_(c['Cashback Balance']),totalOrders:ord.length,deliveredOrders:ord.filter(x=>x.status==='Delivered').length},weekly:t.weekly,monthly:t.monthly,orders:ord.slice(0,20)};
}
function createSupportTicket(p){
  const id=id_('TKT-'); append_(V8.SHEETS.SUPPORT,{'Ticket ID':id,'Created At':now_(),'Party Type':'B2C','Party ID':digits_(p.mobile),'Order ID':s_(p.orderId),Category:s_(p.category||p.l1),'Subject':s_(p.issue||p.l2),'Description':s_(p.summary),Priority:'NORMAL',Status:'OPEN','Updated At':now_()}); return {success:true,ticketId:id};
}
function getSupportTickets(mobile){ return rows_(V8.SHEETS.SUPPORT).filter(x=>s_(x['Party ID'])===digits_(mobile)).map(x=>({ticketId:s_(x['Ticket ID']),createdAt:fmtDT_(x['Created At']),l1:s_(x.Category),l2:s_(x.Subject),summary:s_(x.Description),orderId:s_(x['Order ID']),status:s_(x.Status),priority:s_(x.Priority),lastUpdated:fmtDT_(x['Updated At']),resolution:s_(x.Resolution)})); }

/* ------------------------------ B2B -------------------------------------- */

function vendorLogin(mobile,pin){
  mobile=digits_(mobile); const v=rows_(V8.SHEETS.B2B_VENDORS).find(x=>digits_(x.Mobile)===mobile&&active_(x.Status));
  if(!v||s_(v['PIN Hash'])!==hashV8_(pin)) throw new Error('Invalid mobile or PIN.');
  const token=Utilities.getUuid(), cache=CacheService.getScriptCache(); cache.put('VENDOR:'+token,s_(v['Vendor ID']),21600);
  updateObj_(V8.SHEETS.B2B_VENDORS,v._row,{'Updated At':now_()});
  return {token,vendorId:s_(v['Vendor ID'])};
}
function vendorLogout(token){ CacheService.getScriptCache().remove('VENDOR:'+s_(token)); return true; }
function vendor_(token){
  const id=CacheService.getScriptCache().get('VENDOR:'+s_(token)); if(!id) throw new Error('Session has expired. Please login again.');
  const v=find_(V8.SHEETS.B2B_VENDORS,'Vendor ID',id); if(!v||!active_(v.Status)) throw new Error('Vendor is inactive or unavailable.');
  return v;
}
function b2bProducts_(vendorId){
  const all=productRows_().filter(p=>active_(p['B2B Status'])), prs=rows_(V8.SHEETS.VENDOR_PRICING);
  return all.map(p=>{
    const now=new Date(), ov=prs.find(x=>s_(x['Vendor ID'])===vendorId&&s_(x['Product ID'])===s_(p['Product ID'])&&active_(x.Status)&&(!x['Valid From']||new Date(x['Valid From'])<=now)&&(!x['Valid To']||new Date(x['Valid To'])>=now));
    return {productId:s_(p['Product ID']),productName:s_(p['Product Name']),unit:s_(p.Unit),price:ov?n_(ov['Agreed Price']):n_(p['B2B Default Price']),moq:ov?n_(ov.MOQ):n_(p['B2B MOQ']),qtyStep:ov?n_(ov['Qty Step']):n_(p['Qty Step'])||1,imageUrl:safeImageUrl_(p['Image URL']),status:'LIVE'};
  });
}
function b2bTarget_(vendorId){
  const now=new Date(), ts=rows_(V8.SHEETS.B2B_TARGETS).filter(t=>s_(t['Vendor ID'])===vendorId&&active_(t.Status)&&(!t['Start Date']||new Date(t['Start Date'])<=now)&&(!t['End Date']||new Date(t['End Date'])>=now));
  if(!ts.length)return null; const t=ts.sort((a,b)=>new Date(b['Start Date']||0)-new Date(a['Start Date']||0))[0], start=new Date(t['Start Date']||new Date(now.getFullYear(),now.getMonth(),1)), end=new Date(t['End Date']||new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59));
  const ids=new Set(rows_(V8.SHEETS.B2B_ORDERS).filter(o=>s_(o['Vendor ID'])===vendorId&&!['Cancelled'].includes(s_(o.Status))&&new Date(o['Ordered At'])>=start&&new Date(o['Ordered At'])<=end).map(o=>s_(o['Order ID'])));
  const q=rows_(V8.SHEETS.B2B_ORDER_ITEMS).filter(i=>ids.has(s_(i['Order ID']))).reduce((a,b)=>a+n_(b.Quantity),0), target=n_(t['Target Qty']);
  return {targetId:s_(t['Target ID']),name:s_(t['Target Name'])||'Business Target',startDate:fmtDate_(start),endDate:fmtDate_(end),targetQty:target,achievedQty:q,remainingQty:Math.max(0,target-q),percent:target?Math.min(100,Math.round(q*100/target)):0,rewardText:s_(t['Reward Text']),status:q>=target&&target>0?'COMPLETED':'ACTIVE'};
}
function getB2BAppData(token){
  const v=vendor_(token), vid=s_(v['Vendor ID']), items=rows_(V8.SHEETS.B2B_ORDER_ITEMS);
  const orders=rows_(V8.SHEETS.B2B_ORDERS).filter(o=>s_(o['Vendor ID'])===vid).sort((a,b)=>new Date(b['Ordered At'])-new Date(a['Ordered At'])).slice(0,50).map(o=>({orderId:s_(o['Order ID']),orderedAt:fmtDT_(o['Ordered At']),amount:n_(o['Total Amount']),status:s_(o.Status),paymentType:s_(o['Payment Type']),items:items.filter(i=>s_(i['Order ID'])===s_(o['Order ID'])).map(i=>({productName:s_(i['Product Name']),quantity:n_(i.Quantity)}))}));
  const banners=rows_(V8.SHEETS.BANNERS).filter(r=>active_(r.Status)&&['','B2B','ALL'].includes(s_(r.Audience).toUpperCase())).map(r=>({id:s_(r['Banner ID']),title:s_(r.Title),subtitle:s_(r.Subtitle),offerText:s_(r['Offer Text']),imageUrl:safeImageUrl_(r['Image URL'])}));
  return {brand:V8.BRAND,parentCompany:V8.COMPANY,vendor:{vendorId:vid,businessName:s_(v['Business Name']),ownerName:s_(v['Owner Name']),mobile:digits_(v.Mobile),area:s_(v.Area),address:s_(v.Address),paymentType:s_(v['Payment Type']),creditLimit:n_(v['Credit Limit']),outstanding:n_(v.Outstanding),availableCredit:Math.max(0,n_(v['Credit Limit'])-n_(v.Outstanding))},products:b2bProducts_(vid),orders,marketRates:getAllLatestMarketRates(),banners,target:b2bTarget_(vid)};
}
function placeB2BOrder(token,p){
  return lockRun_(()=>{
    const v=vendor_(token), vid=s_(v['Vendor ID']), products=b2bProducts_(vid), req=Array.isArray(p.items)?p.items:[]; if(!req.length)throw new Error('Cart is empty.');
    let subtotal=0; const lines=[];
    req.forEach(i=>{const x=products.find(z=>z.productId===s_(i.productId)); if(!x)throw new Error('Product unavailable.'); const q=Math.floor(n_(i.quantity)); if(q<x.moq)throw new Error(x.productName+' MOQ is '+x.moq); if(x.qtyStep>1&&q%x.qtyStep)throw new Error(x.productName+' quantity must be in steps of '+x.qtyStep); const line=q*x.price;subtotal+=line;lines.push({x,q,line});});
    const pay=s_(p.paymentType||v['Payment Type']).toUpperCase(), total=subtotal+n_(p.deliveryCharge), credit=pay==='CREDIT'?total:0;
    if(credit>Math.max(0,n_(v['Credit Limit'])-n_(v.Outstanding))) throw new Error('Available credit is insufficient.');
    const id=id_('NEB2B-'),otp=String(Math.floor(1000+Math.random()*9000)),after=n_(v.Outstanding)+credit;
    append_(V8.SHEETS.B2B_ORDERS,{'Order ID':id,'Ordered At':now_(),'Vendor ID':vid,'Business Name':s_(v['Business Name']),'Owner Name':s_(v['Owner Name']),Mobile:digits_(v.Mobile),Address:s_(p.deliveryAddress||v.Address),Area:s_(p.area||v.Area),Pincode:s_(v.Pincode),Latitude:v.Latitude,Longitude:v.Longitude,'Payment Type':pay,'Payment Status':pay==='CREDIT'?'DUE':'PENDING',Subtotal:subtotal,Discount:0,'Total Amount':total,'Outstanding Before':n_(v.Outstanding),'Outstanding After':after,Status:'Order Received','Delivery OTP Hash':hashV8_(otp),'Delivery Slot':s_(p.deliverySlot),'Priority':'NORMAL','Source':'B2B WEB','Created At':now_(),'Updated At':now_()});
    lines.forEach(z=>append_(V8.SHEETS.B2B_ORDER_ITEMS,{'Item ID':id_('BI-'),'Order ID':id,'Product ID':z.x.productId,'Product Name':z.x.productName,Quantity:z.q,Unit:z.x.unit,'Unit Price':z.x.price,'Line Amount':z.line,'Batch Required':'YES','Picked Qty':0,'Delivered Qty':0,Status:'OPEN','Created At':now_(),'Updated At':now_()}));
    if(credit) updateObj_(V8.SHEETS.B2B_VENDORS,v._row,{Outstanding:after,'Updated At':now_()});
    return {success:true,orderId:id,amount:total,status:'Order Received',deliveryOtp:otp};
  });
}
function getAllLatestMarketRates(){
  return rows_(V8.SHEETS.MARKET).filter(x=>s_(x.Commodity).toLowerCase().includes('tender')).sort((a,b)=>new Date(b['Source Date']||b['Captured At'])-new Date(a['Source Date']||a['Captured At'])).slice(0,20).map(r=>({market:s_(r.Market),district:s_(r.District),state:s_(r.State),minRate:n_(r['Min Price']),maxRate:n_(r['Max Price']),modalRate:n_(r['Modal Price']),rateUnit:s_(r.Unit),source:s_(r.Source),rateDate:fmtDate_(r['Source Date'])}));
}

/* ----------------------------- route engine ------------------------------- */

function googleKey_(){ return String(PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_API_KEY')||'').trim(); }
function routeApiChunk_(origin, points){
  if(!points.length) return {ordered:[],legs:[],polyline:'',source:'EMPTY'};
  const key=googleKey_(); if(!key) throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
  let destIndex=0, far=-1; points.forEach((p,i)=>{const d=haversine_(origin,p);if(d>far){far=d;destIndex=i}});
  const dest=points[destIndex], way=points.filter((_,i)=>i!==destIndex);
  const wp=way.length?'optimize:true|'+way.map(p=>p.lat+','+p.lng).join('|'):'';
  const qs=['origin='+encodeURIComponent(origin.lat+','+origin.lng),'destination='+encodeURIComponent(dest.lat+','+dest.lng),'mode=driving','departure_time=now','traffic_model=best_guess','key='+encodeURIComponent(key)];
  if(wp)qs.splice(2,0,'waypoints='+encodeURIComponent(wp));
  const url='https://maps.googleapis.com/maps/api/directions/json?'+qs.join('&');
  const r=JSON.parse(UrlFetchApp.fetch(url,{muteHttpExceptions:true}).getContentText());
  if(r.status!=='OK'||!r.routes||!r.routes.length) throw new Error('Google route error: '+s_(r.status)+' '+s_(r.error_message));
  const rt=r.routes[0], order=(rt.waypoint_order||[]).map(i=>way[i]).concat([dest]);
  const legs=(rt.legs||[]).map(l=>({km:n_(l.distance&&l.distance.value)/1000,min:n_(l.duration_in_traffic&&l.duration_in_traffic.value||l.duration&&l.duration.value)/60}));
  return {ordered:order,legs,polyline:s_(rt.overview_polyline&&rt.overview_polyline.points),source:'GOOGLE_DIRECTIONS'};
}
function fallbackOrder_(origin,points){
  const left=points.slice(),ordered=[],legs=[]; let cur=origin;
  while(left.length){let bi=0,bd=Infinity;left.forEach((p,i)=>{const d=haversine_(cur,p);if(d<bd){bd=d;bi=i}});const x=left.splice(bi,1)[0];ordered.push(x);legs.push({km:bd,min:bd/20*60});cur=x;}
  return {ordered,legs,polyline:'',source:'HAVERSINE_FALLBACK'};
}
function optimizeRoad_(origin,points){
  if(points.length<=25){try{return routeApiChunk_(origin,points)}catch(e){return fallbackOrder_(origin,points)}}
  let left=points.slice(),cur=origin,all=[],legs=[],polys=[],src='GOOGLE_DIRECTIONS_CHUNKED';
  while(left.length){
    left.sort((a,b)=>haversine_(cur,a)-haversine_(cur,b)); const group=left.splice(0,25);
    let r; try{r=routeApiChunk_(cur,group)}catch(e){r=fallbackOrder_(cur,group);src='MIXED_FALLBACK'}
    all=all.concat(r.ordered);legs=legs.concat(r.legs);if(r.polyline)polys.push(r.polyline);if(r.ordered.length)cur=r.ordered[r.ordered.length-1];
  }
  return {ordered:all,legs,polyline:polys.join('||'),source:src};
}
function routeCandidates_(date,routeType){
  routeType=s_(routeType).toUpperCase(); const name=routeType==='B2B'?V8.SHEETS.B2B_ORDERS:V8.SHEETS.ORDERS;
  return rows_(name).filter(o=>{
    if(['Delivered','Cancelled'].includes(s_(o.Status)))return false;
    if(!o.Latitude||!o.Longitude)return false;
    if(o['Assigned Route ID'])return false;
    const d=isoDate_(new Date(o['Ordered At'])); return !date||d===date;
  }).map(o=>({order:o,lat:Number(o.Latitude),lng:Number(o.Longitude),orderId:s_(o['Order ID']),partyId:routeType==='B2B'?s_(o['Vendor ID']):s_(o['Customer ID']),name:s_(o['Business Name']||o['Customer Name']),mobile:digits_(o.Mobile),address:s_(o.Address),requiredQty:orderQty_(routeType,o['Order ID']),priority:s_(o.Priority)||'NORMAL',slot:s_(o['Delivery Slot'])}));
}
function orderQty_(type,orderId){
  const name=s_(type).toUpperCase()==='B2B'?V8.SHEETS.B2B_ORDER_ITEMS:V8.SHEETS.ORDER_ITEMS;
  return rows_(name).filter(i=>s_(i['Order ID'])===s_(orderId)).reduce((a,b)=>a+n_(b.Quantity),0);
}
function generateRouteForDay(email,pin,date,routeType,driverId){
  requireAdmin_(email,pin); routeType=s_(routeType).toUpperCase(); if(!['B2B','B2C'].includes(routeType))throw new Error('Route Type must be B2B or B2C.');
  const d=find_(V8.SHEETS.DRIVERS,'Driver ID',driverId); if(!d||!active_(d.Status))throw new Error('Driver not active.');
  const points=routeCandidates_(date,routeType); if(!points.length)throw new Error('No unassigned orders with valid GPS found for '+date+'.');
  const optimized=optimizeRoad_(V8.HUB,points), routeId=id_((routeType==='B2B'?'RB-':'RC-')), start=new Date(); let totalKm=0,totalMin=0;
  optimized.legs.forEach(l=>{totalKm+=n_(l.km);totalMin+=n_(l.min)});
  append_(V8.SHEETS.ROUTES,{'Route ID':routeId,'Route Date':date,'Route Type':routeType,'Driver ID':driverId,'Vehicle Number':s_(d['Vehicle Number']),'Hub Latitude':V8.HUB.lat,'Hub Longitude':V8.HUB.lng,'Total Stops':optimized.ordered.length,'Completed Stops':0,'Total Road KM':safeRound_(totalKm,2),'Estimated Minutes':Math.round(totalMin),'Optimization Source':optimized.source,Status:'PLANNED','Created At':now_(),'Updated At':now_(),'Route Polyline':optimized.polyline,'API Status':optimized.source});
  let etaMs=start.getTime(), prev=V8.HUB;
  optimized.ordered.forEach((p,i)=>{
    const leg=optimized.legs[i]||{km:haversine_(prev,p),min:haversine_(prev,p)/20*60}; etaMs+=n_(leg.min)*60000; const stopId=id_('ST-');
    append_(V8.SHEETS.STOPS,{'Stop ID':stopId,'Route ID':routeId,'Route Type':routeType,'Stop Sequence':i+1,'Order Type':routeType,'Order ID':p.orderId,'Customer/Vendor ID':p.partyId,'Display Name':p.name,Mobile:p.mobile,Address:p.address,Latitude:p.lat,Longitude:p.lng,'Required Qty':p.requiredQty,'Assigned Batch Qty':0,'Delivered Qty':0,'Road Distance From Previous KM':safeRound_(leg.km,2),'Travel Time From Previous Min':Math.round(leg.min),'Planned ETA':new Date(etaMs),'Tracking Visible':'FALSE',Status:'PENDING',Priority:p.priority,'Time Slot':p.slot});
    const orderSheet=routeType==='B2B'?V8.SHEETS.B2B_ORDERS:V8.SHEETS.ORDERS;
    updateObj_(orderSheet,p.order._row,{'Assigned Route ID':routeId,'Assigned Driver ID':driverId,'Route Stop ID':stopId,Status:'Assigned','Updated At':now_()});
    prev=p;
  });
  updateObj_(V8.SHEETS.DRIVERS,d._row,{'Current Route ID':routeId,'Current Stop ID':s_(findNextStop_(routeId)&&findNextStop_(routeId)['Stop ID']),'Updated At':now_()});
  audit_('ROUTE','GENERATE','Delivery_Routes',routeId,s_(email),'','Type '+routeType+' stops '+optimized.ordered.length);
  return {success:true,routeId,routeType,totalStops:optimized.ordered.length,totalRoadKm:safeRound_(totalKm,2),estimatedMinutes:Math.round(totalMin),optimizationSource:optimized.source};
}
function findNextStop_(routeId){ return rows_(V8.SHEETS.STOPS).filter(x=>s_(x['Route ID'])===routeId&&!['COMPLETED','CANCELLED'].includes(s_(x.Status).toUpperCase())).sort((a,b)=>n_(a['Stop Sequence'])-n_(b['Stop Sequence']))[0]||null; }

/* ----------------------------- driver auth -------------------------------- */

function driverAuth_(mobile,pin,type){
  mobile=digits_(mobile); const d=rows_(V8.SHEETS.DRIVERS).find(x=>digits_(x.Mobile)===mobile&&active_(x.Status));
  if(!d||s_(d['PIN Hash'])!==hashV8_(pin))throw new Error('Invalid driver mobile or PIN.');
  const allowed=s_(d['Delivery Type']).toUpperCase(); type=s_(type).toUpperCase();
  if(type&&allowed!=='BOTH'&&allowed!==type)throw new Error('This driver is not enabled for '+type+' deliveries.');
  updateObj_(V8.SHEETS.DRIVERS,d._row,{'Last Login':now_(),'Updated At':now_()}); return d;
}
function driverLoginV8(mobile,pin,type){ const d=driverAuth_(mobile,pin,type); return {success:true,driverId:s_(d['Driver ID']),name:s_(d['Driver Name']),deliveryType:s_(d['Delivery Type']),vehicle:s_(d['Vehicle Number'])}; }
function getDriverDayRouteV8(mobile,pin,type,date){
  const d=driverAuth_(mobile,pin,type), driverId=s_(d['Driver ID']), routes=rows_(V8.SHEETS.ROUTES).filter(r=>s_(r['Driver ID'])===driverId&&s_(r['Route Type'])===s_(type).toUpperCase()&&(!date||s_(r['Route Date'])===date)&&!['COMPLETED','CANCELLED'].includes(s_(r.Status).toUpperCase())).sort((a,b)=>new Date(b['Created At'])-new Date(a['Created At']));
  if(!routes.length)return {driver:{driverId,name:s_(d['Driver Name']),vehicle:s_(d['Vehicle Number'])},route:null,stops:[]};
  const r=routes[0], stops=rows_(V8.SHEETS.STOPS).filter(x=>s_(x['Route ID'])===s_(r['Route ID'])).sort((a,b)=>n_(a['Stop Sequence'])-n_(b['Stop Sequence'])).map(x=>({stopId:s_(x['Stop ID']),sequence:n_(x['Stop Sequence']),orderType:s_(x['Order Type']),orderId:s_(x['Order ID']),name:s_(x['Display Name']),mobile:digits_(x.Mobile),address:s_(x.Address),lat:n_(x.Latitude),lng:n_(x.Longitude),requiredQty:n_(x['Required Qty']),assignedQty:n_(x['Assigned Batch Qty']),deliveredQty:n_(x['Delivered Qty']),roadKm:n_(x['Road Distance From Previous KM']),travelMin:n_(x['Travel Time From Previous Min']),eta:fmtDT_(x['Planned ETA']),checkInAt:fmtDT_(x['Check In At']),deliveredAt:fmtDT_(x['Delivered At']),checkOutAt:fmtDT_(x['Check Out At']),trackingVisible:active_(x['Tracking Visible']),status:s_(x.Status),priority:s_(x.Priority),timeSlot:s_(x['Time Slot'])}));
  return {driver:{driverId,name:s_(d['Driver Name']),vehicle:s_(d['Vehicle Number'])},route:{routeId:s_(r['Route ID']),date:s_(r['Route Date']),type:s_(r['Route Type']),status:s_(r.Status),totalStops:n_(r['Total Stops']),completedStops:n_(r['Completed Stops']),roadKm:n_(r['Total Road KM']),estimatedMinutes:n_(r['Estimated Minutes']),optimizationSource:s_(r['Optimization Source'])},stops};
}
function checkCurrentStop_(d,stopId){
  const st=find_(V8.SHEETS.STOPS,'Stop ID',stopId); if(!st)throw new Error('Stop not found.');
  const r=find_(V8.SHEETS.ROUTES,'Route ID',st['Route ID']); if(!r||s_(r['Driver ID'])!==s_(d['Driver ID']))throw new Error('This stop is not assigned to you.');
  const next=findNextStop_(s_(r['Route ID'])); if(next&&s_(next['Stop ID'])!==s_(stopId))throw new Error('Complete Stop '+s_(next['Stop Sequence'])+' before this stop.');
  return st;
}
function driverCheckInV8(mobile,pin,type,stopId,lat,lng){
  const d=driverAuth_(mobile,pin,type), st=checkCurrentStop_(d,stopId);
  updateObj_(V8.SHEETS.STOPS,st._row,{'Check In At':now_(),'Tracking Visible':'TRUE',Status:'CHECKED_IN'});
  updateObj_(V8.SHEETS.DRIVERS,d._row,{'Current Route ID':s_(st['Route ID']),'Current Stop ID':stopId,'Updated At':now_()});
  event_(st,d,'CHECK_IN',lat,lng,'',0,'');
  updateOrderDeliveryStatus_(st,'Reached');
  return {success:true};
}
function driverScanBarcodeV8(mobile,pin,type,stopId,barcode){
  return lockRun_(()=>{
    const d=driverAuth_(mobile,pin,type),st=checkCurrentStop_(d,stopId); if(!st['Check In At'])throw new Error('Check in first.');
    barcode=s_(barcode); const batch=rows_(V8.SHEETS.BATCHES).find(b=>s_(b.Barcode)===barcode); if(!batch)throw new Error('Barcode not found.');
    const as=rows_(V8.SHEETS.ASSIGNMENTS).find(a=>s_(a['Batch ID'])===s_(batch['Batch ID'])&&s_(a['Order ID'])===s_(st['Order ID'])&&s_(a['Order Type'])===s_(st['Order Type'])&&!['CANCELLED'].includes(s_(a.Status).toUpperCase()));
    if(!as)throw new Error('This batch is not assigned to '+s_(st['Display Name'])+' / '+s_(st['Order ID'])+'.');
    if(n_(as['Scanned Qty'])>=n_(as['Assigned Qty']))return {success:true,duplicate:true,message:'Batch already verified.',scannedQty:n_(as['Scanned Qty'])};
    updateObj_(V8.SHEETS.ASSIGNMENTS,as._row,{'Scanned Qty':n_(as['Assigned Qty']),Status:'SCANNED','Updated At':now_()});
    const scanned=rows_(V8.SHEETS.ASSIGNMENTS).filter(a=>s_(a['Order ID'])===s_(st['Order ID'])&&s_(a['Order Type'])===s_(st['Order Type'])).reduce((q,a)=>q+n_(a['Scanned Qty']),0);
    updateObj_(V8.SHEETS.STOPS,st._row,{'Assigned Batch Qty':scanned,'Barcode Verified At':scanned>=n_(st['Required Qty'])?now_():'',Status:scanned>=n_(st['Required Qty'])?'BARCODE_VERIFIED':'CHECKED_IN'});
    event_(st,d,'BARCODE_SCAN','','',barcode,n_(as['Assigned Qty']),'');
    return {success:true,batchId:s_(batch['Batch ID']),scannedQty:scanned,requiredQty:n_(st['Required Qty']),verified:scanned>=n_(st['Required Qty'])};
  });
}
function driverDeliverV8(mobile,pin,type,stopId,otp,lat,lng,remarks){
  return lockRun_(()=>{
    const d=driverAuth_(mobile,pin,type), st=checkCurrentStop_(d,stopId); if(!st['Check In At'])throw new Error('Check in first.');
    if(s_(type).toUpperCase()==='B2B'&&n_(st['Assigned Batch Qty'])<n_(st['Required Qty']))throw new Error('Barcode verification incomplete: '+n_(st['Assigned Batch Qty'])+'/'+n_(st['Required Qty'])+'.');
    const orderSheet=s_(st['Order Type'])==='B2B'?V8.SHEETS.B2B_ORDERS:V8.SHEETS.ORDERS, order=find_(orderSheet,'Order ID',st['Order ID']); if(!order)throw new Error('Order not found.');
    if(order['Delivery OTP Hash']&&s_(order['Delivery OTP Hash'])!==hashV8_(otp))throw new Error('Incorrect delivery OTP.');
    updateObj_(V8.SHEETS.STOPS,st._row,{'Delivered Qty':n_(st['Required Qty']),'Delivered At':now_(),Status:'DELIVERED'});
    updateObj_(orderSheet,order._row,{Status:'Delivered','Payment Status':s_(order['Payment Type']).toUpperCase()==='COD'?'COLLECTED':s_(order['Payment Status']),'Updated At':now_()});
    if(s_(st['Order Type'])==='B2B'){
      rows_(V8.SHEETS.ASSIGNMENTS).filter(a=>s_(a['Order Type'])==='B2B'&&s_(a['Order ID'])===s_(st['Order ID'])&&!['CANCELLED','DELIVERED'].includes(s_(a.Status).toUpperCase())).forEach(a=>{
        const delivered=Math.min(n_(a['Assigned Qty']),n_(a['Scanned Qty'])||n_(a['Assigned Qty']));
        updateObj_(V8.SHEETS.ASSIGNMENTS,a._row,{'Delivered Qty':delivered,Status:'DELIVERED','Updated At':now_()});
        const batch=find_(V8.SHEETS.BATCHES,'Batch ID',a['Batch ID']);
        if(batch){
          const reserved=Math.max(0,n_(batch['Reserved Qty'])-delivered), totalDelivered=n_(batch['Delivered Qty'])+delivered;
          updateObj_(V8.SHEETS.BATCHES,batch._row,{'Reserved Qty':reserved,'Delivered Qty':totalDelivered,Status:n_(batch['Available Qty'])>0?'AVAILABLE':(reserved>0?'RESERVED':'DELIVERED'),'Updated At':now_()});
        }
        append_(V8.SHEETS.INVENTORY,{'Movement ID':id_('MOV-'),'Created At':now_(),'Product ID':s_(a['Product ID']),'Product Name':s_(find_(V8.SHEETS.PRODUCTS,'Product ID',a['Product ID'])?.['Product Name']||a['Product ID']),Location:'HUB','Movement Type':'DELIVERY OUT','Qty In':0,'Qty Out':delivered,'Reference Type':'ORDER','Reference ID':s_(st['Order ID']),'Batch ID':s_(a['Batch ID']),Reason:'B2B delivery completed','User ID':s_(d['Driver ID'])});
      });
    }
    event_(st,d,'DELIVERED',lat,lng,'',n_(st['Required Qty']),remarks);
    return {success:true};
  });
}
function driverCheckOutV8(mobile,pin,type,stopId,lat,lng){
  return lockRun_(()=>{
    const d=driverAuth_(mobile,pin,type), st=checkCurrentStop_(d,stopId); if(!st['Delivered At'])throw new Error('Mark delivery completed before check-out.');
    updateObj_(V8.SHEETS.STOPS,st._row,{'Check Out At':now_(),'Tracking Visible':'FALSE',Status:'COMPLETED'});
    event_(st,d,'CHECK_OUT',lat,lng,'',0,'');
    const route=find_(V8.SHEETS.ROUTES,'Route ID',st['Route ID']), all=rows_(V8.SHEETS.STOPS).filter(x=>s_(x['Route ID'])===s_(st['Route ID'])), done=all.filter(x=>s_(x.Status).toUpperCase()==='COMPLETED').length, next=findNextStop_(s_(st['Route ID']));
    if(route) updateObj_(V8.SHEETS.ROUTES,route._row,{'Completed Stops':done,Status:done>=all.length?'COMPLETED':'ACTIVE','Updated At':now_()});
    updateObj_(V8.SHEETS.DRIVERS,d._row,{'Current Stop ID':next?s_(next['Stop ID']):'','Current Route ID':next?s_(st['Route ID']):'','Updated At':now_()});
    stopLive_(s_(d['Driver ID']),s_(st['Route ID']),s_(st['Stop ID']));
    return {success:true,nextStopId:next?s_(next['Stop ID']):'',routeCompleted:!next};
  });
}
function updateDriverLiveV8(mobile,pin,type,stopId,lat,lng,accuracy,heading){
  const d=driverAuth_(mobile,pin,type), st=checkCurrentStop_(d,stopId); lat=Number(lat);lng=Number(lng); if(!isFinite(lat)||!isFinite(lng))throw new Error('Invalid GPS.');
  const live=rows_(V8.SHEETS.DRIVER_LIVE).filter(x=>s_(x['Driver ID'])===s_(d['Driver ID'])&&s_(x['Route ID'])===s_(st['Route ID'])&&s_(x.Status)==='ACTIVE').sort((a,b)=>new Date(b['Updated At'])-new Date(a['Updated At']))[0];
  const obj={'Driver ID':s_(d['Driver ID']),'Route ID':s_(st['Route ID']),'Stop ID':stopId,'Order Type':s_(st['Order Type']),'Order ID':s_(st['Order ID']),Latitude:lat,Longitude:lng,'Accuracy M':n_(accuracy),Heading:n_(heading),'Updated At':now_(),Status:'ACTIVE'};
  if(live)updateObj_(V8.SHEETS.DRIVER_LIVE,live._row,obj);else append_(V8.SHEETS.DRIVER_LIVE,Object.assign({'Live ID':id_('LIVE-')},obj));
  return {success:true};
}
function stopLive_(driverId,routeId,stopId){ rows_(V8.SHEETS.DRIVER_LIVE).filter(x=>s_(x['Driver ID'])===driverId&&s_(x['Route ID'])===routeId&&s_(x.Status)==='ACTIVE').forEach(x=>updateObj_(V8.SHEETS.DRIVER_LIVE,x._row,{Status:'STOPPED','Updated At':now_()})); }
function event_(st,d,type,lat,lng,barcode,qty,remarks){ append_(V8.SHEETS.DELIVERY_EVENTS,{'Event ID':id_('EV-'),'Event At':now_(),'Route ID':s_(st['Route ID']),'Stop ID':s_(st['Stop ID']),'Order Type':s_(st['Order Type']),'Order ID':s_(st['Order ID']),'Driver ID':s_(d['Driver ID']),'Event Type':type,Latitude:lat===''?'':Number(lat),Longitude:lng===''?'':Number(lng),Barcode:s_(barcode),Quantity:n_(qty),Remarks:s_(remarks),'Created By':s_(d['Driver ID'])}); }
function updateOrderDeliveryStatus_(st,status){ const name=s_(st['Order Type'])==='B2B'?V8.SHEETS.B2B_ORDERS:V8.SHEETS.ORDERS, o=find_(name,'Order ID',st['Order ID']); if(o)updateObj_(name,o._row,{Status:status,'Updated At':now_()}); }

/* ------------------------------ live map --------------------------------- */

function liveForOrder_(type,orderId){
  const stop=rows_(V8.SHEETS.STOPS).find(x=>s_(x['Order Type'])===type&&s_(x['Order ID'])===s_(orderId)); if(!stop)return {active:false,message:'Delivery route has not been generated yet.'};
  if(!active_(stop['Tracking Visible'])||['COMPLETED','CANCELLED'].includes(s_(stop.Status).toUpperCase()))return {active:false,closed:s_(stop.Status).toUpperCase()==='COMPLETED',message:s_(stop.Status).toUpperCase()==='COMPLETED'?'Delivery completed.':'Live tracking will appear when the driver starts this route.'};
  const routeId=s_(stop['Route ID']), routeStops=rows_(V8.SHEETS.STOPS).filter(x=>s_(x['Route ID'])===routeId).sort((a,b)=>n_(a['Stop Sequence'])-n_(b['Stop Sequence'])), current=routeStops.find(x=>!['COMPLETED','CANCELLED'].includes(s_(x.Status).toUpperCase()))||stop;
  const live=rows_(V8.SHEETS.DRIVER_LIVE).filter(x=>s_(x['Route ID'])===routeId&&s_(x.Status)==='ACTIVE').sort((a,b)=>new Date(b['Updated At'])-new Date(a['Updated At']))[0];
  if(!live)return {active:false,message:'Waiting for driver live location…'};
  const age=Math.round((Date.now()-new Date(live['Updated At']).getTime())/1000); if(age>180)return {active:false,message:'Driver location is temporarily unavailable.'};
  const seq=n_(stop['Stop Sequence']), cur=n_(current['Stop Sequence']), before=Math.max(0,seq-cur);
  const anon=routeStops.filter(x=>n_(x['Stop Sequence'])>=cur&&n_(x['Stop Sequence'])<seq&&!['COMPLETED','CANCELLED'].includes(s_(x.Status).toUpperCase())).map((x,i)=>({label:'Stop '+(i+1),lat:safeRound_(x.Latitude,3),lng:safeRound_(x.Longitude,3)}));
  return {active:true,lat:n_(live.Latitude),lng:n_(live.Longitude),accuracy:n_(live['Accuracy M']),heading:n_(live.Heading),updatedAt:fmtDT_(live['Updated At']),ageSeconds:age,stopsBefore:before,eta:fmtDT_(stop['Planned ETA']),destination:{lat:n_(stop.Latitude),lng:n_(stop.Longitude)},anonymousStops:anon,routeId};
}
function getCustomerLiveTracking(mobile,orderId){ const o=rows_(V8.SHEETS.ORDERS).find(x=>s_(x['Order ID'])===s_(orderId)&&digits_(x.Mobile)===digits_(mobile)); if(!o)throw new Error('Order not found.'); return liveForOrder_('B2C',orderId); }
function getVendorLiveTracking(token,orderId){ const v=vendor_(token),o=rows_(V8.SHEETS.B2B_ORDERS).find(x=>s_(x['Order ID'])===s_(orderId)&&s_(x['Vendor ID'])===s_(v['Vendor ID'])); if(!o)throw new Error('Order not found.'); return liveForOrder_('B2B',orderId); }

/* ---------------------------- barcode / picker ---------------------------- */

function createV7Batch(productId,qty,createdBy){
  return lockRun_(()=>{const p=find_(V8.SHEETS.PRODUCTS,'Product ID',productId);if(!p)throw new Error('Product not found.');qty=Math.floor(n_(qty));if(qty<=0)throw new Error('Quantity must be greater than 0.');const batch=id_('BAT-'),barcode='NE-'+s_(productId)+'-'+Utilities.formatDate(new Date(),'Asia/Kolkata','yyMMdd')+'-'+Math.random().toString(36).slice(2,7).toUpperCase();append_(V8.SHEETS.BATCHES,{'Batch ID':batch,Barcode:barcode,'Product ID':s_(p['Product ID']),'Product Name':s_(p['Product Name']),'Original Qty':qty,'Available Qty':qty,'Reserved Qty':0,'Delivered Qty':0,Location:'HUB','Picker ID':s_(createdBy),Printed:'NO',Status:'AVAILABLE','Created At':now_(),'Updated At':now_()});return {success:true,batchId:batch,barcode,qty,productName:s_(p['Product Name'])};});
}
function getV7Batches(){return rows_(V8.SHEETS.BATCHES).slice(-200).reverse();}
function assignV7Batch(batchId,orderType,orderId,qty,user){
  return lockRun_(()=>{
    const type=s_(orderType).toUpperCase();
    if(!['B2B','B2C'].includes(type)) throw new Error('Order type must be B2B or B2C.');
    const b=find_(V8.SHEETS.BATCHES,'Batch ID',batchId); if(!b) throw new Error('Batch not found.');
    const orderSheet=type==='B2B'?V8.SHEETS.B2B_ORDERS:V8.SHEETS.ORDERS;
    const itemSheet=type==='B2B'?V8.SHEETS.B2B_ORDER_ITEMS:V8.SHEETS.ORDER_ITEMS;
    const order=find_(orderSheet,'Order ID',orderId); if(!order) throw new Error('Order ID not found in '+type+' orders.');
    const productId=s_(b['Product ID']);
    const lines=rows_(itemSheet).filter(x=>s_(x['Order ID'])===s_(orderId)&&s_(x['Product ID'])===productId);
    if(!lines.length) throw new Error('This batch product is not part of order '+s_(orderId)+'.');
    const required=lines.reduce((a,x)=>a+n_(x.Quantity),0);
    const already=rows_(V8.SHEETS.ASSIGNMENTS).filter(a=>s_(a['Order Type'])===type&&s_(a['Order ID'])===s_(orderId)&&s_(a['Product ID'])===productId&&!['CANCELLED'].includes(s_(a.Status).toUpperCase())).reduce((a,x)=>a+n_(x['Assigned Qty']),0);
    qty=Math.floor(n_(qty));
    if(qty<=0) throw new Error('Assignment quantity must be greater than 0.');
    if(qty>n_(b['Available Qty'])) throw new Error('Only '+n_(b['Available Qty'])+' units are available in this batch.');
    if(already+qty>required) throw new Error('Cannot over-assign. Order needs '+required+' units; '+already+' already assigned.');
    const stop=rows_(V8.SHEETS.STOPS).find(x=>s_(x['Order Type'])===type&&s_(x['Order ID'])===s_(orderId));
    append_(V8.SHEETS.ASSIGNMENTS,{'Assignment ID':id_('ASN-'),'Assigned At':now_(),'Batch ID':batchId,Barcode:s_(b.Barcode),'Order Type':type,'Order ID':s_(orderId),'Stop ID':stop?s_(stop['Stop ID']):'','Product ID':productId,'Assigned Qty':qty,'Scanned Qty':0,'Delivered Qty':0,'Assigned By':s_(user),Status:'ASSIGNED','Updated At':now_()});
    updateObj_(V8.SHEETS.BATCHES,b._row,{'Available Qty':n_(b['Available Qty'])-qty,'Reserved Qty':n_(b['Reserved Qty'])+qty,Status:n_(b['Available Qty'])-qty<=0?'RESERVED':'AVAILABLE','Updated At':now_()});
    return {success:true,requiredQty:required,assignedTotal:already+qty,remainingToAssign:Math.max(0,required-already-qty)};
  });
}
function staffLoginV81_(mobile,pin,role){
  mobile=digits_(mobile); role=s_(role).toUpperCase();
  const u=rows_(V8.SHEETS.STAFF).find(x=>digits_(x.Mobile)===mobile&&active_(x.Status)&&(!role||s_(x.Role).toUpperCase()===role));
  if(!u||s_(u['PIN Hash'])!==hashV8_(pin)) throw new Error('Invalid '+(role||'staff')+' mobile or PIN.');
  updateObj_(V8.SHEETS.STAFF,u._row,{'Last Login':now_(),'Updated At':now_()});
  return {staffId:s_(u['Staff ID']),name:s_(u.Name),mobile:digits_(u.Mobile),role:s_(u.Role)};
}
function setupDemoAccessV81(){
  const sh=sh_(V8.SHEETS.STAFF), all=rows_(V8.SHEETS.STAFF);
  const demos=[
    {id:'STF-PICKER-DEMO',name:'Demo Picker',mobile:'9000000005',pin:'2222',role:'PICKER',app:'PICKER'},
    {id:'STF-SALES-DEMO',name:'Demo Sales Executive',mobile:'9000000006',pin:'3333',role:'SALES',app:'VENDOR_ONBOARDING'}
  ];
  demos.forEach(d=>{
    const hit=all.find(x=>s_(x['Staff ID'])===d.id||digits_(x.Mobile)===d.mobile);
    const obj={'Staff ID':d.id,Name:d.name,Mobile:d.mobile,'PIN Hash':hashV8_(d.pin),Role:d.role,'Allowed App':d.app,Status:'ACTIVE','Updated At':now_()};
    if(hit) updateObj_(V8.SHEETS.STAFF,hit._row,obj); else append_(V8.SHEETS.STAFF,Object.assign(obj,{'Created At':now_()}));
  });
  return {picker:{mobile:'9000000005',pin:'2222'},sales:{mobile:'9000000006',pin:'3333'},note:'Demo access only. Disable before production.'};
}
function getV7PickerDashboard(mobile,pin){
  const user=staffLoginV81_(mobile,pin,'PICKER');
  const tasks=rows_(V8.SHEETS.PICKER_TASKS).filter(t=>!s_(t['Picker ID'])||s_(t['Picker ID'])===user.staffId).slice(-300).reverse();
  return {user,tasks,batches:rows_(V8.SHEETS.BATCHES).slice(-100).reverse()};
}
function updateV7PickerTask(mobile,pin,taskId,action,notes){
  const user=staffLoginV81_(mobile,pin,'PICKER');
  const t=find_(V8.SHEETS.PICKER_TASKS,'Task ID',taskId); if(!t)throw new Error('Task not found.');
  const a=s_(action).toUpperCase(); let status=a;
  if(a==='START') status='PICKING'; if(a==='COMPLETE'||a==='PACKED') status='COMPLETED';
  const upd={Status:status,Notes:s_(notes),'Picker ID':user.staffId,'Updated At':now_()};
  if(status==='PICKING'&&!t['Started At']) upd['Started At']=now_();
  if(status==='COMPLETED') upd['Completed At']=now_();
  updateObj_(V8.SHEETS.PICKER_TASKS,t._row,upd); return {success:true,status};
}
function getInventoryDashboardV81(email,pin){
  requireAdmin_(email,pin);
  const products=productRows_().map(p=>({id:s_(p['Product ID']),name:s_(p['Product Name']),unit:s_(p.Unit)||'pc'}));
  const rows=rows_(V8.SHEETS.INVENTORY), sum={};
  rows.forEach(r=>{const k=s_(r['Product ID'])+'|'+(s_(r.Location)||'HUB');sum[k]=(sum[k]||0)+n_(r['Qty In'])-n_(r['Qty Out'])});
  const balances=Object.entries(sum).map(([k,qty])=>{const [productId,location]=k.split('|');const p=products.find(x=>x.id===productId);return {productId,productName:p?p.name:productId,location,qty};});
  const totalOnHand=balances.reduce((a,b)=>a+n_(b.qty),0);
  return {products,balances,movements:rows.slice(-250).reverse(),summary:{totalOnHand,locations:new Set(balances.map(x=>x.location)).size,products:products.length}};
}
function getV7Inventory(email,pin){ return getInventoryDashboardV81(email,pin); }
function addStockMovementV81(email,pin,p){
  requireAdmin_(email,pin); const productId=s_(p.productId), product=find_(V8.SHEETS.PRODUCTS,'Product ID',productId); if(!product)throw new Error('Select a valid product.');
  const qty=Math.floor(Math.abs(n_(p.qty))); if(qty<=0)throw new Error('Quantity must be greater than 0.');
  const type=s_(p.movementType).toUpperCase(), inbound=type.includes(' IN')||type.endsWith('IN')||type==='PURCHASE';
  append_(V8.SHEETS.INVENTORY,{'Movement ID':id_('MOV-'),'Created At':now_(),'Product ID':productId,'Product Name':s_(product['Product Name']),Location:s_(p.location)||'HUB','Movement Type':type,'Qty In':inbound?qty:0,'Qty Out':inbound?0:qty,'Reference Type':'MANUAL','Reference ID':s_(p.referenceId),Reason:s_(p.reason),'User ID':String(email||'').toLowerCase()});
  return {success:true};
}
function addV7StockMovement(email,pin,p){ return addStockMovementV81(email,pin,p); }
function getBarcodeConsoleV81(email,pin){
  requireAdmin_(email,pin);
  return {products:productRows_().filter(p=>active_(p['B2C Status'])||active_(p['B2B Status'])).map(p=>({id:s_(p['Product ID']),name:s_(p['Product Name'])})),batches:rows_(V8.SHEETS.BATCHES).slice(-250).reverse(),assignments:rows_(V8.SHEETS.ASSIGNMENTS).slice(-250).reverse()};
}
function createBatchV81(email,pin,p){
  requireAdmin_(email,pin); const r=createV7Batch(s_(p.productId),p.qty,email); if(s_(p.location)&&s_(p.location)!=='HUB'){const b=find_(V8.SHEETS.BATCHES,'Batch ID',r.batchId);if(b)updateObj_(V8.SHEETS.BATCHES,b._row,{Location:s_(p.location),'Updated At':now_()});}
  const b=find_(V8.SHEETS.BATCHES,'Batch ID',r.batchId); return {success:true,batch:b||{Barcode:r.barcode,'Batch ID':r.batchId,'Product Name':r.productName,'Original Qty':r.qty}};
}
function assignBatchV81(email,pin,p){
  requireAdmin_(email,pin); const key=s_(p.barcodeOrBatch), b=rows_(V8.SHEETS.BATCHES).find(x=>s_(x.Barcode)===key||s_(x['Batch ID'])===key); if(!b)throw new Error('Batch / barcode not found.');
  const qty=Math.floor(n_(p.qty)); if(qty<=0)throw new Error('Enter assignment quantity.');
  assignV7Batch(s_(b['Batch ID']),s_(p.orderType),s_(p.orderId),qty,email);
  const fresh=find_(V8.SHEETS.BATCHES,'Batch ID',s_(b['Batch ID'])); return {success:true,assignedQty:qty,remainingAfter:n_(fresh['Available Qty'])};
}
function markBatchPrintedV81(email,pin,batchId){requireAdmin_(email,pin);const b=find_(V8.SHEETS.BATCHES,'Batch ID',batchId);if(!b)throw new Error('Batch not found.');updateObj_(V8.SHEETS.BATCHES,b._row,{Printed:'YES','Updated At':now_()});return {success:true};}

/* -------------------------- vendor onboarding ----------------------------- */
function submitV7VendorOnboarding(p){
  p=p||{}; const business=s_(p.businessName), owner=s_(p.ownerName), mobile=digits_(p.mobile), area=s_(p.area);
  if(!business||!owner||!/^[6-9]\d{9}$/.test(mobile)||!area) throw new Error('Business name, owner, valid mobile and area are required.');
  const id=id_('ONB-'); append_(V8.SHEETS.VENDOR_ONBOARD,{'Onboarding ID':id,'Created At':now_(),'Sales Executive':s_(p.salesExecutive),'Business Name':business,'Owner Name':owner,Mobile:mobile,WhatsApp:digits_(p.whatsapp||mobile),'Vendor Type':s_(p.vendorType),Area:area,Address:s_(p.address),Pincode:s_(p.pincode),Latitude:p.latitude===''?'':Number(p.latitude),Longitude:p.longitude===''?'':Number(p.longitude),'Expected Daily Qty':n_(p.expectedDailyQty),'Current Buying Price':n_(p.currentBuyingPrice),'Agreed Price':n_(p.agreedPrice),MOQ:n_(p.moq)||20,'Delivery Frequency':s_(p.deliveryFrequency),'Preferred Time':s_(p.preferredTime),'Payment Mode':s_(p.paymentMode)||'COD','Credit Days':n_(p.creditDays),'Credit Limit':n_(p.creditLimit),'Planned Start Date':s_(p.plannedStartDate),Remarks:s_(p.remarks),Status:'PENDING','Updated At':now_()});return {success:true,onboardingId:id};
}
function salesStaffLoginV81(mobile,pin){ return staffLoginV81_(mobile,pin,'SALES'); }
function submitVendorOnboardingV82(mobile,pin,p){
  const u=staffLoginV81_(mobile,pin,'SALES');
  p=p||{}; p.salesExecutive=u.name+' ('+u.staffId+')';
  const r=submitV7VendorOnboarding(p);
  return Object.assign({salesExecutive:u.name},r);
}


function getSystemHealthV82(email,pin){
  requireAdmin_(email,pin);
  const routes=['index','B2B','Admin','Delivery','Driver','Sales','Picker','VendorOnboarding','Barcode','Inventory'];
  const sheetState={};
  Object.values(V8.SHEETS).forEach(name=>{
    const sh=ss_().getSheetByName(name);
    sheetState[name]=!!sh;
  });
  return {version:V8.VERSION,spreadsheetId:V8.SPREADSHEET_ID,allSheetsReady:Object.values(sheetState).every(Boolean),sheets:sheetState,routes:routes};
}

/* ----------------------------- sales/admin -------------------------------- */
function getV7SalesDashboard(email,pin){
  requireAdmin_(email,pin);
  const bo=rows_(V8.SHEETS.B2B_ORDERS), co=rows_(V8.SHEETS.ORDERS), vendors=rows_(V8.SHEETS.B2B_VENDORS);
  const all=[...bo.map(o=>({type:'B2B',date:o['Ordered At'],amount:n_(o['Total Amount']),status:s_(o.Status),area:s_(o.Area)})),...co.map(o=>({type:'B2C',date:o['Ordered At'],amount:n_(o['Total Amount']),status:s_(o.Status),area:s_(o.Area)}))];
  const valid=all.filter(x=>s_(x.status).toUpperCase()!=='CANCELLED');
  const delivered=all.filter(x=>['DELIVERED','COMPLETED'].includes(s_(x.status).toUpperCase())).length;
  const dailyMap={}, areaMap={}; valid.forEach(x=>{const d=isoDate_(new Date(x.date||new Date()));dailyMap[d]=(dailyMap[d]||0)+x.amount;const a=x.area||'Unknown';areaMap[a]=(areaMap[a]||0)+x.amount});
  const revenue=valid.reduce((a,b)=>a+b.amount,0);
  return {version:V8.VERSION,metrics:{revenue,orders:all.length,b2b:bo.length,b2c:co.length,pending:all.length-delivered-all.filter(x=>s_(x.status).toUpperCase()==='CANCELLED').length,delivered},vendors:{active:vendors.filter(v=>active_(v.Status)).length,total:vendors.length,outstanding:vendors.reduce((a,b)=>a+n_(b.Outstanding),0)},daily:Object.entries(dailyMap).sort().slice(-30).map(([date,revenue])=>({date,revenue})),areas:Object.entries(areaMap).map(([area,revenue])=>({area,revenue})).sort((a,b)=>b.revenue-a.revenue)};
}
function getAdminDashboard(email,pin,start,end){
  requireAdmin_(email,pin); const from=start?new Date(start+'T00:00:00'):new Date(0),to=end?new Date(end+'T23:59:59'):new Date(8640000000000000);
  const os=rows_(V8.SHEETS.ORDERS).filter(o=>{const d=new Date(o['Ordered At']);return d>=from&&d<=to}),items=rows_(V8.SHEETS.ORDER_ITEMS),cust=rows_(V8.SHEETS.CUSTOMERS),feedback=rows_(V8.SHEETS.FEEDBACK),tickets=rows_(V8.SHEETS.SUPPORT),drivers=rows_(V8.SHEETS.DRIVERS);
  const mapped=os.map(o=>({orderId:s_(o['Order ID']),status:s_(o.Status),amount:n_(o['Total Amount']),name:s_(o['Customer Name']),mobile:digits_(o.Mobile),fulfilment:s_(o['Fulfilment Type']),payment:s_(o['Payment Type']),address:s_(o.Address),area:s_(o.Area),landmark:'',deliveryDate:'',slot:s_(o['Delivery Slot']),location:o.Latitude&&o.Longitude?'https://www.google.com/maps?q='+o.Latitude+','+o.Longitude:'',items:items.filter(i=>s_(i['Order ID'])===s_(o['Order ID'])).map(i=>({name:s_(i['Product Name']),qty:n_(i.Quantity),lineTotal:n_(i['Line Amount'])})),assignedPartnerId:s_(o['Assigned Driver ID'])}));
  const prod={};mapped.forEach(o=>o.items.forEach(i=>prod[i.name]=(prod[i.name]||0)+i.qty)); const sales=mapped.filter(o=>o.status!=='Cancelled').reduce((a,b)=>a+b.amount,0);
  return {metrics:{sales,orders:mapped.length,productsSold:Object.values(prod).reduce((a,b)=>a+b,0),delivered:mapped.filter(o=>o.status==='Delivered').length,pending:mapped.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length,cancelled:mapped.filter(o=>o.status==='Cancelled').length,aov:mapped.length?sales/mapped.length:0,openTickets:tickets.filter(t=>['OPEN','IN PROGRESS'].includes(s_(t.Status).toUpperCase())).length,activePartners:drivers.filter(d=>active_(d.Status)).length},productSales:prod,orders:mapped,customers:cust.map(c=>({name:s_(c.Name),mobile:digits_(c.Mobile),orders:rows_(V8.SHEETS.ORDERS).filter(o=>digits_(o.Mobile)===digits_(c.Mobile)).length,delivered:rows_(V8.SHEETS.ORDERS).filter(o=>digits_(o.Mobile)===digits_(c.Mobile)&&s_(o.Status)==='Delivered').length,wallet:n_(c['Cashback Balance']),value:rows_(V8.SHEETS.ORDERS).filter(o=>digits_(o.Mobile)===digits_(c.Mobile)&&s_(o.Status)!=='Cancelled').reduce((a,b)=>a+n_(b['Total Amount']),0),lastOrder:fmtDT_(c['Last Order At'])})),feedback:feedback.map(f=>({orderId:s_(f['Order ID']),mobile:s_(f['Party ID']),rating:n_(f.Rating),feedback:s_(f.Comments),submittedAt:fmtDT_(f['Created At'])})),tickets:tickets.map(t=>({ticketId:s_(t['Ticket ID']),createdAt:fmtDT_(t['Created At']),name:s_(t['Party ID']),mobile:s_(t['Party ID']),orderId:s_(t['Order ID']),l1:s_(t.Category),l2:s_(t.Subject),summary:s_(t.Description),status:s_(t.Status),priority:s_(t.Priority),resolution:s_(t.Resolution),lastUpdated:fmtDT_(t['Updated At'])})),partners:drivers.map(d=>({partnerId:s_(d['Driver ID']),name:s_(d['Driver Name']),mobile:digits_(d.Mobile),vehicle:s_(d['Vehicle Number']),status:s_(d.Status),availability:active_(d.Status)?'AVAILABLE':'OFF DUTY',activeDeliveries:d['Current Route ID']?1:0})),assignments:[],autoAssignment:false};
}
function updateOrderStatus(email,pin,orderId,status){requireAdmin_(email,pin);const o=find_(V8.SHEETS.ORDERS,'Order ID',orderId);if(!o)throw new Error('Order not found.');updateObj_(V8.SHEETS.ORDERS,o._row,{Status:s_(status),'Updated At':now_()});return {success:true};}
function updateSupportTicket(email,pin,ticketId,status,priority,resolution){requireAdmin_(email,pin);const t=find_(V8.SHEETS.SUPPORT,'Ticket ID',ticketId);if(!t)throw new Error('Ticket not found.');updateObj_(V8.SHEETS.SUPPORT,t._row,{Status:s_(status).toUpperCase(),Priority:s_(priority).toUpperCase(),Resolution:s_(resolution),'Resolved At':['RESOLVED','CLOSED'].includes(s_(status).toUpperCase())?now_():'','Updated At':now_()});return {success:true};}
function createDeliveryPartnerAdmin(email,pin,name,mobile,driverPin,vehicle){requireAdmin_(email,pin);const id=id_('DRV-');append_(V8.SHEETS.DRIVERS,{'Driver ID':id,'Driver Name':s_(name),Mobile:digits_(mobile),'PIN Hash':hashV8_(driverPin),'Delivery Type':'B2C','Vehicle Number':s_(vehicle),'Vehicle Type':'Two/Three Wheeler','Capacity Qty':500,Status:'ACTIVE','Created At':now_(),'Updated At':now_()});return {success:true,partnerId:id};}
function updateDeliveryPartnerAdmin(email,pin,id,status,availability,vehicle){requireAdmin_(email,pin);const d=find_(V8.SHEETS.DRIVERS,'Driver ID',id);if(!d)throw new Error('Driver not found.');updateObj_(V8.SHEETS.DRIVERS,d._row,{Status:s_(status),'Vehicle Number':s_(vehicle),'Updated At':now_()});return {success:true};}
function setAutoAssignment(email,pin,on){requireAdmin_(email,pin);return {success:true,enabled:false,message:'V8 uses route generation instead of single-order auto assignment.'};}
function assignDeliveryPartner(email,pin,orderId,driverId){requireAdmin_(email,pin);const o=find_(V8.SHEETS.ORDERS,'Order ID',orderId);if(!o)throw new Error('Order not found.');updateObj_(V8.SHEETS.ORDERS,o._row,{'Assigned Driver ID':driverId,'Updated At':now_()});return {success:true};}
function autoAssignOrderAdmin(email,pin,orderId){requireAdmin_(email,pin);return {success:false,reason:'Use Route Planner to generate the real-road sequence.'};}

/* Legacy delivery calls are intentionally redirected to V8 route apps. */
function deliveryLogin(){ throw new Error('Use the B2C Delivery or B2B Driver app in V8.'); }
function getDeliveryDashboard(){ return {assignments:[]}; }
function updateMyAvailability(){ return {success:true}; }
function confirmDeliveryPickup(){ throw new Error('Use V8 delivery app.'); }
function updateDeliveryStatus(){ throw new Error('Use V8 delivery app.'); }
function confirmFinalDelivery(){ throw new Error('Use V8 delivery app.'); }

/* ------------------------------- audit ----------------------------------- */
function audit_(module,action,refType,refId,user,oldVal,newVal){append_(V8.SHEETS.AUDIT,{'Audit ID':id_('AUD-'),'Created At':now_(),Module:module,Action:action,'Reference Type':refType,'Reference ID':refId,'User ID':user,'Old Value':oldVal,'New Value':newVal});}
