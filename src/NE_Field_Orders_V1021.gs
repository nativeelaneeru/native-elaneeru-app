/** Field sales, staging. Reuse B2B canonical validations and data writes. */
function getFieldVendorsV1021(token){
  v949VendorSessionStaff_(token,true);
  const onboard=rows_(V8.SHEETS.VENDOR_ONBOARD);
  return onboard.map(function(r){
    return {onboardingId:s_(r['Onboarding ID']),vendorId:s_(r['Approved Vendor ID']),name:s_(r['Business Name']),owner:s_(r['Owner Name']),phone:digits_(r.Mobile),area:s_(r.Area),address:s_(r.Address),lat:Number(r.Latitude)||null,lng:Number(r.Longitude)||null,status:s_(r.Status)};
  }).filter(function(r){return r.onboardingId;});
}
function getFieldOrderOptionsV1021(token,onboardingId){
  v949VendorSessionStaff_(token,true);
  const o=find_(V8.SHEETS.VENDOR_ONBOARD,'Onboarding ID',s_(onboardingId));
  if(!o||!s_(o['Approved Vendor ID']))throw new Error('Vendor is not activated; order unavailable.');
  const v=find_(V8.SHEETS.B2B_VENDORS,'Vendor ID',s_(o['Approved Vendor ID']));
  if(!v||!active_(v.Status))throw new Error('Active B2B vendor required.');
  const products=b2bProducts_(s_(v['Vendor ID']));
  const now=Date.now();
  const slots=neAutoContext_().slots.filter(function(r){
    return neAutoEnabled_(r.Enabled)&&s_(r.Area).toLowerCase()===s_(v.Area).toLowerCase()&&neAutoTime_(r['Cutoff At'])>now&&neAutoTime_(neAutoDate_(r['Delivery Date'])+'T00:00:00+05:30')>now;
  }).map(function(r){return {date:neAutoDate_(r['Delivery Date']),slot:s_(r.Slot)};});
  return {vendorId:s_(v['Vendor ID']),products:products.map(function(p){return {productId:p.productId,productName:p.productName,price:p.price,moq:Math.max(200,Number(p.moq)||0),qtyStep:p.qtyStep||1};}),slots:slots};
}
function submitFieldOrderV1021(token,p){
  const actor=v949VendorSessionStaff_(token,true).user;
  p=p||{};
  const onboard=find_(V8.SHEETS.VENDOR_ONBOARD,'Onboarding ID',s_(p.onboardingId));
  if(!onboard||!s_(onboard['Approved Vendor ID']))throw new Error('Only activated vendors may receive field orders.');
  const v=find_(V8.SHEETS.B2B_VENDORS,'Vendor ID',s_(onboard['Approved Vendor ID']));
  if(!v||!active_(v.Status))throw new Error('Vendor B2B account is not active.');
  if(!/^[A-Za-z0-9._:-]{12,80}$/.test(s_(p.clientRequestId)))throw new Error('Unique order request ID required.');
  const qty=Number(p.quantity);if(!Number.isSafeInteger(qty)||qty<=0)throw new Error('Invalid quantity.');
  if(s_(p.paymentType||'COD').toUpperCase()!=='COD')throw new Error('Field orders are COD only.');
  // Do not trust client-provided vendor identity, pricing, address or payment changes.
  const order={items:[{productId:s_(p.productId),quantity:qty}],deliveryDate:s_(p.deliveryDate),
    deliverySlot:s_(p.deliverySlot),paymentType:'COD',clientRequestId:'FIELD:'+s_(p.clientRequestId),
    area:s_(v.Area),deliveryAddress:s_(v.Address)};
  const result=placeB2BOrderV904Core_('',order,v);
  return Object.assign({},result,{submittedBy:actor.staffId,onboardingId:s_(p.onboardingId)});
}
function getFieldOrderHealthV1021(){return {ok:true,version:'10.2.1',sessionAuth:true,canonicalValidation:true,serverPrices:true,requiresActivatedVendor:true,idempotency:true,creditDisabled:true};}
