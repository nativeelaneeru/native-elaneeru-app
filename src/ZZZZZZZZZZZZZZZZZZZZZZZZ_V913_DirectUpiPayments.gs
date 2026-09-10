/**
 * Native Elaneeru V9.1.3 — direct B2C UPI payment foundation.
 *
 * Design:
 * - COD remains the default and unchanged.
 * - UPI is exposed only when a valid merchant VPA is configured.
 * - Before a customer pays, the server creates a short-lived payment intent
 *   containing the server-calculated amount. No production order is created.
 * - After the customer pays and submits a UTR, the canonical B2C order engine
 *   creates the order and the order/payment are marked VERIFICATION_PENDING.
 * - Direct UPI is never auto-marked PAID because there is no gateway/bank
 *   verification callback in this integration.
 * - All payment records use the existing Fresh Operations workbook and the
 *   existing Payment_Ledger sheet; no second database/workbook is introduced.
 */

const V913_PAYMENT_ENGINE_VERSION = '9.1.3';
const V913_FALLBACK_UPI_ID = '';
const V913_FALLBACK_UPI_NAME = 'Sri Govindadri Ventures';
const V913_INTENT_MINUTES = 30;
const V913_PAYMENT_HEADERS = [
  'Payment ID','Order ID','Mobile','Channel','Method','Merchant UPI ID','Merchant Name',
  'Amount','UTR','Status','Intent Expires At','Payload Hash','Order Request ID',
  'Created At','Submitted At','Verified At','Verified By','Notes','Updated At'
];

function v913ValidUpiId_(value){
  return /^[A-Za-z0-9._+\-]{2,}@[A-Za-z0-9.\-]{2,}$/.test(s_(value));
}

function v913PaymentConfig_(){
  const props=PropertiesService.getScriptProperties();
  const propId=s_(props.getProperty('NEL_B2C_UPI_ID'));
  const upiId=propId||V913_FALLBACK_UPI_ID;
  const upiName=s_(props.getProperty('NEL_B2C_UPI_NAME'))||V913_FALLBACK_UPI_NAME||V8.COMPANY;
  const flag=s_(props.getProperty('NEL_B2C_UPI_ENABLED')).toUpperCase();
  const enabled=v913ValidUpiId_(upiId) && flag!=='NO' && flag!=='FALSE' && flag!=='0';
  return {enabled:enabled,upiId:upiId,upiName:upiName};
}

function getB2CPaymentConfigV913(){
  const cfg=v913PaymentConfig_();
  return {
    ok:true,
    engineVersion:V913_PAYMENT_ENGINE_VERSION,
    methods:cfg.enabled?['COD','UPI']:['COD'],
    upiEnabled:cfg.enabled,
    upiId:cfg.enabled?cfg.upiId:'',
    upiName:cfg.enabled?cfg.upiName:'',
    directUpiRequiresManualVerification:true,
    paymentStorage:'Payment_Ledger'
  };
}

function getB2CPaymentEngineHealthV913(){
  const cfg=v913PaymentConfig_();
  return {
    ok:true,
    engineVersion:V913_PAYMENT_ENGINE_VERSION,
    codPreserved:true,
    directUpiSupported:true,
    upiConfigured:cfg.enabled,
    serverCalculatedAmount:true,
    paymentIntentBeforeOrder:true,
    manualVerificationRequired:true,
    autoMarkPaid:false,
    storageWorkbook:'Native Elaneeru V8 - Fresh Operations',
    storageSheet:'Payment_Ledger',
    separatePaymentDatabase:false
  };
}

function setB2CUpiConfigV913(email,pin,upiId,upiName,enabled){
  requireAdmin_(email,pin);
  upiId=s_(upiId);upiName=s_(upiName)||V8.COMPANY;
  if(enabled!==false && !v913ValidUpiId_(upiId))throw new Error('Enter a valid merchant UPI ID.');
  const props=PropertiesService.getScriptProperties();
  props.setProperties({
    NEL_B2C_UPI_ID:upiId,
    NEL_B2C_UPI_NAME:upiName,
    NEL_B2C_UPI_ENABLED:enabled===false?'NO':'YES'
  });
  return getB2CPaymentConfigV913();
}

function v913PaymentSheet_(ss){
  return v910EnsureSheet_(ss,V8.SHEETS.PAYMENTS,V913_PAYMENT_HEADERS);
}

