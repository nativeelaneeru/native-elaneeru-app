/*******************************************************************************
 * NATIVE ELANEERU V9 — SAFE CLIENT RPC BRIDGE
 *
 * google.script.run does not reliably support dynamic method access like
 * google.script.run[functionName](...). Every UI calls this one fixed method
 * and the server dispatches only to an explicit allow-list.
 *******************************************************************************/

function rpcV9(method, args) {
  method = String(method || '').trim();
  args = Array.isArray(args) ? args : [];

  const allowed = {
    // B2C customer
    getAppConfig: getAppConfig,
    saveCustomerProfile: saveCustomerProfile,
    checkDeliveryLocation: checkDeliveryLocation,
    saveOrder: saveOrder,
    getCustomerDashboard: getCustomerDashboard,
    getCustomerLiveTracking: getCustomerLiveTracking,

    // B2B customer
    vendorLogin: vendorLogin,
    vendorLogout: vendorLogout,
    getB2BAppDataV9: getB2BAppDataV9,
    placeB2BOrderV9: placeB2BOrderV9,
    getVendorLiveTracking: getVendorLiveTracking,

    // Drivers / delivery
    driverLoginV8: driverLoginV8,
    getDriverDayRouteV8: getDriverDayRouteV8,
    driverHubPickupV83: driverHubPickupV83,
    driverCheckInV8: driverCheckInV8,
    driverScanBarcodeV8: driverScanBarcodeV8,
    driverDeliverV8: driverDeliverV8,
    driverCheckOutV8: driverCheckOutV8,
    updateDriverLiveV8: updateDriverLiveV8,

    // Picker
    getV7PickerDashboard: getV7PickerDashboard,
    updateV7PickerTask: updateV7PickerTask,

    // Barcode / batch
    getBarcodeConsoleV81: getBarcodeConsoleV81,
    createBatchV81: createBatchV81,
    assignBatchV81: assignBatchV81,

    // Inventory
    getInventoryDashboardV81: getInventoryDashboardV81,
    addStockMovementV81: addStockMovementV81,

    // Sales / onboarding
    getV7SalesDashboard: getV7SalesDashboard,
    salesStaffLoginV81: salesStaffLoginV81,
    submitVendorOnboardingV82: submitVendorOnboardingV82,

    // Admin
    adminLogin: adminLogin,
    getAdminDashboard: getAdminDashboard,
    assignDeliveryPartner: assignDeliveryPartner,
    autoAssignOrderAdmin: autoAssignOrderAdmin,
    updateOrderStatus: updateOrderStatus,
    updateSupportTicket: updateSupportTicket,
    setAutoAssignment: setAutoAssignment,
    createDeliveryPartnerAdmin: createDeliveryPartnerAdmin,
    updateDeliveryPartnerAdmin: updateDeliveryPartnerAdmin,
    getRoutePlannerDataV83: getRoutePlannerDataV83,
    generateRouteForDay: generateRouteForDay,
    getRouteStopsAdminV83: getRouteStopsAdminV83,

    // Launch checks
    getSoftLaunchConfigV9: getSoftLaunchConfigV9,
    runLaunchPreflightV9: runLaunchPreflightV9
  };

  if (!Object.prototype.hasOwnProperty.call(allowed, method)) {
    throw new Error('RPC method not allowed: ' + method);
  }

  return allowed[method].apply(null, args);
}
