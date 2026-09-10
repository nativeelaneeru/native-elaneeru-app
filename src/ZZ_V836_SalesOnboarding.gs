/**
 * Native Elaneeru V8.3.6 — Sales onboarding catalog patch
 * Keeps the existing V8 core untouched while exposing LIVE B2B products to
 * authenticated sales staff and persisting the selected product on onboarding.
 */

function salesStaffLoginV82(mobile,pin){
  const u=staffLoginV81_(mobile,pin,'SALES');
  return {
    staffId:u.staffId,
    name:u.name,
    mobile:u.mobile,
    role:u.role,
    products:b2bProducts_('')
  };
}

function submitVendorOnboardingV83(mobile,pin,p){
  const u=staffLoginV81_(mobile,pin,'SALES');
  p=p||{};

  const liveProducts=b2bProducts_('');
  const selected=liveProducts.find(x=>s_(x.productId)===s_(p.productId));
  if(!selected) throw new Error('Please select a LIVE product before submitting.');

  p.productId=selected.productId;
  p.productName=selected.productName;
  p.salesExecutive=u.name+' ('+u.staffId+')';

  const r=submitV7VendorOnboarding(p);
  ensureVendorOnboardingProductColumnsV836_();

  const row=rows_(V8.SHEETS.VENDOR_ONBOARD)
    .find(x=>s_(x['Onboarding ID'])===s_(r.onboardingId));
  if(row){
    updateObj_(V8.SHEETS.VENDOR_ONBOARD,row._row,{
      'Product ID':selected.productId,
      'Product Name':selected.productName
    });
  }

  return Object.assign({
    salesExecutive:u.name,
    productId:selected.productId,
    productName:selected.productName
  },r);
}

function ensureVendorOnboardingProductColumnsV836_(){
  const sh=sh_(V8.SHEETS.VENDOR_ONBOARD);
  let last=sh.getLastColumn();
  let headers=last>0
    ? sh.getRange(1,1,1,last).getValues()[0].map(s_)
    : [];

  ['Product ID','Product Name'].forEach(name=>{
    if(headers.indexOf(name)===-1){
      headers.push(name);
      sh.getRange(1,headers.length).setValue(name);
    }
  });
}
