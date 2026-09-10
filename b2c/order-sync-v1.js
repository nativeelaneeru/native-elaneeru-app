(function(){
  if(window.NEL_ORDER_SYNC_V1)return;window.NEL_ORDER_SYNC_V1=true;
  function rid(){try{return crypto.randomUUID()}catch(e){return 'nel-'+Date.now()+'-'+Math.random().toString(36).slice(2)}}
  function fingerprint(p){
    p=p||{};var items=(p.items||[]).map(function(x){return [String(x.productId||''),Number(x.quantity||0)]}).sort(function(a,b){return a[0].localeCompare(b[0])});
    return JSON.stringify([String(p.mobile||''),items,String(p.fulfilmentType||''),String(p.address||''),String(p.timeSlot||'')]);
  }
  function retryable(err){return /timed out|timeout|network|failed to fetch|load failed|connection/i.test(String(err&&err.message||err||''))}
  async function prepare(payload){
    var fp=fingerprint(payload);
    if(!window.NEL_DB){var fallbackId=payload.clientRequestId||rid();payload.clientRequestId=fallbackId;return {payload:payload,requestId:fallbackId,fingerprint:fp};}
    var old=null;try{old=await window.NEL_DB.getPendingByFingerprint(fp)}catch(e){}
    var fresh=old&&Date.now()-Number(old.createdAt||0)<15*60*1000;
    var requestId=fresh?old.requestId:(payload.clientRequestId||rid());
    payload.clientRequestId=requestId;
    try{await window.NEL_DB.queueOrder({requestId:requestId,fingerprint:fp,payload:payload,createdAt:fresh?old.createdAt:Date.now()})}catch(e){}
    return {payload:payload,requestId:requestId,fingerprint:fp};
  }
  function install(){
    var base=window.rpc;
    if(typeof base!=='function'||base.__nelOrderSync){return false}
    var wrapped=async function(method,args){
      if(method!=='saveOrder')return base.apply(this,arguments);
      args=Array.isArray(args)?args:[];var payload=Object.assign({},args[0]||{}),prep=await prepare(payload);
      try{
        var result=await base.call(this,method,[prep.payload]);
        try{if(window.NEL_DB)await window.NEL_DB.resolveOrder(prep.requestId,result,prep.payload)}catch(e){}
        return result;
      }catch(err){
        if(!retryable(err)){try{if(window.NEL_DB)await window.NEL_DB.clearPending(prep.requestId)}catch(e){}}
        throw err;
      }
    };
    wrapped.__nelOrderSync=true;wrapped.__base=base;window.rpc=wrapped;try{rpc=wrapped}catch(e){};return true;
  }
  var tries=0;(function wait(){if(!install()&&++tries<240)setTimeout(wait,75)})();
})();
