/** Native Elaneeru V9.5.4 — smart subscriptions + NE Cash target rewards. */
const V954_GROWTH_VERSION='9.5.4';
const V954_SUB_SHEET='B2C_Subscriptions';
const V954_TARGET_SHEET='Weekly_Targets';
const V954_REWARD_LEDGER='NE_Target_Rewards';
const V954_SUB_EXTRA_HEADERS=['Delivery Days','Vacation From','Vacation To','Last Skipped Delivery','Last Schedule Change'];
const V954_REWARD_HEADERS=['Reward Key','Mobile','Customer ID','Target ID','Target Type','Period Start','Period End','Target Qty','Achieved Qty','Reward Amount','Status','Cashback Transaction ID','Created At','Credited At','Updated At'];

function v954ValidMobile_(mobile){
  const m=digits_(mobile);
  if(!/^[6-9]\d{9}$/.test(m))throw new Error('Enter a valid 10 digit mobile number.');
  return m;
}

function v954BoolProp_(name){
  return String(PropertiesService.getScriptProperties().getProperty(name)||'').toUpperCase()==='TRUE';
}

function v954Flags_(){
  return {
    subscriptionAutoOrderSupported:false,
    subscriptionAutoOrderEnabled:false,
    targetAutoCreditEnabled:v954BoolProp_('NEL_TARGET_CASHBACK_AUTO_CREDIT')
  };
}

function v954EnsureHeaders_(sh,headers){
  if(!sh)throw new Error('Missing sheet.');
  if(sh.getLastColumn()<1){sh.getRange(1,1,1,headers.length).setValues([headers]);return sh;}
  const current=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(s_);
  const missing=headers.filter(h=>current.indexOf(h)<0);
  if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  return sh;
}

function v954SubscriptionSheet_(create){
  const ss=ss_();
  let sh=ss.getSheetByName(V954_SUB_SHEET);
  if(!sh&&create){
    sh=ss.insertSheet(V954_SUB_SHEET);
    sh.getRange(1,1,1,V910_SUB_HEADERS.length).setValues([V910_SUB_HEADERS]);
    sh.setFrozenRows(1);
  }
  if(sh&&create)v954EnsureHeaders_(sh,V954_SUB_EXTRA_HEADERS);
  return sh;
}

function v954RowsSafe_(sh){
  if(!sh||sh.getLastRow()<2||sh.getLastColumn()<1)return [];
  const values=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  const headers=values[0].map(s_);
  return values.slice(1).map((row,i)=>{
    const out={_row:i+2};headers.forEach((h,j)=>{if(h)out[h]=row[j];});return out;
  });
}

function v954DayCode_(n){return ['SUN','MON','TUE','WED','THU','FRI','SAT'][Number(n)||0];}
function v954DayNumber_(code){return {SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6}[String(code||'').toUpperCase()];}

function v954NormalizeDays_(days,frequency,startDate){
  const out=[];
  (Array.isArray(days)?days:String(days||'').split(',')).forEach(v=>{
    let n=typeof v==='number'?v:v954DayNumber_(String(v||'').trim());
    if(Number.isInteger(n)&&n>=0&&n<=6&&out.indexOf(n)<0)out.push(n);
  });
  out.sort((a,b)=>a-b);
  const f=String(frequency||'').toUpperCase();
  if(f==='WEEKLY'&&!out.length&&startDate)out.push(startDate.getDay());
  if(f==='3X_WEEKLY'&&!out.length)out.push(1,3,6);
  if(f==='CUSTOM_DAYS'&&!out.length)throw new Error('Choose at least one delivery day.');
  if(f==='3X_WEEKLY'&&out.length!==3)throw new Error('Choose exactly 3 delivery days for 3x Weekly.');
  if(f==='WEEKLY'&&out.length!==1)throw new Error('Choose one delivery day for Weekly.');
  return out;
}

