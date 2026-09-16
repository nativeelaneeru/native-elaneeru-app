/**
 * Native Elaneeru V9.6.1 — Admin serviceability map backend.
 *
 * Admin-only control plane for:
 * - 1.5 km square service grids around the Mantapa Lake hub
 * - B2C and B2B OPEN/CLOSED/COMING_SOON/PAUSED status per grid
 * - current onboarded Customers sheet population on the map
 * - apartment subscription service overrides approved by Admin
 *
 * IMPORTANT: this module does NOT replace the live B2C checkout serviceability
 * rule yet. The customer app can be wired to checkServiceabilityV961 after the
 * launch territory is reviewed and approved in Admin.
 */
const V961_SERVICE_VERSION='9.6.1';
const V961_GRID_SHEET='Service_Grids';
const V961_APARTMENT_SHEET='Apartment_Service_Overrides';
const V961_HUB={name:'Mantapa Lake Hub',lat:12.8075278,lng:77.5999167};
const V961_GRID_KM=1.5;
const V961_B2C_RADIUS_KM=3;
const V961_B2B_RADIUS_KM=20;
const V961_COMING_SOON='We are not serving your area yet. We’ll be here soon.';
const V961_GRID_HEADERS=['Grid ID','IX','IY','Cluster','Center Latitude','Center Longitude','Distance KM','NW Lat','NW Lng','NE Lat','NE Lng','SE Lat','SE Lng','SW Lat','SW Lng','B2C Status','B2B Status','Priority','Updated At','Updated By'];
const V961_APARTMENT_HEADERS=['Apartment ID','Apartment Name','Contact Name','Mobile','Address','Latitude','Longitude','Grid ID','Status','Subscription Only','Approved At','Approved By','Notes','Created At','Updated At'];

function v961EnsureSheet_(name,headers){
  const ss=ss_();
  let sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  const last=Math.max(sh.getLastColumn(),1);
  const current=sh.getRange(1,1,1,last).getValues()[0].map(s_);
  const missing=headers.filter(h=>current.indexOf(h)<0);
  if(missing.length)sh.getRange(1,last+1,1,missing.length).setValues([missing]);
  return sh;
}

function v961Rows_(sh){
  if(!sh||sh.getLastRow()<2||sh.getLastColumn()<1)return [];
  const vals=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  const headers=vals[0].map(s_);
  return vals.slice(1).map((r,i)=>{const o={_row:i+2};headers.forEach((h,j)=>{if(h)o[h]=r[j]});return o;});
}

function v961MetersPerLng_(){return 111320*Math.cos(V961_HUB.lat*Math.PI/180);}
function v961OffsetPoint_(xMeters,yMeters){
  return {lat:V961_HUB.lat+(yMeters/111320),lng:V961_HUB.lng+(xMeters/v961MetersPerLng_())};
}
function v961Bearing_(xMeters,yMeters){
  if(!xMeters&&!yMeters)return 0;
  return (Math.atan2(xMeters,yMeters)*180/Math.PI+360)%360;
}
function v961Cluster_(distanceKm,bearing){
  if(distanceKm<=5)return 'Core Hub';
  if(bearing>=240&&bearing<330)return 'Bannerghatta Road';
  if(bearing>=330||bearing<15)return 'South Urban';
  if(bearing>=15&&bearing<50)return 'Bommanahalli / BTM';
  if(bearing>=50&&bearing<115)return 'Electronic City Side';
  if(bearing>=115&&bearing<210)return 'Jigani / South-East';
  return 'South-West Fringe';
}
function v961Code_(cluster){
  return {'Core Hub':'CORE','Bannerghatta Road':'BGR','South Urban':'SUR','Bommanahalli / BTM':'BTM','Electronic City Side':'EC','Jigani / South-East':'JIG','South-West Fringe':'SWF'}[cluster]||'GRID';
}
function v961Priority_(d){return d<=5?'P1: 0–5 km':d<=10?'P2: 5–10 km':d<=15?'P3: 10–15 km':'P4: 15–20 km';}

