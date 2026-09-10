/**
 * Native Elaneeru V9.1.1 — product-based Refer & Earn reward.
 *
 * Business rule approved on 10 Sep 2026:
 * - Referrer earns 2 Tender Coconuts FREE.
 * - Referred customer receives no separate reward.
 * - Reward qualifies only after the referred customer's first DELIVERED B2C order.
 *
 * Production guard: this module only tracks/qualifies the reward. It never creates
 * an order and never changes checkout pricing. Reward redemption can be wired to
 * checkout separately after the fulfilment rule is approved.
 */

const V911_REFERRER_FREE_QTY = 2;
const V911_REFERRED_FREE_QTY = 0;
const V911_REWARD_PRODUCT_ID = 'TC';
const V911_REWARD_PRODUCT_NAME = 'Tender Coconut';
const V911_QUALIFICATION_RULE = 'FIRST_DELIVERED_ORDER';
const V911_REF_EXTRA_HEADERS = [
  'Reward Product ID','Reward Product Name','Referrer Reward Qty',
  'Referred Reward Qty','Qualification Rule'
];

function v911ReferralHeaders_(){
  return V910_REF_HEADERS.concat(V911_REF_EXTRA_HEADERS.filter(function(h){
    return V910_REF_HEADERS.indexOf(h)<0;
  }));
}

function v911ReferralSheet_(ss){
  return v910EnsureSheet_(ss,V910_REFERRAL_SHEET,v911ReferralHeaders_());
}

function v911OrderMeta_(ordersSh){
  const lastCol=ordersSh?ordersSh.getLastColumn():0;
  if(!lastCol)return null;
  const headers=ordersSh.getRange(1,1,1,lastCol).getValues()[0].map(s_);
  return {
    mobile:headers.indexOf('Mobile'),
    status:headers.indexOf('Status'),
    orderedAt:headers.indexOf('Ordered At'),
    createdAt:headers.indexOf('Created At')
  };
}

function v911OrderMatchesForMobile_(ordersSh,mobile){
  if(!ordersSh||ordersSh.getLastRow()<2)return [];
  const meta=v911OrderMeta_(ordersSh);
  if(!meta||meta.mobile<0)return [];
  const range=ordersSh.getRange(2,meta.mobile+1,ordersSh.getLastRow()-1,1);
  const hits=range.createTextFinder(String(mobile)).matchEntireCell(true).findAll();
  return hits.map(function(cell){
    const row=cell.getRow();
    return {
      row:row,
      status:meta.status>=0?s_(ordersSh.getRange(row,meta.status+1).getValue()):'',
      orderedAt:meta.orderedAt>=0?ordersSh.getRange(row,meta.orderedAt+1).getValue():'',
      createdAt:meta.createdAt>=0?ordersSh.getRange(row,meta.createdAt+1).getValue():''
    };
  });
}

function v911HadExistingB2COrder_(ss,mobile){
  const ordersSh=ss.getSheetByName(V8.SHEETS.ORDERS);
  return v911OrderMatchesForMobile_(ordersSh,mobile).some(function(o){
    return s_(o.status).toUpperCase()!=='CANCELLED';
  });
}

function v911DeliveredAfterReferral_(ss,mobile,createdAt){
  const ordersSh=ss.getSheetByName(V8.SHEETS.ORDERS);
  const registeredAt=createdAt instanceof Date?createdAt:new Date(createdAt||0);
  const hasRegisteredTime=!isNaN(registeredAt.getTime())&&registeredAt.getTime()>0;
  return v911OrderMatchesForMobile_(ordersSh,mobile).some(function(o){
    if(s_(o.status).toUpperCase()!=='DELIVERED')return false;
    if(!hasRegisteredTime)return true;
    const raw=o.orderedAt||o.createdAt;
    const orderTime=raw instanceof Date?raw:new Date(raw||0);
    return !isNaN(orderTime.getTime())&&orderTime.getTime()>=registeredAt.getTime();
  });
}

function v911RewardPatch_(){
  return {
    'Referrer Reward':V911_REFERRER_FREE_QTY+' '+V911_REWARD_PRODUCT_NAME+(V911_REFERRER_FREE_QTY===1?'':'s'),
    'Referred Reward':'',
    'Reward Product ID':V911_REWARD_PRODUCT_ID,
    'Reward Product Name':V911_REWARD_PRODUCT_NAME,
    'Referrer Reward Qty':V911_REFERRER_FREE_QTY,
    'Referred Reward Qty':V911_REFERRED_FREE_QTY,
    'Qualification Rule':V911_QUALIFICATION_RULE
  };
}

function v911NormalizeAndQualify_(ss,refSh,refs){
  let changed=false;
  (refs||[]).forEach(function(r){
    const patch=v911RewardPatch_();
    let needsRewardPatch=false;
    Object.keys(patch).forEach(function(k){
      if(String(r[k]==null?'':r[k])!==String(patch[k]==null?'':patch[k]))needsRewardPatch=true;
    });
    const status=s_(r.Status).toUpperCase();
    if(status==='REGISTERED'&&v911DeliveredAfterReferral_(ss,digits_(r['Referred Mobile']),r['Created At'])){
      patch.Status='QUALIFIED';
      patch['Qualified At']=now_();
      patch['Updated At']=now_();
      v910UpdateRow_(refSh,r._row,patch);
      changed=true;
      return;
    }
    if(needsRewardPatch){
      patch['Updated At']=now_();
      v910UpdateRow_(refSh,r._row,patch);
      changed=true;
    }
  });
  return changed;
}

