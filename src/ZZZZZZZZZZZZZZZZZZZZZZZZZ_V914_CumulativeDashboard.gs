/**
 * Native Elaneeru V9.1.4 — cumulative operations dashboard.
 *
 * Read-only aggregation over the existing Fresh Operations workbook.
 * No data is copied to another workbook and no operational rows are mutated.
 */
const V914_DASHBOARD_VERSION = '9.1.4';

function v914RowsFromSheet_(ss,name){
  const sh=ss.getSheetByName(name);
  if(!sh)return [];
  const lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();
  if(lastRow<2||lastCol<1)return [];
  const values=sh.getRange(1,1,lastRow,lastCol).getValues();
  const headers=values[0].map(s_);
  return values.slice(1).map(function(row,i){
    const out={_row:i+2};
    headers.forEach(function(h,j){if(h)out[h]=row[j];});
    return out;
  });
}

function v914Date_(value){
  if(value instanceof Date&&!isNaN(value.getTime()))return value;
  const d=new Date(value);
  return isNaN(d.getTime())?null:d;
}

function v914InRange_(value,from,to){
  const d=v914Date_(value);
  if(!d)return false;
  return d.getTime()>=from.getTime()&&d.getTime()<=to.getTime();
}

function v914Status_(row){return s_(row&&row.Status).trim().toUpperCase();}
function v914Sum_(rows,key){return rows.reduce(function(total,row){return total+n_(row[key]);},0);}