function v961BuildGridDefs_(){
  const step=V961_GRID_KM*1000,half=step/2,max=Math.ceil(V961_B2B_RADIUS_KM/V961_GRID_KM),defs=[];
  for(let ix=-max;ix<=max;ix++)for(let iy=-max;iy<=max;iy++){
    const x=ix*step,y=iy*step,dMeters=Math.sqrt(x*x+y*y);
    if(dMeters>V961_B2B_RADIUS_KM*1000+0.001)continue;
    const center=v961OffsetPoint_(x,y),dKm=dMeters/1000,b=v961Bearing_(x,y),cluster=v961Cluster_(dKm,b);
    const nw=v961OffsetPoint_(x-half,y+half),ne=v961OffsetPoint_(x+half,y+half),se=v961OffsetPoint_(x+half,y-half),sw=v961OffsetPoint_(x-half,y-half);
    defs.push({ix,iy,cluster,center,dKm,nw,ne,se,sw,bearing:b});
  }
  const grouped={};defs.forEach(d=>{(grouped[d.cluster]||(grouped[d.cluster]=[])).push(d)});
  Object.keys(grouped).forEach(cluster=>{
    grouped[cluster].sort((a,b)=>b.center.lat-a.center.lat||a.center.lng-b.center.lng);
    grouped[cluster].forEach((d,i)=>d.gridId=v961Code_(cluster)+'-'+String(i+1).padStart(3,'0'));
  });
  return defs.sort((a,b)=>a.gridId.localeCompare(b.gridId));
}

function v961SeedGridsIfNeeded_(){
  const sh=v961EnsureSheet_(V961_GRID_SHEET,V961_GRID_HEADERS);
  if(sh.getLastRow()>1)return sh;
  const defs=v961BuildGridDefs_(),now=now_();
  const values=defs.map(d=>[
    d.gridId,d.ix,d.iy,d.cluster,d.center.lat,d.center.lng,safeRound_(d.dKm,3),
    d.nw.lat,d.nw.lng,d.ne.lat,d.ne.lng,d.se.lat,d.se.lng,d.sw.lat,d.sw.lng,
    d.dKm<=V961_B2C_RADIUS_KM?'OPEN':'COMING_SOON','OPEN',v961Priority_(d.dKm),now,'SYSTEM'
  ]);
  if(values.length)sh.getRange(2,1,values.length,V961_GRID_HEADERS.length).setValues(values);
  return sh;
}

function v961GridPublic_(r){
  return {
    gridId:s_(r['Grid ID']),ix:n_(r.IX),iy:n_(r.IY),cluster:s_(r.Cluster),
    center:{lat:n_(r['Center Latitude']),lng:n_(r['Center Longitude'])},distanceKm:n_(r['Distance KM']),
    polygon:[
      {lat:n_(r['NW Lat']),lng:n_(r['NW Lng'])},{lat:n_(r['NE Lat']),lng:n_(r['NE Lng'])},
      {lat:n_(r['SE Lat']),lng:n_(r['SE Lng'])},{lat:n_(r['SW Lat']),lng:n_(r['SW Lng'])}
    ],
    b2cStatus:s_(r['B2C Status'])||'COMING_SOON',b2bStatus:s_(r['B2B Status'])||'CLOSED',priority:s_(r.Priority)
  };
}

function v961GridForPoint_(lat,lng,gridRows){
  lat=Number(lat);lng=Number(lng);if(!isFinite(lat)||!isFinite(lng))return null;
  const x=(lng-V961_HUB.lng)*v961MetersPerLng_(),y=(lat-V961_HUB.lat)*111320,step=V961_GRID_KM*1000;
  const ix=Math.round(x/step),iy=Math.round(y/step);
  const hit=(gridRows||[]).find(r=>Number(r.IX)===ix&&Number(r.IY)===iy);
  return hit||null;
}

function v961SubscriptionByMobile_(){
  const sh=ss_().getSheetByName('B2C_Subscriptions'),map={};
  v961Rows_(sh).forEach(r=>{
    const mobile=digits_(r.Mobile),status=s_(r.Status).toUpperCase();
    if(!mobile||status==='CANCELLED')return;
    const old=map[mobile];if(!old||r._row>old._row)map[mobile]=r;
  });
  return map;
}

function v961ApartmentPublic_(r){
  return {
    apartmentId:s_(r['Apartment ID']),name:s_(r['Apartment Name']),contactName:s_(r['Contact Name']),mobile:digits_(r.Mobile),
    address:s_(r.Address),lat:n_(r.Latitude),lng:n_(r.Longitude),gridId:s_(r['Grid ID']),status:s_(r.Status)||'PENDING',
    subscriptionOnly:s_(r['Subscription Only']).toUpperCase()!=='NO',notes:s_(r.Notes),approvedAt:fmtDT_(r['Approved At'])
  };
}

