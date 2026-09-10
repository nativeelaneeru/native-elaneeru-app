/**
 * Native Elaneeru V9.1.0 — B2C subscriptions and Refer & Earn foundation.
 *
 * Important production guard: subscriptions are stored as recurring schedules,
 * but this file does NOT auto-create orders. Automatic order generation must be
 * enabled separately only after the business confirms the recurring-order rules.
 */

const V910_SUBSCRIPTION_SHEET = 'B2C_Subscriptions';
const V910_REFERRAL_CODE_SHEET = 'B2C_Referral_Codes';
const V910_REFERRAL_SHEET = 'B2C_Referrals';

const V910_SUB_HEADERS = [
  'Subscription ID','Mobile','Product ID','Quantity','Frequency','Start Date',
  'Preferred Slot','Status','Next Delivery Date','Auto Order','Created At','Updated At'
];
const V910_CODE_HEADERS = ['Referral Code','Mobile','Status','Created At','Updated At'];
const V910_REF_HEADERS = [
  'Referral ID','Referral Code','Referrer Mobile','Referred Mobile','Status',
  'Referrer Reward','Referred Reward','Created At','Qualified At','Rewarded At','Updated At'
];

function v910EnsureSheet_(ss,name,headers){
  let sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  const last=Math.max(sh.getLastColumn(),headers.length);
  const current=sh.getRange(1,1,1,last).getValues()[0].map(s_);
  let changed=false;
  headers.forEach(h=>{
    if(current.indexOf(h)<0){current.push(h);changed=true;}
  });
  if(changed) sh.getRange(1,1,1,current.length).setValues([current]);
  return sh;
}

function v910Rows_(sh){
  const lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();
  if(lastRow<2||lastCol<1)return [];
  const values=sh.getRange(1,1,lastRow,lastCol).getValues();
  const headers=values[0].map(s_);
  return values.slice(1).map((row,i)=>{
    const out={_row:i+2};
    headers.forEach((h,j)=>out[h]=row[j]);
    return out;
  });
}

function v910Append_(sh,obj){
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(s_);
  sh.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:''));
}

function v910UpdateRow_(sh,rowNumber,obj){
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(s_);
  const values=sh.getRange(rowNumber,1,1,headers.length).getValues()[0];
  headers.forEach((h,i)=>{if(Object.prototype.hasOwnProperty.call(obj,h))values[i]=obj[h];});
  sh.getRange(rowNumber,1,1,headers.length).setValues([values]);
}

function v910ValidMobile_(mobile){
  const m=digits_(mobile);
  if(!/^[6-9]\d{9}$/.test(m))throw new Error('Enter a valid 10 digit mobile number.');
  return m;
}

function v910ReferralConfig_(){
  const p=PropertiesService.getScriptProperties();
  return {
    referrerReward:Math.max(0,Number(p.getProperty('NEL_REFERRER_REWARD')||0)),
    referredReward:Math.max(0,Number(p.getProperty('NEL_REFERRED_REWARD')||0))
  };
}

function v910ReferralCode_(ss,mobile){
  const sh=v910EnsureSheet_(ss,V910_REFERRAL_CODE_SHEET,V910_CODE_HEADERS);
  const rows=v910Rows_(sh);
  const hit=rows.find(r=>digits_(r.Mobile)===mobile&&s_(r.Status).toUpperCase()!=='DISABLED');
  if(hit)return s_(hit['Referral Code']);
  let code='NEL'+Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
  while(rows.some(r=>s_(r['Referral Code']).toUpperCase()===code)){
    code='NEL'+Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
  }
  const now=now_();
  v910Append_(sh,{'Referral Code':code,Mobile:mobile,Status:'ACTIVE','Created At':now,'Updated At':now});
  return code;
}

function v910SubscriptionView_(r){
  if(!r)return null;
  return {
    subscriptionId:s_(r['Subscription ID']),
    productId:s_(r['Product ID'])||'TC',
    quantity:n_(r.Quantity),
    frequency:s_(r.Frequency),
    startDate:fmtDate_(r['Start Date']),
    preferredSlot:s_(r['Preferred Slot']),
    status:s_(r.Status)||'ACTIVE',
    nextDeliveryDate:fmtDate_(r['Next Delivery Date']),
    autoOrderEnabled:s_(r['Auto Order']).toUpperCase()==='YES'
  };
}

function getB2CCustomerGrowthV910(mobile){
  const m=v910ValidMobile_(mobile);
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const subSh=v910EnsureSheet_(ss,V910_SUBSCRIPTION_SHEET,V910_SUB_HEADERS);
  const refSh=v910EnsureSheet_(ss,V910_REFERRAL_SHEET,V910_REF_HEADERS);
  const code=v910ReferralCode_(ss,m);
  const subs=v910Rows_(subSh).filter(r=>digits_(r.Mobile)===m).sort((a,b)=>b._row-a._row);
  const refs=v910Rows_(refSh).filter(r=>digits_(r['Referrer Mobile'])===m);
  const cfg=v910ReferralConfig_();
  return {
    subscription:v910SubscriptionView_(subs[0]||null),
    referral:{
      code:code,
      shareUrl:'https://nativeelaneeru.github.io/native-elaneeru-app/b2c/?ref='+encodeURIComponent(code),
      total:refs.length,
      qualified:refs.filter(r=>['QUALIFIED','REWARDED'].indexOf(s_(r.Status).toUpperCase())>=0).length,
      rewarded:refs.filter(r=>s_(r.Status).toUpperCase()==='REWARDED').length,
      referrerReward:cfg.referrerReward,
      referredReward:cfg.referredReward,
      rewardConfigured:cfg.referrerReward>0||cfg.referredReward>0
    },
    subscriptionAutoOrderEnabled:false
  };
}

