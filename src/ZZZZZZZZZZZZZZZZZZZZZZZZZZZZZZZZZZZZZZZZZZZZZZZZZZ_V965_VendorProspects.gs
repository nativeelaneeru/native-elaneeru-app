/** Native Elaneeru V9.6.5 — secure Bengaluru vendor prospect queue. */
const V965_VENDOR_PROSPECT_VERSION='9.6.5';
const V965_VENDOR_PROSPECT_SPREADSHEET_ID='1FgMLO5QSp0JnTEaozRnCGtB7LugmCftjghIPo2PiKQE';
const V965_VENDOR_PROSPECT_SHEET='App Import';

function v965ProspectSheet_(){
  const ss=SpreadsheetApp.openById(V965_VENDOR_PROSPECT_SPREADSHEET_ID);
  const sh=ss.getSheetByName(V965_VENDOR_PROSPECT_SHEET);
  if(!sh)throw new Error('Vendor prospect queue is unavailable.');
  return sh;
}

function v965ProspectRows_(){
  const sh=v965ProspectSheet_(),lr=sh.getLastRow(),lc=sh.getLastColumn();
  if(lr<2||lc<1)return [];
  const values=sh.getRange(1,1,lr,lc).getDisplayValues(),headers=values[0].map(s_);
  return values.slice(1).map(function(row,i){
    const out={_row:i+2};
    headers.forEach(function(h,j){if(h)out[h]=row[j]||'';});
    return out;
  }).filter(function(r){return s_(r['Prospect ID']);});
}

function v965ProspectPublic_(r){
  return {
    prospectId:s_(r['Prospect ID']),
    businessName:s_(r['Business Name']),
    vendorType:s_(r['Vendor Type']||'Local Tender Coconut Vendor'),
    phone:digits_(r.Phone),
    area:s_(r.Area),
    address:s_(r.Address),
    placeId:s_(r['Google Place ID']),
    directionsUrl:s_(r['Directions URL']),
    mapsUrl:s_(r['Maps URL']),
    leadSource:s_(r['Lead Source']),
    leadConfidence:s_(r['Lead Confidence']),
    priority:s_(r.Priority).toUpperCase(),
    status:s_(r['Prospect Status']||'NEW').toUpperCase(),
    assignedTo:s_(r['Assigned To']),
    ownerName:s_(r['Owner Name']),
    whatsapp:digits_(r.WhatsApp),
    dailyQty:n_(r['Daily Qty']),
    currentBuyingPrice:n_(r['Current CP']),
    sellingPrice:n_(r['Selling Price']),
    neOfferedPrice:n_(r['NE Offered Price']),
    trialQty:n_(r['Trial Qty']),
    lastVisit:s_(r['Last Visit']),
    nextFollowUp:s_(r['Next Follow-up']),
    notes:s_(r.Notes)
  };
}

function getVendorProspectsV965(token,filters){
  const u=v949VendorSessionStaff_(token,true).user;
  filters=filters||{};
  const q=s_(filters.q).toLowerCase(),priority=s_(filters.priority).toUpperCase();
  const area=s_(filters.area).toLowerCase(),includeClosed=!!filters.includeClosed;
  let rows=v965ProspectRows_();
  if(!includeClosed)rows=rows.filter(function(r){
    return ['ONBOARDED','NOT_INTERESTED','DUPLICATE','REJECTED'].indexOf(s_(r['Prospect Status']).toUpperCase())===-1;
  });
  if(priority)rows=rows.filter(function(r){return s_(r.Priority).toUpperCase()===priority;});
  if(area)rows=rows.filter(function(r){return s_(r.Area).toLowerCase()===area;});
  if(q)rows=rows.filter(function(r){
    return [r['Prospect ID'],r['Business Name'],r.Phone,r.Area,r.Address]
      .map(s_).join(' ').toLowerCase().indexOf(q)!==-1;
  });
  const order={P1:1,P2:2,P3:3};
  rows.sort(function(a,b){
    const pa=order[s_(a.Priority).toUpperCase()]||9,pb=order[s_(b.Priority).toUpperCase()]||9;
    if(pa!==pb)return pa-pb;
    const aa=s_(a.Area),ab=s_(b.Area);
    return aa.localeCompare(ab)||s_(a['Business Name']).localeCompare(s_(b['Business Name']));
  });
  const prospects=rows.slice(0,300).map(v965ProspectPublic_);
  const areas=[...new Set(rows.map(function(r){return s_(r.Area);}).filter(Boolean))].sort();
  return {ok:true,version:V965_VENDOR_PROSPECT_VERSION,count:prospects.length,totalOpen:rows.length,areas:areas,prospects:prospects,staffId:u.staffId};
}

function updateVendorProspectStatusV965(token,prospectId,status,note){
  const u=v949VendorSessionStaff_(token,true).user;
  prospectId=s_(prospectId);status=s_(status).toUpperCase();
  const allowed=['NEW','CONTACTED','VISIT_PLANNED','NOT_INTERESTED','ONBOARDED','DUPLICATE','REJECTED'];
  if(!prospectId)throw new Error('Prospect ID is required.');
  if(allowed.indexOf(status)===-1)throw new Error('Invalid prospect status.');
  const sh=v965ProspectSheet_(),lc=sh.getLastColumn();
  const headers=sh.getRange(1,1,1,lc).getDisplayValues()[0].map(s_),m={};
  headers.forEach(function(h,i){if(h)m[h]=i+1;});
  const ids=sh.getRange(2,m['Prospect ID'],Math.max(0,sh.getLastRow()-1),1).getDisplayValues();
  let row=0;
  for(let i=0;i<ids.length;i++){if(s_(ids[i][0])===prospectId){row=i+2;break;}}
  if(!row)throw new Error('Prospect not found: '+prospectId);
  const now=now_(),actor=u.name+' ('+u.staffId+')';
  sh.getRange(row,m['Prospect Status']).setValue(status);
  if(m['Assigned To']&&!s_(sh.getRange(row,m['Assigned To']).getValue()))sh.getRange(row,m['Assigned To']).setValue(actor);
  if(m['Last Visit']&&['CONTACTED','VISIT_PLANNED','ONBOARDED','NOT_INTERESTED'].indexOf(status)!==-1)sh.getRange(row,m['Last Visit']).setValue(now);
  if(m.Notes&&s_(note)){
    const old=s_(sh.getRange(row,m.Notes).getValue());
    const stamp=Utilities.formatDate(now,'Asia/Kolkata','dd MMM yyyy HH:mm');
    sh.getRange(row,m.Notes).setValue((old?old+'\n':'')+'['+stamp+'] '+actor+': '+s_(note));
  }
  const values=sh.getRange(row,1,1,lc).getDisplayValues()[0],obj={};
  headers.forEach(function(h,i){if(h)obj[h]=values[i]||'';});
  return {ok:true,prospect:v965ProspectPublic_(obj)};
}

function getVendorProspectsHealthV965(){
  return {ok:true,version:V965_VENDOR_PROSPECT_VERSION,secureStaffSession:true,prospectCount:v965ProspectRows_().length,createsVendor:false,createsOrder:false};
}
