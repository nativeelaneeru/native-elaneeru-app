/**
 * Native Elaneeru V9.1.6 — B2B payment consistency + direct UPI foundation.
 *
 * - COD remains available for every active vendor.
 * - CREDIT is available only to vendors approved for credit and within limit.
 * - UPI is exposed only when a valid merchant VPA is configured.
 * - Direct UPI creates a short-lived Payment_Ledger intent before an order.
 * - The server recalculates negotiated B2B prices/MOQ before payment and again
 *   before order creation.
 * - UPI orders are VERIFICATION_PENDING until an Admin verifies the UTR.
 * - Direct UPI is never auto-marked PAID and never changes vendor outstanding.
 * - Unverified/rejected UPI orders are excluded from B2B route fulfilment.
 */

const V916_B2B_PAYMENT_VERSION='9.1.6';
const V916_B2B_INTENT_MINUTES=30;

function v916B2BPaymentConfig_(){
  const props=PropertiesService.getScriptProperties();
  const dedicatedId=s_(props.getProperty('NEL_B2B_UPI_ID'));
  const sharedId=s_(props.getProperty('NEL_B2C_UPI_ID'));
  const upiId=dedicatedId||sharedId||'';
  const upiName=s_(props.getProperty('NEL_B2B_UPI_NAME'))||s_(props.getProperty('NEL_B2C_UPI_NAME'))||V8.COMPANY;
  const dedicatedFlag=s_(props.getProperty('NEL_B2B_UPI_ENABLED')).toUpperCase();
  const sharedFlag=s_(props.getProperty('NEL_B2C_UPI_ENABLED')).toUpperCase();
  const flag=dedicatedId?dedicatedFlag:sharedFlag;
  const enabled=v913ValidUpiId_(upiId)&&!['NO','FALSE','0'].includes(flag);
  return {enabled:enabled,upiId:upiId,upiName:upiName};
}

function getB2BPaymentConfigV916(token){
  const v=vendor_(token),cfg=v916B2BPaymentConfig_();
  const methods=['COD'];
  if(cfg.enabled)methods.push('UPI');
  const creditEnabled=s_(v['Payment Type']).toUpperCase()==='CREDIT';
  const availableCredit=Math.max(0,n_(v['Credit Limit'])-n_(v.Outstanding));
  if(creditEnabled&&availableCredit>0)methods.push('CREDIT');
  return {
    ok:true,engineVersion:V916_B2B_PAYMENT_VERSION,methods:methods,
    preferredMethod:s_(v['Payment Type']).toUpperCase()||'COD',
    upiEnabled:cfg.enabled,upiId:cfg.enabled?cfg.upiId:'',upiName:cfg.enabled?cfg.upiName:'',
    creditEnabled:creditEnabled,availableCredit:availableCredit,
    directUpiRequiresManualVerification:true,paymentStorage:'Payment_Ledger'
  };
}

function getB2BPaymentEngineHealthV916(){
  const cfg=v916B2BPaymentConfig_();
  return {
    ok:true,engineVersion:V916_B2B_PAYMENT_VERSION,codPreserved:true,creditPreserved:true,
    directUpiSupported:true,upiConfigured:cfg.enabled,serverCalculatedAmount:true,
    paymentIntentBeforeOrder:true,manualVerificationRequired:true,autoMarkPaid:false,
    negotiatedPricing:true,serverControlledDeliveryCharge:true,duplicateUtrProtected:true,
    fulfillmentRequiresPaidUpi:true,
    storageWorkbook:'Native Elaneeru V8 - Fresh Operations',storageSheet:'Payment_Ledger',separatePaymentDatabase:false
  };
}

function setB2BUpiConfigV916(email,pin,upiId,upiName,enabled){
  requireAdmin_(email,pin);
  upiId=s_(upiId);upiName=s_(upiName)||V8.COMPANY;
  if(enabled!==false&&!v913ValidUpiId_(upiId))throw new Error('Enter a valid merchant UPI ID.');
  PropertiesService.getScriptProperties().setProperties({
    NEL_B2B_UPI_ID:upiId,NEL_B2B_UPI_NAME:upiName,NEL_B2B_UPI_ENABLED:enabled===false?'NO':'YES'
  });
  return {success:true,enabled:enabled!==false,upiId:upiId,upiName:upiName};
}