function v913PayloadFingerprint_(payload){
  payload=payload||{};
  const items=(Array.isArray(payload.items)?payload.items:[]).map(function(i){
    return {productId:s_(i.productId),quantity:Math.max(1,Math.floor(n_(i.quantity)))};
  }).sort(function(a,b){return a.productId.localeCompare(b.productId);});
  return hashV8_(JSON.stringify({
    mobile:digits_(payload.mobile),items:items,
    fulfilmentType:s_(payload.fulfilmentType),
    address:s_(payload.address),area:s_(payload.area),pincode:s_(payload.pincode),
    latitude:s_(payload.latitude),longitude:s_(payload.longitude),timeSlot:s_(payload.timeSlot),
    cashbackUsed:Math.max(0,n_(payload.cashbackUsed))
  }));
}

function v913Quote_(ss,payload){
  payload=payload||{};
  const mobile=digits_(payload.mobile);
  if(!/^[6-9]\d{9}$/.test(mobile))throw new Error('Enter a valid 10 digit mobile number.');
  const items=Array.isArray(payload.items)?payload.items:[];
  if(!items.length)throw new Error('Cart is empty.');
  if(Math.max(0,n_(payload.cashbackUsed))>0)throw new Error('Cashback cannot be combined with direct UPI yet.');
  const productSh=ss.getSheetByName(V8.SHEETS.PRODUCTS);
  if(!productSh)throw new Error('Product database is unavailable.');
  const products=v905B2CProducts_(productSh),map={};
  products.forEach(function(p){map[s_(p.productId)]=p;});
  let subtotal=0;
  items.forEach(function(i){
    const p=map[s_(i.productId)];
    if(!p)throw new Error('Product unavailable: '+s_(i.productId));
    const q=Math.max(1,Math.floor(n_(i.quantity))),unit=v905Price_(p,q);
    if(!unit||unit<0)throw new Error('Invalid live price for '+p.productName+'.');
    subtotal+=unit*q;
  });
  return {mobile:mobile,amount:Math.max(0,subtotal),payloadHash:v913PayloadFingerprint_(payload)};
}

function v913FindPaymentRow_(sh,paymentId){
  const meta=v905HeaderMeta_(sh,'Payment_Ledger');
  const col=meta.columns['Payment ID'];
  if(col===undefined||sh.getLastRow()<2)return {row:0,meta:meta,values:null};
  const row=v905FindExactRow_(sh,col,s_(paymentId));
  return {row:row,meta:meta,values:row?sh.getRange(row,1,1,meta.headers.length).getValues()[0]:null};
}

function v913RowObject_(found){
  const out={};
  if(!found||!found.values)return out;
  found.meta.headers.forEach(function(h,i){out[h]=found.values[i];});
  return out;
}

function v913UpdatePayment_(sh,found,patch){
  const values=found.values.slice();
  Object.keys(patch||{}).forEach(function(k){
    const col=found.meta.columns[k];if(col!==undefined)values[col]=patch[k];
  });
  sh.getRange(found.row,1,1,values.length).setValues([values]);
  found.values=values;
}

function v913UpiUri_(cfg,paymentId,amount){
  const params=[
    ['pa',cfg.upiId],['pn',cfg.upiName],['am',Number(amount).toFixed(2)],['cu','INR'],
    ['tn','Native Elaneeru '+s_(paymentId)]
  ].map(function(x){return encodeURIComponent(x[0])+'='+encodeURIComponent(x[1]);}).join('&');
  return 'upi://pay?'+params;
}

