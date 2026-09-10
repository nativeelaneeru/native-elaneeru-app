/**
 * Native Elaneeru V8.3.9 — faster customer dashboard and reorder history.
 *
 * Dashboard caching remains here, but saveOrder is no longer wrapped in this
 * file. Order cache invalidation is handled by the single canonical V9.0.1
 * order wrapper to avoid recursive wrapper chains after Apps Script deploys.
 */
const V839_DASHBOARD_TTL_SECONDS = 45;

function b2cDashboardCacheKeyV839_(mobile){
  return 'NEL_B2C_DASH_V839_'+hashV8_(digits_(mobile)).slice(0,24);
}

function clearB2CDashboardCacheV839_(mobile){
  const m=digits_(mobile);
  if(m) CacheService.getScriptCache().remove(b2cDashboardCacheKeyV839_(m));
}

getCustomerDashboard = function(mobile){
  const m=digits_(mobile);
  const cache=CacheService.getScriptCache();
  const key=b2cDashboardCacheKeyV839_(m);
  const hit=cache.get(key);
  if(hit){
    try{return JSON.parse(hit)}catch(err){}
  }

  const customer=rows_(V8.SHEETS.CUSTOMERS).find(x=>digits_(x.Mobile)===m);
  if(!customer) throw new Error('Customer not found.');

  const allOrders=rows_(V8.SHEETS.ORDERS);
  const allItems=rows_(V8.SHEETS.ORDER_ITEMS);
  const customerRows=allOrders
    .filter(o=>digits_(o.Mobile)===m)
    .sort((a,b)=>new Date(b['Ordered At'])-new Date(a['Ordered At']));
  const itemMap={};
  allItems.forEach(i=>{
    const id=s_(i['Order ID']);
    if(!itemMap[id]) itemMap[id]=[];
    itemMap[id].push(i);
  });

  const orders=customerRows.map(o=>({
    orderId:s_(o['Order ID']),
    date:fmtDT_(o['Ordered At']),
    orderedAt:o['Ordered At'] instanceof Date?o['Ordered At'].toISOString():s_(o['Ordered At']),
    amount:n_(o['Total Amount']),
    status:s_(o.Status),
    fulfilment:s_(o['Fulfilment Type']),
    payment:s_(o['Payment Type']),
    items:(itemMap[s_(o['Order ID'])]||[]).map(i=>({
      productId:s_(i['Product ID']),
      name:s_(i['Product Name']),
      qty:n_(i.Quantity),
      lineTotal:n_(i['Line Amount'])
    }))
  }));

  const now=new Date();
  const monday=new Date(now);
  monday.setHours(0,0,0,0);
  monday.setDate(now.getDate()-((now.getDay()+6)%7));
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const deliveredIds=customerRows
    .filter(o=>s_(o.Status)==='Delivered')
    .map(o=>({id:s_(o['Order ID']),at:new Date(o['Ordered At'])}));
  function tenderQtySince_(start){
    const ids={};
    deliveredIds.forEach(o=>{if(!isNaN(o.at)&&o.at>=start)ids[o.id]=true});
    return allItems.reduce((sum,i)=>sum+(ids[s_(i['Order ID'])]&&s_(i['Product ID'])==='TC'?n_(i.Quantity):0),0);
  }
  const weeklyAchieved=tenderQtySince_(monday);
  const monthlyAchieved=tenderQtySince_(monthStart);
  const out={
    customer:{
      name:s_(customer.Name),
      mobile:m,
      cashback:n_(customer['Cashback Balance']),
      totalOrders:orders.length,
      deliveredOrders:orders.filter(o=>o.status==='Delivered').length
    },
    weekly:{achieved:weeklyAchieved,target:V8.WEEKLY_TARGET_QTY,status:weeklyAchieved>=V8.WEEKLY_TARGET_QTY?'Completed':'In Progress',reward:V8.WEEKLY_REWARD},
    monthly:{achieved:monthlyAchieved,target:V8.MONTHLY_TARGET_QTY,status:monthlyAchieved>=V8.MONTHLY_TARGET_QTY?'Completed':'In Progress',reward:V8.MONTHLY_REWARD},
    orders:orders.slice(0,20)
  };
  try{
    const json=JSON.stringify(out);
    if(json.length<95000)cache.put(key,json,V839_DASHBOARD_TTL_SECONDS);
  }catch(err){}
  return out;
};
