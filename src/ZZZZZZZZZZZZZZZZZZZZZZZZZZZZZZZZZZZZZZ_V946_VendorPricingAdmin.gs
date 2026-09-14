/** Native Elaneeru V9.4.6 — Admin-managed vendor-level pricing. */
function v946VendorPricingDto_(r,products,vendors){
  const pid=s_(r['Product ID']),vid=s_(r['Vendor ID']);
  const product=products.find(function(x){return s_(x['Product ID'])===pid})||{};
  const vendor=vendors.find(function(x){return s_(x['Vendor ID'])===vid})||{};
  return {pricingId:s_(r['Pricing ID']),vendorId:vid,businessName:s_(vendor['Business Name']),productId:pid,
    productName:s_(product['Product Name']),defaultPrice:n_(product['B2B Default Price']),agreedPrice:n_(r['Agreed Price']),
    effectivePrice:n_(r['Agreed Price'])||n_(product['B2B Default Price']),moq:n_(r.MOQ)||n_(product['B2B MOQ'])||1,
    qtyStep:n_(r['Qty Step'])||n_(product['Qty Step'])||1,validFrom:s_(r['Valid From']),validTo:s_(r['Valid To']),status:s_(r.Status)||'ACTIVE'};
}
function getVendorPricingAdminV946(email,pin){
  requireAdmin_(email,pin);
  const products=rows_(V8.SHEETS.PRODUCTS).filter(function(x){return s_(x['Product ID'])});
  const vendors=rows_(V8.SHEETS.B2B_VENDORS).filter(function(x){return s_(x['Vendor ID'])});
  const pricing=rows_(V8.SHEETS.VENDOR_PRICING).filter(function(x){return s_(x['Pricing ID'])});
  return {success:true,version:'9.4.6',vendors:vendors.map(function(v){return {vendorId:s_(v['Vendor ID']),businessName:s_(v['Business Name']),ownerName:s_(v['Owner Name']),mobile:digits_(v.Mobile),status:s_(v.Status)}}),
    products:products.map(function(p){return {productId:s_(p['Product ID']),productName:s_(p['Product Name']),defaultPrice:n_(p['B2B Default Price']),defaultMoq:n_(p['B2B MOQ'])||1,defaultQtyStep:n_(p['Qty Step'])||1,status:s_(p['B2B Status'])}}),
    pricing:pricing.map(function(r){return v946VendorPricingDto_(r,products,vendors)})};
}
function saveVendorPricingAdminV946(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  return lockRun_(function(){
    const vid=s_(p.vendorId),pid=s_(p.productId),price=n_(p.agreedPrice),moq=Math.floor(n_(p.moq)),step=Math.floor(n_(p.qtyStep));
    if(!find_(V8.SHEETS.B2B_VENDORS,'Vendor ID',vid))throw new Error('Select a valid B2B vendor.');
    if(!find_(V8.SHEETS.PRODUCTS,'Product ID',pid))throw new Error('Select a valid product.');
    if(price<=0)throw new Error('Agreed price must be greater than zero.');
    if(moq<1||step<1)throw new Error('MOQ and quantity step must be at least 1.');
    const rows=rows_(V8.SHEETS.VENDOR_PRICING),id=s_(p.pricingId),hit=(id&&rows.find(function(x){return s_(x['Pricing ID'])===id}))||rows.find(function(x){return s_(x['Vendor ID'])===vid&&s_(x['Product ID'])===pid&&active_(x.Status)});
    const obj={'Vendor ID':vid,'Product ID':pid,'Agreed Price':price,MOQ:moq,'Qty Step':step,'Valid From':s_(p.validFrom),'Valid To':s_(p.validTo),Status:s_(p.status).toUpperCase()==='INACTIVE'?'INACTIVE':'ACTIVE','Updated At':now_()};
    let pricingId=id;
    if(hit){pricingId=s_(hit['Pricing ID']);updateObj_(V8.SHEETS.VENDOR_PRICING,hit._row,obj)}else{pricingId=id_('PRC-');obj['Pricing ID']=pricingId;append_(V8.SHEETS.VENDOR_PRICING,obj)}
    audit_('VENDOR PRICING',hit?'UPDATE':'CREATE','PRICING',pricingId,email,hit?JSON.stringify(hit):'',JSON.stringify(obj));
    return {success:true,pricingId:pricingId,effectivePrice:price};
  });
}
