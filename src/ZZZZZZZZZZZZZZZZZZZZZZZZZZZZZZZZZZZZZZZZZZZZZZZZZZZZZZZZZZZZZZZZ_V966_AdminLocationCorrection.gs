/** Native Elaneeru V9.6.6 — Admin customer/vendor location correction.
 *
 * Admin-only write endpoint used by Service Areas.
 * It updates only Latitude / Longitude (and Updated At when that header exists)
 * for an already-existing B2C customer, approved B2B vendor, or pending B2B
 * onboarding lead. No customer/vendor is created and no commercial field is
 * changed.
 */
const V966_ADMIN_LOCATION_VERSION='9.6.6';

function v966LocationTarget_(source){
  source=s_(source);
  if(source==='Customers')return {sheet:V8.SHEETS.CUSTOMERS,idColumn:'Customer ID',type:'B2C'};
  if(source==='B2B_Vendors')return {sheet:V8.SHEETS.B2B_VENDORS,idColumn:'Vendor ID',type:'B2B'};
  if(source==='Vendor_Onboarding')return {sheet:V8.SHEETS.VENDOR_ONBOARD,idColumn:'Onboarding ID',type:'B2B_PENDING'};
  throw new Error('Unsupported location source.');
}

function v966ValidCoordinate_(lat,lng){
  lat=Number(lat);lng=Number(lng);
  return isFinite(lat)&&isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180&&lat!==0&&lng!==0;
}

function saveAdminPartyLocationV966(email,pin,payload){
  requireAdmin_(email,pin);
  payload=payload||{};
  const target=v966LocationTarget_(payload.source);
  const referenceId=s_(payload.referenceId);
  const lat=Number(payload.latitude),lng=Number(payload.longitude);
  if(!referenceId)throw new Error('Customer/vendor reference is required.');
  if(!v966ValidCoordinate_(lat,lng))throw new Error('Enter a valid latitude and longitude.');

  return lockRun_(function(){
    const hit=rows_(target.sheet).find(function(r){return s_(r[target.idColumn])===referenceId;});
    if(!hit)throw new Error('Customer/vendor record was not found. Refresh Service Areas and try again.');

    updateObj_(target.sheet,hit._row,{
      Latitude:lat,
      Longitude:lng,
      'Updated At':now_()
    });

    const saved=rows_(target.sheet).find(function(r){return s_(r[target.idColumn])===referenceId;});
    if(!saved||!v966ValidCoordinate_(saved.Latitude,saved.Longitude)||
       Math.abs(Number(saved.Latitude)-lat)>0.0000001||
       Math.abs(Number(saved.Longitude)-lng)>0.0000001){
      throw new Error('Location could not be verified after saving.');
    }

    return {
      success:true,
      version:V966_ADMIN_LOCATION_VERSION,
      source:payload.source,
      partyType:target.type,
      referenceId:referenceId,
      latitude:Number(saved.Latitude),
      longitude:Number(saved.Longitude),
      updatedAt:fmtDT_(saved['Updated At']||new Date())
    };
  });
}

function getAdminLocationCorrectionHealthV966(){
  return {
    ok:true,
    version:V966_ADMIN_LOCATION_VERSION,
    adminOnly:true,
    createsCustomer:false,
    createsVendor:false,
    changesCommercials:false,
    supportedSources:['Customers','B2B_Vendors','Vendor_Onboarding']
  };
}
