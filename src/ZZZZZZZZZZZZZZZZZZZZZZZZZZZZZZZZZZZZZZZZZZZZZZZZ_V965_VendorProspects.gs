/** Native Elaneeru V9.6.5 — Vendor Prospect Queue for field onboarding. */
const V965_VENDOR_PROSPECTS_VERSION='9.6.5';
const V965_VENDOR_PROSPECTS_SHEET='Vendor_Prospects';

function v965ProspectSheet_(){
  const ss=ss_(),sh=ss.getSheetByName(V965_VENDOR_PROSPECTS_SHEET);
  if(!sh)throw new Error('Vendor_Prospects sheet is missing.');
  return sh;
}
function v965ProspectRows_(){
  const sh=v965ProspectSheet_(),lr=sh.getLastRow(),lc=sh.getLastColumn();
  if(lr<2||lc<1)return [];
  const vals=sh.getRange(1,1,lr,lc).getDisplayValues(),h=vals[0].map(s_);
  return vals.slice(1).map(function(r,i){
    const o={_row:i+2};h.forEach(function(k,j){if(k)o[k]=r[j]});return o;
  });
}
function v965ProspectPublic_(r){
  return {
    prospectId:s_(r['Prospect ID']),priority:s_(r.Priority),vendorName:s_(r['Vendor Name']),
    area:s_(r.Area),address:s_(r.Address),phone:digits_(r.Phone),rating:s_(r.Rating),
    reviewCount:s_(r['Review Count']),leadType:s_(r['Lead Type']),verification:s_(r.Verification),
    listingStatus:s_(r['Listing Status']),directions:s_(r.Directions),sourceUrl:s_(r['Source URL']),
    onboardingStatus:s_(r['Onboarding Status']||'Not Contacted'),ownerName:s_(r['Owner Name']),
    dailyQty:s_(r['Daily Qty']),currentBuyPrice:s_(r['Current Buy Price']),
    neOfferedPrice:s_(r['NE Offered Price']),nextFollowup:s_(r['Next Follow-up']),
    assignedTo:s_(r['Assigned To']),remarks:s_(r.Remarks),googlePlaceId:s_(r['Google Place ID'])
  };
}
function getVendorProspectsV965(token,filters){
  const staff=v949VendorSessionStaff_(token,true).user, f=filters||{};
  const q=s_(f.query).toLowerCase(),area=s_(f.area).toLowerCase(),status=s_(f.status).toLowerCase();
  let rows=v965ProspectRows_();
  rows=rows.filter(function(r){
    const hay=[r['Prospect ID'],r['Vendor Name'],r.Area,r.Address,r.Phone].map(s_).join(' ').toLowerCase();
    if(q&&hay.indexOf(q)===-1)return false;
    if(area&&s_(r.Area).toLowerCase()!==area)return false;
    if(status&&s_(r['Onboarding Status']).toLowerCase()!==status)return false;
    return true;
  });
  const priorityRank={P1:1,P2:2,P3:3};
  rows.sort(function(a,b){
    return (priorityRank[s_(a.Priority).toUpperCase()]||9)-(priorityRank[s_(b.Priority).toUpperCase()]||9)
      || s_(a.Area).localeCompare(s_(b.Area))
      || s_(a['Vendor Name']).localeCompare(s_(b['Vendor Name']));
  });
  return {ok:true,version:V965_VENDOR_PROSPECTS_VERSION,staffId:staff.staffId,total:rows.length,
    areas:Array.from(new Set(v965ProspectRows_().map(function(x){return s_(x.Area)}).filter(Boolean))).sort(),
    prospects:rows.slice(0,500).map(v965ProspectPublic_)};
}
function updateVendorProspectStatusV965(token,prospectId,status,remarks){
  const staff=v949VendorSessionStaff_(token,true).user;
  const allowed=['NOT CONTACTED','CONTACTED','VISIT PLANNED','VISITED','INTERESTED','TRIAL','ONBOARDED','NOT INTERESTED','INVALID LEAD'];
  status=s_(status).toUpperCase();if(allowed.indexOf(status)===-1)throw new Error('Invalid prospect status.');
  const row=v965ProspectRows_().find(function(x){return s_(x['Prospect ID'])===s_(prospectId)});
  if(!row)throw new Error('Prospect not found.');
  const sh=v965ProspectSheet_(),m=map_(sh);
  set_(sh,row._row,m,'Onboarding Status',status.replace(/\b\w/g,function(c){return c.toUpperCase()}));
  set_(sh,row._row,m,'Assigned To',staff.name+' ('+staff.staffId+')');
  if(s_(remarks))set_(sh,row._row,m,'Remarks',s_(remarks));
  return {ok:true,prospectId:s_(prospectId),status:status};
}
function getVendorProspectsHealthV965(){
  return {ok:true,version:V965_VENDOR_PROSPECTS_VERSION,sheet:V965_VENDOR_PROSPECTS_SHEET,readOnlyVendorCreation:true};
}
