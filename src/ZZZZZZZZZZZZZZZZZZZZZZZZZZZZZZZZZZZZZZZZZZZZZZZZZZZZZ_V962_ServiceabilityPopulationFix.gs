/** Native Elaneeru V9.6.5 — complete serviceability population + live manual-sheet visibility.
 *
 * Approved population:
 * - B2C Customers master
 * - approved B2B_Vendors master
 *
 * Map visibility also includes unapproved/manual Vendor_Onboarding leads with GPS.
 * They remain clearly flagged as B2B_PENDING and are NOT counted as approved
 * customers/vendors. This lets Admin immediately see manual sheet corrections
 * without changing approval, pricing, credit, ordering, or serviceability rules.
 */
const V962_SERVICE_POPULATION_VERSION='9.6.5';
const V962_PREVIOUS_GET_SERVICEABILITY_ADMIN=getServiceabilityAdminV961;

function v962ValidLatLng_(lat,lng){
  lat=Number(lat);lng=Number(lng);
  return isFinite(lat)&&isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&lat!==0&&lng!==0;
}

function v962Locate_(lat,lng,gridRows){
  const hasLocation=v962ValidLatLng_(lat,lng);
  if(!hasLocation)return {hasLocation:false,lat:null,lng:null,distanceKm:null,grid:null,gridPublic:null};
  lat=Number(lat);lng=Number(lng);
  const grid=v961GridForPoint_(lat,lng,gridRows),g=grid?v961GridPublic_(grid):null,d=haversine_(V961_HUB,{lat:lat,lng:lng});
  return {hasLocation:true,lat:lat,lng:lng,distanceKm:safeRound_(d,2),grid:grid,gridPublic:g};
}

function v962B2BVendorPublic_(v,gridRows,onboardingById){
  const loc=v962Locate_(v.Latitude,v.Longitude,gridRows),g=loc.gridPublic,mobile=digits_(v.Mobile),onboardingId=s_(v['Onboarding ID']);
  const onb=onboardingById[onboardingId]||{};
  const regularB2C=!!(g&&loc.distanceKm<=V961_B2C_RADIUS_KM&&g.b2cStatus==='OPEN');
  const b2bOpen=!!(g&&loc.distanceKm<=V961_B2B_RADIUS_KM&&g.b2bStatus==='OPEN');
  return {
    customerId:s_(v['Vendor ID'])||('VEN-'+mobile),vendorId:s_(v['Vendor ID']),partyType:'B2B',source:'B2B_Vendors',approved:true,
    name:s_(v['Business Name'])||s_(v['Owner Name'])||mobile,businessName:s_(v['Business Name']),ownerName:s_(v['Owner Name']),vendorType:s_(v['Vendor Type']),
    mobile:mobile,address:s_(v.Address),area:s_(v.Area),pincode:s_(v.Pincode),status:s_(v.Status)||'ACTIVE',
    lat:loc.lat,lng:loc.lng,hasLocation:loc.hasLocation,distanceKm:loc.distanceKm,
    gridId:g?g.gridId:'',cluster:g?g.cluster:'',
    b2cService:regularB2C?'OPEN':loc.hasLocation?'COMING_SOON':'LOCATION_NEEDED',
    b2bService:b2bOpen?'OPEN':loc.hasLocation?'CLOSED':'LOCATION_NEEDED',
    subscriptionStatus:'',subscriptionId:'',onboardingId:onboardingId,
    expectedDailyQty:n_(onb['Expected Daily Qty']),currentBuyingPrice:n_(onb['Current Buying Price']),agreedPrice:n_(onb['Agreed Price']),
    deliveryFrequency:s_(v['Delivery Frequency']),preferredTime:s_(v['Preferred Time']),moq:n_(v.MOQ)
  };
}