function v954Iso_(d){return Utilities.formatDate(d,'Asia/Kolkata','yyyy-MM-dd');}
function v954Date_(value){
  if(!value)return null;
  if(Object.prototype.toString.call(value)==='[object Date]')return isNaN(value)?null:new Date(value.getTime());
  const text=s_(value);
  const d=/^\d{4}-\d{2}-\d{2}$/.test(text)?new Date(text+'T00:00:00'):new Date(value);
  if(isNaN(d))return null;d.setHours(0,0,0,0);return d;
}

function v954NextScheduledDate_(sub,fromDate,includeFrom){
  const start=v954Date_(sub['Start Date']);
  if(!start)return null;
  const frequency=s_(sub.Frequency).toUpperCase();
  const days=v954NormalizeDays_(s_(sub['Delivery Days']),frequency,start);
  let d=v954Date_(fromDate)||new Date();d.setHours(0,0,0,0);
  if(!includeFrom)d.setDate(d.getDate()+1);
  if(d<start)d=new Date(start.getTime());
  const vacFrom=v954Date_(sub['Vacation From']),vacTo=v954Date_(sub['Vacation To']);
  for(let i=0;i<370;i++){
    const inVacation=vacFrom&&vacTo&&d>=vacFrom&&d<=vacTo;
    let ok=false;
    if(!inVacation){
      if(frequency==='DAILY')ok=true;
      else if(frequency==='ALTERNATE_DAYS'){
        const diff=Math.floor((d-start)/86400000);ok=diff>=0&&diff%2===0;
      }else if(['3X_WEEKLY','WEEKLY','CUSTOM_DAYS'].indexOf(frequency)>=0)ok=days.indexOf(d.getDay())>=0;
    }
    if(ok)return new Date(d.getTime());
    d.setDate(d.getDate()+1);
  }
  return null;
}

function v954SubscriptionView_(r){
  if(!r)return null;
  const start=v954Date_(r['Start Date']);
  const days=v954NormalizeDays_(s_(r['Delivery Days']),s_(r.Frequency),start);
  return {
    subscriptionId:s_(r['Subscription ID']),productId:s_(r['Product ID'])||'TC',quantity:n_(r.Quantity),
    frequency:s_(r.Frequency),deliveryDays:days.map(v954DayCode_),startDate:start?v954Iso_(start):'',
    preferredSlot:s_(r['Preferred Slot']),status:s_(r.Status)||'ACTIVE',
    nextDeliveryDate:(v954Date_(r['Next Delivery Date'])?v954Iso_(v954Date_(r['Next Delivery Date'])):''),
    vacationFrom:(v954Date_(r['Vacation From'])?v954Iso_(v954Date_(r['Vacation From'])):''),
    vacationTo:(v954Date_(r['Vacation To'])?v954Iso_(v954Date_(r['Vacation To'])):''),
    lastSkippedDelivery:(v954Date_(r['Last Skipped Delivery'])?v954Iso_(v954Date_(r['Last Skipped Delivery'])):''),
    autoOrderEnabled:false
  };
}

function v954CurrentSubscription_(mobile){
  const sh=v954SubscriptionSheet_(false);if(!sh)return null;
  return v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===mobile&&s_(r.Status).toUpperCase()!=='CANCELLED').sort((a,b)=>b._row-a._row)[0]||null;
}

function v954TargetRows_(){
  const sh=ss_().getSheetByName(V954_TARGET_SHEET);return v954RowsSafe_(sh);
}

function v954Period_(type,now){
  const d=v954Date_(now)||new Date();
  if(type==='MONTHLY'){
    const start=new Date(d.getFullYear(),d.getMonth(),1),end=new Date(d.getFullYear(),d.getMonth()+1,0);end.setHours(23,59,59,999);
    return {start:start,end:end};
  }
  const start=new Date(d);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end=new Date(start);end.setDate(end.getDate()+6);end.setHours(23,59,59,999);return {start:start,end:end};
}

