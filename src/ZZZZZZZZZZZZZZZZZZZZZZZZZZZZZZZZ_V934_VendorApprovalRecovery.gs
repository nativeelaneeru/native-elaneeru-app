/** V9.3.4 — resilient approval queue direct-sheet scan. */
function getVendorApprovalQueueV934(email,pin){
  requireAdmin_(email,pin);
  const sh=sh_(V8.SHEETS.VENDOR_ONBOARD), values=sh.getDataRange().getValues();
  if(values.length<2)return [];
  const headers=values[0].map(s_), norm=function(x){return s_(x).toLowerCase().replace(/[^a-z0-9]/g,'');};
  const col=function(name){const n=norm(name);return headers.findIndex(function(h){return norm(h)===n;});};
  const idCol=col('Onboarding ID'), statusCol=col('Status');
  const terminal=['APPROVED','REJECTED','CANCELLED'];
  return values.slice(1).map(function(row,i){
    const id=s_(idCol>=0?row[idCol]:'') || (row.map(s_).join(' ').match(/ONB-[A-Z0-9-]+/i)||[])[0] || '';
    const status=s_(statusCol>=0?row[statusCol]:'');
    if(!id||terminal.includes(status.toUpperCase()))return null;
    const obj={_row:i+2};headers.forEach(function(h,j){if(h)obj[h]=row[j]});
    obj['Onboarding ID']=id; if(!obj.Status)obj.Status=status||'SUBMITTED';
    return v933VendorApprovalDto_(obj);
  }).filter(function(x){return !!x;});
}
function repairVendorOnboardingV934(email,pin,onboardingId){
  requireAdmin_(email,pin);
  const id=s_(onboardingId), sh=sh_(V8.SHEETS.VENDOR_ONBOARD), values=sh.getDataRange().getValues();
  const headers=values[0].map(s_), idCol=headers.findIndex(function(h){return s_(h).toLowerCase()==='onboarding id';}), statusCol=headers.findIndex(function(h){return s_(h).toLowerCase()==='status';});
  if(idCol<0||statusCol<0)throw new Error('Vendor_Onboarding headers are missing Onboarding ID or Status.');
  const row=values.slice(1).findIndex(function(r){return s_(r[idCol])===id;});
  if(row<0)throw new Error('Onboarding '+id+' was not found in Vendor_Onboarding.');
  const current=s_(values[row+1][statusCol]).toUpperCase();
  if(['APPROVED','REJECTED','CANCELLED'].includes(current))throw new Error('This onboarding is already '+current+'.');
  sh.getRange(row+2,statusCol+1).setValue('PENDING');
  return {success:true,onboardingId:id,status:'PENDING'};
}