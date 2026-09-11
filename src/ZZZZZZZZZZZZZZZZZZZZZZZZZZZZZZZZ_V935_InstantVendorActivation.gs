/** V9.3.5 — immediate B2B activation from authorized staff onboarding. */
function activateVendorOnboardingV935_(onboardingId,initialPin,by){
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(function(r){return s_(r['Onboarding ID'])===s_(onboardingId);});
  if(!row)throw new Error('Onboarding record could not be located.');
  const mobile=digits_(row.Mobile), existing=rows_(V8.SHEETS.B2B_VENDORS).find(function(v){return digits_(v.Mobile)===mobile&&active_(v.Status);});
  if(existing)return {vendorId:s_(existing['Vendor ID']),alreadyActive:true};
  initialPin=String(initialPin||'').trim();if(!/^\d{4,8}$/.test(initialPin))throw new Error('Set the vendor B2B PIN to 4–8 digits.');
  const productId=s_(row['Product ID']),product=b2bProducts_('').find(function(p){return s_(p.productId)===productId;});
  if(!product)throw new Error('Selected product is no longer LIVE for B2B.');
  const mode=s_(row['Payment Mode']||'COD').toUpperCase(),now=now_(),vendorId=id_('VEN-'),pricingId=id_('PRC-'),targetId=id_('TGT-'),daily=Math.max(1,n_(row['Expected Daily Qty'])),target=daily*20,start=new Date(),end=new Date(start.getTime()+29*86400000);
  append_(V8.SHEETS.B2B_VENDORS,{'Vendor ID':vendorId,'Business Name':s_(row['Business Name']),'Owner Name':s_(row['Owner Name']),Mobile:mobile,WhatsApp:digits_(row.WhatsApp||row.Mobile),'Vendor Type':s_(row['Vendor Type']),Area:s_(row.Area),Address:s_(row.Address),Pincode:s_(row.Pincode),Latitude:n_(row.Latitude),Longitude:n_(row.Longitude),'Payment Type':mode,'Credit Days':mode==='CREDIT'?n_(row['Credit Days']):0,'Credit Limit':mode==='CREDIT'?n_(row['Credit Limit']):0,Outstanding:0,MOQ:n_(row.MOQ)||n_(product.moq)||1,'Delivery Frequency':s_(row['Delivery Frequency']),'Preferred Time':s_(row['Preferred Time']),'PIN Hash':hashV8_(initialPin),Status:'ACTIVE','Created At':now,'Updated At':now,'Onboarding ID':onboardingId});
  append_(V8.SHEETS.VENDOR_PRICING,{'Pricing ID':pricingId,'Vendor ID':vendorId,'Product ID':productId,'Agreed Price':n_(row['Agreed Price']),MOQ:n_(row.MOQ)||n_(product.moq)||1,'Qty Step':n_(product.qtyStep)||1,'Valid From':start,'Valid To':'',Status:'ACTIVE','Updated At':now});
  append_(V8.SHEETS.B2B_TARGETS,{'Target ID':targetId,'Vendor ID':vendorId,'Target Name':'First 30-Day Growth Target','Start Date':start,'End Date':end,'Target Qty':target,'Reward Text':'Reach '+target+' coconuts in 30 days to unlock a partner reward.',Status:'ACTIVE',Notes:'Instant activation from onboarding '+onboardingId,'Updated At':now});
  updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{Status:'APPROVED','Approved Vendor ID':vendorId,'Approved At':now,'Approved By':s_(by),'Pricing ID':pricingId,'Target ID':targetId,'Initial PIN Set':'YES','Updated At':now});
  return {vendorId:vendorId,initialPin:initialPin};
}