function v954TargetConfig_(type,now){
  const period=v954Period_(type,now),rows=v954TargetRows_().filter(r=>{
    const audience=s_(r.Audience).toUpperCase(),product=s_(r['Product ID']).toUpperCase(),t=s_(r['Target Type']).toUpperCase();
    const from=v954Date_(r['Start Date']),to=v954Date_(r['End Date']);
    return active_(r.Status)&&(!audience||audience==='B2C'||audience==='ALL')&&(!product||product==='TC')&&t===type&&(!from||from<=period.end)&&(!to||to>=period.start);
  }).sort((a,b)=>(v954Date_(b['Start Date'])||new Date(0))-(v954Date_(a['Start Date'])||new Date(0)));
  const r=rows[0]||null;
  return {
    targetId:r?s_(r['Target ID']):(type==='MONTHLY'?'DEFAULT-MONTHLY':'DEFAULT-WEEKLY'),
    title:r?(s_(r.Title)||type+' reward'):(type==='MONTHLY'?'Monthly NE Cash':'Weekly NE Cash'),
    description:r?s_(r.Description):'',
    target:r&&n_(r['Target Qty'])>0?n_(r['Target Qty']):(type==='MONTHLY'?V8.MONTHLY_TARGET_QTY:V8.WEEKLY_TARGET_QTY),
    reward:r?n_(r.Reward):(type==='MONTHLY'?V8.MONTHLY_REWARD:V8.WEEKLY_REWARD),
    period:period
  };
}

function v954DeliveredQty_(mobile,period){
  const orders=rows_(V8.SHEETS.ORDERS).filter(o=>{
    if(digits_(o.Mobile)!==mobile||s_(o.Status).toUpperCase()!=='DELIVERED')return false;
    const at=new Date(o['Ordered At']||o['Created At']||0);return !isNaN(at)&&at>=period.start&&at<=period.end;
  });
  const ids={};orders.forEach(o=>ids[s_(o['Order ID'])]=true);
  return rows_(V8.SHEETS.ORDER_ITEMS).reduce((sum,i)=>sum+(ids[s_(i['Order ID'])]&&s_(i['Product ID']).toUpperCase()==='TC'?n_(i.Quantity):0),0);
}

function v954RewardKey_(mobile,cfg,type){return ['B2C',mobile,cfg.targetId,type,v954Iso_(cfg.period.start),v954Iso_(cfg.period.end)].join('|');}

function v954RewardRows_(){return v954RowsSafe_(ss_().getSheetByName(V954_REWARD_LEDGER));}

function v954TargetState_(mobile,type,now){
  const cfg=v954TargetConfig_(type,now),achieved=v954DeliveredQty_(mobile,cfg.period),key=v954RewardKey_(mobile,cfg,type);
  const ledger=v954RewardRows_().find(r=>s_(r['Reward Key'])===key&&s_(r.Status).toUpperCase()==='CREDITED');
  const completed=achieved>=cfg.target;
  return {
    targetId:cfg.targetId,type:type,title:cfg.title,description:cfg.description,target:cfg.target,achieved:achieved,
    remaining:Math.max(0,cfg.target-achieved),reward:cfg.reward,completed:completed,credited:!!ledger,
    status:ledger?'CREDITED':completed?'COMPLETED':'IN_PROGRESS',
    periodStart:v954Iso_(cfg.period.start),periodEnd:v954Iso_(cfg.period.end),rewardKey:key
  };
}

function v954Customer_(mobile){return rows_(V8.SHEETS.CUSTOMERS).find(r=>digits_(r.Mobile)===mobile)||null;}

function getB2CSubscriptionCashbackV954(mobile){
  const m=v954ValidMobile_(mobile),customer=v954Customer_(m),sub=v954CurrentSubscription_(m),flags=v954Flags_();
  const weekly=v954TargetState_(m,'WEEKLY',new Date()),monthly=v954TargetState_(m,'MONTHLY',new Date());
  return {
    ok:true,version:V954_GROWTH_VERSION,
    subscription:v954SubscriptionView_(sub),
    neCash:{balance:customer?n_(customer['Cashback Balance']):0,maxUsePercent:V8.CASHBACK_MAX_PERCENT,weekly:weekly,monthly:monthly,autoCreditEnabled:flags.targetAutoCreditEnabled},
    flags:flags
  };
}

