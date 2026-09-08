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
  // Keep customer-facing status simple while barcode verification happens.
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
  // Delivery was already confirmed by OTP; checkout only closes the stop/route.
  if(result && result.success) syncOrderStatusFromStopV92_(stopId,'Delivered');
  return result;
}

function generateRouteForDayV92(email,pin,date,routeType,driverId){
  // The base engine already writes Assigned automatically to every routed order.
  return generateRouteForDay(email,pin,date,routeType,driverId);
}
