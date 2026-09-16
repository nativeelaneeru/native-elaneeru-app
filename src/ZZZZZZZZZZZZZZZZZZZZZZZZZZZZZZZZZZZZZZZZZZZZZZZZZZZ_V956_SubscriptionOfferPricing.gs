/** Native Elaneeru V9.5.6 — plan pricing uses the actual non-plan B2C total as the savings baseline.
 *
 * Pricing hierarchy:
 *   Normal/base price -> applicable B2C selling/bundle offer -> plan price.
 * The applicable offer follows the current cart rule: a bundle price is used only
 * when the plan quantity exactly matches Bundle Qty 1 or Bundle Qty 2.
 * Plan amount remains qty * plan unit price. Savings are measured from the
 * customer offer total that the same quantity would receive without the plan.
 *
 * Safety: this layer does not create orders, payments or wallet credits.
 */
const V956_VERSION='9.5.6';

function v956CurrentCustomerUnit_(product,row){
  const live=n_(product&&product['B2C Price']);
  const configured=n_(row&&row['Normal Unit Price']);
  const base=n_(product&&product['B2C Base Price']);
  return live>0?live:(configured>0?configured:base);
}
function v956NormalPrice_(product,row,current){
  const configured=n_(row&&row['Normal Unit Price']);
  const base=n_(product&&product['B2C Base Price']);
  const candidate=configured>0?configured:(base>0?base:current);
  return Math.max(candidate||0,current||0);
}
function v956CustomerOfferTotal_(product,row,qty){
  const unit=v956CurrentCustomerUnit_(product,row),baseTotal=safeRound_(qty*unit,2);
  const q2=Math.floor(n_(product&&product['Bundle Qty 2'])),p2=n_(product&&product['Bundle Price 2']);
  const q1=Math.floor(n_(product&&product['Bundle Qty 1'])),p1=n_(product&&product['Bundle Price 1']);
  if(q2>0&&qty===q2&&p2>0&&p2<baseTotal)return safeRound_(p2,2);
  if(q1>0&&qty===q1&&p1>0&&p1<baseTotal)return safeRound_(p1,2);
  return baseTotal;
}

/* Late compatibility override. All existing V9.5.5 readers/writers call this helper dynamically. */
v955SchemeView_=function(r,days){
  const product=v955Product_(r&&r['Product ID']);
  const qty=Math.max(1,Math.floor(n_(r&&r.Quantity)||1));
  const currentUnit=v956CurrentCustomerUnit_(product,r);
  const normalUnit=v956NormalPrice_(product,r,currentUnit);
  const offerAmount=v956CustomerOfferTotal_(product,r,qty);
  const offerUnit=qty>0?safeRound_(offerAmount/qty,4):currentUnit;
  const planUnit=n_(r&&r['Subscription Unit Price'])||offerUnit;
  const planAmount=safeRound_(qty*planUnit,2);
  const normalAmount=safeRound_(qty*normalUnit,2);
  const deliveries=v955FrequencyDeliveriesMonth_(r&&r.Frequency,days);
  const planMonthly=safeRound_(planAmount*deliveries,2);
  const offerMonthly=safeRound_(offerAmount*deliveries,2);
  const normalMonthly=safeRound_(normalAmount*deliveries,2);
  const start=v954Date_(r&&r['Start Date']),end=v954Date_(r&&r['End Date']);
  return {
    schemeId:s_(r&&r['Scheme ID']),schemeName:s_(r&&r['Scheme Name']),productId:s_(r&&r['Product ID'])||'TC',quantity:qty,frequency:s_(r&&r.Frequency),
    normalUnitPrice:normalUnit,offerUnitPrice:offerUnit,regularUnitPrice:offerUnit,subscriptionUnitPrice:planUnit,
    normalAmountPerDelivery:normalAmount,offerAmountPerDelivery:offerAmount,regularAmountPerDelivery:offerAmount,amountPerDelivery:planAmount,
    estimatedDeliveriesPerMonth:safeRound_(deliveries,2),estimatedMonthlyAmount:planMonthly,
    estimatedNormalMonthlyAmount:normalMonthly,estimatedOfferMonthlyAmount:offerMonthly,estimatedRegularMonthlyAmount:offerMonthly,
    estimatedMonthlySavings:Math.max(0,safeRound_(offerMonthly-planMonthly,2)),
    savingsPerDelivery:Math.max(0,safeRound_(offerAmount-planAmount,2)),
    normalToOfferSavingsPerDelivery:Math.max(0,safeRound_(normalAmount-offerAmount,2)),
    subscriptionBetterThanOffer:planAmount<offerAmount,
    offerIsDiscounted:normalAmount>offerAmount,
    savingsBaseline:'APPLICABLE_B2C_OFFER_TOTAL',
    billingCycle:s_(r&&r['Billing Cycle'])||'PER_DELIVERY',description:s_(r&&r.Description),
    startDate:start?v954Iso_(start):'',endDate:end?v954Iso_(end):'',status:s_(r&&r.Status)||'PAUSED',displayOrder:n_(r&&r['Display Order'])
  };
};

/* New/edited schemes must be at or below the total that a non-plan customer pays for the same quantity. */
const V956_PREVIOUS_SAVE_SCHEME_ADMIN=saveSubscriptionSchemeAdminV955;
saveSubscriptionSchemeAdminV955=function(email,pin,payload){
  requireAdmin_(email,pin);
  const p=payload||{},productId=s_(p.productId)||'TC',product=v955Product_(productId),qty=Math.max(1,Math.floor(n_(p.quantity)||1));
  const customerTotal=v956CustomerOfferTotal_(product,p,qty),planTotal=safeRound_(qty*n_(p.subscriptionUnitPrice),2);
  if(customerTotal>0&&planTotal>customerTotal){
    throw new Error('Plan total cannot exceed the current B2C offer total for this quantity (₹'+safeRound_(customerTotal,2)+').');
  }
  return V956_PREVIOUS_SAVE_SCHEME_ADMIN(email,pin,payload);
};

function getSubscriptionOfferPricingHealthV956(){
  return {ok:true,version:V956_VERSION,pricingHierarchy:'NORMAL_TO_OFFER_TO_PLAN',savingsBaseline:'APPLICABLE_B2C_OFFER_TOTAL',bundleRule:'EXACT_QUANTITY_MATCH',autoOrderEnabled:false,createsProductionOrder:false};
}
