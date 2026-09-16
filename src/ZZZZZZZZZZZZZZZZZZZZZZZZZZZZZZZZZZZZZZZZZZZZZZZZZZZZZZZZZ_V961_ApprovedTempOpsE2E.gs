/**
 * Native Elaneeru V9.6.1 — approved temporary operational E2E harness.
 *
 * TEST-ONLY. Intended to be invoked only through a temporary owner-only
 * Apps Script Execution API deployment. It creates isolated zero-value TEST
 * rows, exercises the real Picker/Batch/Barcode/Driver delivery functions,
 * verifies operational state transitions, and deletes every temporary row in
 * a finally block.
 *
 * Safety boundaries:
 * - No real vendor/customer is created or modified.
 * - No Payment_Ledger, Cashback_Ledger, NE target reward, subscription,
 *   B2B collection, or vendor outstanding write is performed.
 * - Test B2B order uses Payment Type/Status TEST and Total Amount 0.
 */
const V961_APPROVED_TEMP_OPS_E2E_VERSION='9.6.1';

function v961SheetCount_(name){
  const sh=ss_().getSheetByName(name);
  return sh?Math.max(0,sh.getLastRow()-1):0;
}

function v961VendorOutstanding_(){
  const sh=ss_().getSheetByName(V8.SHEETS.B2B_VENDORS);
  if(!sh)return 0;
  return rows_(V8.SHEETS.B2B_VENDORS).reduce(function(sum,r){return sum+n_(r.Outstanding);},0);
}

function v961FinancialSnapshot_(){
  return {
    payments:v961SheetCount_(V8.SHEETS.PAYMENTS),
    cashback:v961SheetCount_(V8.SHEETS.CASHBACK),
    subscriptions:v961SheetCount_('B2C_Subscriptions'),
    targetRewards:v961SheetCount_('NE_Target_Rewards'),
    collections:v961SheetCount_(V8.SHEETS.COLLECTIONS),
    vendorCount:v961SheetCount_(V8.SHEETS.B2B_VENDORS),
    vendorOutstanding:v961VendorOutstanding_(),
    customerCount:v961SheetCount_(V8.SHEETS.CUSTOMERS)
  };
}

function v961SameFinancialSnapshot_(a,b){
  return JSON.stringify(a)===JSON.stringify(b);
}

function v961RandomMobile_(sheetName){
  const used={};
  rows_(sheetName).forEach(function(r){used[digits_(r.Mobile)]=true;});
  for(let i=0;i<80;i++){
    const m='9'+String(Math.floor(100000000+Math.random()*900000000));
    if(!used[m])return m;
  }
  throw new Error('Unable to allocate a temporary TEST mobile.');
}

function v961DeleteWhere_(sheetName,predicate){
  const sh=ss_().getSheetByName(sheetName);
  if(!sh)return 0;
  const found=rows_(sheetName).filter(predicate).map(function(r){return r._row;}).sort(function(a,b){return b-a;});
  found.forEach(function(row){sh.deleteRow(row);});
  return found.length;
}

