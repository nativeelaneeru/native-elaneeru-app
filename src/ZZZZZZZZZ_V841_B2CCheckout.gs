/**
 * Native Elaneeru V8.4.1 — B2C checkout recovery.
 * A customer who entered via PIN/Continue can complete their first order after
 * providing profile details; the backend creates the missing customer row safely.
 */
const V841_ORIGINAL_SAVE_ORDER = saveOrder;
saveOrder = function(order){
  order=order||{};
  const mobile=digits_(order.mobile);
  const exists=rows_(V8.SHEETS.CUSTOMERS).some(r=>digits_(r.Mobile)===mobile);
  if(!exists){
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
  }
  return V841_ORIGINAL_SAVE_ORDER(order);
};
