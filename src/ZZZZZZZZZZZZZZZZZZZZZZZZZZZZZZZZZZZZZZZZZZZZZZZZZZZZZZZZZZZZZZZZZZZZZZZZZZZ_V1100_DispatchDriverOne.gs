/**
 * Native Elaneeru V11.0.0 — Route Dispatcher + Driver One (staging).
 *
 * Scope
 *  - Dispatcher (Admin or OPERATIONS staff) uploads Excel/CSV rows
 *    `Customer Name | Phone Number | Lat | Long` (+ optional columns),
 *    previews server-side validation, then creates a route assigned to a driver.
 *  - Driver One (driver's own phone) signs in with the existing Drivers sheet PIN,
 *    sees only their own routes, confirms vehicle load, starts the trip,
 *    checks in with GPS, records full/partial/failed delivery, returns,
 *    Cash/UPI collections and closes the trip with stock + cash reconciliation.
 *
 * Hard rules
 *  - NO delivery OTP anywhere in this flow.
 *  - NO invoice generation or printing in Driver One.
 *  - No invented road distance / ETA: sequence is labelled MANUAL_FILE_ORDER or
 *    STRAIGHT_LINE_NEAREST_NEIGHBOUR and KM/ETA columns are left blank.
 *  - Collections are recorded as DRIVER_ENTERED (cash) or PROOF_SUBMITTED (UPI);
 *    they are never treated as received funds until an admin validates them.
 *
 * Isolation from the existing V8 driver app
 *  - Routes/stops use Route Type 'B2B_D1' and API Status 'DRIVER_ONE_V1100', so the
 *    legacy Driver page (which filters Route Type === 'B2B') never shows them and
 *    the legacy OTP/barcode handlers are never reached.
 *  - Stop Order Type is 'MANUAL' (or the supplied order reference). No B2B_Orders
 *    row is created or modified by this file.
 *  - New tabs (additive only): D1_Imports, D1_Stop_Terms, D1_Collections.
 *  - Stock: when a trip is finally CLOSED (directly, or after supervisor approval) the
 *    delivered quantity and any approved transit variance are posted once to
 *    Inventory_Ledger (Reference Type D1_ROUTE). Coconut_Batches are not changed here;
 *    batch/bunch allocation arrives with bunch-barcode loading.
 *  - Sign-in once with PIN, then a 6-hour sliding session token (14-hour cap);
 *    5 wrong PINs lock that account for 15 minutes.
 *
 * All helpers end in '_' so anonymous HtmlService visitors cannot call them via
 * google.script.run. Every public function authenticates first.
 */
const V1100_VERSION='11.0.0';
const V1100_MARKER='DRIVER_ONE_V1100';
const V1100_ROUTE_TYPE='B2B_D1';
const V1100_MAX_ROWS=200;
const V1100_SHEETS=Object.freeze({IMPORTS:'D1_Imports',TERMS:'D1_Stop_Terms',COLLECTIONS:'D1_Collections'});
const V1100_HEADERS=Object.freeze({
  D1_Imports:['Import ID','Import Key','Route ID','Route Date','Driver ID','File Name','Rows Total','Rows Accepted','Rows Rejected','Sequence Mode','Created By','Created At','Status'],
  D1_Stop_Terms:['Stop ID','Route ID','Import ID','Source Row','Amount Due','Outcome','Returned Qty','Remarks','Created At','Updated At'],
  D1_Collections:['Collection ID','Request ID','Route ID','Stop ID','Order ID','Driver ID','Method','Amount','UPI Reference','Status','Entered At','Latitude','Longitude','Validated By','Validated At','Notes']
});
const V1100_RESOLVED=Object.freeze(['DELIVERED','PARTIAL','FAILED','CANCELLED']);
const V1100_ALIASES=Object.freeze({
  name:['customername','name','vendorname','shopname','businessname','customer','vendor'],
  phone:['phonenumber','phone','mobile','mobilenumber','contact','contactnumber','phoneno','mobileno'],
  lat:['lat','latitude'],
  lng:['long','longitude','lng','lon'],
  qty:['quantity','qty','requiredqty','coconuts','units','orderqty'],
  amount:['amount','orderamount','ordervalue','value','total','amountdue'],
  address:['address','area','location','landmark'],
  orderId:['orderid','orderno','ordernumber','orderref','order'],
  deliveryDate:['deliverydate','date','promiseddate'],
  timeWindow:['timewindow','window','timeslot','slot','promisedtime'],
  priority:['priority'],
  remarks:['remarks','notes','note','comment','comments']
});

/* ------------------------------------------------------------------ security */

// The admin-credential guard ships separately in V1050_AdminCredentialGuard.gs (PR #42).
// Sessions: PINs are sent once at sign-in; later calls carry a short-lived random token.
// Five wrong PINs for the same mobile/email lock that account for 15 minutes.
const V1100_SESSION_TTL_S=6*3600;          // sliding: renewed on each use (CacheService maximum)
const V1100_SESSION_MAX_MS=14*3600*1000;   // absolute cap for one shift
const V1100_MAX_FAILS=5,V1100_LOCK_S=900;
function v1100Cache_(){return CacheService.getScriptCache();}
function v1100Guard_(key,fn){
  const c=v1100Cache_(),fk='d1fail:'+key,fails=Number(c.get(fk)||0);
  if(fails>=V1100_MAX_FAILS)throw new Error('Too many wrong PINs. Try again in 15 minutes or ask operations to reset your PIN.');
  try{const out=fn();c.remove(fk);return out;}
  catch(e){if(/Invalid/i.test(String(e&&e.message)))c.put(fk,String(fails+1),V1100_LOCK_S);throw e;}
}
function v1100NewSession_(role,id,actor){
  const token=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');
  const rec={role,id:s_(id),actor:s_(actor),exp:Date.now()+V1100_SESSION_MAX_MS};
  v1100Cache_().put('d1s:'+hashV8_(token),JSON.stringify(rec),V1100_SESSION_TTL_S);
  return token;
}
function v1100Session_(token,role){
  const t=s_(token);
  if(!/^[a-f0-9]{64}$/.test(t))throw new Error('Session expired. Sign in again.');
  const k='d1s:'+hashV8_(t),raw=v1100Cache_().get(k);
  let rec=null;try{rec=raw?JSON.parse(raw):null}catch(e){rec=null}
  if(!rec||rec.role!==role||!(rec.exp>Date.now()))throw new Error('Session expired. Sign in again.');
  v1100Cache_().put(k,raw,V1100_SESSION_TTL_S);
  return rec;
}
function d1SignOutV1100(token){
  const t=s_(token);if(/^[a-f0-9]{64}$/.test(t))v1100Cache_().remove('d1s:'+hashV8_(t));
  return {success:true};
}

/* ------------------------------------------------------------------ helpers */

