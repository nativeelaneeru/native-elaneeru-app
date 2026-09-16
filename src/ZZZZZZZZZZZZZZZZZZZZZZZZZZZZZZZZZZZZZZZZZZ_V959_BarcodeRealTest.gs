/**
 * Native Elaneeru V9.5.9 — real end-to-end Barcode test harness.
 *
 * This intentionally creates REAL rows in the production operations workbook so
 * Admin can test the same Batch -> Assignment -> Driver scan -> Delivery flow
 * used in live operations. All generated records are isolated with a BRT test ID
 * and can be removed with the paired admin cleanup action.
 *
 * Safety boundaries:
 * - No payment ledger, cashback, subscription, vendor balance or customer wallet writes.
 * - Uses a dedicated temporary B2B test order + temporary B2B driver.
 * - The real batch/assignment/driver delivery functions remain authoritative.
 */
const V959_BARCODE_REAL_TEST_VERSION='9.5.9';
const V959_BARCODE_TEST_PREFIX='NEL_BARCODE_REAL_TEST_';

function v959TestPropKey_(testId){
  return V959_BARCODE_TEST_PREFIX+s_(testId).replace(/[^A-Za-z0-9_-]/g,'');
}

function v959SaveTest_(rec){
  PropertiesService.getScriptProperties().setProperty(v959TestPropKey_(rec.testId),JSON.stringify(rec));
  return rec;
}

function v959LoadTest_(testId){
  const raw=PropertiesService.getScriptProperties().getProperty(v959TestPropKey_(testId));
  if(!raw)throw new Error('Real barcode test '+s_(testId)+' was not found or was already cleaned up.');
  try{return JSON.parse(raw)}catch(e){throw new Error('Real barcode test state is unreadable.');}
}

function v959RandomTestMobile_(){
  const used={};
  rows_(V8.SHEETS.DRIVERS).forEach(function(r){used[digits_(r.Mobile)]=true;});
  for(let i=0;i<40;i++){
    const m='9'+String(Math.floor(100000000+Math.random()*900000000));
    if(!used[m])return m;
  }
  throw new Error('Could not allocate a temporary test driver mobile.');
}

function v959DeleteWhere_(sheetName,predicate){
  const sh=sh_(sheetName),rows=rows_(sheetName).filter(predicate).map(function(r){return r._row;}).sort(function(a,b){return b-a;});
  rows.forEach(function(row){sh.deleteRow(row);});
  return rows.length;
}