function saveB2CSubscriptionV954(mobile,payload){
  const m=v954ValidMobile_(mobile),p=payload||{},allowed=['DAILY','ALTERNATE_DAYS','3X_WEEKLY','WEEKLY','CUSTOM_DAYS'];
  const frequency=s_(p.frequency).toUpperCase().replace(/\s+/g,'_');
  if(allowed.indexOf(frequency)<0)throw new Error('Choose a valid delivery frequency.');
  const quantity=Math.floor(Number(p.quantity||0));if(quantity<1||quantity>100)throw new Error('Choose 1 to 100 coconuts per delivery.');
  const start=v954Date_(p.startDate);if(!start)throw new Error('Choose a valid subscription start date.');
  const today=v954Date_(new Date());if(start<today)throw new Error('Subscription start date cannot be in the past.');
  const days=v954NormalizeDays_(p.deliveryDays,frequency,start),slot=s_(p.preferredSlot)||'07:00-09:00';
  const sh=v954SubscriptionSheet_(true),rows=v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===m&&['ACTIVE','PAUSED'].indexOf(s_(r.Status).toUpperCase())>=0);
  const now=now_(),data={
    'Product ID':s_(p.productId)||'TC',Quantity:quantity,Frequency:frequency,'Start Date':start,'Delivery Days':days.map(v954DayCode_).join(','),
    'Preferred Slot':slot,Status:'ACTIVE','Vacation From':'','Vacation To':'','Auto Order':'NO','Last Schedule Change':now,'Updated At':now
  };
  data['Next Delivery Date']=v954NextScheduledDate_(data,start,true)||start;
  let id='';
  if(rows.length){const current=rows.sort((a,b)=>b._row-a._row)[0];id=s_(current['Subscription ID']);v910UpdateRow_(sh,current._row,data);}
  else{id=id_('SUB-');data['Subscription ID']=id;data.Mobile=m;data['Created At']=now;v910Append_(sh,data);}
  const saved=v954RowsSafe_(sh).filter(r=>s_(r['Subscription ID'])===id).pop();
  return {success:true,subscription:v954SubscriptionView_(saved),autoOrderEnabled:false};
}

function setB2CSubscriptionStatusV954(mobile,status){
  const m=v954ValidMobile_(mobile),next=s_(status).toUpperCase();if(['ACTIVE','PAUSED','CANCELLED'].indexOf(next)<0)throw new Error('Invalid subscription status.');
  const sh=v954SubscriptionSheet_(true),hit=v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===m&&s_(r.Status).toUpperCase()!=='CANCELLED').sort((a,b)=>b._row-a._row)[0];
  if(!hit)throw new Error('No active subscription found.');
  const patch={Status:next,'Last Schedule Change':now_(),'Updated At':now_()};
  if(next==='ACTIVE')patch['Next Delivery Date']=v954NextScheduledDate_(hit,new Date(),true)||hit['Next Delivery Date'];
  v910UpdateRow_(sh,hit._row,patch);return {success:true,status:next,subscription:v954SubscriptionView_(v954RowsSafe_(sh).find(r=>r._row===hit._row))};
}

function skipNextB2CSubscriptionV954(mobile){
  const m=v954ValidMobile_(mobile),sh=v954SubscriptionSheet_(true),hit=v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===m&&s_(r.Status).toUpperCase()==='ACTIVE').sort((a,b)=>b._row-a._row)[0];
  if(!hit)throw new Error('No active subscription found.');
  const current=v954Date_(hit['Next Delivery Date'])||v954NextScheduledDate_(hit,new Date(),true);if(!current)throw new Error('Could not determine the next delivery.');
  const next=v954NextScheduledDate_(hit,current,false);if(!next)throw new Error('Could not determine the following delivery.');
  v910UpdateRow_(sh,hit._row,{'Last Skipped Delivery':current,'Next Delivery Date':next,'Last Schedule Change':now_(),'Updated At':now_()});
  return {success:true,skippedDate:v954Iso_(current),nextDeliveryDate:v954Iso_(next)};
}

