/*******************************************************************************
 * NATIVE ELANEERU V9 — SOFT LAUNCH GUARDS
 * Launch target: 12 Sep 2026
 * Keeps launch-only policy separate from the stable V8 order engine.
 *******************************************************************************/

function getB2CAppDataV9() {
  const data = getAppConfig();
  const master = productRows_();
  data.products = (data.products || []).map(p => {
    const row = master.find(x => s_(x['Product ID']) === s_(p.productId)) || {};
    return Object.assign({}, p, {
      moq: Math.max(1, n_(row['B2C MOQ']) || 1),
      qtyStep: Math.max(1, n_(row['Qty Step']) || 1)
    });
  });
  data.softLaunch = getSoftLaunchConfigV9();
  data.supportPhone = '7411807675';
  data.supportWhatsApp = '917411807675';
  return data;
}

function b2bLaunchProductsV9_(vendorId) {
  const all = productRows_().filter(p => active_(p['B2B Status']));
  const pricing = rows_(V8.SHEETS.VENDOR_PRICING);
  const now = new Date();

  return all.map(p => {
    const override = pricing.find(x =>
      s_(x['Vendor ID']) === s_(vendorId) &&
      s_(x['Product ID']) === s_(p['Product ID']) &&
      active_(x.Status) &&
      (!x['Valid From'] || new Date(x['Valid From']) <= now) &&
      (!x['Valid To'] || new Date(x['Valid To']) >= now)
    );

    const standardPrice = n_(p['B2B Default Price']);
    const yourPrice = override ? n_(override['Agreed Price']) : standardPrice;
    const savingsPerUnit = Math.max(0, standardPrice - yourPrice);
    const savingsPercent = standardPrice > 0
      ? safeRound_(savingsPerUnit * 100 / standardPrice, 1)
      : 0;

    return {
      productId: s_(p['Product ID']),
      productName: s_(p['Product Name']),
      unit: s_(p.Unit),
      standardPrice: standardPrice,
      price: yourPrice,
      savingsPerUnit: savingsPerUnit,
      savingsPercent: savingsPercent,
      hasNegotiatedPrice: !!override,
      moq: override ? n_(override.MOQ) : n_(p['B2B MOQ']),
      qtyStep: override
        ? (n_(override['Qty Step']) || 1)
        : (n_(p['B2B Qty Step']) || n_(p['Qty Step']) || 1),
      imageUrl: safeImageUrl_(p['Image URL']),
      status: 'LIVE'
    };
  });
}

function getB2BAppDataV9(token) {
  const data = getB2BAppData(token);
  data.products = b2bLaunchProductsV9_(data.vendor.vendorId);
  data.softLaunch = getSoftLaunchConfigV9();
  return data;
}

function placeB2BOrderV9(token, payload) {
  payload = payload || {};
  const vendor = vendor_(token);
  const vendorId = s_(vendor['Vendor ID']);
  const approvedPayment = s_(vendor['Payment Type'] || 'COD').toUpperCase();
  const requestedPayment = s_(payload.paymentType || approvedPayment || 'COD').toUpperCase();

  if (!['COD', 'CREDIT'].includes(requestedPayment)) {
    throw new Error('Online payment is not enabled during the soft launch. Use Cash on Delivery.');
  }

  if (requestedPayment === 'CREDIT' && approvedPayment !== 'CREDIT') {
    throw new Error('Credit payment is not enabled for this business account.');
  }

  const products = b2bLaunchProductsV9_(vendorId);
  const requestedItems = Array.isArray(payload.items) ? payload.items : [];
  if (!requestedItems.length) throw new Error('Cart is empty.');

  let estimatedTotal = n_(payload.deliveryCharge);
  requestedItems.forEach(item => {
    const product = products.find(p => p.productId === s_(item.productId));
    if (!product) throw new Error('Product unavailable.');

    const qty = Math.floor(n_(item.quantity));
    if (qty < n_(product.moq)) {
      throw new Error(product.productName + ' MOQ is ' + product.moq);
    }
    if (n_(product.qtyStep) > 1 && qty % n_(product.qtyStep)) {
      throw new Error(product.productName + ' quantity must be in steps of ' + product.qtyStep);
    }
    estimatedTotal += qty * n_(product.price);
  });

  if (requestedPayment === 'CREDIT') {
    const availableCredit = Math.max(0, n_(vendor['Credit Limit']) - n_(vendor.Outstanding));
    if (estimatedTotal > availableCredit) {
      throw new Error('Order exceeds available credit. Available credit: ₹' + safeRound_(availableCredit, 2));
    }
  }

  const safePayload = Object.assign({}, payload, { paymentType: requestedPayment });
  return placeB2BOrder(token, safePayload);
}

