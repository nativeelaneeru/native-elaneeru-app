/** Native Elaneeru V9.5.5 — admin-managed B2C subscription schemes and transparent pricing. */
const V955_VERSION='9.5.5';
const V955_SCHEME_SHEET='B2C_Subscription_Schemes';
const V955_SCHEME_HEADERS=['Scheme ID','Scheme Name','Product ID','Quantity','Frequency','Normal Unit Price','Subscription Unit Price','Billing Cycle','Description','Start Date','End Date','Display Order','Status','Created At','Updated At'];
const V955_SUB_PRICING_HEADERS=['Scheme ID','Scheme Name','Subscription Unit Price','Regular Unit Price','Amount Per Delivery','Estimated Monthly Amount','Estimated Monthly Savings','Billing Cycle'];

function v955SchemeSheet_(create){
  const ss=ss_();let sh=ss.getSheetByName(V955_SCHEME_SHEET);
  if(!sh&&create){sh=ss.insertSheet(V955_SCHEME_SHEET);sh.getRange(1,1,1,V955_SCHEME_HEADERS.length).setValues([V955_SCHEME_HEADERS]);sh.setFrozenRows(1);}
  if(sh&&create)v954EnsureHeaders_(sh,V955_SCHEME_HEADERS);
  return sh;
}
function v955Product_(id){return productRows_().find(p=>s_(p['Product ID']).toUpperCase()===s_(id||'TC').toUpperCase())||null;}
function v955FrequencyDeliveriesMonth_(frequency,days){
  const f=s_(frequency).toUpperCase();
  if(f==='DAILY')return 30.44;
  if(f==='ALTERNATE_DAYS')return 15.22;
  if(f==='3X_WEEKLY')return 13.04;
  if(f==='WEEKLY')return 4.35;
  if(f==='CUSTOM_DAYS')return Math.max(1,(Array.isArray(days)?days.length:String(days||'').split(',').filter(Boolean).length))*4.35;
  return 4.35;
}
function v955SchemeView_(r,days){
  const p=v955Product_(r&&r['Product ID']),qty=Math.max(1,Math.floor(n_(r&&r.Quantity)||1));
  const regular=n_(r&&r['Normal Unit Price'])||n_(p&&p['B2C Price']);
  const sub=n_(r&&r['Subscription Unit Price'])||regular;
  const perDelivery=safeRound_(qty*sub,2),regularDelivery=safeRound_(qty*regular,2),deliveries=v955FrequencyDeliveriesMonth_(r&&r.Frequency,days);
  const monthly=safeRound_(perDelivery*deliveries,2),regularMonthly=safeRound_(regularDelivery*deliveries,2);
  return {
    schemeId:s_(r&&r['Scheme ID']),schemeName:s_(r&&r['Scheme Name']),productId:s_(r&&r['Product ID'])||'TC',quantity:qty,frequency:s_(r&&r.Frequency),
    regularUnitPrice:regular,subscriptionUnitPrice:sub,amountPerDelivery:perDelivery,regularAmountPerDelivery:regularDelivery,
    estimatedDeliveriesPerMonth:safeRound_(deliveries,2),estimatedMonthlyAmount:monthly,estimatedRegularMonthlyAmount:regularMonthly,
    estimatedMonthlySavings:Math.max(0,safeRound_(regularMonthly-monthly,2)),savingsPerDelivery:Math.max(0,safeRound_(regularDelivery-perDelivery,2)),
    billingCycle:s_(r&&r['Billing Cycle'])||'PER_DELIVERY',description:s_(r&&r.Description),status:s_(r&&r.Status)||'PAUSED',displayOrder:n_(r&&r['Display Order'])
  };
}
function v955LiveSchemeRows_(){
  const sh=v955SchemeSheet_(false);if(!sh)return [];
  const now=new Date();
  return v954RowsSafe_(sh).filter(r=>{
    const from=v954Date_(r['Start Date']),to=v954Date_(r['End Date']);if(to)to.setHours(23,59,59,999);
    return active_(r.Status)&&(!from||from<=now)&&(!to||to>=now);
  }).sort((a,b)=>n_(a['Display Order'])-n_(b['Display Order'])||a._row-b._row);
}
function getB2CSubscriptionSchemesV955(){return {ok:true,version:V955_VERSION,schemes:v955LiveSchemeRows_().map(r=>v955SchemeView_(r))};}
function v955SubscriptionPricing_(sub){
  if(!sub)return null;
  return {
    schemeId:s_(sub['Scheme ID']),schemeName:s_(sub['Scheme Name']),subscriptionUnitPrice:n_(sub['Subscription Unit Price']),regularUnitPrice:n_(sub['Regular Unit Price']),
    amountPerDelivery:n_(sub['Amount Per Delivery']),estimatedMonthlyAmount:n_(sub['Estimated Monthly Amount']),estimatedMonthlySavings:n_(sub['Estimated Monthly Savings']),billingCycle:s_(sub['Billing Cycle'])||'PER_DELIVERY'
  };
}
function getB2CSubscriptionExperienceV955(mobile){
  const base=getB2CSubscriptionCashbackV954(mobile),m=v954ValidMobile_(mobile),row=v954CurrentSubscription_(m);
  base.version=V955_VERSION;base.schemes=v955LiveSchemeRows_().map(r=>v955SchemeView_(r));base.subscriptionPricing=v955SubscriptionPricing_(row);
  return base;
}
function saveB2CSubscriptionV955(mobile,payload){
  const m=v954ValidMobile_(mobile),p=payload||{},id=s_(p.schemeId),row=v955LiveSchemeRows_().find(r=>s_(r['Scheme ID'])===id);
  if(!row)throw new Error('Choose a live subscription scheme.');
  const view=v955SchemeView_(row,p.deliveryDays),result=saveB2CSubscriptionV954(m,{productId:view.productId,quantity:view.quantity,frequency:view.frequency,startDate:p.startDate,preferredSlot:p.preferredSlot,deliveryDays:p.deliveryDays});
  const sh=v954SubscriptionSheet_(true);v954EnsureHeaders_(sh,V955_SUB_PRICING_HEADERS);
  const hit=v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===m&&s_(r['Subscription ID'])===s_(result.subscription.subscriptionId)).pop();
  if(hit)v910UpdateRow_(sh,hit._row,{'Scheme ID':view.schemeId,'Scheme Name':view.schemeName,'Subscription Unit Price':view.subscriptionUnitPrice,'Regular Unit Price':view.regularUnitPrice,'Amount Per Delivery':view.amountPerDelivery,'Estimated Monthly Amount':view.estimatedMonthlyAmount,'Estimated Monthly Savings':view.estimatedMonthlySavings,'Billing Cycle':view.billingCycle,'Updated At':now_()});
  const saved=hit?v954RowsSafe_(sh).find(r=>r._row===hit._row):null;
  return {success:true,subscription:saved?v954SubscriptionView_(saved):result.subscription,pricing:saved?v955SubscriptionPricing_(saved):view,autoOrderEnabled:false};
}
function getSubscriptionSchemesAdminV955(email,pin){requireAdmin_(email,pin);const sh=v955SchemeSheet_(false);return {ok:true,version:V955_VERSION,schemes:sh?v954RowsSafe_(sh).map(r=>v955SchemeView_(r)):[]};}
function saveSubscriptionSchemeAdminV955(email,pin,payload){
  requireAdmin_(email,pin);const p=payload||{},name=s_(p.schemeName),productId=s_(p.productId)||'TC',frequency=s_(p.frequency).toUpperCase(),allowed=['DAILY','ALTERNATE_DAYS','3X_WEEKLY','WEEKLY','CUSTOM_DAYS'];
  if(!name)throw new Error('Scheme name is required.');if(!v955Product_(productId))throw new Error('Choose a valid product.');if(allowed.indexOf(frequency)<0)throw new Error('Choose a valid frequency.');
  const qty=Math.floor(n_(p.quantity));if(qty<1||qty>100)throw new Error('Quantity must be 1 to 100.');
  const normal=n_(p.normalUnitPrice),sub=n_(p.subscriptionUnitPrice);if(sub<=0)throw new Error('Subscription unit price must be greater than zero.');if(normal>0&&sub>normal)throw new Error('Subscription price cannot exceed normal price.');
  const sh=v955SchemeSheet_(true),rows=v954RowsSafe_(sh),schemeId=s_(p.schemeId)||id_('SUBPLAN-'),now=now_();
  const data={'Scheme ID':schemeId,'Scheme Name':name,'Product ID':productId,Quantity:qty,Frequency:frequency,'Normal Unit Price':normal,'Subscription Unit Price':sub,'Billing Cycle':s_(p.billingCycle)||'PER_DELIVERY',Description:s_(p.description),'Start Date':v954Date_(p.startDate)||'','End Date':v954Date_(p.endDate)||'','Display Order':n_(p.displayOrder),Status:s_(p.status)||'LIVE','Updated At':now};
  const hit=rows.find(r=>s_(r['Scheme ID'])===schemeId);if(hit)v910UpdateRow_(sh,hit._row,data);else{data['Created At']=now;v910Append_(sh,data);}
  const saved=v954RowsSafe_(sh).find(r=>s_(r['Scheme ID'])===schemeId);return {success:true,scheme:v955SchemeView_(saved)};
}
function setSubscriptionSchemeStatusAdminV955(email,pin,schemeId,status){
  requireAdmin_(email,pin);const next=s_(status).toUpperCase();if(['LIVE','PAUSED'].indexOf(next)<0)throw new Error('Invalid scheme status.');const sh=v955SchemeSheet_(false);if(!sh)throw new Error('No subscription schemes found.');const hit=v954RowsSafe_(sh).find(r=>s_(r['Scheme ID'])===s_(schemeId));if(!hit)throw new Error('Scheme not found.');v910UpdateRow_(sh,hit._row,{Status:next,'Updated At':now_()});return {success:true,status:next};
}
function getSubscriptionSchemesHealthV955(){return {ok:true,version:V955_VERSION,schemeSheet:V955_SCHEME_SHEET,autoOrderEnabled:false,customerPricingVisible:true,adminManagedSchemes:true};}

/* Narrow POST bridge extension for the external B2C PWA. */
const V955_PREVIOUS_DO_POST=doPost;
doPost=function(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';if(!isBridge)return V955_PREVIOUS_DO_POST(e);
  let req={};try{req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));const method=String(req.method||''),args=Array.isArray(req.args)?req.args:[];
    const allowed={getB2CSubscriptionSchemesV955:getB2CSubscriptionSchemesV955,getB2CSubscriptionExperienceV955:getB2CSubscriptionExperienceV955,saveB2CSubscriptionV955:saveB2CSubscriptionV955};
    if(allowed[method])return bridgeHtml_({ok:true,result:allowed[method].apply(null,args),requestId:String(req.requestId||'')});
  }catch(err){return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:String(req&&req.requestId||'')});}
  return V955_PREVIOUS_DO_POST(e);
};
