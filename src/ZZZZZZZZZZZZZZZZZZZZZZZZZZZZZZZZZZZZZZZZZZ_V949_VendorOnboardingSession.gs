/** Native Elaneeru V9.4.9 — persistent, revocable Vendor Onboarding staff sessions. */
const V949_VENDOR_SESSION_VERSION='9.4.9';
const V949_VENDOR_SESSION_PREFIX='V949:VO:';
const V949_VENDOR_SESSION_TTL_MS=30*24*60*60*1000;

function v949VendorSessionKey_(token){
  token=s_(token);
  if(token.length<20)throw new Error('Vendor Onboarding session is invalid. Please sign in again.');
  return V949_VENDOR_SESSION_PREFIX+hashV8_(token);
}

function v949StaffAccessFingerprint_(row){
  const apps=v917AppsForRow_(row).slice().sort().join(',');
  return hashV8_([
    s_(row&&row['Staff ID']),s_(row&&row['PIN Hash']),s_(row&&row.Role).toUpperCase(),
    apps,s_(row&&row.Status).toUpperCase()
  ].join('|'));
}

function v949PruneVendorSessions_(){
  const props=PropertiesService.getScriptProperties(),all=props.getProperties(),now=Date.now();
  Object.keys(all).forEach(function(key){
    if(key.indexOf(V949_VENDOR_SESSION_PREFIX)!==0)return;
    let rec=null;try{rec=JSON.parse(all[key]||'');}catch(e){}
    if(!rec||!rec.staffId||Number(rec.expiresAt||0)<=now)props.deleteProperty(key);
  });
}

function v949VendorSessionPublic_(u,token,expiresAt){
  return {
    staffId:u.staffId,name:u.name,mobile:u.mobile,role:u.role,allowedApps:u.allowedApps,
    products:b2bProducts_(''),sessionToken:token||'',expiresAt:Number(expiresAt||0),
    sessionVersion:V949_VENDOR_SESSION_VERSION
  };
}

function v949VendorSessionStaff_(token,refresh){
  const props=PropertiesService.getScriptProperties();
  const key=v949VendorSessionKey_(token);
  const raw=props.getProperty(key);
  if(!raw)throw new Error('Vendor Onboarding session has expired. Please sign in again.');
  let rec;
  try{rec=JSON.parse(raw);}catch(e){props.deleteProperty(key);throw new Error('Vendor Onboarding session is invalid. Please sign in again.');}
  if(!rec||!rec.staffId||Number(rec.expiresAt||0)<=Date.now()){
    props.deleteProperty(key);
    throw new Error('Vendor Onboarding session has expired. Please sign in again.');
  }
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===s_(rec.staffId)&&active_(r.Status);});
  if(!row){props.deleteProperty(key);throw new Error('Staff access is inactive. Please contact Admin.');}
  const apps=v917AppsForRow_(row);
  if(apps.indexOf('VENDOR_ONBOARDING')===-1){props.deleteProperty(key);throw new Error('Vendor Onboarding access has been removed. Please contact Admin.');}
  const fingerprint=v949StaffAccessFingerprint_(row);
  if(!rec.accessFingerprint||rec.accessFingerprint!==fingerprint){
    props.deleteProperty(key);
    throw new Error('Staff credentials or access changed. Please sign in again.');
  }
  const u={staffId:s_(row['Staff ID']),name:s_(row.Name),mobile:digits_(row.Mobile),role:s_(row.Role).toUpperCase(),allowedApps:apps};
  if(refresh!==false){
    rec.expiresAt=Date.now()+V949_VENDOR_SESSION_TTL_MS;
    props.setProperty(key,JSON.stringify(rec));
  }
  return {user:u,expiresAt:Number(rec.expiresAt||0),key:key};
}

function createVendorOnboardingSessionV949(mobile,pin){
  const u=staffAppLoginV917_(mobile,pin,'VENDOR_ONBOARDING');
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===s_(u.staffId)&&active_(r.Status);});
  if(!row)throw new Error('Staff access record was not found.');
  v949PruneVendorSessions_();
  const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  const expiresAt=Date.now()+V949_VENDOR_SESSION_TTL_MS;
  PropertiesService.getScriptProperties().setProperty(v949VendorSessionKey_(token),JSON.stringify({
    staffId:u.staffId,accessFingerprint:v949StaffAccessFingerprint_(row),createdAt:Date.now(),expiresAt:expiresAt
  }));
  return v949VendorSessionPublic_(u,token,expiresAt);
}