function createBarcodeRealTestV959(email,pin,p){
  requireAdmin_(email,pin);
  p=p||{};
  const productId=s_(p.productId),product=find_(V8.SHEETS.PRODUCTS,'Product ID',productId);
  if(!product)throw new Error('Select a valid product first.');
  const qty=Math.floor(n_(p.qty));
  if(qty<=0)throw new Error('Real test quantity must be greater than 0.');
  const token=Utilities.formatDate(new Date(),'Asia/Kolkata','yyMMddHHmmss')+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const testId='BRT-'+token;
  const tag='BARCODE REAL TEST|'+testId;
  const rec={version:V959_BARCODE_REAL_TEST_VERSION,testId:testId,tag:tag,createdBy:String(email||'').toLowerCase(),createdAt:new Date().toISOString(),productId:productId,productName:s_(product['Product Name'])||productId,qty:qty};
  v959SaveTest_(rec);

  try{
    // Step 1: create a REAL production batch using the same live function.
    const batchResult=createBatchV81(email,pin,{productId:productId,qty:qty,location:'TEST-'+testId});
    const batch=batchResult&&batchResult.batch?batchResult.batch:{};
    rec.batchId=s_(batch['Batch ID']||batchResult.batchId);
    rec.barcode=s_(batch.Barcode||batchResult.barcode);
    v959SaveTest_(rec);
    if(!rec.batchId||!rec.barcode)throw new Error('Real test batch creation did not return a barcode.');

    // Create a dedicated temporary B2B driver so the test never hijacks a live driver's route.
    const driverId='BRT-DRV-'+token;
    const driverMobile=v959RandomTestMobile_();
    const driverPin=String(Math.floor(1000+Math.random()*9000));
    append_(V8.SHEETS.DRIVERS,{
      'Driver ID':driverId,'Driver Name':'Barcode Real Test','Mobile':driverMobile,'PIN Hash':hashV8_(driverPin),
      'Delivery Type':'B2B','Vehicle Number':'TEST-'+token.slice(-4),'Status':'ACTIVE','Last Login':'',
      'Staff ID':'','Access Source':tag,'Created At':now_(),'Updated At':now_()
    });
    rec.driverId=driverId;rec.driverMobile=driverMobile;rec.driverPin=driverPin;v959SaveTest_(rec);

    // Create a REAL B2B order row and item row, but with zero financial value.
    const orderId='BRT-ORDER-'+token,otp=String(Math.floor(1000+Math.random()*9000));
    append_(V8.SHEETS.B2B_ORDERS,{
      'Order ID':orderId,'Ordered At':now_(),'Vendor ID':'BARCODE-REAL-TEST','Business Name':'Barcode Real Test',
      'Owner Name':'Native Elaneeru QA','Mobile':driverMobile,'Address':'Native Elaneeru Hub - Internal Test',
      'Area':'HUB','Pincode':'','Latitude':V8.HUB.lat,'Longitude':V8.HUB.lng,'Payment Type':'COD',
      'Payment Status':'TEST','Subtotal':0,'Discount':0,'Total Amount':0,'Outstanding Before':0,'Outstanding After':0,
      'Status':'Assigned','Delivery OTP Hash':hashV8_(otp),'Delivery Slot':'TEST','Priority':'NORMAL','Source':tag,
      'Created At':now_(),'Updated At':now_()
    });
    append_(V8.SHEETS.B2B_ORDER_ITEMS,{
      'Item ID':'BRT-ITEM-'+token,'Order ID':orderId,'Product ID':productId,'Product Name':rec.productName,
      'Quantity':qty,'Unit':s_(product.Unit)||'pc','Unit Price':0,'Line Amount':0,'Batch Required':'YES',
      'Picked Qty':0,'Delivered Qty':0,'Status':'OPEN','Created At':now_(),'Updated At':now_()
    });
    rec.orderId=orderId;rec.deliveryOtp=otp;v959SaveTest_(rec);

    // Create a dedicated REAL B2B route + stop for the temporary driver.
    const routeId='BRT-ROUTE-'+token,stopId='BRT-STOP-'+token,date=isoDate_(new Date());
    append_(V8.SHEETS.ROUTES,{
      'Route ID':routeId,'Route Date':date,'Route Type':'B2B','Driver ID':driverId,'Vehicle Number':'TEST-'+token.slice(-4),
      'Hub Latitude':V8.HUB.lat,'Hub Longitude':V8.HUB.lng,'Total Stops':1,'Completed Stops':0,'Total Road KM':0,
      'Estimated Minutes':0,'Optimization Source':'BARCODE_REAL_TEST','Status':'PLANNED','Created At':now_(),'Updated At':now_(),
      'Route Polyline':'','API Status':tag
    });
    append_(V8.SHEETS.STOPS,{
      'Stop ID':stopId,'Route ID':routeId,'Route Type':'B2B','Stop Sequence':1,'Order Type':'B2B','Order ID':orderId,
      'Customer/Vendor ID':'BARCODE-REAL-TEST','Display Name':'Barcode Real Test','Mobile':driverMobile,
      'Address':'Native Elaneeru Hub - Internal Test','Latitude':V8.HUB.lat,'Longitude':V8.HUB.lng,
      'Required Qty':qty,'Assigned Batch Qty':0,'Delivered Qty':0,'Road Distance From Previous KM':0,
      'Travel Time From Previous Min':0,'Planned ETA':now_(),'Tracking Visible':'FALSE','Status':'PENDING',
      'Priority':'NORMAL','Time Slot':'TEST'
    });
    const order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',orderId);
    if(order)updateObj_(V8.SHEETS.B2B_ORDERS,order._row,{'Assigned Route ID':routeId,'Assigned Driver ID':driverId,'Route Stop ID':stopId,'Updated At':now_()});
    rec.routeId=routeId;rec.stopId=stopId;v959SaveTest_(rec);

    return {
      success:true,version:V959_BARCODE_REAL_TEST_VERSION,testId:testId,productId:productId,productName:rec.productName,qty:qty,
      batchId:rec.batchId,barcode:rec.barcode,orderType:'B2B',orderId:orderId,routeId:routeId,stopId:stopId,
      driverId:driverId,driverMobile:driverMobile,driverPin:driverPin,deliveryOtp:otp,
      location:'TEST-'+testId,createsRealRows:true,financialWrites:false,
      next:'Print/scan the real barcode, assign it to '+orderId+', then sign into the B2B Driver app with the temporary driver credentials.'
    };
  }catch(err){
    rec.error=String(err&&err.message||err);v959SaveTest_(rec);
    try{cleanupBarcodeRealTestV959(email,pin,testId);}catch(cleanErr){}
    throw err;
  }
}

