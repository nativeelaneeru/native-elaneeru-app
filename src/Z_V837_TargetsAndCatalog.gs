/**
 * Native Elaneeru V8.3.7 target/catalog compatibility patch.
 *
 * Adds a separate Monthly_Targets sheet while preserving the existing
 * Weekly_Targets implementation and all current production data.
 * Also keeps Tender Coconut live in both B2C and B2B through the V8.3.4 guard.
 *
 * Supported columns for both target sheets:
 * Target ID | Audience | Product ID | Target Type | Target Qty | Reward |
 * Start Date | End Date | Status | Title | Description | Created At | Updated At
 */

const V837_MONTHLY_SHEET = 'Monthly_Targets';
const V837_TC_PRODUCT_ID = 'TC';
const V837_TARGET_HEADERS = [
  'Target ID','Audience','Product ID','Target Type','Target Qty','Reward',
  'Start Date','End Date','Status','Title','Description','Created At','Updated At'
];

function ensureMonthlyTargetsV837_(){
  const ss = ss_();
  let sh = ss.getSheetByName(V837_MONTHLY_SHEET);
  if(!sh) sh = ss.insertSheet(V837_MONTHLY_SHEET);

  if(sh.getLastColumn() === 0 || sh.getLastRow() === 0){
    sh.getRange(1,1,1,V837_TARGET_HEADERS.length).setValues([V837_TARGET_HEADERS]);
    sh.setFrozenRows(1);
  }else{
    const existing = sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(s_);
    V837_TARGET_HEADERS.forEach(h=>{
      if(!existing.includes(h)){
        sh.getRange(1,sh.getLastColumn()+1).setValue(h);
        existing.push(h);
      }
    });
  }

  if(sh.getLastRow() < 2){
    const now = new Date();
    const first = new Date(now.getFullYear(),now.getMonth(),1);
    first.setHours(0,0,0,0);
    const last = new Date(now.getFullYear(),now.getMonth()+1,0);
    last.setHours(23,59,59,999);

    append_(V837_MONTHLY_SHEET,{
      'Target ID':'MT-TC-DEFAULT',
      'Audience':'B2C',
      'Product ID':V837_TC_PRODUCT_ID,
      'Target Type':'MONTHLY',
      'Target Qty':V8.MONTHLY_TARGET_QTY,
      'Reward':V8.MONTHLY_REWARD,
      'Start Date':first,
      'End Date':last,
      'Status':'LIVE',
      'Title':'Monthly Tender Coconut Reward',
      'Description':'Buy the monthly Tender Coconut target quantity to unlock the reward.',
      'Created At':now_(),
      'Updated At':now_()
    });
  }
  return sh;
}

function targetDateV837_(value,endOfDay){
  if(value === '' || value == null) return null;
  const d = new Date(value);
  if(isNaN(d)) return null;
  if(endOfDay && d.getHours()===0 && d.getMinutes()===0 && d.getSeconds()===0 && d.getMilliseconds()===0){
    d.setHours(23,59,59,999);
  }
  return d;
}

function defaultTargetWindowV837_(type){
  const now = new Date();
  if(type === 'MONTHLY'){
    const start = new Date(now.getFullYear(),now.getMonth(),1);
    start.setHours(0,0,0,0);
    const end = new Date(now.getFullYear(),now.getMonth()+1,0);
    end.setHours(23,59,59,999);
    return {start,end};
  }
  const start = new Date(now);
  start.setHours(0,0,0,0);
  start.setDate(now.getDate()-((now.getDay()+6)%7));
  const end = new Date(start);
  end.setDate(start.getDate()+6);
  end.setHours(23,59,59,999);
  return {start,end};
}

function targetConfigV837_(sheetName,type,defaultTarget,defaultReward){
  const now = new Date();
  const rows = rows_(sheetName).filter(r=>{
    const audience = s_(r.Audience).toUpperCase();
    const productId = s_(r['Product ID']).toUpperCase();
    const targetType = s_(r['Target Type']).toUpperCase();
    const from = targetDateV837_(r['Start Date'],false);
    const to = targetDateV837_(r['End Date'],true);
    return active_(r.Status) &&
      (!audience || audience === 'B2C' || audience === 'ALL') &&
      (!productId || productId === V837_TC_PRODUCT_ID) &&
      (!targetType || targetType === type) &&
      (!from || from <= now) &&
      (!to || to >= now);
  });

  const row = rows.sort((a,b)=>{
    const ad = targetDateV837_(a['Start Date'],false);
    const bd = targetDateV837_(b['Start Date'],false);
    return (bd ? bd.getTime() : 0) - (ad ? ad.getTime() : 0);
  })[0];
  const fallback = defaultTargetWindowV837_(type);
  const start = row ? (targetDateV837_(row['Start Date'],false) || fallback.start) : fallback.start;
  const end = row ? (targetDateV837_(row['End Date'],true) || fallback.end) : fallback.end;

  return {
    target: row && n_(row['Target Qty']) > 0 ? n_(row['Target Qty']) : defaultTarget,
    reward: row ? n_(row.Reward) : defaultReward,
    title: row ? (s_(row.Title) || (type === 'MONTHLY' ? 'Monthly reward' : 'Weekly reward')) : (type === 'MONTHLY' ? 'Monthly reward' : 'Weekly reward'),
    description: row ? s_(row.Description) : '',
    targetId: row ? s_(row['Target ID']) : '',
    startDate:start,
    endDate:end
  };
}