function getSoftLaunchConfigV9() {
  return {
    launchDate: '2026-09-12',
    mode: 'SOFT_LAUNCH',
    b2cLogin: 'MOBILE_DEVICE_SESSION',
    b2cPayment: 'COD',
    b2bPayments: ['COD', 'CREDIT_IF_APPROVED'],
    supportPhone: '7411807675',
    supportWhatsApp: '917411807675'
  };
}

function runLaunchPreflightV9() {
  const checks = [];
  const pass = (name, ok, detail) => checks.push({name:name, ok:!!ok, detail:s_(detail)});
  const ss = ss_();
  const requiredSheets = [
    V8.SHEETS.ORDERS, V8.SHEETS.ORDER_ITEMS, V8.SHEETS.CUSTOMERS,
    V8.SHEETS.B2B_VENDORS, V8.SHEETS.B2B_ORDERS, V8.SHEETS.B2B_ORDER_ITEMS,
    V8.SHEETS.PRODUCTS, V8.SHEETS.ROUTES, V8.SHEETS.STOPS,
    V8.SHEETS.DRIVERS, V8.SHEETS.DRIVER_LIVE, V8.SHEETS.PICKER_TASKS,
    V8.SHEETS.INVENTORY, V8.SHEETS.VENDOR_PRICING,
    'Consolidated_Orders', 'Consolidated_Customers', 'Consolidated_Dashboard',
    'Launch_Config', 'Launch_QA'
  ];

  const missing = requiredSheets.filter(name => !ss.getSheetByName(name));
  pass('Required sheets', missing.length === 0, missing.length ? 'Missing: ' + missing.join(', ') : 'All launch sheets present.');

  const tc = productRows_().find(p => s_(p['Product ID']).toUpperCase() === 'TC');
  pass('Tender Coconut product', !!tc, tc ? 'TC found.' : 'Tender Coconut (TC) missing.');
  if (tc) {
    pass('Tender Coconut B2C LIVE', active_(tc['B2C Status']), 'Status: ' + s_(tc['B2C Status']));
    pass('Tender Coconut B2B LIVE', active_(tc['B2B Status']), 'Status: ' + s_(tc['B2B Status']));
    pass('Tender Coconut B2C price', n_(tc['B2C Price']) > 0, '₹' + n_(tc['B2C Price']) + ' | MOQ ' + n_(tc['B2C MOQ']));
    pass('Tender Coconut B2B price', n_(tc['B2B Default Price']) > 0, '₹' + n_(tc['B2B Default Price']) + ' | MOQ ' + n_(tc['B2B MOQ']) + ' | Step ' + (n_(tc['B2B Qty Step']) || n_(tc['Qty Step']) || 1));
  }

  const launchSheet = ss.getSheetByName('Launch_Config');
  if (launchSheet && launchSheet.getLastRow() > 1) {
    const values = launchSheet.getRange(2, 1, launchSheet.getLastRow() - 1, 2).getValues();
    const config = {};
    values.forEach(r => { if (s_(r[0])) config[s_(r[0])] = r[1]; });
    pass('Launch date', s_(config.Launch_Date) === '2026-09-12', 'Launch_Date: ' + s_(config.Launch_Date));
    pass('Soft launch mode', s_(config.Launch_Mode).toUpperCase() === 'SOFT_LAUNCH', 'Mode: ' + s_(config.Launch_Mode));
    pass('B2C login mode', s_(config.B2C_Login_Mode).toUpperCase() === 'MOBILE_DEVICE_SESSION', 'Mode: ' + s_(config.B2C_Login_Mode));
    pass('B2C payment mode', s_(config.B2C_Payment_Mode).toUpperCase() === 'COD', 'Mode: ' + s_(config.B2C_Payment_Mode));
    pass('Support phone', digits_(config.Support_Phone) === '7411807675', 'Phone: ' + s_(config.Support_Phone));
    pass('Delivery radius', n_(config.Delivery_Radius_KM) > 0, n_(config.Delivery_Radius_KM) + ' KM');
  } else {
    pass('Launch config', false, 'Launch_Config is empty or missing.');
  }

  const vendors = rows_(V8.SHEETS.B2B_VENDORS).filter(v => active_(v.Status));
  const invalidPayments = vendors.filter(v => !['COD', 'CREDIT'].includes(s_(v['Payment Type'] || 'COD').toUpperCase()));
  pass('Active B2B payment setup', invalidPayments.length === 0, invalidPayments.length ? 'Unsupported payment type on ' + invalidPayments.length + ' active account(s).' : vendors.length + ' active B2B account(s) use COD/CREDIT only.');

  const failed = checks.filter(c => !c.ok);
  return {
    ok: failed.length === 0,
    checkedAt: fmtDT_(new Date()),
    totalChecks: checks.length,
    passedChecks: checks.length - failed.length,
    failedChecks: failed.length,
    checks: checks
  };
}
