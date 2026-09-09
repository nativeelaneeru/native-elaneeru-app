/*******************************************************************************
 * NATIVE ELANEERU — VENDOR ONBOARDING V2
 * Sales onboarding + mandatory photos + admin approval + vendor pricing/target
 ******************************************************************************/

function vendorOnboardingPhotoRootV2_(){
  const props=PropertiesService.getScriptProperties();
  const key='VENDOR_ONBOARDING_PHOTO_FOLDER_ID_V2';
  const saved=s_(props.getProperty(key));
  if(saved){
    try{return DriveApp.getFolderById(saved);}catch(e){}
  }
  const f=DriveApp.createFolder('Native Elaneeru - Vendor Onboarding Photos');
  props.setProperty(key,f.getId());
  return f;
}

function saveVendorOnboardingPhotoV2_(folder,dataUrl,name){
  const m=String(dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if(!m) throw new Error('Invalid photo. Please capture the photo again.');
  const mime=m[1].toLowerCase();
  const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
  const bytes=Utilities.base64Decode(m[2]);
  if(bytes.length>4.5*1024*1024) throw new Error('Photo is too large. Please capture it again.');
  const file=folder.createFile(Utilities.newBlob(bytes,mime,name+'.'+ext));
  return file.getUrl();
}

function recommendedTargetQtyV2_(daily,frequency){
  daily=Math.max(0,n_(daily));
  const f=s_(frequency).toLowerCase();
  let cycles=30;
  if(f.indexOf('alternate')>=0) cycles=15;
  else if(f.indexOf('3x')>=0) cycles=13;
  else if(f==='weekly') cycles=4;
  else if(f.indexOf('on demand')>=0) cycles=8;
  return Math.max(1,Math.round(daily*cycles));
}

function submitVendorOnboardingV2(mobile,pin,p){
  const u=staffLoginV81_(mobile,pin,'SALES');
  p=p||{};
  const business=s_(p.businessName),owner=s_(p.ownerName),customerMobile=digits_(p.mobile),area=s_(p.area);
  const daily=n_(p.expectedDailyQty),agreed=n_(p.agreedPrice),productId=s_(p.productId||'TC').toUpperCase();
  if(!business||!owner||!/^[6-9]\d{9}$/.test(customerMobile)||!area) throw new Error('Business name, owner, valid mobile and area are required.');
  if(daily<=0) throw new Error('Expected daily quantity is required.');
  if(agreed<=0) throw new Error('Agreed price is required.');
  if(p.latitude===''||p.longitude===''||!isFinite(Number(p.latitude))||!isFinite(Number(p.longitude))) throw new Error('Capture shop GPS before submitting.');
  if(!s_(p.customerPhotoData)||!s_(p.shopPhotoData)) throw new Error('Customer photo and shop photo are mandatory.');
  const prod=productRows_().find(x=>s_(x['Product ID']).toUpperCase()===productId);
  if(!prod) throw new Error('Invalid product.');
  const existingVendor=rows_(V8.SHEETS.B2B_VENDORS).find(x=>digits_(x.Mobile)===customerMobile&&active_(x.Status));
  if(existingVendor) throw new Error('This mobile number is already an active B2B vendor.');
  const pending=rows_(V8.SHEETS.VENDOR_ONBOARD).find(x=>digits_(x.Mobile)===customerMobile&&s_(x.Status).toUpperCase().indexOf('PENDING')===0);
  if(pending) throw new Error('A pending onboarding already exists for this mobile: '+s_(pending['Onboarding ID']));

  return lockRun_(function(){
    const id=id_('ONB-'),root=vendorOnboardingPhotoRootV2_(),folder=root.createFolder(id+' - '+business.replace(/[\\/:*?"<>|]/g,' ').slice(0,60));
    const customerPhotoUrl=saveVendorOnboardingPhotoV2_(folder,p.customerPhotoData,'customer-photo');
    const shopPhotoUrl=saveVendorOnboardingPhotoV2_(folder,p.shopPhotoData,'shop-photo');
    const when=now_();
    append_(V8.SHEETS.VENDOR_ONBOARD,{
      'Onboarding ID':id,'Created At':when,'Sales Executive':u.name+' ('+u.staffId+')','Business Name':business,'Owner Name':owner,
      Mobile:customerMobile,WhatsApp:digits_(p.whatsapp||customerMobile),'Vendor Type':s_(p.vendorType),Area:area,Address:s_(p.address),Pincode:s_(p.pincode),
      Latitude:Number(p.latitude),Longitude:Number(p.longitude),'Expected Daily Qty':daily,'Current Buying Price':n_(p.currentBuyingPrice),'Agreed Price':agreed,
      MOQ:n_(p.moq)||n_(prod['B2B MOQ'])||20,'Delivery Frequency':s_(p.deliveryFrequency)||'Daily','Preferred Time':s_(p.preferredTime),
      'Payment Mode':'COD','Credit Days':0,'Credit Limit':0,'Planned Start Date':s_(p.plannedStartDate),'Remarks':s_(p.remarks),Status:'PENDING',
      'Approved Vendor ID':'','Updated At':when,'Customer Photo URL':customerPhotoUrl,'Shop Photo URL':shopPhotoUrl,'Photo Captured At':when,
      'Product ID':productId,'Target Qty':recommendedTargetQtyV2_(daily,p.deliveryFrequency),'Target Reward':''
    });
    append_(V8.SHEETS.AUDIT,{'Audit ID':id_('AUD-'),'Created At':when,Module:'B2B Onboarding',Action:'SUBMITTED','Reference Type':'Vendor Onboarding','Reference ID':id,'User ID':u.staffId,'Old Value':'','New Value':business+' | '+customerMobile});
    return {success:true,onboardingId:id,salesExecutive:u.name,customerPhotoUrl:customerPhotoUrl,shopPhotoUrl:shopPhotoUrl,recommendedTargetQty:recommendedTargetQtyV2_(daily,p.deliveryFrequency)};
  });
}

function getPendingVendorOnboardingsV2(email,pin){
  requireAdmin_(email,pin);
  return rows_(V8.SHEETS.VENDOR_ONBOARD)
    .filter(x=>s_(x.Status).toUpperCase().indexOf('PENDING')===0)
    .sort((a,b)=>new Date(b['Created At'])-new Date(a['Created At']))
    .map(x=>({
      onboardingId:s_(x['Onboarding ID']),createdAt:fmtDT_(x['Created At']),salesExecutive:s_(x['Sales Executive']),businessName:s_(x['Business Name']),ownerName:s_(x['Owner Name']),
      mobile:digits_(x.Mobile),whatsapp:digits_(x.WhatsApp),vendorType:s_(x['Vendor Type']),area:s_(x.Area),address:s_(x.Address),pincode:s_(x.Pincode),
      latitude:x.Latitude===''?'':n_(x.Latitude),longitude:x.Longitude===''?'':n_(x.Longitude),expectedDailyQty:n_(x['Expected Daily Qty']),currentBuyingPrice:n_(x['Current Buying Price']),
      agreedPrice:n_(x['Agreed Price']),moq:n_(x.MOQ)||20,deliveryFrequency:s_(x['Delivery Frequency']),preferredTime:s_(x['Preferred Time']),plannedStartDate:s_(x['Planned Start Date']),remarks:s_(x.Remarks),
      productId:s_(x['Product ID']||'TC'),customerPhotoUrl:s_(x['Customer Photo URL']),shopPhotoUrl:s_(x['Shop Photo URL']),photoCapturedAt:fmtDT_(x['Photo Captured At']),
      recommendedTargetQty:n_(x['Target Qty'])||recommendedTargetQtyV2_(x['Expected Daily Qty'],x['Delivery Frequency'])
    }));
}

function monthNameV2_(d){return Utilities.formatDate(d,'Asia/Kolkata','MMMM yyyy');}

function approveVendorOnboardingV2(email,pin,onboardingId,opt){
  requireAdmin_(email,pin); opt=opt||{};
  const onb=rows_(V8.SHEETS.VENDOR_ONBOARD).find(x=>s_(x['Onboarding ID'])===s_(onboardingId));
  if(!onb) throw new Error('Onboarding not found.');
  if(s_(onb.Status).toUpperCase().indexOf('PENDING')!==0) throw new Error('This onboarding is already processed.');
  const customerMobile=digits_(onb.Mobile);
  const activeVendor=rows_(V8.SHEETS.B2B_VENDORS).find(x=>digits_(x.Mobile)===customerMobile&&active_(x.Status));
  if(activeVendor) throw new Error('An active B2B vendor already exists for this mobile.');
  const productId=s_(opt.productId||onb['Product ID']||'TC').toUpperCase();
  const prod=productRows_().find(x=>s_(x['Product ID']).toUpperCase()===productId);
  if(!prod) throw new Error('Invalid product.');
  const agreed=n_(opt.agreedPrice||onb['Agreed Price']);
  const moq=n_(opt.moq||onb.MOQ||prod['B2B MOQ'])||20;
  const targetQty=Math.round(n_(opt.targetQty||onb['Target Qty']||recommendedTargetQtyV2_(onb['Expected Daily Qty'],onb['Delivery Frequency'])));
  const reward=s_(opt.rewardText||onb['Target Reward']);
  if(agreed<=0) throw new Error('Agreed price must be greater than zero.');
  if(targetQty<=0) throw new Error('Target quantity must be greater than zero.');
  if(!reward) throw new Error('Enter a clear target reward before approval.');
  let activationPin=s_(opt.initialPin);
  if(activationPin && !/^\d{4}$/.test(activationPin)) throw new Error('Initial PIN must be exactly 4 digits.');
  if(!activationPin) activationPin=String(Math.floor(1000+Math.random()*9000));

  return lockRun_(function(){
    const now=now_(),vendorId=id_('VEN-'),pricingId=id_('PRC-'),targetId=id_('TGT-');
    const startRaw=s_(onb['Planned Start Date'])||isoDate_(now),startDate=new Date(startRaw+'T00:00:00');
    const safeStart=isNaN(startDate)?new Date():startDate,endDate=new Date(safeStart.getFullYear(),safeStart.getMonth()+1,0);
    append_(V8.SHEETS.B2B_VENDORS,{
      'Vendor ID':vendorId,'Business Name':s_(onb['Business Name']),'Owner Name':s_(onb['Owner Name']),Mobile:customerMobile,WhatsApp:digits_(onb.WhatsApp||customerMobile),
      'Vendor Type':s_(onb['Vendor Type']),Area:s_(onb.Area),Address:s_(onb.Address),Pincode:s_(onb.Pincode),Latitude:onb.Latitude,Longitude:onb.Longitude,
      'Payment Type':'COD','Credit Days':0,'Credit Limit':0,Outstanding:0,MOQ:moq,'Delivery Frequency':s_(onb['Delivery Frequency']),'Preferred Time':s_(onb['Preferred Time']),
      'PIN Hash':hashV8_(activationPin),Status:'ACTIVE','Created At':now,'Updated At':now,'Last Login':'','Customer Photo URL':s_(onb['Customer Photo URL']),'Shop Photo URL':s_(onb['Shop Photo URL']),'Onboarding ID':s_(onb['Onboarding ID'])
    });
    append_(V8.SHEETS.VENDOR_PRICING,{'Pricing ID':pricingId,'Vendor ID':vendorId,'Product ID':productId,'Agreed Price':agreed,MOQ:moq,'Qty Step':n_(prod['Qty Step'])||1,'Valid From':isoDate_(safeStart),'Valid To':'',Status:'ACTIVE','Updated At':now});
    append_(V8.SHEETS.B2B_TARGETS,{'Target ID':targetId,'Vendor ID':vendorId,'Target Name':monthNameV2_(safeStart)+' Partner Target','Start Date':isoDate_(safeStart),'End Date':isoDate_(endDate),'Target Qty':targetQty,'Reward Text':reward,Status:'ACTIVE','Notes':'Created from onboarding '+s_(onb['Onboarding ID']),'Updated At':now});
    updateObj_(V8.SHEETS.VENDOR_ONBOARD,onb._row,{
      Status:'APPROVED','Approved Vendor ID':vendorId,'Updated At':now,'Approved At':now,'Approved By':s_(email).toLowerCase(),'Pricing ID':pricingId,'Target ID':targetId,
      'Initial PIN Set':'YES','Product ID':productId,'Agreed Price':agreed,MOQ:moq,'Target Qty':targetQty,'Target Reward':reward
    });
    append_(V8.SHEETS.AUDIT,{'Audit ID':id_('AUD-'),'Created At':now,Module:'B2B Onboarding',Action:'APPROVED','Reference Type':'Vendor','Reference ID':vendorId,'User ID':s_(email).toLowerCase(),'Old Value':s_(onb['Onboarding ID']),'New Value':JSON.stringify({pricingId:pricingId,targetId:targetId,price:agreed,targetQty:targetQty})});
    return {success:true,onboardingId:s_(onb['Onboarding ID']),vendorId:vendorId,pricingId:pricingId,targetId:targetId,activationPin:activationPin,businessName:s_(onb['Business Name']),mobile:customerMobile,agreedPrice:agreed,targetQty:targetQty,rewardText:reward};
  });
}

function rejectVendorOnboardingV2(email,pin,onboardingId,reason){
  requireAdmin_(email,pin);
  const onb=rows_(V8.SHEETS.VENDOR_ONBOARD).find(x=>s_(x['Onboarding ID'])===s_(onboardingId));
  if(!onb) throw new Error('Onboarding not found.');
  if(s_(onb.Status).toUpperCase().indexOf('PENDING')!==0) throw new Error('This onboarding is already processed.');
  const why=s_(reason); if(!why) throw new Error('Enter a rejection reason.');
  const now=now_();
  updateObj_(V8.SHEETS.VENDOR_ONBOARD,onb._row,{Status:'REJECTED','Updated At':now,'Approved At':now,'Approved By':s_(email).toLowerCase(),Remarks:(s_(onb.Remarks)?s_(onb.Remarks)+' | ':'')+'Rejected: '+why});
  append_(V8.SHEETS.AUDIT,{'Audit ID':id_('AUD-'),'Created At':now,Module:'B2B Onboarding',Action:'REJECTED','Reference Type':'Vendor Onboarding','Reference ID':s_(onboardingId),'User ID':s_(email).toLowerCase(),'Old Value':'PENDING','New Value':why});
  return {success:true,onboardingId:s_(onboardingId),status:'REJECTED'};
}