function getServiceabilityAdminV961(email,pin){
  requireAdmin_(email,pin);
  const gridSh=v961SeedGridsIfNeeded_(),apartmentSh=v961EnsureSheet_(V961_APARTMENT_SHEET,V961_APARTMENT_HEADERS);
  const gridRows=v961Rows_(gridSh),grids=gridRows.map(v961GridPublic_),subs=v961SubscriptionByMobile_();
  const apartments=v961Rows_(apartmentSh).map(v961ApartmentPublic_);
  const customers=rows_(V8.SHEETS.CUSTOMERS).map(c=>{
    const lat=Number(c.Latitude),lng=Number(c.Longitude),hasLocation=isFinite(lat)&&isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&lat!==0&&lng!==0;
    const mobile=digits_(c.Mobile),grid=hasLocation?v961GridForPoint_(lat,lng,gridRows):null,d=hasLocation?haversine_(V961_HUB,{lat:lat,lng:lng}):null;
    const g=grid?v961GridPublic_(grid):null,regularB2C=!!(g&&d<=V961_B2C_RADIUS_KM&&g.b2cStatus==='OPEN');
    return {
      customerId:s_(c['Customer ID'])||('CUST-'+mobile),name:s_(c.Name),mobile:mobile,address:s_(c.Address),area:s_(c.Area),pincode:s_(c.Pincode),status:s_(c.Status)||'ACTIVE',
      lat:hasLocation?lat:null,lng:hasLocation?lng:null,hasLocation:hasLocation,distanceKm:hasLocation?safeRound_(d,2):null,
      gridId:g?g.gridId:'',cluster:g?g.cluster:'',b2cService:regularB2C?'OPEN':hasLocation?'COMING_SOON':'LOCATION_NEEDED',
      b2bService:g&&d<=V961_B2B_RADIUS_KM&&g.b2bStatus==='OPEN'?'OPEN':hasLocation?'CLOSED':'LOCATION_NEEDED',
      subscriptionStatus:subs[mobile]?s_(subs[mobile].Status)||'ACTIVE':'',subscriptionId:subs[mobile]?s_(subs[mobile]['Subscription ID']):''
    };
  });
  return {
    ok:true,version:V961_SERVICE_VERSION,
    config:{hub:V961_HUB,gridKm:V961_GRID_KM,b2cRadiusKm:V961_B2C_RADIUS_KM,b2bRadiusKm:V961_B2B_RADIUS_KM,comingSoonMessage:V961_COMING_SOON},
    grids:grids,customers:customers,apartments:apartments,
    summary:{
      grids:grids.length,b2cOpenGrids:grids.filter(g=>g.b2cStatus==='OPEN').length,b2bOpenGrids:grids.filter(g=>g.b2bStatus==='OPEN').length,
      customers:customers.length,customersMapped:customers.filter(c=>c.hasLocation).length,customersNeedLocation:customers.filter(c=>!c.hasLocation).length,
      b2cOpenCustomers:customers.filter(c=>c.b2cService==='OPEN').length,activeSubscriptions:customers.filter(c=>c.subscriptionStatus&&c.subscriptionStatus.toUpperCase()!=='CANCELLED').length,
      approvedApartments:apartments.filter(a=>a.status.toUpperCase()==='APPROVED').length
    }
  };
}

function updateServiceGridStatusV961(email,pin,gridId,channel,status){
  requireAdmin_(email,pin);gridId=s_(gridId);channel=s_(channel).toUpperCase();status=s_(status).toUpperCase();
  if(!gridId)throw new Error('Grid ID is required.');
  if(['B2C','B2B'].indexOf(channel)<0)throw new Error('Choose B2C or B2B.');
  if(['OPEN','CLOSED','COMING_SOON','PAUSED'].indexOf(status)<0)throw new Error('Invalid service status.');
  const sh=v961SeedGridsIfNeeded_(),rows=v961Rows_(sh),hit=rows.find(r=>s_(r['Grid ID'])===gridId);
  if(!hit)throw new Error('Grid not found: '+gridId);
  const map=map_(sh),field=channel+' Status';
  set_(sh,hit._row,map,field,status);set_(sh,hit._row,map,'Updated At',now_());set_(sh,hit._row,map,'Updated By',s_(email).toLowerCase());
  return {success:true,gridId:gridId,channel:channel,status:status};
}

function bulkSetServiceRadiusV961(email,pin,channel,maxDistanceKm,status){
  requireAdmin_(email,pin);channel=s_(channel).toUpperCase();status=s_(status).toUpperCase();maxDistanceKm=Number(maxDistanceKm);
  if(['B2C','B2B'].indexOf(channel)<0)throw new Error('Choose B2C or B2B.');
  if(!isFinite(maxDistanceKm)||maxDistanceKm<0||maxDistanceKm>V961_B2B_RADIUS_KM)throw new Error('Invalid radius.');
  if(['OPEN','CLOSED','COMING_SOON','PAUSED'].indexOf(status)<0)throw new Error('Invalid service status.');
  const sh=v961SeedGridsIfNeeded_(),rows=v961Rows_(sh),map=map_(sh),field=channel+' Status',fieldCol=map[field],atCol=map['Updated At'],byCol=map['Updated By'];
  let changed=0;
  rows.forEach(r=>{
    if(n_(r['Distance KM'])<=maxDistanceKm){
      sh.getRange(r._row,fieldCol).setValue(status);if(atCol)sh.getRange(r._row,atCol).setValue(now_());if(byCol)sh.getRange(r._row,byCol).setValue(s_(email).toLowerCase());changed++;
    }
  });
  return {success:true,changed:changed,channel:channel,status:status,maxDistanceKm:maxDistanceKm};
}