function v1100Norm_(h){return String(h==null?'':h).toLowerCase().replace(/[^a-z0-9]/g,'');}
function v1100SafeCell_(v){
  // Neutralise spreadsheet formula injection for any text written to Sheets.
  if(typeof v!=='string')return v;
  return /^[=+\-@\t\r]/.test(v)?"'"+v:v;
}
function v1100SafeObj_(o){const out={};Object.keys(o).forEach(k=>{out[k]=v1100SafeCell_(o[k])});return out;}
function v1100Today_(){return isoDate_(new Date());}
function v1100Int_(v){if(v===''||v==null)return null;const n=Number(v);return Number.isInteger(n)?n:NaN;}
function v1100Money_(v){if(v===''||v==null)return null;const n=Number(v);if(!isFinite(n))return NaN;return Math.round(n*100)/100;}
function v1100ReqId_(v){
  const r=s_(v);
  if(!/^[A-Za-z0-9_-]{8,64}$/.test(r))throw new Error('A valid request ID is required. Refresh and retry.');
  return r;
}
function v1100DateKey_(v){
  if(v==null||v==='')return '';
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return isoDate_(v);
  const raw=s_(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const d=new Date(raw);return isNaN(d.getTime())?raw.slice(0,10):isoDate_(d);
}

function v1100EnsureSheet_(name){
  const ss=ss_(),want=V1100_HEADERS[name];
  if(!want)throw new Error('Unknown Driver One sheet.');
  let sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,want.length).setValues([want]);return sh;}
  const lc=sh.getLastColumn();
  const have=lc>0?sh.getRange(1,1,1,lc).getValues()[0].map(s_):[];
  const missing=want.filter(h=>have.indexOf(h)<0);
  if(missing.length){
    const used=have.filter(Boolean).length;
    sh.getRange(1,used+1,1,missing.length).setValues([missing]);
  }
  return sh;
}
function v1100Rows_(name){
  if(V1100_HEADERS[name]){
    const sh=ss_().getSheetByName(name);
    if(!sh)return [];
  }
  return rows_(name);
}
/** Append many rows in one setValues call so a route is never half-written by row-by-row appends. */
function v1100AppendMany_(name,objs){
  if(!objs.length)return;
  const sh=V1100_HEADERS[name]?v1100EnsureSheet_(name):sh_(name);
  const m=map_(sh),width=sh.getLastColumn();
  const missing=[];
  objs.forEach(o=>Object.keys(o).forEach(k=>{if(!m[k]&&missing.indexOf(k)<0)missing.push(k)}));
  const values=objs.map(o=>{const row=Array(width).fill('');Object.keys(o).forEach(k=>{if(m[k])row[m[k]-1]=v1100SafeCell_(o[k])});return row;});
  sh.getRange(sh.getLastRow()+1,1,values.length,width).setValues(values);
  return missing;
}
function v1100RequireColumns_(name,cols){
  const m=map_(sh_(name)),missing=cols.filter(c=>!m[c]);
  if(missing.length)throw new Error(name+' is missing column(s): '+missing.join(', ')+'. No data was written.');
}
function v1100Update_(name,row,obj){updateObj_(name,row,v1100SafeObj_(obj));}

/* ------------------------------------------------------------------ auth */

function v1100Dispatcher_(auth){
  if(typeof auth==='string'){const r=v1100Session_(auth,'DISPATCHER');return {actor:r.actor,role:r.id};}
  auth=auth||{};
  if(s_(auth.email)){
    v1100Guard_('admin:'+s_(auth.email).toLowerCase(),()=>requireAdmin_(auth.email,auth.pin));
    return {actor:'ADMIN:'+s_(auth.email).toLowerCase(),role:'ADMIN'};
  }
  if(s_(auth.mobile)){
    const u=v1100Guard_('staff:'+digits_(auth.mobile),()=>staffLoginV81_(auth.mobile,auth.pin,'OPERATIONS'));
    return {actor:'STAFF:'+s_(u.staffId),role:'OPERATIONS'};
  }
  throw new Error('Dispatcher sign-in required.');
}
function v1100DriverLogin_(mobile,pin){
  // Existing Drivers sheet + PIN hash. Driver must be enabled for B2B (or BOTH).
  return v1100Guard_('driver:'+digits_(mobile),()=>driverAuth_(mobile,pin,'B2B'));
}
function v1100Driver_(token){
  const r=v1100Session_(token,'DRIVER'),d=find_(V8.SHEETS.DRIVERS,'Driver ID',r.id);
  if(!d||!active_(d.Status)||['B2B','BOTH'].indexOf(s_(d['Delivery Type']).toUpperCase())<0){d1SignOutV1100(token);throw new Error('Driver access is no longer active.');}
  return d;
}
function v1100DriverPublic_(d){
  return {driverId:s_(d['Driver ID']),name:s_(d['Driver Name']),vehicle:s_(d['Vehicle Number']),vehicleType:s_(d['Vehicle Type']),capacity:n_(d['Capacity Qty'])};
}
function v1100IsD1Route_(r){return !!r&&s_(r['API Status'])===V1100_MARKER&&s_(r['Route Type'])===V1100_ROUTE_TYPE;}
function v1100OwnRoute_(d,routeId){
  const r=find_(V8.SHEETS.ROUTES,'Route ID',routeId);
  // Same message for "missing" and "not yours" so route IDs cannot be probed.
  if(!v1100IsD1Route_(r)||s_(r['Driver ID'])!==s_(d['Driver ID']))throw new Error('Route not assigned to you.');
  return r;
}
function v1100OwnStop_(d,stopId){
  const st=find_(V8.SHEETS.STOPS,'Stop ID',stopId);
  if(!st||s_(st['Route Type'])!==V1100_ROUTE_TYPE)throw new Error('Stop not assigned to you.');
  const r=find_(V8.SHEETS.ROUTES,'Route ID',st['Route ID']);
  if(!v1100IsD1Route_(r)||s_(r['Driver ID'])!==s_(d['Driver ID']))throw new Error('Stop not assigned to you.');
  return {st,r};
}

/* ------------------------------------------------------------------ events */

function v1100EventId_(requestId){return 'EV-D1-'+requestId;}
function v1100FindEvent_(requestId){return find_(V8.SHEETS.DELIVERY_EVENTS,'Event ID',v1100EventId_(requestId));}
function v1100Event_(requestId,route,stop,driverId,type,qty,lat,lng,remarks){
  append_(V8.SHEETS.DELIVERY_EVENTS,v1100SafeObj_({
    'Event ID':v1100EventId_(requestId),'Event At':now_(),'Route ID':s_(route['Route ID']),
    'Stop ID':stop?s_(stop['Stop ID']):'','Order Type':stop?s_(stop['Order Type']):'','Order ID':stop?s_(stop['Order ID']):'',
    'Driver ID':s_(driverId),'Event Type':type,
    Latitude:isFinite(Number(lat))&&lat!==''&&lat!=null?Number(lat):'',
    Longitude:isFinite(Number(lng))&&lng!==''&&lng!=null?Number(lng):'',
    Barcode:'',Quantity:n_(qty),Remarks:s_(remarks).slice(0,500)
  }));
}
function v1100RouteEvents_(routeId){return rows_(V8.SHEETS.DELIVERY_EVENTS).filter(e=>s_(e['Route ID'])===s_(routeId)&&s_(e['Event ID']).indexOf('EV-D1-')===0);}
function v1100LoadedQty_(events){
  const loads=events.filter(e=>s_(e['Event Type'])==='LOAD_CONFIRMED');
  return loads.length?n_(loads[loads.length-1].Quantity):0;
}
function v1100GpsArgs_(g){
  g=g||{};const lat=Number(g.lat),lng=Number(g.lng),acc=Number(g.accuracy);
  const ok=isFinite(lat)&&isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0);
  return ok?{lat,lng,accuracy:isFinite(acc)?Math.round(acc):''}:{lat:'',lng:'',accuracy:''};
}

/* ------------------------------------------------------------------ validation (pure) */

function v1100Pick_(record,key){
  const keys=Object.keys(record||{});
  for(let i=0;i<keys.length;i++){if(V1100_ALIASES[key].indexOf(v1100Norm_(keys[i]))>=0)return record[keys[i]];}
  return '';
}
function v1100Phone_(raw){
  if(raw==null||raw==='')return {ok:false,error:'Phone number is required.'};
  if(typeof raw==='number'){
    if(!Number.isInteger(raw))return {ok:false,error:'Phone number is not a whole number; format the column as Text.'};
    raw=raw.toFixed(0);
  }
  let t=String(raw).trim();
  if(/e\+?\d+$/i.test(t))return {ok:false,error:'Phone number was converted to scientific notation; format the column as Text.'};
  t=t.replace(/\.0+$/,'').replace(/[\s\-().]/g,'');
  if(/^\+91\d{10}$/.test(t))t=t.slice(3);
  else if(/^91\d{10}$/.test(t))t=t.slice(2);
  else if(/^0\d{10}$/.test(t))t=t.slice(1);
  if(!/^[6-9]\d{9}$/.test(t))return {ok:false,error:'Phone must be a valid 10-digit Indian mobile number.'};
  return {ok:true,value:t};
}
/**
 * Validates untrusted import rows. Each input row is a {header:value} object and
 * may carry __row (spreadsheet row number) and __formulaFields (headers that held
 * formulas in the source file).
 */
