/*******************************************************************************
 * NATIVE ELANEERU V9.2 — AUTOMATIC DELIVERY STATUS ENGINE
 *
 * Customer/B2B order status follows operational events instead of Admin edits.
 * Existing V8 delivery engine remains the source of truth for auth, GPS, OTP,
 * barcode and route completion. These wrappers add customer-facing status sync.
 *******************************************************************************/

function orderSheetForStopV92_(st){
  return s_(st && st['Order Type']).toUpperCase()==='B2B'
    ? V8.SHEETS.B2B_ORDERS
    : V8.SHEETS.ORDERS;
}

function syncOrderStatusFromStopV92_(stopId, status){
  const st=find_(V8.SHEETS.STOPS,'Stop ID',stopId);
  if(!st) return false;
  const sheet=orderSheetForStopV92_(st);
  const order=find_(sheet,'Order ID',st['Order ID']);
  if(!order) return false;

  const current=s_(order.Status).toUpperCase();
  if(['DELIVERED','CANCELLED','RETURNED'].includes(current) && s_(status).toUpperCase()!=='DELIVERED') return true;

  updateObj_(sheet,order._row,{Status:s_(status),'Updated At':now_()});
  return true;
}

function activateRouteOrdersV92_(routeId, routeType){
  routeType=s_(routeType).toUpperCase();
  const route=find_(V8.SHEETS.ROUTES,'Route ID',routeId);
  if(route && !['COMPLETED','CANCELLED'].includes(s_(route.Status).toUpperCase())){
    updateObj_(V8.SHEETS.ROUTES,route._row,{Status:'ACTIVE','Updated At':now_()});
  }

  rows_(V8.SHEETS.STOPS)
    .filter(st=>s_(st['Route ID'])===s_(routeId) && !['COMPLETED','CANCELLED','DELIVERED'].includes(s_(st.Status).toUpperCase()))
    .forEach(st=>{
      const sheet=orderSheetForStopV92_(st);
      const order=find_(sheet,'Order ID',st['Order ID']);
      if(!order) return;
      const current=s_(order.Status).toUpperCase();
      if(!['DELIVERED','CANCELLED','RETURNED'].includes(current)){
        updateObj_(sheet,order._row,{Status:'Out for Delivery','Updated At':now_()});
      }
    });
}

function ensureFailureColumnsV92_(){
  const sh=sh_(V8.SHEETS.STOPS);
  const wanted=['Failure Reason','Failure Remarks','Failed At','Failure Latitude','Failure Longitude'];
  let headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(s_);
  wanted.forEach(h=>{
    if(headers.includes(h)) return;
    if(sh.getLastColumn()>=sh.getMaxColumns()) sh.insertColumnAfter(sh.getMaxColumns());
    sh.getRange(1,sh.getLastColumn()+1).setValue(h);
    headers.push(h);
  });
}

function failureStatusV92_(reason){
  const map={
    CUSTOMER_UNAVAILABLE:'Delivery Failed - Customer Unavailable',
    WRONG_ADDRESS:'Delivery Failed - Wrong Address',
    RESCHEDULE:'Reschedule Required',
    DAMAGED:'Delivery Failed - Damaged',
    REJECTED:'Rejected by Customer'
  };
  return map[reason]||'Delivery Failed';
}

function normalizeFailureReasonV92_(reason){
  const r=s_(reason).toUpperCase().replace(/[^A-Z]+/g,'_').replace(/^_+|_+$/g,'');
  const aliases={
    CUSTOMER_NOT_AVAILABLE:'CUSTOMER_UNAVAILABLE',
    NOT_AVAILABLE:'CUSTOMER_UNAVAILABLE',
    CUSTOMER_UNAVAILABLE:'CUSTOMER_UNAVAILABLE',
    WRONG_ADDRESS:'WRONG_ADDRESS',
    RESCHEDULE:'RESCHEDULE',
    RESCHEDULE_REQUESTED:'RESCHEDULE',
    DAMAGED:'DAMAGED',
    DAMAGED_STOCK:'DAMAGED',
    REJECTED:'REJECTED',
    CUSTOMER_REJECTED:'REJECTED'
  };
  const out=aliases[r]||'';
  if(!out) throw new Error('Choose a valid delivery-failure reason.');
  return out;
}

// B2B has no hub-pickup action. Opening today's assigned route is treated as
// the driver's route start and automatically moves its orders to Out for Delivery.
// B2C remains stricter: Out for Delivery begins only after confirmed hub pickup.
function getDriverDayRouteV92(mobile,pin,type,date){
  const data=getDriverDayRouteV8(mobile,pin,type,date);
  const t=s_(type).toUpperCase();
  if(data && data.route && t==='B2B'){
    activateRouteOrdersV92_(data.route.routeId,t);
    data.route.status='ACTIVE';
  }
  return data;
}