function setB2CSubscriptionVacationV954(mobile,fromDate,toDate){
  const m=v954ValidMobile_(mobile),from=v954Date_(fromDate),to=v954Date_(toDate);if(!from||!to||to<from)throw new Error('Choose a valid vacation date range.');
  const sh=v954SubscriptionSheet_(true),hit=v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===m&&s_(r.Status).toUpperCase()!=='CANCELLED').sort((a,b)=>b._row-a._row)[0];
  if(!hit)throw new Error('No active subscription found.');
  const temp=Object.assign({},hit,{'Vacation From':from,'Vacation To':to});
  const after=new Date(to);after.setDate(after.getDate()+1);
  const next=v954NextScheduledDate_(temp,after,true);
  v910UpdateRow_(sh,hit._row,{'Vacation From':from,'Vacation To':to,'Next Delivery Date':next||hit['Next Delivery Date'],'Last Schedule Change':now_(),'Updated At':now_()});
  return {success:true,vacationFrom:v954Iso_(from),vacationTo:v954Iso_(to),nextDeliveryDate:next?v954Iso_(next):''};
}

function clearB2CSubscriptionVacationV954(mobile){
  const m=v954ValidMobile_(mobile),sh=v954SubscriptionSheet_(true),hit=v954RowsSafe_(sh).filter(r=>digits_(r.Mobile)===m&&s_(r.Status).toUpperCase()!=='CANCELLED').sort((a,b)=>b._row-a._row)[0];
  if(!hit)throw new Error('No active subscription found.');
  const temp=Object.assign({},hit,{'Vacation From':'','Vacation To':''}),next=v954NextScheduledDate_(temp,new Date(),true);
  v910UpdateRow_(sh,hit._row,{'Vacation From':'','Vacation To':'','Next Delivery Date':next||hit['Next Delivery Date'],'Last Schedule Change':now_(),'Updated At':now_()});
  return {success:true,nextDeliveryDate:next?v954Iso_(next):''};
}

function v954EnsureRewardLedger_(){
  const ss=ss_();let sh=ss.getSheetByName(V954_REWARD_LEDGER);
  if(!sh){sh=ss.insertSheet(V954_REWARD_LEDGER);sh.getRange(1,1,1,V954_REWARD_HEADERS.length).setValues([V954_REWARD_HEADERS]);sh.setFrozenRows(1);}
  else v954EnsureHeaders_(sh,V954_REWARD_HEADERS);
  return sh;
}

function processB2CTargetRewardsV954(mobile){
  const m=v954ValidMobile_(mobile),flags=v954Flags_();
  if(!flags.targetAutoCreditEnabled)return Object.assign(getB2CSubscriptionCashbackV954(m),{creditedNow:[],writePerformed:false});
  const lock=LockService.getScriptLock();if(!lock.tryLock(5000))throw new Error('Reward processing is busy. Please retry.');
  try{
    const customer=v954Customer_(m);if(!customer)throw new Error('Customer profile not found.');
    const rewardSh=v954EnsureRewardLedger_(),creditedNow=[];
    ['WEEKLY','MONTHLY'].forEach(type=>{
      const state=v954TargetState_(m,type,new Date());if(!state.completed||state.credited||state.reward<=0)return;
      const duplicate=v954RowsSafe_(rewardSh).some(r=>s_(r['Reward Key'])===state.rewardKey&&s_(r.Status).toUpperCase()==='CREDITED');if(duplicate)return;
      const oldBal=n_(customer['Cashback Balance']),newBal=oldBal+state.reward,tx=id_('CB-');
      updateObj_(V8.SHEETS.CUSTOMERS,customer._row,{'Cashback Balance':newBal,'Updated At':now_()});customer['Cashback Balance']=newBal;
      append_(V8.SHEETS.CASHBACK,{'Transaction ID':tx,'Created At':now_(),'Customer ID':s_(customer['Customer ID']),Mobile:m,'Order ID':'','Entry Type':'CREDIT',Credit:state.reward,Debit:0,'Balance After':newBal,Scheme:'TARGET','Description':state.type+' target achieved: '+state.target+' Tender Coconuts','Created By':'SYSTEM'});
      const now=now_();const obj={'Reward Key':state.rewardKey,Mobile:m,'Customer ID':s_(customer['Customer ID']),'Target ID':state.targetId,'Target Type':state.type,'Period Start':state.periodStart,'Period End':state.periodEnd,'Target Qty':state.target,'Achieved Qty':state.achieved,'Reward Amount':state.reward,Status:'CREDITED','Cashback Transaction ID':tx,'Created At':now,'Credited At':now,'Updated At':now};
      const headers=rewardSh.getRange(1,1,1,rewardSh.getLastColumn()).getValues()[0].map(s_);rewardSh.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:''));
      creditedNow.push({type:state.type,amount:state.reward,transactionId:tx});
    });
    return Object.assign(getB2CSubscriptionCashbackV954(m),{creditedNow:creditedNow,writePerformed:creditedNow.length>0});
  }finally{lock.releaseLock();}
}