function prepareB2CUpiPaymentV913(payload){
  const cfg=v913PaymentConfig_();
  if(!cfg.enabled)throw new Error('UPI payment is not configured yet. Please choose Cash on Delivery.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const quote=v913Quote_(ss,payload);
  if(quote.amount<=0)throw new Error('Payment amount must be greater than zero.');
  const sh=v913PaymentSheet_(ss);
  const paymentId=id_('UPI-'),created=now_();
  const expires=new Date(new Date().getTime()+V913_INTENT_MINUTES*60*1000);
  v910Append_(sh,{
    'Payment ID':paymentId,'Order ID':'',Mobile:quote.mobile,Channel:'B2C',Method:'UPI',
    'Merchant UPI ID':cfg.upiId,'Merchant Name':cfg.upiName,Amount:quote.amount,UTR:'',
    Status:'INTENT_CREATED','Intent Expires At':expires,'Payload Hash':quote.payloadHash,
    'Order Request ID':'UPI:'+paymentId,'Created At':created,'Updated At':created
  });
  return {
    success:true,paymentId:paymentId,amount:quote.amount,upiId:cfg.upiId,upiName:cfg.upiName,
    upiUri:v913UpiUri_(cfg,paymentId,quote.amount),expiresAt:expires,
    paymentStatus:'INTENT_CREATED',manualVerificationRequired:true
  };
}

function v913PatchOrderPayment_(ss,orderId,paymentStatus){
  const sh=ss.getSheetByName(V8.SHEETS.ORDERS);
  if(!sh)throw new Error('Orders database is unavailable.');
  const meta=v905HeaderMeta_(sh,'Orders');
  const row=v905FindExactRow_(sh,meta.columns['Order ID'],s_(orderId));
  if(!row)throw new Error('Order could not be linked to the payment.');
  const values=sh.getRange(row,1,1,meta.headers.length).getValues()[0];
  if(meta.columns['Payment Type']!==undefined)values[meta.columns['Payment Type']]='UPI';
  if(meta.columns['Payment Status']!==undefined)values[meta.columns['Payment Status']]=paymentStatus;
  if(meta.columns['Updated At']!==undefined)values[meta.columns['Updated At']]=now_();
  sh.getRange(row,1,1,meta.headers.length).setValues([values]);
}

function submitB2CUpiOrderV913(paymentId,utr,payload){
  const cfg=v913PaymentConfig_();
  if(!cfg.enabled)throw new Error('UPI payment is not configured.');
  paymentId=s_(paymentId);utr=s_(utr).replace(/\s+/g,'');payload=payload||{};
  if(!/^UPI-[A-Za-z0-9_-]+$/i.test(paymentId))throw new Error('Invalid UPI payment reference.');
  if(!/^[A-Za-z0-9-]{6,40}$/.test(utr))throw new Error('Enter the UPI transaction/UTR number after completing payment.');

  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const sh=v913PaymentSheet_(ss),found=v913FindPaymentRow_(sh,paymentId);
  if(!found.row)throw new Error('UPI payment request was not found. Please prepare payment again.');
  const record=v913RowObject_(found),mobile=digits_(payload.mobile);
  if(digits_(record.Mobile)!==mobile)throw new Error('This UPI payment request belongs to another customer session.');

  const existingOrder=s_(record['Order ID']);
  const existingStatus=s_(record.Status).toUpperCase();
  if(existingOrder&&['VERIFICATION_PENDING','PAID'].indexOf(existingStatus)>=0){
    return {success:true,orderId:existingOrder,finalAmount:n_(record.Amount),status:'Order Received',paymentType:'UPI',paymentStatus:existingStatus,duplicatePrevented:true};
  }
  if(existingStatus!=='INTENT_CREATED')throw new Error('This UPI payment request cannot be submitted again.');
  const expiry=record['Intent Expires At'] instanceof Date?record['Intent Expires At']:new Date(record['Intent Expires At']);
  if(!expiry||isNaN(expiry.getTime())||expiry.getTime()<new Date().getTime())throw new Error('UPI payment request expired. Please prepare a new payment.');

  const quote=v913Quote_(ss,payload);
  if(quote.payloadHash!==s_(record['Payload Hash']))throw new Error('Cart or delivery details changed. Prepare the UPI payment again.');
  if(Math.abs(quote.amount-n_(record.Amount))>0.001)throw new Error('Live price changed. Prepare the UPI payment again before paying.');

  const orderPayload=Object.assign({},payload,{payment:'UPI',clientRequestId:'UPI:'+paymentId});
  const order=saveOrder(orderPayload);
  if(!order||!order.orderId)throw new Error('Order was not created. Please contact support before paying again.');
  v913PatchOrderPayment_(ss,order.orderId,'VERIFICATION_PENDING');
  v913UpdatePayment_(sh,found,{
    'Order ID':order.orderId,UTR:utr,Status:'VERIFICATION_PENDING','Submitted At':now_(),'Updated At':now_()
  });
  try{clearB2CDashboardCacheV839_(mobile);}catch(e){}
  return Object.assign({},order,{paymentType:'UPI',paymentStatus:'VERIFICATION_PENDING',paymentId:paymentId,manualVerificationRequired:true});
}

function verifyB2CUpiPaymentV913(email,pin,paymentId,status,notes){
  requireAdmin_(email,pin);
  const next=s_(status).toUpperCase();
  if(['PAID','REJECTED'].indexOf(next)<0)throw new Error('Payment status must be PAID or REJECTED.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const sh=v913PaymentSheet_(ss),found=v913FindPaymentRow_(sh,paymentId);
  if(!found.row)throw new Error('Payment not found.');
  const record=v913RowObject_(found),orderId=s_(record['Order ID']);
  if(!orderId)throw new Error('Payment is not linked to an order.');
  v913PatchOrderPayment_(ss,orderId,next);
  v913UpdatePayment_(sh,found,{Status:next,'Verified At':now_(),'Verified By':s_(email).toLowerCase(),Notes:s_(notes),'Updated At':now_()});
  try{clearB2CDashboardCacheV839_(record.Mobile);}catch(e){}
  return {success:true,paymentId:s_(paymentId),orderId:orderId,paymentStatus:next};
}
