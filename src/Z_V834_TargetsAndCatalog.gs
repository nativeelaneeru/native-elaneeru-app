/**
 * Native Elaneeru V8.3.4 compatibility patch.
 *
 * Goals:
 * 1) Make the B2C weekly reward read from the Weekly_Targets sheet instead of
 *    being permanently hard-coded.
 * 2) Keep Tender Coconut (TC) available in both B2C and B2B even if a sheet
 *    status was accidentally cleared/disabled.
 * 3) Stay backward-compatible with the existing V8.3 Code.gs APIs.
 *
 * Weekly_Targets supported columns (case-sensitive headers):
 * Target ID | Audience | Product ID | Target Type | Target Qty | Reward |
 * Start Date | End Date | Status | Title | Description | Created At | Updated At
 */

const V834_WEEKLY_SHEET = 'Weekly_Targets';
const V834_TC_PRODUCT_ID = 'TC';

function ensureWeeklyTargetsV834_(){
  const ss = ss_();
  let sh = ss.getSheetByName(V834_WEEKLY_SHEET);
  if(!sh) sh = ss.insertSheet(V834_WEEKLY_SHEET);

  const headers = [
    'Target ID','Audience','Product ID','Target Type','Target Qty','Reward',
    'Start Date','End Date','Status','Title','Description','Created At','Updated At'
  ];

  if(sh.getLastColumn() === 0 || sh.getLastRow() === 0){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }else{
    const existing = sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(s_);
    headers.forEach(h=>{
      if(!existing.includes(h)){
        sh.getRange(1,sh.getLastColumn()+1).setValue(h);
        existing.push(h);
      }
    });
  }

  if(sh.getLastRow() < 2){
    const now = new Date();
    const monday = new Date(now);
    monday.setHours(0,0,0,0);
    monday.setDate(now.getDate()-((now.getDay()+6)%7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate()+6);
    sunday.setHours(23,59,59,999);

    append_(V834_WEEKLY_SHEET,{
      'Target ID':'WT-TC-DEFAULT',
      'Audience':'B2C',
      'Product ID':V834_TC_PRODUCT_ID,
      'Target Type':'WEEKLY',
      'Target Qty':V8.WEEKLY_TARGET_QTY,
      'Reward':V8.WEEKLY_REWARD,
      'Start Date':monday,
      'End Date':sunday,
      'Status':'LIVE',
      'Title':'Weekly Tender Coconut Reward',
      'Description':'Buy the weekly Tender Coconut target quantity to unlock the reward.',
      'Created At':now_(),
      'Updated At':now_()
    });
  }
  return sh;
}

function weeklyTargetConfigV834_(){
  ensureWeeklyTargetsV834_();
  const now = new Date();
  const rows = rows_(V834_WEEKLY_SHEET).filter(r=>{
    const audience = s_(r.Audience).toUpperCase();
    const productId = s_(r['Product ID']).toUpperCase();
    const type = s_(r['Target Type']).toUpperCase();
    const from = r['Start Date'] ? new Date(r['Start Date']) : null;
    const to = r['End Date'] ? new Date(r['End Date']) : null;
    return active_(r.Status) &&
      (!audience || audience === 'B2C' || audience === 'ALL') &&
      (!productId || productId === V834_TC_PRODUCT_ID) &&
      (!type || type === 'WEEKLY') &&
      (!from || isNaN(from) || from <= now) &&
      (!to || isNaN(to) || to >= now);
  });

  const r = rows.sort((a,b)=>{
    const ad = new Date(a['Start Date']||0).getTime() || 0;
    const bd = new Date(b['Start Date']||0).getTime() || 0;
    return bd-ad;
  })[0];

  return {
    target: r && n_(r['Target Qty']) > 0 ? n_(r['Target Qty']) : V8.WEEKLY_TARGET_QTY,
    reward: r ? n_(r.Reward) : V8.WEEKLY_REWARD,
    title: r ? (s_(r.Title)||'Weekly reward') : 'Weekly reward',
    description: r ? s_(r.Description) : '',
    targetId: r ? s_(r['Target ID']) : ''
  };
}

function ensureTenderCoconutLiveV834_(){
  const cache = CacheService.getScriptCache();
  if(cache.get('NEL_TC_LIVE_V834') === '1') return true;

  const sh = sh_(V8.SHEETS.PRODUCTS);
  const rows = productRowsV834Raw_();
  const tc = rows.find(p=>s_(p['Product ID']).toUpperCase() === V834_TC_PRODUCT_ID);

  if(tc){
    const patch = {};
    if(s_(tc['B2C Status']).toUpperCase() !== 'LIVE') patch['B2C Status'] = 'LIVE';
    if(s_(tc['B2B Status']).toUpperCase() !== 'LIVE') patch['B2B Status'] = 'LIVE';
    if(!s_(tc['Product Name'])) patch['Product Name'] = 'Tender Coconut';
    if(!s_(tc.Category)) patch.Category = 'Coconuts';
    if(!s_(tc.Unit)) patch.Unit = 'pc';
    if(!n_(tc['B2C MOQ'])) patch['B2C MOQ'] = 1;
    if(!n_(tc['B2B MOQ'])) patch['B2B MOQ'] = 20;
    if(!n_(tc['Qty Step'])) patch['Qty Step'] = 1;
    if(!n_(tc['Sort Order'])) patch['Sort Order'] = 1;
    if(Object.keys(patch).length){
      patch['Updated At'] = now_();
      updateObj_(V8.SHEETS.PRODUCTS,tc._row,patch);
    }
  }else{
    append_(V8.SHEETS.PRODUCTS,{
      'Product ID':V834_TC_PRODUCT_ID,
      'Product Name':'Tender Coconut',
      'Category':'Coconuts',
      'Unit':'pc',
      'B2C Price':50,
      'B2B Default Price':39,
      'B2C MOQ':1,
      'B2B MOQ':20,
      'Qty Step':1,
      'Bundle Qty 1':5,
      'Bundle Price 1':240,
      'Bundle Qty 2':10,
      'Bundle Price 2':475,
      'Barcode Required':'YES',
      'B2C Status':'LIVE',
      'B2B Status':'LIVE',
      'Sort Order':1,
      'Created At':now_(),
      'Updated At':now_()
    });
  }

  cache.put('NEL_TC_LIVE_V834','1',600);
  return true;
}

function productRowsV834Raw_(){
  return rows_(V8.SHEETS.PRODUCTS);
}

function getCustomerTargetsV834_(mobile){
  ensureTenderCoconutLiveV834_();
  const cfg = weeklyTargetConfigV834_();
  const delivered = rows_(V8.SHEETS.ORDERS).filter(o=>
    digits_(o.Mobile)===digits_(mobile) && s_(o.Status).toUpperCase()==='DELIVERED'
  );
  const items = rows_(V8.SHEETS.ORDER_ITEMS);
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0,0,0,0);
  monday.setDate(now.getDate()-((now.getDay()+6)%7));
  const monthStart = new Date(now.getFullYear(),now.getMonth(),1);

  function qtySince(d){
    const ids = new Set(delivered.filter(o=>new Date(o['Ordered At'])>=d).map(o=>s_(o['Order ID'])));
    return items.filter(i=>
      ids.has(s_(i['Order ID'])) && s_(i['Product ID']).toUpperCase()===V834_TC_PRODUCT_ID
    ).reduce((a,b)=>a+n_(b.Quantity),0);
  }

  const w = qtySince(monday);
  const m = qtySince(monthStart);
  return {
    weekly:{
      achieved:w,
      target:cfg.target,
      status:w>=cfg.target?'Completed':'In Progress',
      reward:cfg.reward,
      title:cfg.title,
      description:cfg.description,
      targetId:cfg.targetId
    },
    monthly:{
      achieved:m,
      target:V8.MONTHLY_TARGET_QTY,
      status:m>=V8.MONTHLY_TARGET_QTY?'Completed':'In Progress',
      reward:V8.MONTHLY_REWARD
    }
  };
}

/**
 * Production repair/verification helper. Safe to run more than once.
 */
function repairNativeElaneeruV834(){
  ensureWeeklyTargetsV834_();
  ensureTenderCoconutLiveV834_();
  const weekly = weeklyTargetConfigV834_();
  const tc = productRowsV834Raw_().find(p=>s_(p['Product ID']).toUpperCase()===V834_TC_PRODUCT_ID);
  return {
    version:'8.3.4',
    weeklyTargetsSheetReady:!!ss_().getSheetByName(V834_WEEKLY_SHEET),
    weeklyTarget:weekly,
    tenderCoconut:{
      exists:!!tc,
      b2cStatus:tc?s_(tc['B2C Status']):'',
      b2bStatus:tc?s_(tc['B2B Status']):'',
      productName:tc?s_(tc['Product Name']):''
    }
  };
}

/*
 * Compatibility override.
 * Apps Script evaluates project server files in project order; this Z-prefixed
 * patch is intentionally placed after Code.gs and replaces only the weekly
 * target function while leaving the public API name unchanged.
 */
getCustomerTargets = getCustomerTargetsV834_;