function v1100ValidateRows_(input,opts){
  opts=opts||{};
  const errors=[],warnings=[],accepted=[],seenOrder={},seenPhoneCoord={},seenCoord={};
  const rows=Array.isArray(input)?input:[];
  if(rows.length>V1100_MAX_ROWS)return {accepted:[],errors:[{row:0,field:'file',message:'Maximum '+V1100_MAX_ROWS+' rows per import.'}],warnings:[],totals:{rows:rows.length,accepted:0,rejected:rows.length,qty:0,amount:0}};
  const hub=opts.hub||V8.HUB;
  let nonBlank=0;
  rows.forEach((r,i)=>{
    if(!r||typeof r!=='object')return;
    const rowNo=Number(r.__row)||i+2;
    const values=Object.keys(r).filter(k=>k.indexOf('__')!==0).map(k=>s_(r[k]));
    if(!values.some(Boolean))return;
    nonBlank++;
    const rowErrors=[];const err=(field,message)=>rowErrors.push({row:rowNo,field,message});
    const name=s_(v1100Pick_(r,'name'));
    if(!name)err('Customer Name','Customer name is required.');
    else if(name.length>120)err('Customer Name','Customer name is longer than 120 characters.');
    const phone=v1100Phone_(v1100Pick_(r,'phone'));
    if(!phone.ok)err('Phone Number',phone.error);
    const latRaw=v1100Pick_(r,'lat'),lngRaw=v1100Pick_(r,'lng');
    const lat=latRaw===''?NaN:Number(latRaw),lng=lngRaw===''?NaN:Number(lngRaw);
    if(!isFinite(lat)||lat<-90||lat>90)err('Lat','Latitude must be a number between -90 and 90.');
    if(!isFinite(lng)||lng<-180||lng>180)err('Long','Longitude must be a number between -180 and 180.');
    if(isFinite(lat)&&isFinite(lng)&&lat===0&&lng===0)err('Lat/Long','Coordinates 0,0 are not a real delivery location.');
    const qty=v1100Int_(v1100Pick_(r,'qty'));
    if(Number.isNaN(qty)||(qty!=null&&(qty<0||qty>100000)))err('Quantity','Quantity must be a whole number between 0 and 100000.');
    const amount=v1100Money_(v1100Pick_(r,'amount'));
    if(Number.isNaN(amount)||(amount!=null&&(amount<0||amount>10000000)))err('Amount','Amount must be a positive number.');
    const orderId=s_(v1100Pick_(r,'orderId'));
    if(orderId&&!/^[A-Za-z0-9_\-\/]{1,60}$/.test(orderId))err('Order ID','Order ID may only contain letters, numbers, - _ /.');
    if(orderId&&seenOrder[orderId])err('Order ID','Duplicate Order ID in this file (also on row '+seenOrder[orderId]+').');
    const address=s_(v1100Pick_(r,'address')).slice(0,250);
    const priority=s_(v1100Pick_(r,'priority')).toUpperCase().slice(0,20);
    const timeWindow=s_(v1100Pick_(r,'timeWindow')).slice(0,40);
    const remarks=s_(v1100Pick_(r,'remarks')).slice(0,250);
    const dd=v1100DateKey_(v1100Pick_(r,'deliveryDate'));
    if(rowErrors.length){errors.push.apply(errors,rowErrors);return;}
    if(orderId)seenOrder[orderId]=rowNo;
    const coordKey=lat.toFixed(5)+','+lng.toFixed(5),pcKey=phone.value+'|'+coordKey;
    if(seenPhoneCoord[pcKey])warnings.push({row:rowNo,message:'Same phone and location as row '+seenPhoneCoord[pcKey]+'. Possible duplicate stop.'});
    else if(seenCoord[coordKey])warnings.push({row:rowNo,message:'Same coordinates as row '+seenCoord[coordKey]+'. Confirm both vendors share this location.'});
    seenPhoneCoord[pcKey]=seenPhoneCoord[pcKey]||rowNo;seenCoord[coordKey]=seenCoord[coordKey]||rowNo;
    const km=haversine_(hub,{lat,lng});
    if(km>60)warnings.push({row:rowNo,message:'Location is '+safeRound_(km,1)+' km (straight line) from the hub. Check coordinates.'});
    if(qty==null||qty===0)warnings.push({row:rowNo,message:'Quantity missing; delivered quantity will be limited only by vehicle stock.'});
    if(amount==null||amount===0)warnings.push({row:rowNo,message:'Amount missing; driver cannot record a collection for this stop.'});
    if(opts.routeDate&&dd&&dd!==opts.routeDate)warnings.push({row:rowNo,message:'Row delivery date '+dd+' differs from route date '+opts.routeDate+'.'});
    const formulaFields=Array.isArray(r.__formulaFields)?r.__formulaFields.map(v1100Norm_):[];
    const formulaHit=['phone','lat','lng','qty','amount'].filter(k=>formulaFields.some(f=>V1100_ALIASES[k].indexOf(f)>=0));
    if(formulaHit.length)warnings.push({row:rowNo,message:'Formula-calculated values in: '+formulaHit.join(', ')+'. Verify before dispatch.'});
    accepted.push({row:rowNo,name,phone:phone.value,lat,lng,qty:qty||0,amount:amount||0,address,orderId,priority,timeWindow,remarks});
  });
  const qtyTotal=accepted.reduce((a,x)=>a+x.qty,0),amountTotal=accepted.reduce((a,x)=>a+x.amount,0);
  const rejectedRows={};errors.forEach(e=>{if(e.row)rejectedRows[e.row]=true});
  return {accepted,errors,warnings,totals:{rows:nonBlank,accepted:accepted.length,rejected:Object.keys(rejectedRows).length,qty:qtyTotal,amount:safeRound_(amountTotal,2)}};
}
/** Straight-line nearest-neighbour ordering. Labelled as such; never presented as road optimisation. */
function v1100NearestOrder_(origin,points){
  const left=points.slice(),out=[];let cur=origin;
  while(left.length){
    let best=0,bestKm=Infinity;
    for(let i=0;i<left.length;i++){const km=haversine_(cur,left[i]);if(km<bestKm){bestKm=km;best=i}}
    const next=left.splice(best,1)[0];out.push(next);cur=next;
  }
  return out;
}
function v1100ImportKey_(accepted,routeDate,driverId){
  const basis=JSON.stringify({d:routeDate,v:driverId,s:accepted.map(a=>[a.name,a.phone,a.lat,a.lng,a.qty,a.amount,a.orderId])});
  return hashV8_(basis).slice(0,32);
}
function v1100ActiveOrderIds_(){
  const set={};
  rows_(V8.SHEETS.STOPS).forEach(s=>{
    if(['CANCELLED'].indexOf(s_(s.Status).toUpperCase())>=0)return;
    const id=s_(s['Order ID']);if(id)set[id]=true;
  });
  return set;
}


/* ------------------------------------------------------------------ stock ledger */

