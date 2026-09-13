/** Native Elaneeru V9.4.4 — shared bunch creation, scanning and stock truth. */
const V944_BUNCH_VERSION='9.4.4';

function v944User_(mobile,pin){return staffAppLoginV917_(mobile,pin,'BUNCH');}
function v944Product_(id){return find_(V8.SHEETS.PRODUCTS,'Product ID',s_(id));}
function v944BatchByCode_(code){
  code=s_(code).toUpperCase();
  return rows_(V8.SHEETS.BATCHES).find(function(b){return s_(b.Barcode).toUpperCase()===code||s_(b['Batch ID']).toUpperCase()===code;})||null;
}
function v944Assigned_(orderId,productId){
  return rows_(V8.SHEETS.ASSIGNMENTS).filter(function(a){return s_(a['Order Type']).toUpperCase()==='B2B'&&s_(a['Order ID'])===s_(orderId)&&s_(a['Product ID'])===s_(productId)&&s_(a.Status).toUpperCase()!=='CANCELLED';}).reduce(function(sum,a){return sum+n_(a['Assigned Qty']);},0);
}
function v944OpenOrders_(){
  const vendors=rows_(V8.SHEETS.B2B_VENDORS),items=rows_(V8.SHEETS.B2B_ORDER_ITEMS);
  return rows_(V8.SHEETS.B2B_ORDERS).filter(function(o){return ['PLACED','CONFIRMED','PROCESSING','PICKING','READY','ROUTED'].indexOf(s_(o.Status).toUpperCase())>=0;}).slice(-150).reverse().map(function(o){
    const vendor=vendors.find(function(v){return s_(v['Vendor ID'])===s_(o['Vendor ID']);})||{};
    const lines=items.filter(function(i){return s_(i['Order ID'])===s_(o['Order ID']);}).map(function(i){const required=n_(i.Quantity),assigned=v944Assigned_(o['Order ID'],i['Product ID']);return {productId:s_(i['Product ID']),productName:s_(i['Product Name'])||s_(i['Product ID']),requiredQty:required,assignedQty:assigned,remainingQty:Math.max(0,required-assigned)};});
    return {orderId:s_(o['Order ID']),vendorId:s_(o['Vendor ID']),vendorName:s_(vendor['Business Name'])||s_(vendor.Name)||s_(o['Vendor ID']),area:s_(vendor.Area),status:s_(o.Status),lines:lines};
  }).filter(function(o){return o.lines.some(function(i){return i.remainingQty>0;});});
}
function v944BunchDto_(b){return {batchId:s_(b['Batch ID']),barcode:s_(b.Barcode),productId:s_(b['Product ID']),productName:s_(b['Product Name']),originalQty:n_(b['Original Qty']),availableQty:n_(b['Available Qty']),reservedQty:n_(b['Reserved Qty']),deliveredQty:n_(b['Delivered Qty']),location:s_(b.Location)||'HUB',createdBy:s_(b['Picker ID']),status:s_(b.Status),createdAt:fmtDT_(b['Created At'])};}

function getBunchWorkspaceV944(mobile,pin){
  const user=v944User_(mobile,pin);
  const products=productRows_().filter(function(p){return active_(p['B2B Status'])||active_(p['B2C Status']);}).map(function(p){return {productId:s_(p['Product ID']),productName:s_(p['Product Name']),unit:s_(p.Unit)||'pc'};});
  return {ok:true,version:V944_BUNCH_VERSION,user:user,products:products,orders:v944OpenOrders_(),bunches:rows_(V8.SHEETS.BATCHES).slice(-100).reverse().map(v944BunchDto_)};
}

function createBunchV944(mobile,pin,payload){
  payload=payload||{};const user=v944User_(mobile,pin),productId=s_(payload.productId),qty=Math.floor(n_(payload.qty)),location=s_(payload.location)||'HUB';
  if(qty<=0)throw new Error('Count the coconuts and enter a quantity greater than 0.');
  return lockRun_(function(){
    const p=v944Product_(productId);if(!p)throw new Error('Product not found.');
    const batch=id_('BUN-'),barcode='NEL-B-'+Utilities.formatDate(new Date(),'Asia/Kolkata','yyMMdd')+'-'+Math.random().toString(36).slice(2,8).toUpperCase(),now=now_();
    append_(V8.SHEETS.BATCHES,{'Batch ID':batch,Barcode:barcode,'Product ID':productId,'Product Name':s_(p['Product Name']),'Original Qty':qty,'Available Qty':qty,'Reserved Qty':0,'Delivered Qty':0,Location:location,'Picker ID':user.staffId,Printed:'NO',Status:'AVAILABLE','Created At':now,'Updated At':now});
    append_(V8.SHEETS.INVENTORY,{'Movement ID':id_('MOV-'),'Created At':now,'Product ID':productId,'Product Name':s_(p['Product Name']),Location:location,'Movement Type':'BUNCH IN','Qty In':qty,'Qty Out':0,'Reference Type':'BUNCH','Reference ID':batch,'Batch ID':batch,Reason:'Counted bunch inward','User ID':user.staffId});
    return {success:true,bunch:{batchId:batch,barcode:barcode,productId:productId,productName:s_(p['Product Name']),originalQty:qty,availableQty:qty,location:location,status:'AVAILABLE',createdBy:user.name}};
  });
}

