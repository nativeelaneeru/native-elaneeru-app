/**
 * Native Elaneeru V8.4.0 — Vendor onboarding approval workflow.
 * Authorized staff submits only PENDING records. Admin approval creates the live B2B account,
 * agreed product price, and an actionable first 30-day target.
 */

function submitVendorOnboardingV840(mobile,pin,p){
  const u=staffAppLoginV917_(mobile,pin,'VENDOR_ONBOARDING');
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
  if(!/^[6-9]\d{9}$/.test(vendorMobile)) throw new Error('Enter a valid vendor mobile number.');
  const activeVendor=rows_(V8.SHEETS.B2B_VENDORS).find(x=>digits_(x.Mobile)===vendorMobile&&active_(x.Status));
  if(activeVendor) throw new Error('This mobile is already active as B2B vendor '+s_(activeVendor['Vendor ID'])+'.');
  const pendingVendor=rows_(V8.SHEETS.VENDOR_ONBOARD).find(x=>digits_(x.Mobile)===vendorMobile&&s_(x.Status).toUpperCase()==='PENDING');
  if(pendingVendor) throw new Error('A vendor onboarding is already pending for this mobile: '+s_(pendingVendor['Onboarding ID'])+'.');
  const liveProducts=b2bProducts_('');
  const product=liveProducts.find(x=>s_(x.productId)===s_(p.productId));
  if(!product) throw new Error('Please select a LIVE B2B product.');
  if(!s_(p.ownerPhotoData)||!s_(p.shopPhotoData)) throw new Error('Owner photo and shop-front photo are required.');
  p.salesExecutive=u.name+' ('+u.staffId+')';
  const initialB2BPin=String(p.initialB2BPin||'').trim();
  if(!/^\d{4,8}$/.test(initialB2BPin))throw new Error('Set a 4–8 digit B2B PIN for the vendor.');
  p.productId=product.productId;
  p.productName=product.productName;
  const r=submitV7VendorOnboarding(p);
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(x=>s_(x['Onboarding ID'])===s_(r.onboardingId));
  if(!row) throw new Error('Onboarding record could not be located.');
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

function uploadOnboardingPhotoV840_(dataUrl,fileName,onboardingId,kind){
  const match=String(dataUrl||'').match(/^data:([^;]+);base64,(.+)$/);
  if(!match) throw new Error('Invalid '+kind+' photo.');
  const bytes=Utilities.base64Decode(match[2]);
  if(bytes.length>4*1024*1024) throw new Error('Please use a smaller '+kind+' photo.');
  const props=PropertiesService.getScriptProperties();
  const folderId=s_(props.getProperty('VENDOR_ONBOARDING_PHOTO_FOLDER_ID'))||'1GAk4K3NlWpCabU_jjy68nevXn8PhY_Oj';
  let folder;
  try{folder=folderId?DriveApp.getFolderById(folderId):DriveApp.getRootFolder();}
  catch(err){throw new Error('Vendor onboarding photo folder is not accessible. Check VENDOR_ONBOARDING_PHOTO_FOLDER_ID in Script Properties.');}
  const safe=String(fileName||kind+'.jpg').replace(/[^a-zA-Z0-9._-]/g,'_');
  const file=folder.createFile(Utilities.newBlob(bytes,match[1],onboardingId+'_'+kind+'_'+safe));
  return file.getUrl();
}

function getPendingVendorOnboardingsV840(email,pin){
  requireAdmin_(email,pin);
  return rows_(V8.SHEETS.VENDOR_ONBOARD)
    .filter(r=>s_(r.Status).toUpperCase()==='PENDING')
    .map(r=>({onboardingId:s_(r['Onboarding ID']),businessName:s_(r['Business Name']),ownerName:s_(r['Owner Name']),
      mobile:s_(r.Mobile),area:s_(r.Area),productId:s_(r['Product ID']),productName:s_(r['Product Name']),
      agreedPrice:n_(r['Agreed Price']),moq:n_(r.MOQ),expectedDailyQty:n_(r['Expected Daily Qty']),
      paymentMode:s_(r['Payment Mode']).toUpperCase()||'COD',creditDays:n_(r['Credit Days']),creditLimit:n_(r['Credit Limit']),
      ownerPhotoUrl:s_(r['Customer Photo URL']),shopPhotoUrl:s_(r['Shop Photo URL']),createdAt:r['Created At']})); 
}

function approveVendorOnboardingV840(email,pin,onboardingId,initialPin,targetQty,rewardText){
  requireAdmin_(email,pin);
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(r=>s_(r['Onboarding ID'])===s_(onboardingId));
  if(!row) throw new Error('Onboarding not found.');
  if(s_(row.Status).toUpperCase()!=='PENDING') throw new Error('Only PENDING onboarding records can be approved.');
  const vendorMobile=digits_(row.Mobile);
  const existingVendor=rows_(V8.SHEETS.B2B_VENDORS).find(x=>digits_(x.Mobile)===vendorMobile&&active_(x.Status));
  if(existingVendor) throw new Error('An active B2B vendor already exists for this mobile: '+s_(existingVendor['Vendor ID'])+'.');
  initialPin=String(initialPin||'').trim();
  if(!/^\d{4,8}$/.test(initialPin)) throw new Error('Set a 4–8 digit initial PIN.');
  const productId=s_(row['Product ID']);
  const product=b2bProducts_('').find(x=>s_(x.productId)===productId);
  if(!product) throw new Error('The selected product is no longer LIVE for B2B.');
  const paymentMode=s_(row['Payment Mode']||'COD').toUpperCase();
  if(!['COD','UPI','CREDIT'].includes(paymentMode))throw new Error('Onboarding has an unsupported payment mode.');
  if(paymentMode==='CREDIT'&&n_(row['Credit Limit'])<=0)throw new Error('Credit vendor requires a valid credit limit before approval.');
  const vendorId=id_('VEN-');
  const pricingId=id_('PRC-');
  const targetId=id_('TGT-');
  const now=now_(), start=new Date(), end=new Date(start.getTime()+29*86400000);
  const daily=Math.max(1,n_(row['Expected Daily Qty']));
  const finalTarget=Math.max(daily*20, n_(targetQty));
  const reward=s_(rewardText)||('Reach '+finalTarget.toLocaleString('en-IN')+' coconuts in 30 days to unlock a partner reward.');
  append_(V8.SHEETS.B2B_VENDORS,{
    'Vendor ID':vendorId,'Business Name':s_(row['Business Name']),'Owner Name':s_(row['Owner Name']),
    Mobile:vendorMobile,WhatsApp:digits_(row.WhatsApp||row.Mobile),'Vendor Type':s_(row['Vendor Type']),
    Area:s_(row.Area),Address:s_(row.Address),Pincode:s_(row.Pincode),Latitude:n_(row.Latitude),Longitude:n_(row.Longitude),
    'Payment Type':paymentMode,'Credit Days':paymentMode==='CREDIT'?n_(row['Credit Days']):0,'Credit Limit':paymentMode==='CREDIT'?n_(row['Credit Limit']):0,
    Outstanding:0,MOQ:n_(row.MOQ)||n_(product.moq)||1,'Delivery Frequency':s_(row['Delivery Frequency']),
    'Preferred Time':s_(row['Preferred Time']),'PIN Hash':hashV8_(initialPin),Status:'ACTIVE', 'Created At':now,'Updated At':now,
    'Customer Photo URL':s_(row['Customer Photo URL']),'Shop Photo URL':s_(row['Shop Photo URL']),'Onboarding ID':onboardingId
  });
  append_(V8.SHEETS.VENDOR_PRICING,{
    'Pricing ID':pricingId,'Vendor ID':vendorId,'Product ID':productId,'Agreed Price':n_(row['Agreed Price']),
    MOQ:n_(row.MOQ)||n_(product.moq)||1,'Qty Step':n_(product.qtyStep)||1,'Valid From':start,'Valid To':'',Status:'ACTIVE','Updated At':now
  });
  append_(V8.SHEETS.B2B_TARGETS,{
    'Target ID':targetId,'Vendor ID':vendorId,'Target Name':'First 30-Day Growth Target','Start Date':start,'End Date':end,
    'Target Qty':finalTarget,'Reward Text':reward,Status:'ACTIVE',
    Notes:'Created from onboarding '+onboardingId,'Updated At':now
  });
  updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{
    Status:'APPROVED','Approved Vendor ID':vendorId,'Approved At':now,'Approved By':String(email||'').trim().toLowerCase(),
    'Pricing ID':pricingId,'Target ID':targetId,'Initial PIN Set':'YES','Updated At':now
  });
  return {success:true,vendorId:vendorId,pricingId:pricingId,targetId:targetId,initialPin:initialPin,paymentMode:paymentMode};
}