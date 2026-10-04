/** Approved v5 production screens. Every read/write derives ownership from vendor_(token). */
function getB2BWorkspaceV5(token){
  const v=vendor_(token),vid=s_(v['Vendor ID']),data=getB2BAppDataV9(token);
  const orders=rows_(V8.SHEETS.B2B_ORDERS).filter(o=>s_(o['Vendor ID'])===vid);
  const items=rows_(V8.SHEETS.B2B_ORDER_ITEMS),byId={};orders.forEach(o=>byId[s_(o['Order ID'])]=o);
  (data.orders||[]).forEach(o=>{
    const row=byId[o.orderId];if(!row)return;
    o.deliveryDate=neAutoDate_(row['Delivery Date']);o.deliverySlot=s_(row['Delivery Slot']);
    o.address=s_(row.Address);o.paymentStatus=s_(row['Payment Status']);
    o.items=items.filter(i=>s_(i['Order ID'])===o.orderId).map(i=>({productId:s_(i['Product ID']),productName:s_(i['Product Name']),quantity:n_(i.Quantity),unit:s_(i.Unit),unitPrice:n_(i['Unit Price']),lineAmount:n_(i['Line Amount'])}));
  });
  data.paymentConfig=getB2BPaymentConfigV916(token);
  data.payments=rows_(V8.SHEETS.PAYMENTS).filter(r=>s_(r.Channel).toUpperCase()==='B2B'&&!!byId[s_(r['Order ID'])]).sort((a,b)=>new Date(b['Created At'])-new Date(a['Created At'])).slice(0,100).map(r=>({paymentId:s_(r['Payment ID']),orderId:s_(r['Order ID']),amount:n_(r.Amount),method:s_(r.Method),status:s_(r.Status),createdAt:fmtDT_(r['Created At'])}));
  data.tickets=getB2BTicketsV5(token);
  data.deliverySlots=[];
  try{
    const ctx=neAutoContext_(),area=s_(v.Area).toLowerCase(),now=Date.now();
    data.deliverySlots=ctx.slots.filter(r=>neAutoEnabled_(r.Enabled)&&s_(r.Area).toLowerCase()===area&&neAutoTime_(r['Cutoff At'])>now&&neAutoTime_(neAutoDate_(r['Delivery Date'])+'T00:00:00+05:30')>now).map(r=>{
      const date=neAutoDate_(r['Delivery Date']),slot=s_(r.Slot);
      const booked=ctx.orders.filter(o=>neAutoDate_(o['Delivery Date'])===date&&s_(o['Delivery Slot'])===slot&&s_(o.Area).toLowerCase()===area&&!['CANCELLED','REJECTED'].includes(s_(o.Status).toUpperCase())).reduce((a,o)=>a+ctx.items.filter(i=>s_(i['Order ID'])===s_(o['Order ID'])).reduce((n,i)=>n+n_(i.Quantity),0),0);
      return {date,slot,availableQty:Math.max(0,n_(r['Capacity Qty'])-booked),cutoffAt:fmtDT_(r['Cutoff At'])};
    }).filter(r=>r.availableQty>0).sort((a,b)=>a.date.localeCompare(b.date)||a.slot.localeCompare(b.slot));
  }catch(e){data.schedulePending=true;}
  data.vendor.pincode=s_(v.Pincode);data.version='5-live-1600';return data;
}
function neV5SheetText_(value,max){
  const text=s_(value);if(!text||text.length>max)throw new Error('Enter a valid value (maximum '+max+' characters).');
  return /^[=+@-]/.test(text)?"'"+text:text;
}
function saveB2BProfileV5(token,p){
  return lockRun_(()=>{
    const v=vendor_(token),patch={'Updated At':now_()};p=p||{};
    // Mobile, identity, area, payment terms, PIN and limits cannot be changed here.
    if(Object.prototype.hasOwnProperty.call(p,'ownerName'))patch['Owner Name']=neV5SheetText_(p.ownerName,100);
    if(Object.prototype.hasOwnProperty.call(p,'businessName'))patch['Business Name']=neV5SheetText_(p.businessName,160);
    if(Object.prototype.hasOwnProperty.call(p,'address'))patch.Address=neV5SheetText_(p.address,500);
    if(Object.keys(patch).length===1)throw new Error('No profile change supplied.');
    updateObj_(V8.SHEETS.B2B_VENDORS,v._row,patch);
    CacheService.getScriptCache().remove('V1000_VENDOR_ROW:'+s_(v['Vendor ID']));
    return {success:true};
  });
}
function getB2BTicketsV5(token){
  const vid=s_(vendor_(token)['Vendor ID']);
  return rows_(V8.SHEETS.SUPPORT).filter(r=>s_(r['Party Type']).toUpperCase()==='B2B'&&s_(r['Party ID'])===vid).sort((a,b)=>new Date(b['Created At'])-new Date(a['Created At'])).slice(0,100).map(r=>({ticketId:s_(r['Ticket ID']),category:s_(r.Category),title:s_(r.Subject),details:s_(r.Description),status:s_(r.Status),createdAt:fmtDT_(r['Created At']),resolution:s_(r.Resolution)}));
}
function createB2BTicketV5(token,p){
  return lockRun_(()=>{
    const v=vendor_(token),vid=s_(v['Vendor ID']);p=p||{};
    const request=s_(p.clientRequestId);if(!/^[A-Za-z0-9._:-]{16,80}$/.test(request))throw new Error('Ticket request ID is required.');
    const id='NE-TKT-'+hashV8_(vid+'|'+request).slice(0,24),prior=find_(V8.SHEETS.SUPPORT,'Ticket ID',id);
    if(prior){if(s_(prior['Party ID'])!==vid)throw new Error('Ticket unavailable.');return {success:true,ticketId:id,duplicatePrevented:true};}
    const category=s_(p.category);if(!['Quality Issue','Delivery Issue','Payment Issue','Order Issue','App Issue','Other'].includes(category))throw new Error('Choose a valid category.');
    const title=neV5SheetText_(p.title,160),details=neV5SheetText_(p.details,3000);
    append_(V8.SHEETS.SUPPORT,{'Ticket ID':id,'Party Type':'B2B','Party ID':vid,Category:category,Subject:title,Description:details,Priority:'NORMAL',Status:'OPEN','Created At':now_(),'Updated At':now_()});
    return {success:true,ticketId:id};
  });
}