function assignBunchToVendorV944(mobile,pin,barcode,orderId){
  const user=v944User_(mobile,pin);orderId=s_(orderId);
  return lockRun_(function(){
    const b=v944BatchByCode_(barcode);if(!b)throw new Error('Bunch barcode not found.');
    const available=Math.floor(n_(b['Available Qty']));if(available<=0)throw new Error('This bunch is already assigned. Refresh to see who assigned it.');
    if(available!==Math.floor(n_(b['Original Qty'])))throw new Error('This older batch was partly allocated. Use the Barcode console to finish it.');
    const order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',orderId);if(!order)throw new Error('End-vendor order not found.');
    const productId=s_(b['Product ID']),line=rows_(V8.SHEETS.B2B_ORDER_ITEMS).find(function(i){return s_(i['Order ID'])===orderId&&s_(i['Product ID'])===productId;});
    if(!line)throw new Error('This end-vendor order does not contain '+s_(b['Product Name'])+'.');
    const required=n_(line.Quantity),already=v944Assigned_(orderId,productId),remaining=Math.max(0,required-already);
    if(available>remaining)throw new Error('Bunch has '+available+' coconuts but this vendor needs only '+remaining+'. Choose another order or create the correct bunch size.');
    const stop=rows_(V8.SHEETS.STOPS).find(function(x){return s_(x['Order Type'])==='B2B'&&s_(x['Order ID'])===orderId;});
    append_(V8.SHEETS.ASSIGNMENTS,{'Assignment ID':id_('ASN-'),'Assigned At':now_(),'Batch ID':s_(b['Batch ID']),Barcode:s_(b.Barcode),'Order Type':'B2B','Order ID':orderId,'Stop ID':stop?s_(stop['Stop ID']):'','Product ID':productId,'Assigned Qty':available,'Scanned Qty':0,'Delivered Qty':0,'Assigned By':user.staffId+' · '+user.name,Status:'ASSIGNED','Updated At':now_()});
    updateObj_(V8.SHEETS.BATCHES,b._row,{'Available Qty':0,'Reserved Qty':n_(b['Reserved Qty'])+available,Status:'RESERVED','Updated At':now_()});
    return {success:true,batchId:s_(b['Batch ID']),barcode:s_(b.Barcode),qty:available,assignedBy:user.name,requiredQty:required,assignedTotal:already+available,remainingToAssign:Math.max(0,remaining-available)};
  });
}

function getBunchStockV944(){
  const batches=rows_(V8.SHEETS.BATCHES),sum={};
  batches.forEach(function(b){const id=s_(b['Product ID']);if(!id)return;if(!sum[id])sum[id]={productId:id,tracked:true,availableQty:0,reservedQty:0,deliveredQty:0};sum[id].availableQty+=n_(b['Available Qty']);sum[id].reservedQty+=n_(b['Reserved Qty']);sum[id].deliveredQty+=n_(b['Delivered Qty']);});
  return Object.keys(sum).map(function(k){const x=sum[k];x.stockStatus=x.availableQty>0?'IN_STOCK':'OOS';return x;});
}

function v944ApplyStock_(products){
  const stock={};getBunchStockV944().forEach(function(x){stock[x.productId]=x;});
  return (products||[]).map(function(p){const out=Object.assign({},p),x=stock[s_(p.productId)];if(x){out.stockTracked=true;out.availableQty=x.availableQty;out.stockStatus=x.stockStatus;}return out;});
}

// Both storefronts use the same bunch availability. A product becomes stock
// tracked only after its first bunch is created, allowing a safe live rollout.
const V944_BASE_GET_APP_CONFIG=getAppConfig;
getAppConfig=function(){const out=V944_BASE_GET_APP_CONFIG.apply(this,arguments);out.products=v944ApplyStock_(out.products);return out;};
const V944_BASE_B2B_PRODUCTS=b2bProducts_;
b2bProducts_=function(){return v944ApplyStock_(V944_BASE_B2B_PRODUCTS.apply(this,arguments));};

// Deployment marker: shared bunch operations V9.4.4.
