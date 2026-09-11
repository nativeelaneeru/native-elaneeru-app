/** Native Elaneeru V9.3.1 — supplier purchase orders. */
const V931_PO_SHEET='Purchase_Orders';
const V931_PO_ITEMS_SHEET='Purchase_Order_Items';
const V931_PO_HEADERS=['PO ID','PO Date','Supplier ID','Supplier Name','Supplier Mobile','Delivery Location','Expected Date','Status','Sub Total','Notes','Created By','Created At','Updated At'];
const V931_PO_ITEM_HEADERS=['PO ID','Line No','Product ID','Product Name','Quantity','Unit','Unit Price','Line Total','Received Qty'];

function v931Ensure_(sheetName,headers){
  const sh=sh_(sheetName),last=sh.getLastColumn();
  if(last<1){sh.getRange(1,1,1,headers.length).setValues([headers]);return sh;}
  const have=sh.getRange(1,1,1,last).getValues()[0].map(s_);
  const missing=headers.filter(function(h){return !have.includes(h)});
  if(missing.length)sh.getRange(1,last+1,1,missing.length).setValues([missing]);
  return sh;
}
function v931Setup_(){v931Ensure_(V931_PO_SHEET,V931_PO_HEADERS);v931Ensure_(V931_PO_ITEMS_SHEET,V931_PO_ITEM_HEADERS);}
function v931Rows_(name){v931Setup_();return rows_(name);}
function v931Iso_(v){if(!v)return '';try{return Utilities.formatDate(new Date(v),'Asia/Kolkata','yyyy-MM-dd')}catch(e){return s_(v)}}
function v931Dto_(po,items){return {poId:s_(po['PO ID']),poDate:v931Iso_(po['PO Date']),supplierId:s_(po['Supplier ID']),supplierName:s_(po['Supplier Name']),supplierMobile:digits_(po['Supplier Mobile']),deliveryLocation:s_(po['Delivery Location']),expectedDate:v931Iso_(po['Expected Date']),status:s_(po.Status)||'DRAFT',subTotal:n_(po['Sub Total']),notes:s_(po.Notes),createdAt:fmtDT_(po['Created At']),items:(items||[]).map(function(x){return {lineNo:n_(x['Line No']),productId:s_(x['Product ID']),productName:s_(x['Product Name']),quantity:n_(x.Quantity),unit:s_(x.Unit)||'pc',unitPrice:n_(x['Unit Price']),lineTotal:n_(x['Line Total']),receivedQty:n_(x['Received Qty'])};})};}

function getPurchaseOrderConsoleV931(email,pin){
  requireAdmin_(email,pin);v931Setup_();
  const products=rows_(V8.SHEETS.PRODUCTS).filter(function(p){return s_(p['Product ID'])}).map(function(p){return {productId:s_(p['Product ID']),productName:s_(p['Product Name']),unit:s_(p.Unit)||'pc',price:n_(p['B2B Default Price'])||n_(p['B2C Price'])};});
  const suppliers=rows_(V8.SHEETS.B2B_VENDORS).filter(function(v){return s_(v['Vendor ID'])&&active_(v.Status)}).map(function(v){return {supplierId:s_(v['Vendor ID']),supplierName:s_(v['Business Name'])||s_(v['Owner Name']),mobile:digits_(v.Mobile),address:s_(v.Address)};});
  const allItems=v931Rows_(V931_PO_ITEMS_SHEET),orders=v931Rows_(V931_PO_SHEET).filter(function(p){return s_(p['PO ID'])}).sort(function(a,b){return new Date(b['Created At']||0)-new Date(a['Created At']||0)}).slice(0,50);
  return {success:true,version:'9.3.1',products:products,suppliers:suppliers,orders:orders.map(function(po){return v931Dto_(po,allItems.filter(function(i){return s_(i['PO ID'])===s_(po['PO ID'])}));})};
}

function createPurchaseOrderV931(email,pin,p){
  requireAdmin_(email,pin);p=p||{};
  return lockRun_(function(){
    v931Setup_();const supplierId=s_(p.supplierId),supplier=v931Rows_(V8.SHEETS.B2B_VENDORS).find(function(v){return s_(v['Vendor ID'])===supplierId});
    if(!supplier)throw new Error('Select an active supplier.');
    const items=(Array.isArray(p.items)?p.items:[]).map(function(x){return {productId:s_(x.productId),quantity:Math.floor(n_(x.quantity)),unitPrice:n_(x.unitPrice)};}).filter(function(x){return x.productId&&x.quantity>0;});
    if(!items.length)throw new Error('Add at least one product and quantity.');
    const products=rows_(V8.SHEETS.PRODUCTS),poId=id_('PO-'),now=now_();let total=0;
    const lines=items.map(function(x,i){const product=products.find(function(p){return s_(p['Product ID'])===x.productId});if(!product)throw new Error('Unknown product: '+x.productId);const rate=x.unitPrice>0?x.unitPrice:(n_(product['B2B Default Price'])||n_(product['B2C Price']));const line=x.quantity*rate;total+=line;return {'PO ID':poId,'Line No':i+1,'Product ID':x.productId,'Product Name':s_(product['Product Name']),'Quantity':x.quantity,Unit:s_(product.Unit)||'pc','Unit Price':rate,'Line Total':line,'Received Qty':0};});
    append_(V931_PO_SHEET,{'PO ID':poId,'PO Date':s_(p.poDate)||v931Iso_(now),'Supplier ID':supplierId,'Supplier Name':s_(supplier['Business Name'])||s_(supplier['Owner Name']),'Supplier Mobile':digits_(supplier.Mobile),'Delivery Location':s_(p.deliveryLocation)||'Native Elaneeru Hub','Expected Date':s_(p.expectedDate),'Status':'ISSUED','Sub Total':total,Notes:s_(p.notes),'Created By':s_(email),'Created At':now,'Updated At':now});
    lines.forEach(function(line){append_(V931_PO_ITEMS_SHEET,line)});
    return {success:true,poId:poId};
  });
}

function updatePurchaseOrderStatusV931(email,pin,poId,status){
  requireAdmin_(email,pin);const allowed=['DRAFT','ISSUED','PARTIALLY RECEIVED','RECEIVED','CANCELLED'],next=s_(status).toUpperCase();if(!allowed.includes(next))throw new Error('Invalid PO status.');
  const row=v931Rows_(V931_PO_SHEET).find(function(p){return s_(p['PO ID'])===s_(poId)});if(!row)throw new Error('Purchase order not found.');updateObj_(V931_PO_SHEET,row._row,{Status:next,'Updated At':now_()});return {success:true};
}