function driverHubPickupV92(mobile,pin,type,routeId,lat,lng){
  const result=driverHubPickupV83(mobile,pin,type,routeId,lat,lng);
  if(result && result.success) activateRouteOrdersV92_(routeId,'B2C');
  return result;
}

function driverCheckInV92(mobile,pin,type,stopId,lat,lng){
  const result=driverCheckInV8(mobile,pin,type,stopId,lat,lng);
  if(result && result.success!==false) syncOrderStatusFromStopV92_(stopId,'Arrived');
  return result;
}

function driverScanBarcodeV92(mobile,pin,type,stopId,barcode,lat,lng){
  const result=driverScanBarcodeV8(mobile,pin,type,stopId,barcode,lat,lng);
  if(result && result.success) syncOrderStatusFromStopV92_(stopId,'Arrived');
  return result;
}

function driverDeliverV92(mobile,pin,type,stopId,otp,lat,lng,remarks){
  const result=driverDeliverV8(mobile,pin,type,stopId,otp,lat,lng,remarks);
  if(result && result.success) syncOrderStatusFromStopV92_(stopId,'Delivered');
  return result;
}

function driverCheckOutV92(mobile,pin,type,stopId,lat,lng){
  const result=driverCheckOutV8(mobile,pin,type,stopId,lat,lng);
  if(result && result.success) syncOrderStatusFromStopV92_(stopId,'Delivered');
  return result;
}

function driverUnableToDeliverV92(mobile,pin,type,stopId,reason,remarks,lat,lng){
  return lockRun_(()=>{
    const d=driverAuth_(mobile,pin,type);
    const st=checkCurrentStop_(d,stopId);
    if(st['Delivered At']) throw new Error('This stop is already delivered.');

    const why=normalizeFailureReasonV92_(reason);
    lat=Number(lat); lng=Number(lng);
    if(!isFinite(lat)||!isFinite(lng)) throw new Error('Valid GPS is required to mark an unsuccessful delivery.');

    ensureFailureColumnsV92_();
    const failedAt=now_();
    const publicStatus=failureStatusV92_(why);

    updateObj_(V8.SHEETS.STOPS,st._row,{
      'Tracking Visible':'FALSE',
      Status:'CANCELLED',
      'Check Out At':failedAt,
      'Failure Reason':why,
      'Failure Remarks':s_(remarks),
      'Failed At':failedAt,
      'Failure Latitude':lat,
      'Failure Longitude':lng
    });

    const orderSheet=orderSheetForStopV92_(st);
    const order=find_(orderSheet,'Order ID',st['Order ID']);
    if(order){
      const orderUpdate={Status:publicStatus,'Updated At':failedAt};
      if(['CUSTOMER_UNAVAILABLE','RESCHEDULE','DAMAGED'].includes(why)){
        orderUpdate['Assigned Route ID']='';
        orderUpdate['Assigned Driver ID']='';
        orderUpdate['Route Stop ID']='';
      }
      updateObj_(orderSheet,order._row,orderUpdate);
    }

    event_(st,d,'DELIVERY_FAILED',lat,lng,'',0,why+(s_(remarks)?' · '+s_(remarks):''));
    stopLive_(s_(d['Driver ID']),s_(st['Route ID']),s_(st['Stop ID']));

    const all=rows_(V8.SHEETS.STOPS).filter(x=>s_(x['Route ID'])===s_(st['Route ID']));
    const terminal=all.filter(x=>['COMPLETED','CANCELLED'].includes(s_(x.Status).toUpperCase())).length;
    const next=findNextStop_(s_(st['Route ID']));
    const route=find_(V8.SHEETS.ROUTES,'Route ID',st['Route ID']);
    if(route) updateObj_(V8.SHEETS.ROUTES,route._row,{
      'Completed Stops':terminal,
      Status:terminal>=all.length?'COMPLETED':'ACTIVE',
      'Updated At':failedAt
    });
    updateObj_(V8.SHEETS.DRIVERS,d._row,{
      'Current Stop ID':next?s_(next['Stop ID']):'',
      'Current Route ID':next?s_(st['Route ID']):'',
      'Updated At':failedAt
    });

    return {
      success:true,
      reason:why,
      orderStatus:publicStatus,
      nextStopId:next?s_(next['Stop ID']):'',
      routeCompleted:!next
    };
  });
}

function generateRouteForDayV92(email,pin,date,routeType,driverId){
  return generateRouteForDay(email,pin,date,routeType,driverId);
}