function v916B2BFingerprint_(vendorId,payload){
  payload=payload||{};
  const items=(Array.isArray(payload.items)?payload.items:[]).map(function(i){
    return {productId:s_(i.productId),quantity:Math.max(1,Math.floor(n_(i.quantity)))};
  }).sort(function(a,b){return a.productId.localeCompare(b.productId);});
  return hashV8_(JSON.stringify({vendorId:s_(vendorId),items:items,
    deliverySlot:s_(payload.deliverySlot),deliveryAddress:s_(payload.deliveryAddress),area:s_(payload.area)}));
}

function v916B2BQuote_(vendor,payload){
  payload=payload||{};
  const vid=s_(vendor['Vendor ID']),products=b2bProducts_(vid),req=Array.isArray(payload.items)?payload.items:[];
  if(!req.length)throw new Error('Cart is empty.');
  let subtotal=0;const lines=[];
  req.forEach(function(i){
    const x=products.find(function(z){return s_(z.productId)===s_(i.productId);});
    if(!x)throw new Error('Product unavailable: '+s_(i.productId));
    const q=Math.floor(n_(i.quantity));
    if(q<n_(x.moq))throw new Error(x.productName+' MOQ is '+x.moq);
    if(n_(x.qtyStep)>1&&q%n_(x.qtyStep))throw new Error(x.productName+' quantity must be in steps of '+x.qtyStep);
    const line=q*n_(x.price);subtotal+=line;lines.push({product:x,qty:q,line:line});
  });
  const deliveryCharge=0;
  return {vendorId:vid,subtotal:subtotal,deliveryCharge:deliveryCharge,total:subtotal+deliveryCharge,
    lines:lines,payloadHash:v916B2BFingerprint_(vid,payload)};
}