function getB2CGrowthEngineHealthV954(){
  const flags=v954Flags_();
  return {ok:true,version:V954_GROWTH_VERSION,smartSubscription:true,customDeliveryDays:true,skipNext:true,vacationMode:true,subscriptionAutoOrderSupported:false,subscriptionAutoOrderEnabled:false,neCashTargets:true,deliveredOrdersOnly:true,idempotentRewardKey:true,targetAutoCreditEnabled:flags.targetAutoCreditEnabled,createsProductionOrder:false,creditsCashbackByDefault:false};
}

function setB2CTargetAutoCreditV954(email,pin,enabled){
  requireAdmin_(email,pin);PropertiesService.getScriptProperties().setProperty('NEL_TARGET_CASHBACK_AUTO_CREDIT',enabled===true?'TRUE':'FALSE');return getB2CGrowthEngineHealthV954();
}

/* Expose only the new customer-safe methods; everything else delegates to the existing hardened bridge. */
const V954_BASE_DO_POST=doPost;
doPost=function(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(!isBridge)return V954_BASE_DO_POST(e);
  let req={};
  try{
    req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));
    const method=String(req.method||''),args=Array.isArray(req.args)?req.args:[];
    const allowed={
      getB2CSubscriptionCashbackV954:getB2CSubscriptionCashbackV954,
      saveB2CSubscriptionV954:saveB2CSubscriptionV954,
      setB2CSubscriptionStatusV954:setB2CSubscriptionStatusV954,
      skipNextB2CSubscriptionV954:skipNextB2CSubscriptionV954,
      setB2CSubscriptionVacationV954:setB2CSubscriptionVacationV954,
      clearB2CSubscriptionVacationV954:clearB2CSubscriptionVacationV954,
      processB2CTargetRewardsV954:processB2CTargetRewardsV954,
      getB2CGrowthEngineHealthV954:getB2CGrowthEngineHealthV954
    };
    if(!allowed[method])return V954_BASE_DO_POST(e);
    const result=allowed[method].apply(null,args);
    return bridgeHtml_({ok:true,result:result,requestId:String(req.requestId||'')});
  }catch(err){return bridgeHtml_({ok:false,error:String(err&&err.message||err),requestId:String(req&&req.requestId||'')});}
};

/* Read-only health endpoint for deployment verification. */
const V954_BASE_DO_GET=doGet;
doGet=function(e){
  const jsonp=String(e&&e.parameter&&e.parameter.jsonp||'')==='1';
  if(!jsonp)return V954_BASE_DO_GET(e);
  let req={};
  try{req=JSON.parse(String(e&&e.parameter&&e.parameter.payload||'{}'));}catch(err){return V954_BASE_DO_GET(e);}
  if(String(req.method||'')!=='getB2CGrowthEngineHealthV954')return V954_BASE_DO_GET(e);
  let callback=String(e&&e.parameter&&e.parameter.callback||'');
  if(!/^[A-Za-z_$][0-9A-Za-z_$]{0,100}$/.test(callback))callback='__nelGrowthHealth';
  const payload={ok:true,result:getB2CGrowthEngineHealthV954(),requestId:String(req.requestId||'')};
  const json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
};

/* Backward-compatible ownership so the older B2C growth card uses the safe V9.5.4 schedule writer too. */
saveB2CSubscriptionV910=saveB2CSubscriptionV954;
setB2CSubscriptionStatusV910=setB2CSubscriptionStatusV954;
