/*******************************************************************************
 * NATIVE ELANEERU V9 — SOFT LAUNCH GUARDS
 * Launch target: 12 Sep 2026
 * Keeps launch-only policy separate from the stable V8 order engine.
 *******************************************************************************/

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

    return {
      productId: s_(p['Product ID']),
      productName: s_(p['Product Name']),
      unit: s_(p.Unit),
      price: override ? n_(override['Agreed Price']) : n_(p['B2B Default Price']),
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