function saveApartmentServiceOverrideV961(email,pin,payload){
  requireAdmin_(email,pin);const p=payload||{},name=s_(p.apartmentName),status=s_(p.status||'APPROVED').toUpperCase();
  const lat=Number(p.lat),lng=Number(p.lng),mobile=digits_(p.mobile);
  if(!name)throw new Error('Apartment name is required.');
  if(!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('Valid apartment latitude and longitude are required.');
  if(['PENDING','APPROVED','REJECTED','PAUSED','REVOKED'].indexOf(status)<0)throw new Error('Invalid apartment status.');
  const gridRows=v961Rows_(v961SeedGridsIfNeeded_()),grid=v961GridForPoint_(lat,lng,gridRows);
  if(!grid)throw new Error('Apartment is outside the current 20 km service grid.');
  const sh=v961EnsureSheet_(V961_APARTMENT_SHEET,V961_APARTMENT_HEADERS),rows=v961Rows_(sh),id=s_(p.apartmentId)||id_('APT-'),hit=rows.find(r=>s_(r['Apartment ID'])===id),now=now_();
  const data={
    'Apartment ID':id,'Apartment Name':name,'Contact Name':s_(p.contactName),Mobile:mobile,Address:s_(p.address),Latitude:lat,Longitude:lng,'Grid ID':s_(grid['Grid ID']),
    Status:status,'Subscription Only':'YES','Approved At':status==='APPROVED'?now:'','Approved By':status==='APPROVED'?s_(email).toLowerCase():'',Notes:s_(p.notes),'Updated At':now
  };
  if(hit)updateObj_(V961_APARTMENT_SHEET,hit._row,data);
  else{data['Created At']=now;append_(V961_APARTMENT_SHEET,data);}
  return {success:true,apartmentId:id,gridId:s_(grid['Grid ID']),status:status};
}

/**
 * Read-only future app serviceability API. Not wired into production checkout yet.
 * An approved apartment exception requires the exact apartmentId and the customer
 * location to be within 250 metres of that registered apartment point.
 */
function checkServiceabilityV961(lat,lng,channel,apartmentId){
  lat=Number(lat);lng=Number(lng);channel=s_(channel||'B2C').toUpperCase();
  if(!isFinite(lat)||!isFinite(lng))throw new Error('Invalid location.');
  if(['B2C','B2B'].indexOf(channel)<0)throw new Error('Invalid channel.');
  const gridRows=v961Rows_(v961SeedGridsIfNeeded_()),row=v961GridForPoint_(lat,lng,gridRows),grid=row?v961GridPublic_(row):null,d=haversine_(V961_HUB,{lat:lat,lng:lng});
  if(channel==='B2B'){
    const eligible=!!(grid&&d<=V961_B2B_RADIUS_KM&&grid.b2bStatus==='OPEN');
    return {eligible:eligible,channel:'B2B',gridId:grid?grid.gridId:'',distanceKm:safeRound_(d,2),status:grid?grid.b2bStatus:'OUTSIDE',message:eligible?'Service available':V961_COMING_SOON};
  }
  const regular=!!(grid&&d<=V961_B2C_RADIUS_KM&&grid.b2cStatus==='OPEN');
  let apartmentApproved=false,apartmentName='';
  if(!regular&&s_(apartmentId)){
    const sh=v961EnsureSheet_(V961_APARTMENT_SHEET,V961_APARTMENT_HEADERS),a=v961Rows_(sh).find(r=>s_(r['Apartment ID'])===s_(apartmentId)&&s_(r.Status).toUpperCase()==='APPROVED');
    if(a){const ad=haversine_({lat:n_(a.Latitude),lng:n_(a.Longitude)},{lat:lat,lng:lng});apartmentApproved=ad<=0.25;apartmentName=s_(a['Apartment Name']);}
  }
  return {
    eligible:regular||apartmentApproved,channel:'B2C',gridId:grid?grid.gridId:'',distanceKm:safeRound_(d,2),status:regular?'OPEN':apartmentApproved?'APARTMENT_APPROVED':grid?grid.b2cStatus:'OUTSIDE',
    apartmentApproved:apartmentApproved,apartmentName:apartmentName,message:(regular||apartmentApproved)?'Service available':V961_COMING_SOON
  };
}