const V1100_PRODUCT_ID='TC';
/** Posts a closed trip to Inventory_Ledger exactly once. Returns the rows written (0 on repeat). */
function v1100PostLedger_(r,actor){
  const routeId=s_(r['Route ID']);
  if(rows_(V8.SHEETS.INVENTORY).some(x=>s_(x['Reference Type'])==='D1_ROUTE'&&s_(x['Reference ID'])===routeId))return 0;
  const closeEv=v1100RouteEvents_(routeId).filter(e=>s_(e['Event Type'])==='TRIP_CLOSED').pop();
  let sum=null;try{sum=closeEv?JSON.parse(s_(closeEv.Remarks)):null}catch(e){sum=null}
  if(!sum)throw new Error('Trip close summary missing; ledger not posted.');
  let product=null;try{product=find_(V8.SHEETS.PRODUCTS,'Product ID',V1100_PRODUCT_ID)}catch(e){product=null}
  const name=product?s_(product['Product Name']):'Tender Coconut',at=now_(),rows=[];
  const base={'Created At':at,'Product ID':V1100_PRODUCT_ID,'Product Name':name,Location:'HUB','Reference Type':'D1_ROUTE','Reference ID':routeId,'Batch ID':'','User ID':s_(actor)};
  if(n_(sum.delivered)>0)rows.push(Object.assign({'Movement ID':id_('MOV-'),'Movement Type':'DELIVERY OUT','Qty In':0,'Qty Out':n_(sum.delivered),Reason:'Driver One route delivered'},base));
  if(n_(sum.stockVariance)<0)rows.push(Object.assign({'Movement ID':id_('MOV-'),'Movement Type':'TRANSIT LOSS OUT','Qty In':0,'Qty Out':-n_(sum.stockVariance),Reason:'Approved trip variance: '+s_(sum.remarks).slice(0,150)},base));
  if(n_(sum.stockVariance)>0)rows.push(Object.assign({'Movement ID':id_('MOV-'),'Movement Type':'COUNT ADJUSTMENT IN','Qty In':n_(sum.stockVariance),'Qty Out':0,Reason:'Approved trip variance: '+s_(sum.remarks).slice(0,150)},base));
  if(rows.length)v1100AppendMany_(V8.SHEETS.INVENTORY,rows);
  return rows.length;
}

/** A ledger failure must not strand a driver at the hub: the trip still closes and ops is told. */
function v1100TryLedger_(r,actor,driverId){
  try{v1100PostLedger_(r,actor);return true;}
  catch(e){v1100Event_('LEDGER-FAIL-'+s_(r['Route ID']).replace(/[^A-Za-z0-9_-]/g,'')+'-'+Date.now(),r,null,driverId,'LEDGER_POST_FAILED',0,'','',String(e&&e.message||e).slice(0,300));return false;}
}
function d1PostLedgerV1100(auth,routeId){
  return lockRun_(()=>{
    const who=v1100Dispatcher_(auth),r=find_(V8.SHEETS.ROUTES,'Route ID',routeId);
    if(!v1100IsD1Route_(r))throw new Error('Route not found.');
    if(s_(r.Status)!=='CLOSED')throw new Error('Only a closed route can be posted to the stock ledger.');
    return {success:true,rowsWritten:v1100PostLedger_(r,who.actor)};
  });
}

/* ------------------------------------------------------------------ dispatcher API */