function prepareB2BUpiPaymentV916(token,payload){
  const vendor=vendor_(token),cfg=v916B2BPaymentConfig_();
  if(!cfg.enabled)throw new Error('UPI payment is not configured yet. Please choose Cash on Delivery.');
  const quote=v916B2BQuote_(vendor,payload||{});
  if(quote.total<=0)throw new Error('Payment amount must be greater than zero.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID),sh=v913PaymentSheet_(ss);
  const paymentId=id_('B2BUPI-'),created=now_(),expires=new Date(created.getTime()+V916_B2B_INTENT_MINUTES*60*1000);
  v910Append_(sh,{
    'Payment ID':paymentId,'Order ID':'',Mobile:digits_(vendor.Mobile),Channel:'B2B',Method:'UPI',
    'Merchant UPI ID':cfg.upiId,'Merchant Name':cfg.upiName,Amount:quote.total,UTR:'',
    Status:'INTENT_CREATED','Intent Expires At':expires,'Payload Hash':quote.payloadHash,
    'Order Request ID':'UPI:'+paymentId,'Created At':created,
    Notes:'Vendor '+quote.vendorId,'Updated At':created
  });
  return {success:true,paymentId:paymentId,amount:quote.total,upiId:cfg.upiId,upiName:cfg.upiName,
    upiUri:v913UpiUri_(cfg,paymentId,quote.total),expiresAt:expires,paymentStatus:'INTENT_CREATED',manualVerificationRequired:true};
}

function v916UtrAlreadyUsed_(sh,utr,currentRow){
  const m=map_(sh),last=sh.getLastRow();
  if(!m.UTR||last<2)return false;
  const matches=sh.getRange(2,m.UTR,last-1,1).createTextFinder(s_(utr)).matchEntireCell(true).matchCase(false).findAll();
  return matches.some(function(cell){return cell.getRow()!==Number(currentRow||0);});
}

function v916PatchB2BPaymentStatus_(orderId,status){
  const sh=sh_(V8.SHEETS.B2B_ORDERS),m=map_(sh),last=sh.getLastRow();
  if(last<2||!m['Order ID'])throw new Error('B2B order database is unavailable.');
  const found=sh.getRange(2,m['Order ID'],last-1,1).createTextFinder(s_(orderId)).matchEntireCell(true).findNext();
  if(!found)throw new Error('B2B order could not be linked to the payment.');
  const row=found.getRow();
  if(m['Payment Type'])sh.getRange(row,m['Payment Type']).setValue('UPI');
  if(m['Payment Status'])sh.getRange(row,m['Payment Status']).setValue(s_(status).toUpperCase());
  if(m['Updated At'])sh.getRange(row,m['Updated At']).setValue(now_());
}

function v916CreateUpiB2BOrder_(vendor,quote,payload,paymentId){
  const vid=s_(vendor['Vendor ID']),requestId='UPI:'+s_(paymentId);
  const prior=findExistingB2BRequestV904_(vid,requestId);
  if(prior){v916PatchB2BPaymentStatus_(prior.orderId,'VERIFICATION_PENDING');return {success:true,orderId:prior.orderId,amount:prior.amount,status:prior.status,duplicatePrevented:true};}
  const orderId=id_('NEB2B-'),otp=String(Math.floor(1000+Math.random()*9000)),created=now_();
  append_(V8.SHEETS.B2B_ORDERS,{
    'Order ID':orderId,'Ordered At':created,'Vendor ID':vid,'Business Name':s_(vendor['Business Name']),'Owner Name':s_(vendor['Owner Name']),
    Mobile:digits_(vendor.Mobile),Address:s_(payload.deliveryAddress||vendor.Address),Area:s_(payload.area||vendor.Area),Pincode:s_(vendor.Pincode),
    Latitude:vendor.Latitude,Longitude:vendor.Longitude,'Payment Type':'UPI','Payment Status':'VERIFICATION_PENDING',
    Subtotal:quote.subtotal,Discount:0,'Total Amount':quote.total,'Outstanding Before':n_(vendor.Outstanding),'Outstanding After':n_(vendor.Outstanding),
    Status:'Order Received','Delivery OTP Hash':hashV8_(otp),'Delivery Slot':s_(payload.deliverySlot),'Priority':'NORMAL',
    Source:'B2B WEB|REQ:'+requestId,'Created At':created,'Updated At':created
  });
  quote.lines.forEach(function(z){
    append_(V8.SHEETS.B2B_ORDER_ITEMS,{
      'Item ID':id_('BI-'),'Order ID':orderId,'Product ID':z.product.productId,'Product Name':z.product.productName,Quantity:z.qty,Unit:z.product.unit,
      'Unit Price':z.product.price,'Line Amount':z.line,'Batch Required':'YES','Picked Qty':0,'Delivered Qty':0,Status:'OPEN',
      'Created At':created,'Updated At':created
    });
  });
  return {success:true,orderId:orderId,amount:quote.total,status:'Order Received',deliveryOtp:otp,clientRequestId:requestId};
}

function submitB2BUpiOrderV916(token,paymentId,utr,payload){
  paymentId=s_(paymentId);utr=s_(utr).replace(/\s+/g,'');payload=payload||{};
  if(!/^B2BUPI-[A-Za-z0-9_-]+$/i.test(paymentId))throw new Error('Invalid B2B UPI payment reference.');
  if(!/^[A-Za-z0-9-]{6,40}$/.test(utr))throw new Error('Enter the UPI transaction/UTR number after completing payment.');
  const vendor=vendor_(token),cfg=v916B2BPaymentConfig_();
  if(!cfg.enabled)throw new Error('UPI payment is not configured.');
  return lockRun_(function(){
    const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID),sh=v913PaymentSheet_(ss),found=v913FindPaymentRow_(sh,paymentId);
    if(!found.row)throw new Error('UPI payment request was not found. Please prepare payment again.');
    const record=v913RowObject_(found);
    if(s_(record.Channel).toUpperCase()!=='B2B')throw new Error('This payment reference is not a B2B payment.');
    if(digits_(record.Mobile)!==digits_(vendor.Mobile))throw new Error('This UPI payment request belongs to another vendor session.');
    const existingOrder=s_(record['Order ID']),existingStatus=s_(record.Status).toUpperCase();
    if(existingOrder&&['VERIFICATION_PENDING','PAID'].includes(existingStatus)){
      return {success:true,orderId:existingOrder,amount:n_(record.Amount),status:'Order Received',paymentType:'UPI',paymentStatus:existingStatus,duplicatePrevented:true};
    }
    if(existingStatus!=='INTENT_CREATED')throw new Error('This UPI payment request cannot be submitted again.');
    if(v916UtrAlreadyUsed_(sh,utr,found.row))throw new Error('This UPI transaction/UTR is already linked to another payment.');
    const expiry=record['Intent Expires At'] instanceof Date?record['Intent Expires At']:new Date(record['Intent Expires At']);
    if(!expiry||isNaN(expiry.getTime())||expiry.getTime()<Date.now())throw new Error('UPI payment request expired. Please prepare a new payment.');
    const quote=v916B2BQuote_(vendor,payload);
    if(quote.payloadHash!==s_(record['Payload Hash']))throw new Error('Cart or delivery details changed. Prepare the UPI payment again.');
    if(Math.abs(quote.total-n_(record.Amount))>0.001)throw new Error('Live negotiated price changed. Prepare the UPI payment again before paying.');
    const order=v916CreateUpiB2BOrder_(vendor,quote,payload,paymentId);
    v913UpdatePayment_(sh,found,{'Order ID':order.orderId,UTR:utr,Status:'VERIFICATION_PENDING','Submitted At':now_(),'Updated At':now_()});
    return Object.assign({},order,{paymentType:'UPI',paymentStatus:'VERIFICATION_PENDING',paymentId:paymentId,manualVerificationRequired:true});
  });
}