function getBarcodeRealTestStatusV959(email,pin,testId){
  requireAdmin_(email,pin);
  const rec=v959LoadTest_(testId);
  const batch=rec.batchId?find_(V8.SHEETS.BATCHES,'Batch ID',rec.batchId):null;
  const order=rec.orderId?find_(V8.SHEETS.B2B_ORDERS,'Order ID',rec.orderId):null;
  const route=rec.routeId?find_(V8.SHEETS.ROUTES,'Route ID',rec.routeId):null;
  const stop=rec.stopId?find_(V8.SHEETS.STOPS,'Stop ID',rec.stopId):null;
  const assignment=rows_(V8.SHEETS.ASSIGNMENTS).find(function(a){return s_(a['Order ID'])===s_(rec.orderId)&&s_(a['Batch ID'])===s_(rec.batchId);})||null;
  return {
    success:true,version:V959_BARCODE_REAL_TEST_VERSION,testId:rec.testId,
    batch:{exists:!!batch,status:batch?s_(batch.Status):'',available:batch?n_(batch['Available Qty']):0,reserved:batch?n_(batch['Reserved Qty']):0,delivered:batch?n_(batch['Delivered Qty']):0},
    assignment:{exists:!!assignment,status:assignment?s_(assignment.Status):'',assigned:assignment?n_(assignment['Assigned Qty']):0,scanned:assignment?n_(assignment['Scanned Qty']):0,delivered:assignment?n_(assignment['Delivered Qty']):0},
    stop:{exists:!!stop,status:stop?s_(stop.Status):'',checkedIn:!!(stop&&stop['Check In At']),barcodeVerified:!!(stop&&stop['Barcode Verified At']),delivered:!!(stop&&stop['Delivered At']),checkedOut:!!(stop&&stop['Check Out At'])},
    order:{exists:!!order,status:order?s_(order.Status):'',paymentStatus:order?s_(order['Payment Status']):''},
    route:{exists:!!route,status:route?s_(route.Status):''},
    driver:{driverId:rec.driverId,mobile:rec.driverMobile,pin:rec.driverPin},deliveryOtp:rec.deliveryOtp,
    ids:{batchId:rec.batchId,barcode:rec.barcode,orderId:rec.orderId,routeId:rec.routeId,stopId:rec.stopId}
  };
}

function cleanupBarcodeRealTestV959(email,pin,testId){
  requireAdmin_(email,pin);
  const rec=v959LoadTest_(testId),tag=rec.tag||('BARCODE REAL TEST|'+rec.testId);
  const out={events:0,inventory:0,assignments:0,stops:0,routes:0,items:0,orders:0,batches:0,driverLive:0,drivers:0};

  out.events=v959DeleteWhere_(V8.SHEETS.DELIVERY_EVENTS,function(r){return s_(r['Route ID'])===s_(rec.routeId)||s_(r['Order ID'])===s_(rec.orderId)||s_(r['Driver ID'])===s_(rec.driverId);});
  out.inventory=v959DeleteWhere_(V8.SHEETS.INVENTORY,function(r){return s_(r['Reference ID'])===s_(rec.orderId)||s_(r['Batch ID'])===s_(rec.batchId);});
  out.assignments=v959DeleteWhere_(V8.SHEETS.ASSIGNMENTS,function(r){return s_(r['Order ID'])===s_(rec.orderId)||s_(r['Batch ID'])===s_(rec.batchId);});
  out.stops=v959DeleteWhere_(V8.SHEETS.STOPS,function(r){return s_(r['Stop ID'])===s_(rec.stopId)||s_(r['Route ID'])===s_(rec.routeId)||s_(r['Order ID'])===s_(rec.orderId);});
  out.routes=v959DeleteWhere_(V8.SHEETS.ROUTES,function(r){return s_(r['Route ID'])===s_(rec.routeId);});
  out.items=v959DeleteWhere_(V8.SHEETS.B2B_ORDER_ITEMS,function(r){return s_(r['Order ID'])===s_(rec.orderId);});
  out.orders=v959DeleteWhere_(V8.SHEETS.B2B_ORDERS,function(r){return s_(r['Order ID'])===s_(rec.orderId)&&s_(r.Source)===tag;});
  out.batches=v959DeleteWhere_(V8.SHEETS.BATCHES,function(r){return s_(r['Batch ID'])===s_(rec.batchId)&&s_(r.Location)==='TEST-'+s_(rec.testId);});
  out.driverLive=v959DeleteWhere_(V8.SHEETS.DRIVER_LIVE,function(r){return s_(r['Driver ID'])===s_(rec.driverId);});
  out.drivers=v959DeleteWhere_(V8.SHEETS.DRIVERS,function(r){return s_(r['Driver ID'])===s_(rec.driverId)&&s_(r['Access Source'])===tag;});

  PropertiesService.getScriptProperties().deleteProperty(v959TestPropKey_(testId));
  return {success:true,version:V959_BARCODE_REAL_TEST_VERSION,testId:testId,deleted:out,financialWritesReversed:false,message:'Real barcode test records removed. No payment/cashback/subscription records were created by this test harness.'};
}

function getBarcodeRealTestHealthV959(){
  return {ok:true,version:V959_BARCODE_REAL_TEST_VERSION,realBatch:true,realB2BOrder:true,realAssignmentPath:'assignBatchV81',realDriverPath:'driverScanBarcodeV8',cleanup:true,payments:false,cashback:false,subscriptions:false};
}