function d1DispatcherLoginV1100(auth){
  if(typeof auth==='string')throw new Error('Sign in with your mobile or email and PIN.');
  const who=v1100Dispatcher_(auth);
  return {success:true,role:who.role,token:v1100NewSession_('DISPATCHER',who.role,who.actor),version:V1100_VERSION,hub:V8.HUB,today:v1100Today_()};
}
function d1ListDriversV1100(auth){
  v1100Dispatcher_(auth);
  return rows_(V8.SHEETS.DRIVERS)
    .filter(d=>active_(d.Status)&&['B2B','BOTH'].indexOf(s_(d['Delivery Type']).toUpperCase())>=0)
    .map(v1100DriverPublic_);
}
function d1PreviewImportV1100(auth,payload){
  v1100Dispatcher_(auth);payload=payload||{};
  const routeDate=s_(payload.routeDate);
  const result=v1100ValidateRows_(payload.rows,{routeDate});
  const active=v1100ActiveOrderIds_();
  const clash=result.accepted.filter(a=>a.orderId&&active[a.orderId]);
  clash.forEach(a=>result.errors.push({row:a.row,field:'Order ID','message':'Order ID '+a.orderId+' is already on another route.'}));
  if(clash.length){
    const bad={};clash.forEach(a=>bad[a.row]=true);
    result.accepted=result.accepted.filter(a=>!bad[a.row]);
    result.totals.accepted=result.accepted.length;
    result.totals.qty=result.accepted.reduce((s,a)=>s+a.qty,0);
    result.totals.amount=safeRound_(result.accepted.reduce((s,a)=>s+a.amount,0),2);
    const rej={};result.errors.forEach(e=>{if(e.row)rej[e.row]=true});result.totals.rejected=Object.keys(rej).length;
  }
  if(s_(payload.driverId)){
    const d=find_(V8.SHEETS.DRIVERS,'Driver ID',payload.driverId);
    if(d){
      const cap=n_(d['Capacity Qty']);
      result.driver=v1100DriverPublic_(d);
      if(cap>0&&result.totals.qty>cap)result.errors.push({row:0,field:'Quantity','message':'Total quantity '+result.totals.qty+' exceeds recorded vehicle capacity '+cap+'.'});
    }
  }
  result.mutated=false;
  return result;
}
function d1CreateRouteV1100(auth,payload){
  return lockRun_(()=>{
    const who=v1100Dispatcher_(auth);payload=payload||{};
    const routeDate=s_(payload.routeDate);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(routeDate))throw new Error('Select a valid route date.');
    if(routeDate<v1100Today_())throw new Error('Route date cannot be in the past.');
    const d=find_(V8.SHEETS.DRIVERS,'Driver ID',payload.driverId);
    if(!d||!active_(d.Status))throw new Error('Driver is not active.');
    if(['B2B','BOTH'].indexOf(s_(d['Delivery Type']).toUpperCase())<0)throw new Error('Driver is not enabled for B2B deliveries.');
    const capacity=n_(d['Capacity Qty']);
    if(!(capacity>0))throw new Error('Vehicle capacity is not set for this driver. Update Drivers → Capacity Qty first.');
    const mode=s_(payload.sequenceMode).toUpperCase()==='NEAREST'?'NEAREST':'FILE';
    const v=v1100ValidateRows_(payload.rows,{routeDate});
    // Idempotency is keyed on the validated file content (before the cross-route order check),
    // so a retried submit returns the original route instead of re-importing the remaining rows.
    const importKey=v1100ImportKey_(v.accepted,routeDate,s_(d['Driver ID']));
    const prior=v1100Rows_(V1100_SHEETS.IMPORTS).find(x=>s_(x['Import Key'])===importKey&&s_(x.Status)==='CREATED');
    if(prior)return {success:true,duplicate:true,routeId:s_(prior['Route ID']),importId:s_(prior['Import ID'])};
    const active=v1100ActiveOrderIds_();
    v.accepted.forEach(a=>{if(a.orderId&&active[a.orderId])v.errors.push({row:a.row,field:'Order ID',message:'Order ID '+a.orderId+' is already on another route.'})});
    const badRows={};v.errors.forEach(e=>{if(e.row)badRows[e.row]=true});
    const fileErrors=v.errors.filter(e=>!e.row);
    if(fileErrors.length)throw new Error(fileErrors[0].message);
    const accepted=v.accepted.filter(a=>!badRows[a.row]);
    if(!accepted.length){const first=v.errors.find(e=>e.row);throw new Error('No valid rows to dispatch.'+(first?' Row '+first.row+': '+first.message:''));}
    if(Object.keys(badRows).length&&payload.acceptPartial!==true){
      const first=v.errors.find(e=>e.row);
      throw new Error(Object.keys(badRows).length+' row(s) have errors (row '+first.row+': '+first.message+'). Fix them or explicitly approve importing only the valid rows.');
    }
    const totalQty=accepted.reduce((s,a)=>s+a.qty,0);
    if(totalQty>capacity)throw new Error('Total quantity '+totalQty+' exceeds recorded vehicle capacity '+capacity+'.');

    v1100RequireColumns_(V8.SHEETS.ROUTES,['Route ID','Route Date','Route Type','Driver ID','Status','API Status','Optimization Source','Total Stops','Completed Stops']);
    v1100RequireColumns_(V8.SHEETS.STOPS,['Stop ID','Route ID','Route Type','Stop Sequence','Order ID','Display Name','Mobile','Latitude','Longitude','Required Qty','Delivered Qty','Status']);
    const ordered=mode==='NEAREST'?v1100NearestOrder_(V8.HUB,accepted):accepted.slice();
    const routeId=id_('RD1-'),importId=id_('IMP-'),at=now_(),driverId=s_(d['Driver ID']);
    const source=mode==='NEAREST'?'STRAIGHT_LINE_NEAREST_NEIGHBOUR':'MANUAL_FILE_ORDER';
    const stops=[],terms=[];
    ordered.forEach((a,i)=>{
      const stopId=routeId.replace('RD1-','SD1-')+'-'+(i+1);
      stops.push({'Stop ID':stopId,'Route ID':routeId,'Route Type':V1100_ROUTE_TYPE,'Stop Sequence':i+1,'Order Type':'MANUAL',
        'Order ID':a.orderId||('MAN-'+stopId),'Customer/Vendor ID':'','Display Name':a.name,Mobile:a.phone,Address:a.address,
        Latitude:a.lat,Longitude:a.lng,'Required Qty':a.qty,'Assigned Batch Qty':0,'Delivered Qty':0,
        'Road Distance From Previous KM':'','Travel Time From Previous Min':'','Planned ETA':'','Tracking Visible':'FALSE',
        Status:'PENDING',Priority:a.priority,'Time Slot':a.timeWindow});
      terms.push({'Stop ID':stopId,'Route ID':routeId,'Import ID':importId,'Source Row':a.row,'Amount Due':a.amount,'Outcome':'','Returned Qty':0,Remarks:a.remarks,'Created At':at,'Updated At':at});
    });
    // Write order: stops+terms first, route header last, so a route only becomes visible once its stops exist.
    v1100AppendMany_(V8.SHEETS.STOPS,stops);
    v1100AppendMany_(V1100_SHEETS.TERMS,terms);
    v1100AppendMany_(V8.SHEETS.ROUTES,[{'Route ID':routeId,'Route Date':routeDate,'Route Type':V1100_ROUTE_TYPE,'Driver ID':driverId,
      'Vehicle Number':s_(d['Vehicle Number']),'Hub Latitude':V8.HUB.lat,'Hub Longitude':V8.HUB.lng,'Total Stops':stops.length,'Completed Stops':0,
      'Total Road KM':'','Estimated Minutes':'','Optimization Source':source,Status:'PLANNED','Created At':at,'Updated At':at,
      'Route Polyline':'','API Status':V1100_MARKER}]);
    v1100AppendMany_(V1100_SHEETS.IMPORTS,[{'Import ID':importId,'Import Key':importKey,'Route ID':routeId,'Route Date':routeDate,'Driver ID':driverId,
      'File Name':s_(payload.fileName).slice(0,120),'Rows Total':v.totals.rows,'Rows Accepted':accepted.length,'Rows Rejected':Object.keys(badRows).length,
      'Sequence Mode':source,'Created By':who.actor,'Created At':at,Status:'CREATED'}]);
    audit_('DISPATCH','CREATE_ROUTE','Delivery_Routes',routeId,who.actor,'','Driver One route; stops '+stops.length+'; qty '+totalQty+'; '+source);
    return {success:true,duplicate:false,routeId,importId,stops:stops.length,totalQty,totalAmount:safeRound_(accepted.reduce((s,a)=>s+a.amount,0),2),
      sequenceSource:source,skippedRows:Object.keys(badRows).map(Number),roadKm:null,etaMinutes:null};
  });
}
function d1CancelRouteV1100(auth,routeId,reason){
  return lockRun_(()=>{
    const who=v1100Dispatcher_(auth);
    const r=find_(V8.SHEETS.ROUTES,'Route ID',routeId);
    if(!v1100IsD1Route_(r))throw new Error('Route not found.');
    if(s_(r.Status)!=='PLANNED')throw new Error('Only a route that has not been loaded can be cancelled.');
    if(!s_(reason))throw new Error('Enter a cancellation reason.');
    rows_(V8.SHEETS.STOPS).filter(s=>s_(s['Route ID'])===s_(routeId)).forEach(s=>v1100Update_(V8.SHEETS.STOPS,s._row,{Status:'CANCELLED','Failure Remarks':s_(reason).slice(0,200)}));
    v1100Update_(V8.SHEETS.ROUTES,r._row,{Status:'CANCELLED','Updated At':now_()});
    const imp=v1100Rows_(V1100_SHEETS.IMPORTS).find(x=>s_(x['Route ID'])===s_(routeId));
    if(imp)v1100Update_(V1100_SHEETS.IMPORTS,imp._row,{Status:'CANCELLED'});
    audit_('DISPATCH','CANCEL_ROUTE','Delivery_Routes',routeId,who.actor,'PLANNED','CANCELLED: '+s_(reason).slice(0,200));
    return {success:true};
  });
}
function v1100RouteView_(r,includeEvents){
  const routeId=s_(r['Route ID']);
  const stops=rows_(V8.SHEETS.STOPS).filter(s=>s_(s['Route ID'])===routeId).sort((a,b)=>n_(a['Stop Sequence'])-n_(b['Stop Sequence']));
  const terms={};v1100Rows_(V1100_SHEETS.TERMS).filter(t=>s_(t['Route ID'])===routeId).forEach(t=>terms[s_(t['Stop ID'])]=t);
  const cols=v1100Rows_(V1100_SHEETS.COLLECTIONS).filter(c=>s_(c['Route ID'])===routeId&&s_(c.Status)!=='REJECTED');
  const events=v1100RouteEvents_(routeId);
  const loaded=v1100LoadedQty_(events);
  const closeEv=events.filter(e=>s_(e['Event Type'])==='TRIP_CLOSED').pop();
  let closeSummary=null;if(closeEv){try{closeSummary=JSON.parse(s_(closeEv.Remarks))}catch(e){closeSummary=null}}
  const stopViews=stops.map(s=>{
    const t=terms[s_(s['Stop ID'])]||{},sc=cols.filter(c=>s_(c['Stop ID'])===s_(s['Stop ID']));
    const due=n_(t['Amount Due']),req=n_(s['Required Qty']),del=n_(s['Delivered Qty']);
    return {stopId:s_(s['Stop ID']),sequence:n_(s['Stop Sequence']),orderId:s_(s['Order ID']),name:s_(s['Display Name']),mobile:s_(s.Mobile),
      address:s_(s.Address),lat:n_(s.Latitude),lng:n_(s.Longitude),requiredQty:req,deliveredQty:del,returnedQty:n_(t['Returned Qty']),
      status:s_(s.Status),priority:s_(s.Priority),timeWindow:s_(s['Time Slot']),checkInAt:fmtDT_(s['Check In At']),
      failureReason:s_(s['Failure Reason']),remarks:s_(t.Remarks),amountDue:due,
      collectible:req>0?safeRound_(due*del/req,2):(del>0?due:0),
      collectedCash:safeRound_(sc.filter(c=>s_(c.Method)==='CASH').reduce((a,c)=>a+n_(c.Amount),0),2),
      collectedUpi:safeRound_(sc.filter(c=>s_(c.Method)==='UPI').reduce((a,c)=>a+n_(c.Amount),0),2)};
  });
  const sum=(k)=>stopViews.reduce((a,s)=>a+n_(s[k]),0);
  const view={routeId,date:v1100DateKey_(r['Route Date']),status:s_(r.Status),driverId:s_(r['Driver ID']),vehicle:s_(r['Vehicle Number']),
    sequenceSource:s_(r['Optimization Source']),roadKm:null,etaMinutes:null,hub:{lat:n_(r['Hub Latitude']),lng:n_(r['Hub Longitude'])},
    totals:{stops:stopViews.length,resolved:stopViews.filter(s=>V1100_RESOLVED.indexOf(s.status)>=0).length,
      failed:stopViews.filter(s=>s.status==='FAILED').length,requiredQty:sum('requiredQty'),loadedQty:loaded,deliveredQty:sum('deliveredQty'),
      customerReturnedQty:sum('returnedQty'),amountDue:safeRound_(sum('amountDue'),2),collectible:safeRound_(sum('collectible'),2),
      cash:safeRound_(sum('collectedCash'),2),upi:safeRound_(sum('collectedUpi'),2)},
    close:closeSummary,stops:stopViews,
    ledgerPending:s_(r.Status)==='CLOSED'&&!(function(){try{return rows_(V8.SHEETS.INVENTORY).some(x=>s_(x['Reference Type'])==='D1_ROUTE'&&s_(x['Reference ID'])===routeId)}catch(e){return false}})()};
  if(includeEvents){
    view.events=events.map(e=>({at:fmtDT_(e['Event At']),type:s_(e['Event Type']),stopId:s_(e['Stop ID']),qty:n_(e.Quantity),lat:e.Latitude===''?null:n_(e.Latitude),lng:e.Longitude===''?null:n_(e.Longitude),remarks:s_(e.Remarks)}));
    view.collections=v1100Rows_(V1100_SHEETS.COLLECTIONS).filter(c=>s_(c['Route ID'])===routeId).map(c=>({collectionId:s_(c['Collection ID']),stopId:s_(c['Stop ID']),method:s_(c.Method),amount:n_(c.Amount),upiRef:s_(c['UPI Reference']),status:s_(c.Status),enteredAt:fmtDT_(c['Entered At']),validatedBy:s_(c['Validated By'])}));
  }
  return view;
}
function d1GetDispatchBoardV1100(auth,date){
  v1100Dispatcher_(auth);
  const day=s_(date)||v1100Today_();
  const drivers={};rows_(V8.SHEETS.DRIVERS).forEach(d=>drivers[s_(d['Driver ID'])]=s_(d['Driver Name']));
  const live={};rows_(V8.SHEETS.DRIVER_LIVE).filter(x=>s_(x.Status)==='ACTIVE').forEach(x=>{const k=s_(x['Route ID']);if(!live[k]||new Date(x['Updated At'])>new Date(live[k].at))live[k]={lat:n_(x.Latitude),lng:n_(x.Longitude),accuracy:n_(x['Accuracy M']),at:x['Updated At']}});
  const routes=rows_(V8.SHEETS.ROUTES).filter(r=>v1100IsD1Route_(r)&&v1100DateKey_(r['Route Date'])===day)
    .map(r=>{const v=v1100RouteView_(r,false);v.driverName=drivers[v.driverId]||v.driverId;const l=live[v.routeId];v.live=l?{lat:l.lat,lng:l.lng,accuracy:l.accuracy,at:fmtDT_(l.at)}:null;delete v.stops;return v;});
  return {date:day,routes,version:V1100_VERSION};
}
function d1GetRouteDetailAdminV1100(auth,routeId){
  v1100Dispatcher_(auth);
  const r=find_(V8.SHEETS.ROUTES,'Route ID',routeId);
  if(!v1100IsD1Route_(r))throw new Error('Route not found.');
  return v1100RouteView_(r,true);
}
function d1ReviewRouteV1100(auth,routeId,approve,notes){
  return lockRun_(()=>{
    const who=v1100Dispatcher_(auth);
    const r=find_(V8.SHEETS.ROUTES,'Route ID',routeId);
    if(!v1100IsD1Route_(r))throw new Error('Route not found.');
    if(s_(r.Status)!=='CLOSED_PENDING_REVIEW')throw new Error('Route is not waiting for review.');
    if(!s_(notes))throw new Error('Enter review notes.');
    const status=approve===true?'CLOSED':'IN_PROGRESS';
    v1100Update_(V8.SHEETS.ROUTES,r._row,{Status:status,'Updated At':now_()});
    if(status==='CLOSED')v1100TryLedger_(r,who.actor,'');
    audit_('DISPATCH',approve===true?'APPROVE_VARIANCE':'REOPEN_ROUTE','Delivery_Routes',routeId,who.actor,'CLOSED_PENDING_REVIEW',status+': '+s_(notes).slice(0,300));
    return {success:true,status};
  });
}
function d1ValidateCollectionV1100(auth,collectionId,decision,notes){
  return lockRun_(()=>{
    const who=v1100Dispatcher_(auth);
    const c=v1100Rows_(V1100_SHEETS.COLLECTIONS).find(x=>s_(x['Collection ID'])===s_(collectionId));
    if(!c)throw new Error('Collection not found.');
    const next=s_(decision).toUpperCase();
    if(['VALIDATED','REJECTED'].indexOf(next)<0)throw new Error('Decision must be VALIDATED or REJECTED.');
    if(['VALIDATED','REJECTED'].indexOf(s_(c.Status))>=0)throw new Error('Collection already '+s_(c.Status).toLowerCase()+'.');
    if(next==='REJECTED'&&!s_(notes))throw new Error('Enter a reason for rejecting this collection.');
    v1100Update_(V1100_SHEETS.COLLECTIONS,c._row,{Status:next,'Validated By':who.actor,'Validated At':now_(),Notes:s_(notes).slice(0,250)});
    audit_('DISPATCH','COLLECTION_'+next,'D1_Collections',s_(collectionId),who.actor,s_(c.Status),next);
    return {success:true,status:next};
  });
}