function saveB2CSubscriptionV910(mobile,payload){
  const m=v910ValidMobile_(mobile);
  const p=payload||{};
  const allowed=['DAILY','ALTERNATE_DAYS','3X_WEEKLY','WEEKLY'];
  const frequency=s_(p.frequency).toUpperCase().replace(/\s+/g,'_');
  if(allowed.indexOf(frequency)<0)throw new Error('Choose Daily, Alternate Days, 3x Weekly or Weekly.');
  const quantity=Math.floor(Number(p.quantity||0));
  if(quantity<1||quantity>100)throw new Error('Choose a quantity between 1 and 100 coconuts per delivery.');
  const startText=s_(p.startDate);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startText))throw new Error('Choose a valid subscription start date.');
  const start=new Date(startText+'T00:00:00');
  if(isNaN(start.getTime()))throw new Error('Choose a valid subscription start date.');
  const today=new Date();today.setHours(0,0,0,0);
  if(start<today)throw new Error('Subscription start date cannot be in the past.');
  const slot=s_(p.preferredSlot)||'07:00-09:00';
  const productId=s_(p.productId)||'TC';

  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const sh=v910EnsureSheet_(ss,V910_SUBSCRIPTION_SHEET,V910_SUB_HEADERS);
  const rows=v910Rows_(sh).filter(r=>digits_(r.Mobile)===m&&['ACTIVE','PAUSED'].indexOf(s_(r.Status).toUpperCase())>=0);
  const now=now_();
  const data={
    'Product ID':productId,Quantity:quantity,Frequency:frequency,'Start Date':start,
    'Preferred Slot':slot,Status:'ACTIVE','Next Delivery Date':start,
    'Auto Order':'NO','Updated At':now
  };
  let id='';
  if(rows.length){
    const current=rows.sort((a,b)=>b._row-a._row)[0];
    id=s_(current['Subscription ID']);
    v910UpdateRow_(sh,current._row,data);
  }else{
    id=id_('SUB-');
    data['Subscription ID']=id;data.Mobile=m;data['Created At']=now;
    v910Append_(sh,data);
  }
  const saved=v910Rows_(sh).filter(r=>s_(r['Subscription ID'])===id).pop();
  return {success:true,subscription:v910SubscriptionView_(saved),autoOrderEnabled:false};
}

function setB2CSubscriptionStatusV910(mobile,status){
  const m=v910ValidMobile_(mobile);
  const next=s_(status).toUpperCase();
  if(['ACTIVE','PAUSED','CANCELLED'].indexOf(next)<0)throw new Error('Invalid subscription status.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const sh=v910EnsureSheet_(ss,V910_SUBSCRIPTION_SHEET,V910_SUB_HEADERS);
  const hit=v910Rows_(sh).filter(r=>digits_(r.Mobile)===m&&s_(r.Status).toUpperCase()!=='CANCELLED').sort((a,b)=>b._row-a._row)[0];
  if(!hit)throw new Error('No active subscription found.');
  v910UpdateRow_(sh,hit._row,{Status:next,'Updated At':now_()});
  return {success:true,status:next};
}

function registerB2CReferralV910(referredMobile,referralCode){
  const referred=v910ValidMobile_(referredMobile);
  const code=s_(referralCode).toUpperCase();
  if(!/^NEL[A-Z0-9]{8}$/.test(code))throw new Error('Invalid referral code.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const codeSh=v910EnsureSheet_(ss,V910_REFERRAL_CODE_SHEET,V910_CODE_HEADERS);
  const refSh=v910EnsureSheet_(ss,V910_REFERRAL_SHEET,V910_REF_HEADERS);
  const owner=v910Rows_(codeSh).find(r=>s_(r['Referral Code']).toUpperCase()===code&&s_(r.Status).toUpperCase()==='ACTIVE');
  if(!owner)throw new Error('Referral code is not active.');
  const referrer=digits_(owner.Mobile);
  if(referrer===referred)throw new Error('You cannot use your own referral code.');
  const existing=v910Rows_(refSh).find(r=>digits_(r['Referred Mobile'])===referred);
  if(existing){
    return {success:true,alreadyRegistered:true,status:s_(existing.Status),referralId:s_(existing['Referral ID'])};
  }
  const cfg=v910ReferralConfig_(),now=now_(),id=id_('REF-');
  v910Append_(refSh,{
    'Referral ID':id,'Referral Code':code,'Referrer Mobile':referrer,'Referred Mobile':referred,
    Status:'REGISTERED','Referrer Reward':cfg.referrerReward,'Referred Reward':cfg.referredReward,
    'Created At':now,'Updated At':now
  });
  return {success:true,alreadyRegistered:false,status:'REGISTERED',referralId:id};
}

function getB2CGrowthAdminConfigV910(email,pin){
  requireAdmin_(email,pin);
  return v910ReferralConfig_();
}

function setB2CGrowthAdminConfigV910(email,pin,referrerReward,referredReward){
  requireAdmin_(email,pin);
  const a=Math.max(0,Number(referrerReward||0)),b=Math.max(0,Number(referredReward||0));
  if(a>1000||b>1000)throw new Error('Referral reward cannot exceed ₹1,000 per person.');
  const p=PropertiesService.getScriptProperties();
  p.setProperty('NEL_REFERRER_REWARD',String(a));
  p.setProperty('NEL_REFERRED_REWARD',String(b));
  return {success:true,referrerReward:a,referredReward:b};
}