function resumeVendorOnboardingSessionV949(token){
  const s=v949VendorSessionStaff_(token,true);
  return v949VendorSessionPublic_(s.user,'',s.expiresAt);
}

function logoutVendorOnboardingSessionV949(token){
  try{PropertiesService.getScriptProperties().deleteProperty(v949VendorSessionKey_(token));}catch(e){}
  return true;
}

function submitVendorOnboardingSessionV949(token,p){
  const u=v949VendorSessionStaff_(token,true).user;
  p=p||{};
  const paymentMode=s_(p.paymentMode||'COD').toUpperCase();
  if(!['COD','UPI','CREDIT'].includes(paymentMode))throw new Error('Payment mode must be COD, UPI or CREDIT.');
  p.paymentMode=paymentMode;
  if(paymentMode==='CREDIT'){
    if(n_(p.creditLimit)<=0)throw new Error('Enter a valid credit limit for a CREDIT vendor.');
    p.creditDays=Math.max(0,Math.floor(n_(p.creditDays)));
    p.creditLimit=Math.max(0,n_(p.creditLimit));
  }else{
    p.creditDays=0;p.creditLimit=0;
  }
  const vendorMobile=digits_(p.mobile);
  if(!/^[6-9]\d{9}$/.test(vendorMobile))throw new Error('Enter a valid vendor mobile number.');
  const activeVendor=rows_(V8.SHEETS.B2B_VENDORS).find(function(x){return digits_(x.Mobile)===vendorMobile&&active_(x.Status);});
  if(activeVendor)throw new Error('This mobile is already active as B2B vendor '+s_(activeVendor['Vendor ID'])+'.');
  const pendingVendor=rows_(V8.SHEETS.VENDOR_ONBOARD).find(function(x){return digits_(x.Mobile)===vendorMobile&&s_(x.Status).toUpperCase()==='PENDING';});
  if(pendingVendor)throw new Error('A vendor onboarding is already pending for this mobile: '+s_(pendingVendor['Onboarding ID'])+'.');
  const liveProducts=b2bProducts_('');
  const product=liveProducts.find(function(x){return s_(x.productId)===s_(p.productId);});
  if(!product)throw new Error('Please select a LIVE B2B product.');
  if(!s_(p.ownerPhotoData)||!s_(p.shopPhotoData))throw new Error('Owner photo and shop-front photo are required.');
  p.salesExecutive=u.name+' ('+u.staffId+')';
  const initialB2BPin=String(p.initialB2BPin||'').trim();
  if(!/^\d{4,8}$/.test(initialB2BPin))throw new Error('Set a 4–8 digit B2B PIN for the vendor.');
  p.productId=product.productId;
  p.productName=product.productName;
  const r=submitV7VendorOnboarding(p);
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(function(x){return s_(x['Onboarding ID'])===s_(r.onboardingId);});
  if(!row)throw new Error('Onboarding record could not be located.');
  const capturedAt=now_();
  const ownerUrl=uploadOnboardingPhotoV840_(p.ownerPhotoData,p.ownerPhotoName||'owner.jpg',r.onboardingId,'owner');
  const shopUrl=uploadOnboardingPhotoV840_(p.shopPhotoData,p.shopPhotoName||'shop.jpg',r.onboardingId,'shop');
  updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{
    'Product ID':product.productId,'Product Name':product.productName,
    'Customer Photo URL':ownerUrl,'Shop Photo URL':shopUrl,'Photo Captured At':capturedAt,
    'Payment Mode':paymentMode,'Credit Days':p.creditDays,'Credit Limit':p.creditLimit,
    Status:'PENDING','Updated At':capturedAt
  });
  const activation=activateVendorOnboardingV935_(r.onboardingId,initialB2BPin,u.name+' ('+u.staffId+')');
  return {success:true,onboardingId:r.onboardingId,productName:product.productName,salesExecutive:u.name,status:'ACTIVE',vendorId:activation.vendorId,initialPin:initialB2BPin,paymentMode:paymentMode};
}

function getVendorOnboardingSessionHealthV949(){
  return {ok:true,version:V949_VENDOR_SESSION_VERSION,persistent:true,pinStoredInBrowser:false,serverStoresPin:false,ttlDays:30,revokesOnStaffDisable:true,revokesOnPermissionRemoval:true,revokesOnPinReset:true,revokesOnRoleOrAccessChange:true,expiredSessionsPruned:true};
}