function getCumulativeDashboardV914(email,pin,start,end){
  requireAdmin_(email,pin);
  const from=start?new Date(start+'T00:00:00'):new Date(0);
  const to=end?new Date(end+'T23:59:59'):new Date(8640000000000000);
  if(isNaN(from.getTime())||isNaN(to.getTime())||from>to)throw new Error('Choose a valid dashboard date range.');

  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const customers=v914RowsFromSheet_(ss,V8.SHEETS.CUSTOMERS);
  const b2cOrders=v914RowsFromSheet_(ss,V8.SHEETS.ORDERS);
  const b2cItems=v914RowsFromSheet_(ss,V8.SHEETS.ORDER_ITEMS);
  const vendors=v914RowsFromSheet_(ss,V8.SHEETS.B2B_VENDORS);
  const b2bOrders=v914RowsFromSheet_(ss,V8.SHEETS.B2B_ORDERS);
  const b2bItems=v914RowsFromSheet_(ss,V8.SHEETS.B2B_ORDER_ITEMS);
  const onboarding=v914RowsFromSheet_(ss,V8.SHEETS.VENDOR_ONBOARD);
  const payments=v914RowsFromSheet_(ss,V8.SHEETS.PAYMENTS);
  const subscriptions=v914RowsFromSheet_(ss,'B2C_Subscriptions');
  const referrals=v914RowsFromSheet_(ss,'B2C_Referrals');

  const b2cRange=b2cOrders.filter(function(r){return v914InRange_(r['Ordered At']||r['Created At'],from,to);});
  const b2bRange=b2bOrders.filter(function(r){return v914InRange_(r['Ordered At']||r['Created At'],from,to);});
  const validB2C=b2cRange.filter(function(r){return v914Status_(r)!=='CANCELLED';});
  const validB2B=b2bRange.filter(function(r){return v914Status_(r)!=='CANCELLED';});
  const b2cIds={};validB2C.forEach(function(r){b2cIds[s_(r['Order ID'])]=true;});
  const b2bIds={};validB2B.forEach(function(r){b2bIds[s_(r['Order ID'])]=true;});
  const b2cQty=b2cItems.filter(function(r){return b2cIds[s_(r['Order ID'])];}).reduce(function(a,r){return a+n_(r.Quantity);},0);
  const b2bQty=b2bItems.filter(function(r){return b2bIds[s_(r['Order ID'])];}).reduce(function(a,r){return a+n_(r.Quantity);},0);
  const b2cSales=v914Sum_(validB2C,'Total Amount');
  const b2bSales=v914Sum_(validB2B,'Total Amount');

  const activeSubs=subscriptions.filter(function(r){return v914Status_(r)==='ACTIVE';});
  const pausedSubs=subscriptions.filter(function(r){return v914Status_(r)==='PAUSED';});
  const cancelledSubs=subscriptions.filter(function(r){return v914Status_(r)==='CANCELLED';});
  const qualifiedRefs=referrals.filter(function(r){return ['QUALIFIED','REWARDED'].indexOf(v914Status_(r))>=0;});
  const rewardedRefs=referrals.filter(function(r){return v914Status_(r)==='REWARDED';});
  const availableFreeCoconuts=Math.max(0,(qualifiedRefs.length-rewardedRefs.length)*2);

  const upiRows=payments.filter(function(r){return s_(r.Method).toUpperCase()==='UPI';});
  const verificationPending=upiRows.filter(function(r){return v914Status_(r)==='VERIFICATION_PENDING';});
  const paid=upiRows.filter(function(r){return v914Status_(r)==='PAID';});
  const rejected=upiRows.filter(function(r){return v914Status_(r)==='REJECTED';});
  const intents=upiRows.filter(function(r){return v914Status_(r)==='INTENT_CREATED';});

  const pendingOnboarding=onboarding.filter(function(r){return v914Status_(r)==='PENDING';});
  const approvedOnboarding=onboarding.filter(function(r){return v914Status_(r)==='APPROVED';});
  const activeVendors=vendors.filter(function(r){return v914Status_(r)==='ACTIVE';});
  const totalOutstanding=activeVendors.reduce(function(a,r){return a+n_(r.Outstanding);},0);

  const b2cDelivered=validB2C.filter(function(r){return v914Status_(r)==='DELIVERED';}).length;
  const b2bDelivered=validB2B.filter(function(r){return v914Status_(r)==='DELIVERED';}).length;
  const b2cPending=validB2C.filter(function(r){return ['DELIVERED','CANCELLED'].indexOf(v914Status_(r))<0;}).length;
  const b2bPending=validB2B.filter(function(r){return ['DELIVERED','CANCELLED'].indexOf(v914Status_(r))<0;}).length;

  return {
    ok:true,
    version:V914_DASHBOARD_VERSION,
    generatedAt:fmtDT_(now_()),
    range:{start:start||'',end:end||''},
    combined:{
      sales:b2cSales+b2bSales,
      orders:validB2C.length+validB2B.length,
      quantity:b2cQty+b2bQty
    },
    b2c:{
      sales:b2cSales,orders:validB2C.length,quantity:b2cQty,delivered:b2cDelivered,pending:b2cPending,
      customers:customers.length,activeSubscriptions:activeSubs.length,pausedSubscriptions:pausedSubs.length
    },
    b2b:{
      sales:b2bSales,orders:validB2B.length,quantity:b2bQty,delivered:b2bDelivered,pending:b2bPending,
      activeVendors:activeVendors.length,outstanding:totalOutstanding
    },
    subscriptions:{
      total:subscriptions.length,active:activeSubs.length,paused:pausedSubs.length,cancelled:cancelledSubs.length,
      autoOrderEnabled:false
    },
    referrals:{
      total:referrals.length,qualified:qualifiedRefs.length,rewarded:rewardedRefs.length,
      availableFreeCoconuts:availableFreeCoconuts,rewardPerQualifiedReferral:2
    },
    payments:{
      upiTotal:upiRows.length,intents:intents.length,verificationPending:verificationPending.length,
      paid:paid.length,rejected:rejected.length,pendingAmount:v914Sum_(verificationPending,'Amount'),paidAmount:v914Sum_(paid,'Amount'),
      storageSheet:V8.SHEETS.PAYMENTS
    },
    onboarding:{
      total:onboarding.length,pending:pendingOnboarding.length,approved:approvedOnboarding.length,
      activeB2BVendors:activeVendors.length
    },
    storage:{
      workbook:'Native Elaneeru V8 - Fresh Operations',singleWorkbook:true,
      sheets:{orders:V8.SHEETS.ORDERS,customers:V8.SHEETS.CUSTOMERS,subscriptions:'B2C_Subscriptions',referrals:'B2C_Referrals',payments:V8.SHEETS.PAYMENTS,b2bOrders:V8.SHEETS.B2B_ORDERS,b2bVendors:V8.SHEETS.B2B_VENDORS,vendorOnboarding:V8.SHEETS.VENDOR_ONBOARD}
    }
  };
}

function getCumulativeDashboardHealthV914(){
  return {
    ok:true,version:V914_DASHBOARD_VERSION,readOnly:true,singleWorkbook:true,
    includes:['B2C','B2B','SUBSCRIPTIONS','REFERRALS','PAYMENTS','VENDOR_ONBOARDING']
  };
}
