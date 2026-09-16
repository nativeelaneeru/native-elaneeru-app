/** Native Elaneeru V9.5.6 — subscription pricing uses the current B2C customer price as the savings baseline.
 *
 * Pricing hierarchy:
 *   Normal/base price -> current B2C selling/offer price -> subscription price.
 * Subscription amount remains qty * subscription unit price.
 * Subscription savings are calculated against the current B2C selling/offer total,
 * never against an inflated normal/base price.
 *
 * Safety: this layer does not create orders, payments or wallet credits.
 */
const V956_VERSION='9.5.6';

function v956CurrentCustomerPrice_(product,row){
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

/* Late compatibility override. All existing V9.5.5 readers/writers call this helper dynamically. */
v955SchemeView_=function(r,days){
  const product=v955Product_(r&&r['Product ID']);
  const qty=Math.max(1,Math.floor(n_(r&&r.Quantity)||1));
  const offerUnit=v956CurrentCustomerPrice_(product,r);
  const normalUnit=v956NormalPrice_(product,r,offerUnit);
  const subscriptionUnit=n_(r&&r['Subscription Unit Price'])||offerUnit;
  const subscriptionAmount=safeRound_(qty*subscriptionUnit,2);
  const offerAmount=safeRound_(qty*offerUnit,2);
  const normalAmount=safeRound_(qty*normalUnit,2);
  const deliveries=v955FrequencyDeliveriesMonth_(r&&r.Frequency,days);
  const subscriptionMonthly=safeRound_(subscriptionAmount*deliveries,2);
  const offerMonthly=safeRound_(offerAmount*deliveries,2);
  const normalMonthly=safeRound_(normalAmount*deliveries,2);
  const start=v954Date_(r&&r['Start Date']),end=v954Date_(r&&r['End Date']);
  return {
    schemeId:s_(r&&r['Scheme ID']),schemeName:s_(r&&r['Scheme Name']),productId:s_(r&&r['Product ID'])||'TC',quantity:qty,frequency:s_(r&&r.Frequency),
    normalUnitPrice:normalUnit,offerUnitPrice:offerUnit,regularUnitPrice:offerUnit,subscriptionUnitPrice:subscriptionUnit,
    normalAmountPerDelivery:normalAmount,offerAmountPerDelivery:offerAmount,regularAmountPerDelivery:offerAmount,amountPerDelivery:subscriptionAmount,
    estimatedDeliveriesPerMonth:safeRound_(deliveries,2),estimatedMonthlyAmount:subscriptionMonthly,
    estimatedNormalMonthlyAmount:normalMonthly,estimatedOfferMonthlyAmount:offerMonthly,estimatedRegularMonthlyAmount:offerMonthly,
    estimatedMonthlySavings:Math.max(0,safeRound_(offerMonthly-subscriptionMonthly,2)),
    savingsPerDelivery:Math.max(0,safeRound_(offerAmount-subscriptionAmount,2)),
    normalToOfferSavingsPerDelivery:Math.max(0,safeRound_(normalAmount-offerAmount,2)),
    subscriptionBetterThanOffer:subscriptionUnit<offerUnit,
    offerIsDiscounted:normalUnit>offerUnit,
    savingsBaseline:'CURRENT_B2C_PRICE',
    billingCycle:s_(r&&r['Billing Cycle'])||'PER_DELIVERY',description:s_(r&&r.Description),
    startDate:start?v954Iso_(start):'',endDate:end?v954Iso_(end):'',status:s_(r&&r.Status)||'PAUSED',displayOrder:n_(r&&r['Display Order'])
  };
};

/* New/edited schemes cannot advertise a subscription price above the live B2C customer price. */
const V956_PREVIOUS_SAVE_SCHEME_ADMIN=saveSubscriptionSchemeAdminV955;
saveSubscriptionSchemeAdminV955=function(email,pin,payload){
  requireAdmin_(email,pin);
  const p=payload||{},productId=s_(p.productId)||'TC',product=v955Product_(productId);
  const current=n_(product&&product['B2C Price']),subscription=n_(p.subscriptionUnitPrice);
  if(current>0&&subscription>current){
    throw new Error('Subscription price cannot exceed the current B2C customer price (₹'+safeRound_(current,2)+').');
  }
  return V956_PREVIOUS_SAVE_SCHEME_ADMIN(email,pin,payload);
};

function getSubscriptionOfferPricingHealthV956(){
  return {ok:true,version:V956_VERSION,pricingHierarchy:'NORMAL_TO_OFFER_TO_SUBSCRIPTION',savingsBaseline:'CURRENT_B2C_PRICE',autoOrderEnabled:false,createsProductionOrder:false};
}