function v962PendingOnboarding_(gridRows,approvedOnboardingIds){
  const latest={};
  rows_(V8.SHEETS.VENDOR_ONBOARD).forEach(function(r){
    const onboardingId=s_(r['Onboarding ID']),mobile=digits_(r.Mobile),status=s_(r.Status).toUpperCase();
    if(!onboardingId||approvedOnboardingIds[onboardingId]||s_(r['Approved Vendor ID'])||status==='APPROVED'||status==='REJECTED')return;
    const key=mobile||onboardingId,old=latest[key];if(!old||r._row>old._row)latest[key]=r;
  });
  return Object.keys(latest).map(function(key){
    const r=latest[key],loc=v962Locate_(r.Latitude,r.Longitude,gridRows),g=loc.gridPublic;
    const regularB2C=!!(g&&loc.distanceKm<=V961_B2C_RADIUS_KM&&g.b2cStatus==='OPEN');
    const b2bOpen=!!(g&&loc.distanceKm<=V961_B2B_RADIUS_KM&&g.b2bStatus==='OPEN');
    return {
      customerId:s_(r['Onboarding ID']),onboardingId:s_(r['Onboarding ID']),partyType:'B2B_PENDING',source:'Vendor_Onboarding',approved:false,
      name:s_(r['Business Name'])||s_(r['Owner Name'])||digits_(r.Mobile),businessName:s_(r['Business Name']),ownerName:s_(r['Owner Name']),vendorType:s_(r['Vendor Type']),
      mobile:digits_(r.Mobile),area:s_(r.Area),address:s_(r.Address),pincode:s_(r.Pincode),status:s_(r.Status)||'PENDING',
      lat:loc.lat,lng:loc.lng,hasLocation:loc.hasLocation,distanceKm:loc.distanceKm,gridId:g?g.gridId:'',cluster:g?g.cluster:'',
      b2cService:regularB2C?'OPEN':loc.hasLocation?'COMING_SOON':'LOCATION_NEEDED',
      b2bService:b2bOpen?'OPEN':loc.hasLocation?'CLOSED':'LOCATION_NEEDED',
      subscriptionStatus:'',subscriptionId:'',
      expectedDailyQty:n_(r['Expected Daily Qty']),currentBuyingPrice:n_(r['Current Buying Price']),agreedPrice:n_(r['Agreed Price'])
    };
  }).sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});
}

function getServiceabilityAdminV962_(email,pin){
  const base=V962_PREVIOUS_GET_SERVICEABILITY_ADMIN(email,pin),gridRows=v961Rows_(v961SeedGridsIfNeeded_());
  const onboardingRows=rows_(V8.SHEETS.VENDOR_ONBOARD),onboardingById={};onboardingRows.forEach(function(r){const id=s_(r['Onboarding ID']);if(id)onboardingById[id]=r;});
  const b2c=(base.customers||[]).map(function(c){const out=Object.assign({},c);out.partyType='B2C';out.source='Customers';out.approved=true;return out;});
  const vendors=rows_(V8.SHEETS.B2B_VENDORS).filter(function(v){return s_(v['Vendor ID'])||digits_(v.Mobile);}).map(function(v){return v962B2BVendorPublic_(v,gridRows,onboardingById);});
  const approvedOnboardingIds={};vendors.forEach(function(v){if(v.onboardingId)approvedOnboardingIds[v.onboardingId]=true;});
  const pending=v962PendingOnboarding_(gridRows,approvedOnboardingIds);
  const approved=b2c.concat(vendors),mapPopulation=approved.concat(pending);
  base.version=V962_SERVICE_POPULATION_VERSION;
  // `customers` is the map/table population. Pending leads are visible but remain approved:false.
  base.customers=mapPopulation;
  base.approvedCustomers=approved;
  base.b2cCustomers=b2c;
  base.b2bCustomers=vendors;
  base.pendingOnboarding=pending;
  base.mapPopulation=mapPopulation;
  base.summary=Object.assign({},base.summary||{}, {
    // Keep approval metrics honest: pending/manual leads do not inflate approved customers.
    customers:approved.length,
    approvedCustomers:approved.length,
    mapPopulation:mapPopulation.length,
    b2cCustomers:b2c.length,
    b2bCustomers:vendors.length,
    pendingB2BOnboarding:pending.length,
    pendingB2BMapped:pending.filter(function(c){return c.hasLocation;}).length,
    customersMapped:approved.filter(function(c){return c.hasLocation;}).length,
    customersNeedLocation:approved.filter(function(c){return !c.hasLocation;}).length,
    b2cOpenCustomers:b2c.filter(function(c){return c.b2cService==='OPEN';}).length,
    b2bOpenCustomers:vendors.filter(function(c){return c.b2bService==='OPEN';}).length,
    activeSubscriptions:b2c.filter(function(c){return c.subscriptionStatus&&String(c.subscriptionStatus).toUpperCase()!=='CANCELLED';}).length
  });
  return base;
}

getServiceabilityAdminV961=getServiceabilityAdminV962_;

function getServiceabilityPopulationHealthV962(){
  return {
    ok:true,version:V962_SERVICE_POPULATION_VERSION,
    b2cSource:'Customers',b2bSource:'B2B_Vendors',pendingSource:'Vendor_Onboarding',
    manualPendingRowsVisibleOnMap:true,pendingExcludedFromApprovedCounts:true,missingGpsRetained:true
  };
}