function weeklyTargetConfigV837_(){
  ensureWeeklyTargetsV834_();
  return targetConfigV837_('Weekly_Targets','WEEKLY',V8.WEEKLY_TARGET_QTY,V8.WEEKLY_REWARD);
}

function monthlyTargetConfigV837_(){
  ensureMonthlyTargetsV837_();
  return targetConfigV837_(V837_MONTHLY_SHEET,'MONTHLY',V8.MONTHLY_TARGET_QTY,V8.MONTHLY_REWARD);
}

function customerTenderCoconutQtyV837_(mobile,start,end){
  const delivered = rows_(V8.SHEETS.ORDERS).filter(o=>{
    if(digits_(o.Mobile)!==digits_(mobile)) return false;
    if(s_(o.Status).toUpperCase()!=='DELIVERED') return false;
    const orderedAt = new Date(o['Ordered At']);
    if(isNaN(orderedAt)) return false;
    return (!start || orderedAt >= start) && (!end || orderedAt <= end);
  });
  const ids = new Set(delivered.map(o=>s_(o['Order ID'])));
  return rows_(V8.SHEETS.ORDER_ITEMS).filter(i=>
    ids.has(s_(i['Order ID'])) && s_(i['Product ID']).toUpperCase()===V837_TC_PRODUCT_ID
  ).reduce((sum,row)=>sum+n_(row.Quantity),0);
}

function getCustomerTargetsV837_(mobile){
  ensureTenderCoconutLiveV834_();
  const weekly = weeklyTargetConfigV837_();
  const monthly = monthlyTargetConfigV837_();
  const w = customerTenderCoconutQtyV837_(mobile,weekly.startDate,weekly.endDate);
  const m = customerTenderCoconutQtyV837_(mobile,monthly.startDate,monthly.endDate);

  return {
    weekly:{
      achieved:w,
      target:weekly.target,
      status:w>=weekly.target?'Completed':'In Progress',
      reward:weekly.reward,
      title:weekly.title,
      description:weekly.description,
      targetId:weekly.targetId,
      startDate:fmtDate_(weekly.startDate),
      endDate:fmtDate_(weekly.endDate)
    },
    monthly:{
      achieved:m,
      target:monthly.target,
      status:m>=monthly.target?'Completed':'In Progress',
      reward:monthly.reward,
      title:monthly.title,
      description:monthly.description,
      targetId:monthly.targetId,
      startDate:fmtDate_(monthly.startDate),
      endDate:fmtDate_(monthly.endDate)
    }
  };
}

/**
 * Production repair/verification helper. Safe to run repeatedly.
 * It never clears or replaces existing rows; it only creates missing sheets/headers
 * and seeds defaults when a target sheet has no data rows.
 */
function repairNativeElaneeruV837(){
  ensureWeeklyTargetsV834_();
  ensureMonthlyTargetsV837_();
  ensureTenderCoconutLiveV834_();
  const weekly = weeklyTargetConfigV837_();
  const monthly = monthlyTargetConfigV837_();
  const tc = productRowsV834Raw_().find(p=>s_(p['Product ID']).toUpperCase()===V837_TC_PRODUCT_ID);
  return {
    version:'8.3.7',
    weeklyTargetsSheetReady:!!ss_().getSheetByName('Weekly_Targets'),
    monthlyTargetsSheetReady:!!ss_().getSheetByName(V837_MONTHLY_SHEET),
    weeklyTarget:{target:weekly.target,reward:weekly.reward,targetId:weekly.targetId,startDate:fmtDate_(weekly.startDate),endDate:fmtDate_(weekly.endDate)},
    monthlyTarget:{target:monthly.target,reward:monthly.reward,targetId:monthly.targetId,startDate:fmtDate_(monthly.startDate),endDate:fmtDate_(monthly.endDate)},
    tenderCoconut:{
      exists:!!tc,
      b2cStatus:tc?s_(tc['B2C Status']):'',
      b2bStatus:tc?s_(tc['B2B Status']):'',
      productName:tc?s_(tc['Product Name']):''
    }
  };
}

// Final public API override for the target dashboard.
getCustomerTargets = getCustomerTargetsV837_;