function v961Cleanup_(rec){
  rec=rec||{};
  const out={events:0,inventory:0,pickerTasks:0,assignments:0,stops:0,routes:0,items:0,orders:0,batches:0,driverLive:0,drivers:0,staff:0};
  out.events=v961DeleteWhere_(V8.SHEETS.DELIVERY_EVENTS,function(r){return s_(r['Route ID'])===s_(rec.routeId)||s_(r['Order ID'])===s_(rec.orderId)||s_(r['Driver ID'])===s_(rec.driverId);});
  out.inventory=v961DeleteWhere_(V8.SHEETS.INVENTORY,function(r){return s_(r['Reference ID'])===s_(rec.orderId)||s_(r['Reference ID'])===s_(rec.testId)||s_(r['Batch ID'])===s_(rec.batchId);});
  out.pickerTasks=v961DeleteWhere_(V8.SHEETS.PICKER_TASKS,function(r){return s_(r['Task ID'])===s_(rec.taskId)||s_(r['Order ID'])===s_(rec.orderId);});
  out.assignments=v961DeleteWhere_(V8.SHEETS.ASSIGNMENTS,function(r){return s_(r['Order ID'])===s_(rec.orderId)||s_(r['Batch ID'])===s_(rec.batchId);});
  out.stops=v961DeleteWhere_(V8.SHEETS.STOPS,function(r){return s_(r['Stop ID'])===s_(rec.stopId)||s_(r['Route ID'])===s_(rec.routeId)||s_(r['Order ID'])===s_(rec.orderId);});
  out.routes=v961DeleteWhere_(V8.SHEETS.ROUTES,function(r){return s_(r['Route ID'])===s_(rec.routeId);});
  out.items=v961DeleteWhere_(V8.SHEETS.B2B_ORDER_ITEMS,function(r){return s_(r['Order ID'])===s_(rec.orderId);});
  out.orders=v961DeleteWhere_(V8.SHEETS.B2B_ORDERS,function(r){return s_(r['Order ID'])===s_(rec.orderId)&&s_(r.Source)===s_(rec.tag);});
  out.batches=v961DeleteWhere_(V8.SHEETS.BATCHES,function(r){return s_(r['Batch ID'])===s_(rec.batchId)&&s_(r.Location)===s_('TEST-'+rec.testId);});
  out.driverLive=v961DeleteWhere_(V8.SHEETS.DRIVER_LIVE,function(r){return s_(r['Driver ID'])===s_(rec.driverId);});
  out.drivers=v961DeleteWhere_(V8.SHEETS.DRIVERS,function(r){return s_(r['Driver ID'])===s_(rec.driverId)&&s_(r['Access Source'])===s_(rec.tag);});
  out.staff=v961DeleteWhere_(V8.SHEETS.STAFF,function(r){return s_(r['Staff ID'])===s_(rec.pickerId)&&s_(r.Name)===s_('OPS E2E TEST PICKER '+rec.testId);});
  return out;
}

function v961Residuals_(rec){
  function has(name,pred){const sh=ss_().getSheetByName(name);return !!(sh&&rows_(name).some(pred));}
  return {
    events:has(V8.SHEETS.DELIVERY_EVENTS,function(r){return s_(r['Route ID'])===s_(rec.routeId)||s_(r['Order ID'])===s_(rec.orderId)||s_(r['Driver ID'])===s_(rec.driverId);}),
    inventory:has(V8.SHEETS.INVENTORY,function(r){return s_(r['Reference ID'])===s_(rec.orderId)||s_(r['Reference ID'])===s_(rec.testId)||s_(r['Batch ID'])===s_(rec.batchId);}),
    pickerTask:has(V8.SHEETS.PICKER_TASKS,function(r){return s_(r['Task ID'])===s_(rec.taskId)||s_(r['Order ID'])===s_(rec.orderId);}),
    assignment:has(V8.SHEETS.ASSIGNMENTS,function(r){return s_(r['Order ID'])===s_(rec.orderId)||s_(r['Batch ID'])===s_(rec.batchId);}),
    stop:has(V8.SHEETS.STOPS,function(r){return s_(r['Stop ID'])===s_(rec.stopId)||s_(r['Route ID'])===s_(rec.routeId);}),
    route:has(V8.SHEETS.ROUTES,function(r){return s_(r['Route ID'])===s_(rec.routeId);}),
    item:has(V8.SHEETS.B2B_ORDER_ITEMS,function(r){return s_(r['Order ID'])===s_(rec.orderId);}),
    order:has(V8.SHEETS.B2B_ORDERS,function(r){return s_(r['Order ID'])===s_(rec.orderId);}),
    batch:has(V8.SHEETS.BATCHES,function(r){return s_(r['Batch ID'])===s_(rec.batchId);}),
    driver:has(V8.SHEETS.DRIVERS,function(r){return s_(r['Driver ID'])===s_(rec.driverId);}),
    picker:has(V8.SHEETS.STAFF,function(r){return s_(r['Staff ID'])===s_(rec.pickerId);})
  };
}

