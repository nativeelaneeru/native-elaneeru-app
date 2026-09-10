/**
 * Native Elaneeru V8.4.0 — Vendor onboarding approval workflow.
 * Sales submits only PENDING records. Admin approval creates the live B2B account,
 * agreed product price, and an actionable first 30-day target.
 */

function submitVendorOnboardingV840(mobile,pin,p){
  const u=staffLoginV81_(mobile,pin,'SALES');
  p=p||{};
  const liveProducts=b2bProducts_('');
  const product=liveProducts.find(x=>s_(x.productId)===s_(p.productId));
  if(!product) throw new Error('Please select a LIVE B2B product.');
  if(!s_(p.ownerPhotoData)||!s_(p.shopPhotoData)) throw new Error('Owner photo and shop-front photo are required.');
  p.salesExecutive=u.name+' ('+u.staffId+')';
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
    Status:'PENDING','Updated At':capturedAt
  });
  return {success:true,onboardingId:r.onboardingId,productName:product.productName,salesExecutive:u.name,status:'PENDING'};
}

function uploadOnboardingPhotoV840_(dataUrl,fileName,onboardingId,kind){
  const match=String(dataUrl||'').match(/^data:([^;]+);base64,(.+)$/);
  if(!match) throw new Error('Invalid '+kind+' photo.');
  const bytes=Utilities.base64Decode(match[2]);
  if(bytes.length>4*1024*1024) throw new Error('Please use a smaller '+kind+' photo.');
  const folderId='1GAk4K3NlWpCabU_jjy68nevXn8PhY_Oj';
  const folder=folderId?DriveApp.getFolderById(folderId):DriveApp.getRootFolder();
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
      paymentMode:s_(r['Payment Mode']),ownerPhotoUrl:s_(r['Customer Photo URL']),shopPhotoUrl:s_(r['Shop Photo URL']),
      createdAt:r['Created At']})); 
}

function approveVendorOnboardingV840(email,pin,onboardingId,initialPin,targetQty,rewardText){
  requireAdmin_(email,pin);
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(r=>s_(r['Onboarding ID'])===s_(onboardingId));
  if(!row) throw new Error('Onboarding not found.');
  if(s_(row.Status).toUpperCase()!=='PENDING') throw new Error('Only PENDING onboarding records can be approved.');
  initialPin=String(initialPin||'').trim();
  if(!/^\d{4,8}$/.test(initialPin)) throw new Error('Set a 4–8 digit initial PIN.');
  const productId=s_(row['Product ID']);
  const product=b2bProducts_('').find(x=>s_(x.productId)===productId);
  if(!product) throw new Error('The selected product is no longer LIVE for B2B.');
  const vendorId=id_('VEN-');
  const pricingId=id_('PRC-');
  const targetId=id_('TGT-');
  const now=now_(), start=new Date(), end=new Date(start.getTime()+29*86400000);
  const daily=Math.max(1,n_(row['Expected Daily Qty']));
  const finalTarget=Math.max(daily*20, n_(targetQty));
  const reward=s_(rewardText)||('Reach '+finalTarget.toLocaleString('en-IN')+' coconuts in 30 days to unlock a partner reward.');
  append_(V8.SHEETS.B2B_VENDORS,{
    'Vendor ID':vendorId,'Business Name':s_(row['Business Name']),'Owner Name':s_(row['Owner Name']),
    Mobile:digits_(row.Mobile),WhatsApp:digits_(row.WhatsApp||row.Mobile),'Vendor Type':s_(row['Vendor Type']),
    Area:s_(row.Area),Address:s_(row.Address),Pincode:s_(row.Pincode),Latitude:n_(row.Latitude),Longitude:n_(row.Longitude),
    'Payment Type':s_(row['Payment Mode'])||'COD','Credit Days':n_(row['Credit Days']),'Credit Limit':n_(row['Credit Limit']),
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
  return {success:true,vendorId:vendorId,pricingId:pricingId,targetId:targetId,initialPin:initialPin};
}
