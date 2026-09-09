/*******************************************************************************
 * NATIVE ELANEERU V9 — SAFE CLIENT RPC BRIDGE
 ******************************************************************************/

function rpcV9(method, args) {
  method = String(method || '').trim();
  args = Array.isArray(args) ? args : [];

  const allowed = {
    // Auth
    customerLoginV95: customerLoginV95,
    authLoginV95: authLoginV95,
    getCustomerPinStatusV107: getCustomerPinStatusV107,
    setCustomerPinV107: setCustomerPinV107,
    customerLoginWithPinV107: customerLoginWithPinV107,

    // B2C customer
    getAppConfig: getAppConfig,
    getB2CAppDataV9: getB2CAppDataV9,
    getB2CBootstrapV107: getB2CBootstrapV107,
    saveCustomerProfile: saveCustomerProfile,
    checkDeliveryLocation: checkDeliveryLocation,
    saveOrder: saveOrder,
    getCustomerDashboard: getCustomerDashboard,
    getCustomerLiveTracking: getCustomerLiveTracking,
    getB2CInvoiceV91: getB2CInvoiceV91,

    // B2B customer
    vendorLogin: vendorLogin,
    vendorLogout: vendorLogout,
    getB2BAppDataV9: getB2BAppDataV9,
    placeB2BOrderV9: placeB2BOrderV9,
    getVendorLiveTracking: getVendorLiveTracking,
    getB2BInvoiceV91: getB2BInvoiceV91,

    // Public compliance
    getCompliancePublicV91: getCompliancePublicV91,

    // Drivers / delivery
    driverLoginV8: driverLoginV8,
    getDriverDayRouteV8: getDriverDayRouteV92,
    driverHubPickupV83: driverHubPickupV92,
    driverCheckInV8: driverCheckInV92,
    driverScanBarcodeV8: driverScanBarcodeV92,
    driverDeliverV8: driverDeliverV92,
    driverCheckOutV8: driverCheckOutV92,
    driverUnableToDeliverV92: driverUnableToDeliverV92,
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
    generateRouteForDay: generateRouteForDayV92,
    getRouteStopsAdminV83: getRouteStopsAdminV83,
    getAdminInvoiceV91: getAdminInvoiceV91,

    // Launch checks
    getSoftLaunchConfigV9: getSoftLaunchConfigV9,
    runLaunchPreflightV9: runLaunchPreflightV9
  };

  if (!Object.prototype.hasOwnProperty.call(allowed, method)) {
    throw new Error('RPC method not allowed: ' + method);
  }
  return allowed[method].apply(null, args);
}
