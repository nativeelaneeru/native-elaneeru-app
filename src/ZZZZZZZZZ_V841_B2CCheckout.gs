/**
 * Native Elaneeru V8.4.1 — B2C checkout recovery helper.
 *
 * This file no longer wraps saveOrder. The helper is called by the single
 * canonical V9.0.1 order wrapper, preventing circular saveOrder delegation.
 */
function ensureB2CCustomerForOrderV841_(order){
  order=order||{};
  const mobile=digits_(order.mobile);
  const exists=rows_(V8.SHEETS.CUSTOMERS).some(r=>digits_(r.Mobile)===mobile);
  if(exists) return true;

  const profile={
    mobile:mobile,
    name:s_(order.name),
    address:s_(order.address),
    area:s_(order.area),
    pincode:s_(order.pincode),
    latitude:order.latitude==null?'':order.latitude,
    longitude:order.longitude==null?'':order.longitude
  };
  if(!profile.name||!profile.address||!profile.area){
    throw new Error('Please complete and save your profile before placing your first order.');
  }
  saveCustomerProfile(profile);
  return true;
}