function runApprovedTempOpsE2EV961(){
  const token=Utilities.formatDate(new Date(),'Asia/Kolkata','yyMMddHHmmss')+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const rec={
    version:V961_APPROVED_TEMP_OPS_E2E_VERSION,
    testId:'OPS-'+token,
    tag:'APPROVED TEMP OPS E2E|OPS-'+token
  };
  const before=v961FinancialSnapshot_();
  const checkpoints=[];
  let primaryError=null,cleanup=null,residuals=null,after=null;

  function mark(name,ok,detail){
    checkpoints.push({name:name,ok:!!ok,detail:detail||''});
    if(!ok)throw new Error('Checkpoint failed: '+name+(detail?(' — '+detail):''));
  }

  try{
    const product=find_(V8.SHEETS.PRODUCTS,'Product ID','TC')||productRows_()[0];
    if(!product)throw new Error('No product is available for the temporary E2E.');
    rec.productId=s_(product['Product ID']);
    rec.productName=s_(product['Product Name'])||rec.productId;
    rec.qty=2;

    // Dedicated temporary Picker identity.
    rec.pickerId='OPS-PICK-'+token;
    rec.pickerMobile=v961RandomMobile_(V8.SHEETS.STAFF);
    rec.pickerPin=String(Math.floor(1000+Math.random()*9000));
    append_(V8.SHEETS.STAFF,{
      'Staff ID':rec.pickerId,Name:'OPS E2E TEST PICKER '+rec.testId,Mobile:rec.pickerMobile,
      'PIN Hash':hashV8_(rec.pickerPin),Role:'PICKER','Allowed App':'PICKER',Status:'ACTIVE',
      'Created At':now_(),'Updated At':now_()
    });

    // Dedicated temporary B2B driver identity.
    rec.driverId='OPS-DRV-'+token;
    rec.driverMobile=v961RandomMobile_(V8.SHEETS.DRIVERS);
    rec.driverPin=String(Math.floor(1000+Math.random()*9000));
    append_(V8.SHEETS.DRIVERS,{
      'Driver ID':rec.driverId,'Driver Name':'OPS E2E TEST DRIVER '+rec.testId,Mobile:rec.driverMobile,
      'PIN Hash':hashV8_(rec.driverPin),'Delivery Type':'B2B','Vehicle Number':'TEST-'+token.slice(-4),
      Status:'ACTIVE','Access Source':rec.tag,'Created At':now_(),'Updated At':now_()
    });

    // Zero-value TEST order — not a real vendor and not a financial transaction.
    rec.orderId='OPS-ORDER-'+token;
    rec.deliveryOtp=String(Math.floor(1000+Math.random()*9000));
    append_(V8.SHEETS.B2B_ORDERS,{
      'Order ID':rec.orderId,'Ordered At':now_(),'Vendor ID':'OPS-E2E-TEST','Business Name':'OPS E2E TEST',
      'Owner Name':'Native Elaneeru QA',Mobile:rec.driverMobile,Address:'Native Elaneeru Hub - Internal TEST',
      Area:'HUB',Pincode:'',Latitude:V8.HUB.lat,Longitude:V8.HUB.lng,'Payment Type':'TEST','Payment Status':'TEST',
      Subtotal:0,Discount:0,'Total Amount':0,'Outstanding Before':0,'Outstanding After':0,Status:'Assigned',
      'Delivery OTP Hash':hashV8_(rec.deliveryOtp),'Delivery Slot':'TEST','Priority':'NORMAL',Source:rec.tag,
      'Created At':now_(),'Updated At':now_()
    });
    append_(V8.SHEETS.B2B_ORDER_ITEMS,{
      'Item ID':'OPS-ITEM-'+token,'Order ID':rec.orderId,'Product ID':rec.productId,'Product Name':rec.productName,
      Quantity:rec.qty,Unit:s_(product.Unit)||'pc','Unit Price':0,'Line Amount':0,'Batch Required':'YES',
      'Picked Qty':0,'Delivered Qty':0,Status:'OPEN','Created At':now_(),'Updated At':now_()
    });
    mark('B2B TEST order created',!!find_(V8.SHEETS.B2B_ORDERS,'Order ID',rec.orderId),'zero value / Payment Type TEST');

    // Route + stop assigned only to the temporary driver.
    rec.routeId='OPS-ROUTE-'+token;
    rec.stopId='OPS-STOP-'+token;
    append_(V8.SHEETS.ROUTES,{
      'Route ID':rec.routeId,'Route Date':isoDate_(new Date()),'Route Type':'B2B','Driver ID':rec.driverId,
      'Vehicle Number':'TEST-'+token.slice(-4),'Hub Latitude':V8.HUB.lat,'Hub Longitude':V8.HUB.lng,
      'Total Stops':1,'Completed Stops':0,'Total Road KM':0,'Estimated Minutes':0,
      'Optimization Source':'APPROVED_TEMP_E2E',Status:'PLANNED','Created At':now_(),'Updated At':now_(),
      'Route Polyline':'','API Status':rec.tag
    });
    append_(V8.SHEETS.STOPS,{
      'Stop ID':rec.stopId,'Route ID':rec.routeId,'Route Type':'B2B','Stop Sequence':1,'Order Type':'B2B','Order ID':rec.orderId,
      'Customer/Vendor ID':'OPS-E2E-TEST','Display Name':'OPS E2E TEST',Mobile:rec.driverMobile,
      Address:'Native Elaneeru Hub - Internal TEST',Latitude:V8.HUB.lat,Longitude:V8.HUB.lng,
      'Required Qty':rec.qty,'Assigned Batch Qty':0,'Delivered Qty':0,'Road Distance From Previous KM':0,
      'Travel Time From Previous Min':0,'Planned ETA':now_(),'Tracking Visible':'FALSE',Status:'PENDING',Priority:'NORMAL','Time Slot':'TEST'
    });
    let order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',rec.orderId);
    updateObj_(V8.SHEETS.B2B_ORDERS,order._row,{'Assigned Route ID':rec.routeId,'Assigned Driver ID':rec.driverId,'Route Stop ID':rec.stopId,'Updated At':now_()});
    mark('Route and stop created',!!find_(V8.SHEETS.STOPS,'Stop ID',rec.stopId),'dedicated temporary driver');

    // Picker task uses the real Picker login/dashboard/action functions.
    rec.taskId='OPS-TASK-'+token;
    append_(V8.SHEETS.PICKER_TASKS,{
      'Task ID':rec.taskId,'Order Type':'B2B','Order ID':rec.orderId,'Product ID':rec.productId,'Product Name':rec.productName,
      Quantity:rec.qty,'Required Qty':rec.qty,'Picker ID':'',Status:'PENDING',Notes:rec.tag,'Created At':now_(),'Updated At':now_()
    });
    const pickerDash=getV7PickerDashboard(rec.pickerMobile,rec.pickerPin);
    mark('Picker sees TEST task',pickerDash.tasks.some(function(t){return s_(t['Task ID'])===rec.taskId;}),'real getV7PickerDashboard');
    const pickStart=updateV7PickerTask(rec.pickerMobile,rec.pickerPin,rec.taskId,'START',rec.tag+' START');
    mark('Picker task started',s_(pickStart.status)==='PICKING','real updateV7PickerTask');
    const pickDone=updateV7PickerTask(rec.pickerMobile,rec.pickerPin,rec.taskId,'COMPLETE',rec.tag+' COMPLETE');
    mark('Picker task completed',s_(pickDone.status)==='COMPLETED','real updateV7PickerTask');

    // Create the real production-format batch using the actual underlying batch function.
    const batchResult=createV7Batch(rec.productId,rec.qty,'TEST:'+rec.testId);
    rec.batchId=s_(batchResult.batchId);
    rec.barcode=s_(batchResult.barcode);
    let batch=find_(V8.SHEETS.BATCHES,'Batch ID',rec.batchId);
    updateObj_(V8.SHEETS.BATCHES,batch._row,{Location:'TEST-'+rec.testId,'Updated At':now_()});
    mark('Real batch created',!!rec.batchId&&!!rec.barcode,'createV7Batch');

    // A temporary inbound inventory ledger row lets inventory return to zero after the real delivery-out movement.
    append_(V8.SHEETS.INVENTORY,{
      'Movement ID':'OPS-IN-'+token,'Created At':now_(),'Product ID':rec.productId,'Product Name':rec.productName,
      Location:'TEST-'+rec.testId,'Movement Type':'TEST STOCK IN','Qty In':rec.qty,'Qty Out':0,
      'Reference Type':'TEST','Reference ID':rec.testId,'Batch ID':rec.batchId,Reason:rec.tag,'User ID':'SYSTEM_TEST'
    });
    mark('Inventory TEST stock-in visible',rows_(V8.SHEETS.INVENTORY).some(function(r){return s_(r['Reference ID'])===rec.testId&&n_(r['Qty In'])===rec.qty;}),'isolated test ledger row');

    // Actual assignment logic: batch -> B2B order -> route stop.
    const assignmentResult=assignV7Batch(rec.batchId,'B2B',rec.orderId,rec.qty,'TEST:'+rec.testId);
    mark('Batch assigned to B2B TEST order',assignmentResult.assignedTotal===rec.qty,'real assignV7Batch');

    // Actual B2B Driver functions, in the same order used by the app.
    const login=driverLoginV8(rec.driverMobile,rec.driverPin,'B2B');
    mark('B2B Driver login',login.success===true&&s_(login.driverId)===rec.driverId,'real driverLoginV8');
    const day=getDriverDayRouteV8(rec.driverMobile,rec.driverPin,'B2B',isoDate_(new Date()));
    mark('Driver sees assigned route',day.route&&s_(day.route.routeId)===rec.routeId&&day.stops.some(function(x){return s_(x.stopId)===rec.stopId;}),'real getDriverDayRouteV8');

    driverCheckInV8(rec.driverMobile,rec.driverPin,'B2B',rec.stopId,V8.HUB.lat,V8.HUB.lng);
    let stop=find_(V8.SHEETS.STOPS,'Stop ID',rec.stopId);
    mark('Driver check-in',s_(stop.Status)==='CHECKED_IN'&&!!stop['Check In At'],'real driverCheckInV8');

    const scan=driverScanBarcodeV8(rec.driverMobile,rec.driverPin,'B2B',rec.stopId,rec.barcode);
    stop=find_(V8.SHEETS.STOPS,'Stop ID',rec.stopId);
    mark('Barcode verified at stop',scan.verified===true&&s_(stop.Status)==='BARCODE_VERIFIED','real driverScanBarcodeV8');

    driverDeliverV8(rec.driverMobile,rec.driverPin,'B2B',rec.stopId,rec.deliveryOtp,V8.HUB.lat,V8.HUB.lng,rec.tag);
    stop=find_(V8.SHEETS.STOPS,'Stop ID',rec.stopId);
    order=find_(V8.SHEETS.B2B_ORDERS,'Order ID',rec.orderId);
    mark('OTP delivery completed',s_(stop.Status)==='DELIVERED'&&s_(order.Status)==='Delivered','real driverDeliverV8');
    mark('TEST payment untouched',s_(order['Payment Type'])==='TEST'&&s_(order['Payment Status'])==='TEST','no COD/UPI/credit state');

    const checkout=driverCheckOutV8(rec.driverMobile,rec.driverPin,'B2B',rec.stopId,V8.HUB.lat,V8.HUB.lng);
    stop=find_(V8.SHEETS.STOPS,'Stop ID',rec.stopId);
    const route=find_(V8.SHEETS.ROUTES,'Route ID',rec.routeId);
    mark('Driver checkout and route completion',checkout.routeCompleted===true&&s_(stop.Status)==='COMPLETED'&&s_(route.Status)==='COMPLETED','real driverCheckOutV8');

    const assignment=rows_(V8.SHEETS.ASSIGNMENTS).find(function(a){return s_(a['Order ID'])===rec.orderId&&s_(a['Batch ID'])===rec.batchId;});
    batch=find_(V8.SHEETS.BATCHES,'Batch ID',rec.batchId);
    mark('Batch/assignment delivered',!!assignment&&s_(assignment.Status)==='DELIVERED'&&n_(assignment['Delivered Qty'])===rec.qty&&n_(batch['Delivered Qty'])===rec.qty,'actual delivery inventory transition');

    const outMove=rows_(V8.SHEETS.INVENTORY).find(function(r){return s_(r['Reference ID'])===rec.orderId&&s_(r['Batch ID'])===rec.batchId&&s_(r['Movement Type'])==='DELIVERY OUT';});
    mark('Inventory delivery-out generated',!!outMove&&n_(outMove['Qty Out'])===rec.qty,'created by real driverDeliverV8');

    const events=rows_(V8.SHEETS.DELIVERY_EVENTS).filter(function(r){return s_(r['Route ID'])===rec.routeId||s_(r['Order ID'])===rec.orderId||s_(r['Driver ID'])===rec.driverId;});
    const eventText=events.map(function(r){return s_(r['Event Type']||r.Event||r.Type);}).join('|').toUpperCase();
    mark('Delivery events recorded',events.length>=3,'events='+events.length+' '+eventText);

    // Sales/Admin source verification without using or exposing Admin credentials.
    mark('Sales/Admin source order visible',rows_(V8.SHEETS.B2B_ORDERS).some(function(r){return s_(r['Order ID'])===rec.orderId;}),'B2B_Orders source row present');
    mark('Operational reconciliation consistent',n_(stop['Delivered Qty'])===rec.qty&&n_(assignment['Delivered Qty'])===rec.qty&&n_(outMove['Qty Out'])===rec.qty,'stop = assignment = inventory out');

    after=v961FinancialSnapshot_();
    mark('Financial safety unchanged',v961SameFinancialSnapshot_(before,after),'payments/cashback/subscriptions/rewards/collections/vendor outstanding/customers unchanged');
  }catch(err){
    primaryError=String(err&&err.stack||err&&err.message||err);
  }finally{
    try{cleanup=v961Cleanup_(rec);}catch(cleanErr){cleanup={error:String(cleanErr&&cleanErr.message||cleanErr)};}
    try{residuals=v961Residuals_(rec);}catch(resErr){residuals={error:String(resErr&&resErr.message||resErr)};}
    try{after=v961FinancialSnapshot_();}catch(finErr){after={error:String(finErr&&finErr.message||finErr)};}
  }

  const noResiduals=residuals&&!residuals.error&&Object.keys(residuals).every(function(k){return residuals[k]===false;});
  const financialSafe=after&&!after.error&&v961SameFinancialSnapshot_(before,after);
  const success=!primaryError&&noResiduals&&financialSafe&&checkpoints.every(function(c){return c.ok;});
  return {
    success:success,
    version:V961_APPROVED_TEMP_OPS_E2E_VERSION,
    testId:rec.testId,
    productId:rec.productId||'',
    quantity:rec.qty||0,
    checkpoints:checkpoints,
    financialBefore:before,
    financialAfter:after,
    financialSafetyUnchanged:financialSafe,
    cleanup:cleanup,
    residuals:residuals,
    allTemporaryRowsRemoved:noResiduals,
    productionOrderCreated:false,
    realCustomerOrVendorCreated:false,
    paymentLedgerWrite:false,
    cashbackWrite:false,
    subscriptionWrite:false,
    vendorOutstandingWrite:false,
    error:primaryError||''
  };
}

function getApprovedTempOpsE2EHealthV961(){
  return {
    ok:true,version:V961_APPROVED_TEMP_OPS_E2E_VERSION,
    ownerOnlyExecutionIntended:true,temporaryRows:true,cleanup:true,
    pickerPath:'getV7PickerDashboard/updateV7PickerTask',
    batchPath:'createV7Batch/assignV7Batch',
    driverPath:'driverLoginV8/getDriverDayRouteV8/driverCheckInV8/driverScanBarcodeV8/driverDeliverV8/driverCheckOutV8',
    payments:false,cashback:false,subscriptions:false,vendorOutstanding:false
  };
}
