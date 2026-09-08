/*******************************************************************************
 * NATIVE ELANEERU V9.3 — EXTERNAL PWA BRIDGE
 *
 * Enables the installable PWAs hosted on GitHub Pages to call Apps Script using
 * the existing hidden-form/postMessage bridge. Only explicitly safe methods are
 * exposed. Authentication is still enforced inside each driver/vendor/staff API.
 *******************************************************************************/

function doPostV93_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(!isBridge) return bridgeHtml_({ok:false,error:'Unknown endpoint.',requestId:''});

  let req={};
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    const method=s_(req.method);
    const args=Array.isArray(req.args)?req.args:[];

    const allowed={
      // B2C customer PWA
      getAppConfig:getAppConfig,
      getB2CAppDataV9:getB2CAppDataV9,
      saveCustomerProfile:saveCustomerProfile,
      checkDeliveryLocation:checkDeliveryLocation,
      saveOrder:saveOrder,
      getCustomerDashboard:getCustomerDashboard,
      getCustomerLiveTracking:getCustomerLiveTracking,
      getB2CInvoiceV91:getB2CInvoiceV91,

      // B2B business PWA
      vendorLogin:vendorLogin,
      vendorLogout:vendorLogout,
      getB2BAppDataV9:getB2BAppDataV9,
      placeB2BOrderV9:placeB2BOrderV9,
      getVendorLiveTracking:getVendorLiveTracking,
      getB2BInvoiceV91:getB2BInvoiceV91,

      // Compliance
      getCompliancePublicV91:getCompliancePublicV91,

      // Operations PWA — delivery partner / driver
      driverLoginV8:driverLoginV8,
      getDriverDayRouteV8:getDriverDayRouteV92,
      driverHubPickupV83:driverHubPickupV92,
      driverCheckInV8:driverCheckInV92,
      driverScanBarcodeV8:driverScanBarcodeV92,
      driverDeliverV8:driverDeliverV92,
      driverCheckOutV8:driverCheckOutV92,
      driverUnableToDeliverV92:driverUnableToDeliverV92,
      updateDriverLiveV8:updateDriverLiveV8,

      // Picker / inventory / sales operations PWA expansion
      getV7PickerDashboard:getV7PickerDashboard,
      updateV7PickerTask:updateV7PickerTask,
      getInventoryDashboardV81:getInventoryDashboardV81,
      addStockMovementV81:addStockMovementV81,
      salesStaffLoginV81:salesStaffLoginV81,
      getV7SalesDashboard:getV7SalesDashboard,
      submitVendorOnboardingV82:submitVendorOnboardingV82
    };

    if(!Object.prototype.hasOwnProperty.call(allowed,method)) throw new Error('Method not allowed.');
    const result=allowed[method].apply(null,args);
    return bridgeHtml_({ok:true,result:result,requestId:s_(req.requestId)});
  }catch(err){
    return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:s_(req&&req.requestId)});
  }
}

doPost=doPostV93_;
