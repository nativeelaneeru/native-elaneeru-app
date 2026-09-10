/**
 * Native Elaneeru V9.0.0 — external PWA bridge compatibility.
 * Keeps the separate GitHub Pages B2B app compatible with the existing V8
 * backend while preserving token validation inside all vendor data/actions.
 */

function getCompliancePublicV91(){
  return {
    legalName: V8.COMPANY,
    legalStructure: 'Business',
    businessAddress: '',
    fssaiNo: '',
    gstin: '',
    grievanceOfficer: '',
    grievanceEmail: '',
    supportPhone: '7411807675',
    invoiceDocumentType: 'Commercial Invoice / Receipt'
  };
}

function getB2BAppDataV9(token){
  return getB2BAppData(token);
}

function placeB2BOrderV9(token,payload){
  return placeB2BOrder(token,payload||{});
}

function getB2BInvoiceV91(token,orderId){
  const vendor=vendor_(token);
  const vendorId=s_(vendor['Vendor ID']);
  const order=rows_(V8.SHEETS.B2B_ORDERS).find(function(r){
    return s_(r['Order ID'])===s_(orderId) && s_(r['Vendor ID'])===vendorId;
  });
  if(!order) throw new Error('Order not found.');
  const items=rows_(V8.SHEETS.B2B_ORDER_ITEMS)
    .filter(function(r){return s_(r['Order ID'])===s_(orderId);})
    .map(function(r){
      return {
        productName:s_(r['Product Name']),
        hsn:s_(r.HSN||r['HSN Code']),
        qty:n_(r.Quantity),
        rate:n_(r['Unit Price']),
        lineAmount:n_(r['Line Amount'])
      };
    });
  return {
    documentType:'Commercial Invoice / Receipt',
    invoiceNo:'INV-'+s_(orderId),
    invoiceDate:fmtDate_(order['Ordered At']||order['Created At']),
    orderId:s_(orderId),
    partyName:s_(order['Business Name']||vendor['Business Name']),
    mobile:digits_(order.Mobile||vendor.Mobile),
    address:s_(order.Address||vendor.Address),
    paymentType:s_(order['Payment Type']),
    total:n_(order['Total Amount']),
    items:items,
    legal:getCompliancePublicV91()
  };
}

function getB2CInvoiceV91(mobile,orderId){
  mobile=digits_(mobile);
  if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid mobile number.');
  const order=rows_(V8.SHEETS.ORDERS).find(function(r){
    return s_(r['Order ID'])===s_(orderId) && digits_(r.Mobile)===mobile;
  });
  if(!order) throw new Error('Order not found.');
  const items=rows_(V8.SHEETS.ORDER_ITEMS)
    .filter(function(r){return s_(r['Order ID'])===s_(orderId);})
    .map(function(r){
      return {
        productName:s_(r['Product Name']),
        hsn:s_(r.HSN||r['HSN Code']),
        qty:n_(r.Quantity),
        rate:n_(r['Unit Price']),
        lineAmount:n_(r['Line Amount'])
      };
    });
  return {
    documentType:'Commercial Invoice / Receipt',
    invoiceNo:'INV-'+s_(orderId),
    invoiceDate:fmtDate_(order['Ordered At']||order['Created At']),
    orderId:s_(orderId),
    partyName:s_(order['Customer Name']),
    mobile:mobile,
    address:s_(order.Address),
    paymentType:s_(order['Payment Type']),
    total:n_(order['Total Amount']),
    items:items,
    legal:getCompliancePublicV91()
  };
}

/**
 * Public bridge for the separate PWAs. Only explicitly listed methods are
 * callable. Vendor account/order methods still authenticate using the token
 * produced by vendorLogin().
 */
doPost=function(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(!isBridge) return bridgeHtml_({ok:false,error:'Unknown endpoint.',requestId:''});
  let req={};
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    const method=String(req.method||'');
    const args=Array.isArray(req.args)?req.args:[];
    const allowed={
      getAppConfig:getAppConfig,
      saveCustomerProfile:saveCustomerProfile,
      checkDeliveryLocation:checkDeliveryLocation,
      saveOrder:saveOrder,
      getB2COrderEngineHealthV901:getB2COrderEngineHealthV901,
      getB2COrderEngineHealthV905:getB2COrderEngineHealthV905,
      getCustomerDashboard:getCustomerDashboard,
      getCustomerLiveTracking:getCustomerLiveTracking,
      getB2CInvoiceV91:getB2CInvoiceV91,
      getCompliancePublicV91:getCompliancePublicV91,
      vendorLogin:vendorLogin,
      vendorLogout:vendorLogout,
      getB2BAppDataV9:getB2BAppDataV9,
      placeB2BOrderV9:placeB2BOrderV9,
      getB2BInvoiceV91:getB2BInvoiceV91,
      getB2BOrderEngineHealthV904:getB2BOrderEngineHealthV904
    };
    if(!allowed[method]) throw new Error('Method not allowed.');
    const result=allowed[method].apply(null,args);
    return bridgeHtml_({ok:true,result:result,requestId:String(req.requestId||'')});
  }catch(err){
    return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:String(req&&req.requestId||'')});
  }
};