function verifyB2BUpiPaymentV916(email,pin,paymentId,status,notes){
  requireAdmin_(email,pin);
  const next=s_(status).toUpperCase();
  if(!['PAID','REJECTED'].includes(next))throw new Error('Payment status must be PAID or REJECTED.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID),sh=v913PaymentSheet_(ss),found=v913FindPaymentRow_(sh,paymentId);
  if(!found.row)throw new Error('Payment not found.');
  const record=v913RowObject_(found),orderId=s_(record['Order ID']);
  if(s_(record.Channel).toUpperCase()!=='B2B')throw new Error('This payment is not a B2B payment.');
  if(!orderId)throw new Error('Payment is not linked to an order.');
  v916PatchB2BPaymentStatus_(orderId,next);
  v913UpdatePayment_(sh,found,{Status:next,'Verified At':now_(),'Verified By':s_(email).toLowerCase(),Notes:s_(notes),'Updated At':now_()});
  return {success:true,paymentId:paymentId,orderId:orderId,paymentStatus:next};
}

const V916_PREVIOUS_GET_B2B_APP_DATA_V9=getB2BAppDataV9;
getB2BAppDataV9=function(token){
  const data=V916_PREVIOUS_GET_B2B_APP_DATA_V9(token),vendor=vendor_(token),vid=s_(vendor['Vendor ID']);
  const byId={};
  rows_(V8.SHEETS.B2B_ORDERS).filter(function(o){return s_(o['Vendor ID'])===vid;}).forEach(function(o){byId[s_(o['Order ID'])]=s_(o['Payment Status']);});
  (data.orders||[]).forEach(function(o){o.paymentStatus=byId[s_(o.orderId)]||'';});
  data.payment=getB2BPaymentConfigV916(token);
  return data;
};

const V916_PREVIOUS_ROUTE_CANDIDATES_=routeCandidates_;
routeCandidates_=function(date,routeType){
  const candidates=V916_PREVIOUS_ROUTE_CANDIDATES_(date,routeType);
  if(s_(routeType).toUpperCase()!=='B2B')return candidates;
  return candidates.filter(function(candidate){
    const order=candidate&&candidate.order||{};
    const type=s_(order['Payment Type']).toUpperCase();
    const status=s_(order['Payment Status']).toUpperCase();
    return type!=='UPI'||status==='PAID';
  });
};
