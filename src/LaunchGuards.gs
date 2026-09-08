/*******************************************************************************
 * NATIVE ELANEERU V9 — SOFT LAUNCH GUARDS
 * Launch target: 12 Sep 2026
 * Keeps launch-only policy separate from the stable V8 order engine.
 *******************************************************************************/

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

  if (requestedPayment === 'CREDIT') {
    const products = b2bProducts_(vendorId);
    const requestedItems = Array.isArray(payload.items) ? payload.items : [];
    if (!requestedItems.length) throw new Error('Cart is empty.');

    let estimatedTotal = n_(payload.deliveryCharge);
    requestedItems.forEach(item => {
      const product = products.find(p => p.productId === s_(item.productId));
      if (!product) throw new Error('Product unavailable.');
      const qty = Math.floor(n_(item.quantity));
      estimatedTotal += qty * n_(product.price);
    });

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
