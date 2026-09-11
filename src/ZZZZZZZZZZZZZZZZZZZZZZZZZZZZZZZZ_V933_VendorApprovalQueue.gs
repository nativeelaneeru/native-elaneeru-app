/** Native Elaneeru V9.3.3 — show all unresolved vendor onboarding records. */
function v933VendorApprovalDto_(r){return {onboardingId:s_(r['Onboarding ID']),businessName:s_(r['Business Name']),ownerName:s_(r['Owner Name']),mobile:s_(r.Mobile),area:s_(r.Area),productId:s_(r['Product ID']),productName:s_(r['Product Name']),agreedPrice:n_(r['Agreed Price']),moq:n_(r.MOQ),expectedDailyQty:n_(r['Expected Daily Qty']),paymentMode:s_(r['Payment Mode']).toUpperCase()||'COD',creditDays:n_(r['Credit Days']),creditLimit:n_(r['Credit Limit']),ownerPhotoUrl:s_(r['Customer Photo URL']),shopPhotoUrl:s_(r['Shop Photo URL']),createdAt:r['Created At'],status:s_(r.Status)||'SUBMITTED'};}
function getVendorApprovalQueueV933(email,pin){
  requireAdmin_(email,pin);
  const terminal=['APPROVED','REJECTED','CANCELLED'];
  return rows_(V8.SHEETS.VENDOR_ONBOARD).filter(function(r){return s_(r['Onboarding ID'])&&!terminal.includes(s_(r.Status).toUpperCase());}).sort(function(a,b){return new Date(b['Created At']||0)-new Date(a['Created At']||0);}).map(v933VendorApprovalDto_);
}
function approveVendorOnboardingV933(email,pin,onboardingId,initialPin,targetQty,rewardText){
  requireAdmin_(email,pin);
  const row=rows_(V8.SHEETS.VENDOR_ONBOARD).find(function(r){return s_(r['Onboarding ID'])===s_(onboardingId)});
  if(!row)throw new Error('Onboarding not found.');
  const status=s_(row.Status).toUpperCase();
  if(['APPROVED','REJECTED','CANCELLED'].includes(status))throw new Error('This onboarding is already '+(status||'closed')+'.');
  if(status!=='PENDING')updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{Status:'PENDING','Updated At':now_()});
  return approveVendorOnboardingV840(email,pin,onboardingId,initialPin,targetQty,rewardText);
}