function v911ReferralSummary_(refs){
  const rows=refs||[];
  const qualified=rows.filter(function(r){
    return ['QUALIFIED','REWARDED'].indexOf(s_(r.Status).toUpperCase())>=0;
  });
  const rewarded=rows.filter(function(r){return s_(r.Status).toUpperCase()==='REWARDED';});
  const available=rows.filter(function(r){return s_(r.Status).toUpperCase()==='QUALIFIED';});
  return {
    total:rows.length,
    qualified:qualified.length,
    rewarded:rewarded.length,
    availableFreeCoconuts:available.reduce(function(sum,r){
      return sum+Math.max(0,n_(r['Referrer Reward Qty'])||V911_REFERRER_FREE_QTY);
    },0),
    earnedFreeCoconuts:qualified.reduce(function(sum,r){
      return sum+Math.max(0,n_(r['Referrer Reward Qty'])||V911_REFERRER_FREE_QTY);
    },0),
    usedFreeCoconuts:rewarded.reduce(function(sum,r){
      return sum+Math.max(0,n_(r['Referrer Reward Qty'])||V911_REFERRER_FREE_QTY);
    },0)
  };
}

function getB2CCustomerGrowthV911_(mobile){
  const m=v910ValidMobile_(mobile);
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const subSh=v910EnsureSheet_(ss,V910_SUBSCRIPTION_SHEET,V910_SUB_HEADERS);
  const refSh=v911ReferralSheet_(ss);
  const code=v910ReferralCode_(ss,m);
  const subs=v910Rows_(subSh).filter(function(r){return digits_(r.Mobile)===m;}).sort(function(a,b){return b._row-a._row;});
  let refs=v910Rows_(refSh).filter(function(r){return digits_(r['Referrer Mobile'])===m;});
  if(v911NormalizeAndQualify_(ss,refSh,refs)){
    refs=v910Rows_(refSh).filter(function(r){return digits_(r['Referrer Mobile'])===m;});
  }
  const summary=v911ReferralSummary_(refs);
  return {
    subscription:v910SubscriptionView_(subs[0]||null),
    referral:{
      code:code,
      shareUrl:'https://nativeelaneeru.github.io/native-elaneeru-app/b2c/?ref='+encodeURIComponent(code),
      total:summary.total,
      qualified:summary.qualified,
      rewarded:summary.rewarded,
      rewardType:'FREE_PRODUCT',
      rewardProductId:V911_REWARD_PRODUCT_ID,
      rewardProductName:V911_REWARD_PRODUCT_NAME,
      referrerRewardQty:V911_REFERRER_FREE_QTY,
      referredRewardQty:V911_REFERRED_FREE_QTY,
      qualificationRule:V911_QUALIFICATION_RULE,
      rewardConfigured:true,
      referrerReward:0,
      referredReward:0,
      availableFreeCoconuts:summary.availableFreeCoconuts,
      earnedFreeCoconuts:summary.earnedFreeCoconuts,
      usedFreeCoconuts:summary.usedFreeCoconuts,
      redemptionEnabled:false
    },
    subscriptionAutoOrderEnabled:false
  };
}

function registerB2CReferralV911_(referredMobile,referralCode){
  const referred=v910ValidMobile_(referredMobile);
  const code=s_(referralCode).toUpperCase();
  if(!/^NEL[A-Z0-9]{8}$/.test(code))throw new Error('Invalid referral code.');
  const ss=SpreadsheetApp.openById(V8.SPREADSHEET_ID);
  const codeSh=v910EnsureSheet_(ss,V910_REFERRAL_CODE_SHEET,V910_CODE_HEADERS);
  const refSh=v911ReferralSheet_(ss);
  const owner=v910Rows_(codeSh).find(function(r){
    return s_(r['Referral Code']).toUpperCase()===code&&s_(r.Status).toUpperCase()==='ACTIVE';
  });
  if(!owner)throw new Error('Referral code is not active.');
  const referrer=digits_(owner.Mobile);
  if(referrer===referred)throw new Error('You cannot use your own referral code.');
  const existing=v910Rows_(refSh).find(function(r){return digits_(r['Referred Mobile'])===referred;});
  if(existing){
    return {success:true,alreadyRegistered:true,status:s_(existing.Status),referralId:s_(existing['Referral ID'])};
  }
  if(v911HadExistingB2COrder_(ss,referred)){
    throw new Error('Referral codes can be applied only before the customer places their first order.');
  }
  const now=now_(),id=id_('REF-'),reward=v911RewardPatch_();
  const row={
    'Referral ID':id,'Referral Code':code,'Referrer Mobile':referrer,'Referred Mobile':referred,
    Status:'REGISTERED','Created At':now,'Updated At':now
  };
  Object.keys(reward).forEach(function(k){row[k]=reward[k];});
  v910Append_(refSh,row);
  return {
    success:true,alreadyRegistered:false,status:'REGISTERED',referralId:id,
    rewardType:'FREE_PRODUCT',rewardProductId:V911_REWARD_PRODUCT_ID,
    referrerRewardQty:V911_REFERRER_FREE_QTY,qualificationRule:V911_QUALIFICATION_RULE
  };
}

function getB2CReferralRuleV911(){
  return {
    ok:true,
    rewardType:'FREE_PRODUCT',
    rewardProductId:V911_REWARD_PRODUCT_ID,
    rewardProductName:V911_REWARD_PRODUCT_NAME,
    referrerRewardQty:V911_REFERRER_FREE_QTY,
    referredRewardQty:V911_REFERRED_FREE_QTY,
    qualificationRule:V911_QUALIFICATION_RULE,
    redemptionEnabled:false
  };
}

// Late compatibility assignments: keep the existing V9.1.0 public method names
// used by the B2C PWA while applying the approved product-reward rule.
getB2CCustomerGrowthV910 = getB2CCustomerGrowthV911_;
registerB2CReferralV910 = registerB2CReferralV911_;