/* ------------------------------------------------------------------ driver API (no OTP, no invoices) */

function d1DriverLoginV1100(mobile,pin){
  const d=v1100DriverLogin_(mobile,pin);
  const out=d1GetMyTripsV1100(v1100NewSession_('DRIVER',s_(d['Driver ID']),'DRIVER:'+s_(d['Driver ID'])));
  return out;
}
function d1GetMyTripsV1100(token){
  const d=v1100Driver_(token),driverId=s_(d['Driver ID']),today=v1100Today_();
  const routes=rows_(V8.SHEETS.ROUTES).filter(r=>v1100IsD1Route_(r)&&s_(r['Driver ID'])===driverId)
    .filter(r=>{const day=v1100DateKey_(r['Route Date']),st=s_(r.Status);return st!=='CANCELLED'&&(day>=today||['LOADED','IN_PROGRESS','CLOSED_PENDING_REVIEW'].indexOf(st)>=0);})
    .sort((a,b)=>v1100DateKey_(a['Route Date']).localeCompare(v1100DateKey_(b['Route Date']))||new Date(a['Created At'])-new Date(b['Created At']))
    .map(r=>({routeId:s_(r['Route ID']),date:v1100DateKey_(r['Route Date']),status:s_(r.Status),stops:n_(r['Total Stops']),completed:n_(r['Completed Stops']),sequenceSource:s_(r['Optimization Source'])}));
  return {success:true,token,version:V1100_VERSION,driver:v1100DriverPublic_(d),routes,otpRequired:false,invoices:false};
}
function d1GetRouteV1100(token,routeId){
  const d=v1100Driver_(token),r=v1100OwnRoute_(d,routeId);
  return v1100RouteView_(r,false);
}
function d1ConfirmLoadV1100(token,routeId,loadedQty,requestId){
  return lockRun_(()=>{
    requestId=v1100ReqId_(requestId);
    const d=v1100Driver_(token),r=v1100OwnRoute_(d,routeId);
    if(v1100FindEvent_(requestId))return {success:true,duplicate:true};
    if(['PLANNED','LOADED'].indexOf(s_(r.Status))<0)throw new Error('Load can only be confirmed before the trip starts.');
    const q=v1100Int_(loadedQty),cap=n_(d['Capacity Qty']);
    if(!(Number.isInteger(q)&&q>0))throw new Error('Enter the loaded quantity as a whole number.');
    if(cap>0&&q>cap)throw new Error('Loaded quantity '+q+' exceeds recorded vehicle capacity '+cap+'.');
    const required=rows_(V8.SHEETS.STOPS).filter(s=>s_(s['Route ID'])===s_(routeId)).reduce((a,s)=>a+n_(s['Required Qty']),0);
    v1100Event_(requestId,r,null,d['Driver ID'],'LOAD_CONFIRMED',q,'','',q<required?'Short load: required '+required:'');
    v1100Update_(V8.SHEETS.ROUTES,r._row,{Status:'LOADED','Updated At':now_()});
    return {success:true,loadedQty:q,requiredQty:required,shortBy:Math.max(0,required-q)};
  });
}
function d1StartTripV1100(token,routeId,gps,requestId){
  return lockRun_(()=>{
    requestId=v1100ReqId_(requestId);
    const d=v1100Driver_(token),r=v1100OwnRoute_(d,routeId);
    if(v1100FindEvent_(requestId))return {success:true,duplicate:true};
    if(s_(r.Status)!=='LOADED')throw new Error('Confirm vehicle loading before starting the trip.');
    const g=v1100GpsArgs_(gps);
    v1100Event_(requestId,r,null,d['Driver ID'],'TRIP_STARTED',0,g.lat,g.lng,g.lat===''?'GPS unavailable':'');
    v1100Update_(V8.SHEETS.ROUTES,r._row,{Status:'IN_PROGRESS','Updated At':now_()});
    return {success:true,status:'IN_PROGRESS'};
  });
}
function d1CheckInV1100(token,stopId,gps,requestId){
  return lockRun_(()=>{
    requestId=v1100ReqId_(requestId);
    const d=v1100Driver_(token),o=v1100OwnStop_(d,stopId);
    if(v1100FindEvent_(requestId))return {success:true,duplicate:true};
    if(s_(o.r.Status)!=='IN_PROGRESS')throw new Error('Start the trip before checking in at a stop.');
    if(s_(o.st.Status)!=='PENDING')throw new Error('This stop is already '+s_(o.st.Status).toLowerCase()+'.');
    const g=v1100GpsArgs_(gps);
    let note=g.lat===''?'GPS unavailable':'Accuracy '+g.accuracy+' m';
    if(g.lat!==''){const km=haversine_({lat:g.lat,lng:g.lng},{lat:n_(o.st.Latitude),lng:n_(o.st.Longitude)});note+='; '+Math.round(km*1000)+' m straight-line from stop pin';}
    v1100Update_(V8.SHEETS.STOPS,o.st._row,{'Check In At':now_(),Status:'ARRIVED','Tracking Visible':'TRUE'});
    v1100Event_(requestId,o.r,o.st,d['Driver ID'],'CHECK_IN',0,g.lat,g.lng,note);
    return {success:true,status:'ARRIVED',gpsCaptured:g.lat!==''};
  });
}
function d1RecordDeliveryV1100(token,stopId,p){
  return lockRun_(()=>{
    p=p||{};const requestId=v1100ReqId_(p.requestId);
    const d=v1100Driver_(token),o=v1100OwnStop_(d,stopId),st=o.st,r=o.r;
    if(v1100FindEvent_(requestId))return {success:true,duplicate:true};
    if(s_(r.Status)!=='IN_PROGRESS')throw new Error('Trip is not in progress.');
    if(s_(st.Status)!=='ARRIVED')throw new Error(V1100_RESOLVED.indexOf(s_(st.Status))>=0?'This stop is already recorded.':'Check in at the stop first.');
    const outcome=s_(p.outcome).toUpperCase();
    if(['DELIVERED','PARTIAL','FAILED'].indexOf(outcome)<0)throw new Error('Choose Delivered, Partial or Failed.');
    const dRaw=v1100Int_(p.deliveredQty),rRaw=v1100Int_(p.returnedQty);
    const required=n_(st['Required Qty']),delivered=dRaw==null?0:dRaw,returned=rRaw==null?0:rRaw;
    if(!Number.isInteger(delivered)||delivered<0)throw new Error('Delivered quantity must be a whole number.');
    if(!Number.isInteger(returned)||returned<0)throw new Error('Returned quantity must be a whole number.');
    if(required>0&&delivered>required)throw new Error('Delivered quantity cannot exceed the ordered '+required+'.');
    if(required>0&&delivered+returned>required)throw new Error('Delivered + returned cannot exceed the ordered '+required+'.');
    const reason=s_(p.failureReason).slice(0,120),remarks=s_(p.remarks).slice(0,250);
    if(outcome==='DELIVERED'&&(delivered<=0||(required>0&&delivered!==required)))throw new Error(required>0?'Full delivery must be exactly '+required+'. Use Partial otherwise.':'Enter the delivered quantity.');
    if(outcome==='PARTIAL'&&!(delivered>0&&(required===0||delivered<required)))throw new Error('Partial delivery must be more than 0 and less than '+required+'.');
    if(outcome==='PARTIAL'&&!reason)throw new Error('Select a reason for the partial delivery.');
    if(outcome==='FAILED'&&delivered!==0)throw new Error('A failed stop cannot have delivered quantity.');
    if(outcome==='FAILED'&&!reason)throw new Error('Select a failure reason.');
    const events=v1100RouteEvents_(s_(r['Route ID'])),loaded=v1100LoadedQty_(events);
    const alreadyDelivered=rows_(V8.SHEETS.STOPS).filter(s=>s_(s['Route ID'])===s_(r['Route ID'])).reduce((a,s)=>a+n_(s['Delivered Qty']),0);
    if(alreadyDelivered+delivered>loaded)throw new Error('Only '+Math.max(0,loaded-alreadyDelivered)+' coconuts remain on the vehicle per the confirmed load.');
    const g=v1100GpsArgs_(p.gps),at=now_();
    const upd={'Delivered Qty':delivered,Status:outcome,'Check Out At':at,'Tracking Visible':'FALSE'};
    if(delivered>0)upd['Delivered At']=at;
    if(outcome!=='DELIVERED'){upd['Failure Reason']=reason;upd['Failure Remarks']=remarks;}
    if(outcome==='FAILED'){upd['Failed At']=at;upd['Failure Latitude']=g.lat;upd['Failure Longitude']=g.lng;}
    v1100Update_(V8.SHEETS.STOPS,st._row,upd);
    v1100EnsureSheet_(V1100_SHEETS.TERMS);
    const t=v1100Rows_(V1100_SHEETS.TERMS).find(x=>s_(x['Stop ID'])===s_(stopId));
    if(t)v1100Update_(V1100_SHEETS.TERMS,t._row,{Outcome:outcome,'Returned Qty':returned,'Updated At':at});
    const type=outcome==='DELIVERED'?'DELIVERED':outcome==='PARTIAL'?'PARTIAL_DELIVERY':'DELIVERY_FAILED';
    v1100Event_(requestId,r,st,d['Driver ID'],type,delivered,g.lat,g.lng,JSON.stringify({returnedQty:returned,reason,remarks,otp:false}));
    const done=rows_(V8.SHEETS.STOPS).filter(s=>s_(s['Route ID'])===s_(r['Route ID'])&&V1100_RESOLVED.indexOf(s_(s.Status))>=0).length;
    v1100Update_(V8.SHEETS.ROUTES,r._row,{'Completed Stops':done,'Updated At':at});
    return {success:true,status:outcome,deliveredQty:delivered,returnedQty:returned,remainingOnVehicle:loaded-alreadyDelivered-delivered};
  });
}
function d1RecordCollectionV1100(token,stopId,p){
  return lockRun_(()=>{
    p=p||{};const requestId=v1100ReqId_(p.requestId);
    const d=v1100Driver_(token),o=v1100OwnStop_(d,stopId),st=o.st,r=o.r;
    v1100EnsureSheet_(V1100_SHEETS.COLLECTIONS);
    const dup=v1100Rows_(V1100_SHEETS.COLLECTIONS).find(c=>s_(c['Request ID'])===requestId);
    if(dup)return {success:true,duplicate:true,collectionId:s_(dup['Collection ID'])};
    if(s_(r.Status)!=='IN_PROGRESS')throw new Error('Trip is not in progress.');
    if(['DELIVERED','PARTIAL'].indexOf(s_(st.Status))<0)throw new Error(s_(st.Status)==='FAILED'?'A failed stop cannot have a collection.':'Record the delivery before the collection.');
    const method=s_(p.method).toUpperCase();
    if(['CASH','UPI'].indexOf(method)<0)throw new Error('Choose Cash or UPI.');
    const amount=v1100Money_(p.amount);
    if(!(amount>0))throw new Error('Enter the amount collected.');
    const ref=s_(p.upiRef).toUpperCase();
    if(method==='UPI'&&!/^[A-Z0-9]{6,40}$/.test(ref))throw new Error('Enter the UPI reference / UTR shown on the customer\'s payment.');
    if(method==='UPI'&&v1100Rows_(V1100_SHEETS.COLLECTIONS).some(c=>s_(c['UPI Reference']).toUpperCase()===ref&&s_(c.Status)!=='REJECTED'))throw new Error('This UPI reference has already been recorded.');
    const t=v1100Rows_(V1100_SHEETS.TERMS).find(x=>s_(x['Stop ID'])===s_(stopId))||{};
    const due=n_(t['Amount Due']),req=n_(st['Required Qty']),del=n_(st['Delivered Qty']);
    if(!(due>0))throw new Error('No amount due is set for this stop. Ask dispatch to record it.');
    const collectible=req>0?safeRound_(due*del/req,2):due;
    const prior=v1100Rows_(V1100_SHEETS.COLLECTIONS).filter(c=>s_(c['Stop ID'])===s_(stopId)&&s_(c.Status)!=='REJECTED').reduce((a,c)=>a+n_(c.Amount),0);
    if(safeRound_(prior+amount,2)>collectible)throw new Error('Collection exceeds the ₹'+collectible+' due for the delivered quantity (already recorded ₹'+safeRound_(prior,2)+'). A supervisor adjustment is required.');
    const g=v1100GpsArgs_(p.gps),id=id_('COL-');
    v1100AppendMany_(V1100_SHEETS.COLLECTIONS,[{'Collection ID':id,'Request ID':requestId,'Route ID':s_(r['Route ID']),'Stop ID':s_(stopId),'Order ID':s_(st['Order ID']),
      'Driver ID':s_(d['Driver ID']),Method:method,Amount:amount,'UPI Reference':method==='UPI'?ref:'',
      Status:method==='UPI'?'PROOF_SUBMITTED':'DRIVER_ENTERED','Entered At':now_(),Latitude:g.lat,Longitude:g.lng,'Validated By':'','Validated At':'',Notes:''}]);
    return {success:true,collectionId:id,status:method==='UPI'?'PROOF_SUBMITTED':'DRIVER_ENTERED',balance:safeRound_(collectible-prior-amount,2)};
  });
}
function d1PingLocationV1100(token,routeId,gps){
  const d=v1100Driver_(token),r=v1100OwnRoute_(d,routeId);
  if(s_(r.Status)!=='IN_PROGRESS')return {success:false,reason:'Trip not in progress.'};
  const g=v1100GpsArgs_(gps);if(g.lat==='')return {success:false,reason:'No GPS fix.'};
  const live=rows_(V8.SHEETS.DRIVER_LIVE).filter(x=>s_(x['Driver ID'])===s_(d['Driver ID'])&&s_(x['Route ID'])===s_(routeId)&&s_(x.Status)==='ACTIVE')[0];
  const obj={'Driver ID':s_(d['Driver ID']),'Route ID':s_(routeId),'Stop ID':'','Order Type':'MANUAL','Order ID':'',Latitude:g.lat,Longitude:g.lng,'Accuracy M':g.accuracy,Heading:'','Updated At':now_(),Status:'ACTIVE'};
  if(live)updateObj_(V8.SHEETS.DRIVER_LIVE,live._row,obj);else append_(V8.SHEETS.DRIVER_LIVE,Object.assign({'Live ID':id_('LIVE-')},obj));
  return {success:true};
}
function d1CloseTripV1100(token,routeId,p){
  return lockRun_(()=>{
    p=p||{};const requestId=v1100ReqId_(p.requestId);
    const d=v1100Driver_(token),r=v1100OwnRoute_(d,routeId);
    if(v1100FindEvent_(requestId))return {success:true,duplicate:true};
    if(s_(r.Status)!=='IN_PROGRESS')throw new Error('Trip is not in progress.');
    const view=v1100RouteView_(r,false);
    const open=view.stops.filter(s=>V1100_RESOLVED.indexOf(s.status)<0);
    if(open.length)throw new Error(open.length+' stop(s) are not resolved yet. Record delivered, partial or failed for every stop.');
    const back=v1100Int_(p.returnedToHubQty),cash=v1100Money_(p.cashHandedOver);
    if(!(Number.isInteger(back)&&back>=0))throw new Error('Enter the coconuts returned to the hub (0 if none).');
    if(!(cash!=null&&!Number.isNaN(cash)&&cash>=0))throw new Error('Enter the cash handed over (0 if none).');
    const t=view.totals,expectedBack=t.loadedQty-t.deliveredQty,stockVariance=back-expectedBack,cashVariance=safeRound_(cash-t.cash,2);
    const remarks=s_(p.remarks).slice(0,300);
    const needsReview=stockVariance!==0||cashVariance!==0;
    if(needsReview&&!remarks)throw new Error('Stock or cash does not reconcile (stock '+stockVariance+', cash ₹'+cashVariance+'). Explain the difference to close.');
    const summary={loaded:t.loadedQty,delivered:t.deliveredQty,customerReturned:t.customerReturnedQty,expectedBackToHub:expectedBack,returnedToHub:back,
      stockVariance,cashCollected:t.cash,cashHandedOver:cash,cashVariance,upiSubmitted:t.upi,failedStops:t.failed,remarks};
    const status=needsReview?'CLOSED_PENDING_REVIEW':'CLOSED';
    v1100Event_(requestId,r,null,d['Driver ID'],'TRIP_CLOSED',back,'','',JSON.stringify(summary));
    v1100Update_(V8.SHEETS.ROUTES,r._row,{Status:status,'Updated At':now_()});
    const ledgerPosted=status==='CLOSED'?v1100TryLedger_(r,'DRIVER:'+s_(d['Driver ID']),d['Driver ID']):false;
    stopLive_(s_(d['Driver ID']),s_(routeId),'');
    return {success:true,status,reconciliation:summary,ledgerPosted};
  });
}

/* ------------------------------------------------------------------ pages + health */

function getDriverOneHealthV1100(){
  return {ok:true,version:V1100_VERSION,otpRequired:false,invoicesInDriverApp:false,routeType:V1100_ROUTE_TYPE,
    sequenceSources:['MANUAL_FILE_ORDER','STRAIGHT_LINE_NEAREST_NEIGHBOUR'],roadOptimisation:false,sessionTokens:true,pinLockout:true,ledgerPostingOnClose:true};
}
const V1100_PREVIOUS_DO_GET=doGet;
doGet=function(e){
  const params=e&&e.parameter?e.parameter:{};
  const page=String(params.page||'').toLowerCase();
  const pages={'dispatch':'DispatchV1100','dispatcher':'DispatchV1100','driverone':'DriverOneV1100','d1':'DriverOneV1100'};
  if(String(params.jsonp||'')!=='1'&&pages[page]){
    return HtmlService.createTemplateFromFile(pages[page]).evaluate()
      .setTitle(V8.BRAND+' - '+(pages[page]==='DispatchV1100'?'Route Dispatcher':'Driver One'))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
  }
  return V1100_PREVIOUS_DO_GET(e);
};
