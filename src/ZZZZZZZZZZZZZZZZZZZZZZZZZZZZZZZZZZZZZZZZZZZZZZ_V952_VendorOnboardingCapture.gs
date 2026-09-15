/** Native Elaneeru V9.5.2 — complete Vendor Onboarding capture + activation repair. */
const V952_VENDOR_CAPTURE_VERSION='9.5.2';
const V952_VENDOR_ONBOARDING_HEADERS=['Product Name'];

function v952EnsureVendorOnboardingCaptureHeaders_(){
  const sh=sh_(V8.SHEETS.VENDOR_ONBOARD),lc=sh.getLastColumn();
  if(lc<1)return sh;
  const h=sh.getRange(1,1,1,lc).getValues()[0].map(s_);
  const missing=V952_VENDOR_ONBOARDING_HEADERS.filter(function(x){return !h.includes(x);});
  if(missing.length)sh.getRange(1,lc+1,1,missing.length).setValues([missing]);
  return sh;
}

function v952RequireCompleteVendorCapture_(p){
  p=p||{};
  const mobile=digits_(p.mobile),pin=s_(p.pincode),lat=Number(p.latitude),lng=Number(p.longitude);
  if(!s_(p.businessName))throw new Error('Business name is required.');
  if(!s_(p.ownerName))throw new Error('Owner name is required.');
  if(!/^[6-9]\d{9}$/.test(mobile))throw new Error('Enter a valid vendor mobile number.');
  if(!s_(p.vendorType))throw new Error('Vendor type is required.');
  if(!s_(p.area))throw new Error('Area is required.');
  if(!s_(p.address))throw new Error('Full address is required.');
  if(!/^\d{6}$/.test(pin))throw new Error('Enter a valid 6 digit pincode.');
  if(!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||(lat===0&&lng===0))throw new Error('Capture the vendor GPS location before submitting.');
  if(n_(p.expectedDailyQty)<=0)throw new Error('Expected daily quantity is required.');
  if(n_(p.currentBuyingPrice)<=0)throw new Error('Current buying price is required.');
  if(n_(p.agreedPrice)<=0)throw new Error('Agreed price is required.');
  if(n_(p.moq)<=0)throw new Error('MOQ is required.');
  if(!s_(p.deliveryFrequency))throw new Error('Delivery frequency is required.');
  if(!s_(p.preferredTime))throw new Error('Preferred delivery time is required.');
  if(!s_(p.plannedStartDate))throw new Error('Planned start date is required.');
  if(!s_(p.productId))throw new Error('Select a product before submitting.');
  return true;
}

function v952RepairActivatedVendorCapture_(onboardingId,activation){
  v952EnsureVendorOnboardingCaptureHeaders_();
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(function(r){return s_(r['Onboarding ID'])===s_(onboardingId);});
  if(!row)return activation;
  const vendorId=s_((activation&&activation.vendorId)||row['Approved Vendor ID']);
  if(vendorId){
    const vendor=rows_(V8.SHEETS.B2B_VENDORS).find(function(v){return s_(v['Vendor ID'])===vendorId;});
    if(vendor){
      updateObj_(V8.SHEETS.B2B_VENDORS,vendor._row,{
        'Customer Photo URL':s_(row['Customer Photo URL']),
        'Shop Photo URL':s_(row['Shop Photo URL']),
        'Onboarding ID':s_(row['Onboarding ID']),
        'Updated At':now_()
      });
    }
  }
  const targetId=s_(row['Target ID']);
  if(targetId){
    const target=rows_(V8.SHEETS.B2B_TARGETS).find(function(t){return s_(t['Target ID'])===targetId;});
    if(target){
      updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{
        'Target Qty':n_(target['Target Qty']),
        'Target Reward':s_(target['Reward Text']),
        'Updated At':now_()
      });
    }
  }
  return activation;
}

/* Validate the complete capture before the existing secure V949 session submit. */
const V952_BASE_VENDOR_ONBOARDING_SESSION_SUBMIT=submitVendorOnboardingSessionV949;
submitVendorOnboardingSessionV949=function(token,p){
  v952EnsureVendorOnboardingCaptureHeaders_();
  v952RequireCompleteVendorCapture_(p);
  const out=V952_BASE_VENDOR_ONBOARDING_SESSION_SUBMIT.apply(this,arguments);
  try{
    const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(function(r){return s_(r['Onboarding ID'])===s_(out&&out.onboardingId);});
    if(row&&s_(p&&p.productName))updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{'Product Name':s_(p.productName),'Updated At':now_()});
  }catch(e){}
  return out;
};

/* Repair the fields the V935 instant-activation path used to omit. */
const V952_BASE_ACTIVATE_VENDOR_ONBOARDING=activateVendorOnboardingV935_;
activateVendorOnboardingV935_=function(onboardingId,initialPin,by){
  const out=V952_BASE_ACTIVATE_VENDOR_ONBOARDING.apply(this,arguments);
  return v952RepairActivatedVendorCapture_(onboardingId,out);
};

function getVendorOnboardingCaptureHealthV952(){
  return {
    ok:true,version:V952_VENDOR_CAPTURE_VERSION,
    completeFieldValidation:true,productNameCaptured:true,
    vendorPhotosCopied:true,targetSummaryCaptured:true,
    createsTestVendor:false
  };
}
