(function(){
  if(window.NEL_B2B_ORDER_SYNC_V1)return;window.NEL_B2B_ORDER_SYNC_V1=true;

  function rid(){try{return crypto.randomUUID()}catch(e){return 'neb2b-'+Date.now()+'-'+Math.random().toString(36).slice(2)}}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function fingerprint(p){
    p=p||{};
    var items=(p.items||[]).map(function(x){return [String(x.productId||''),Number(x.quantity||0)]}).sort(function(a,b){return a[0].localeCompare(b[0])});
    var mobile='';try{mobile=digits(DATA&&DATA.vendor&&DATA.vendor.mobile)}catch(e){}
    return JSON.stringify([mobile,items,String(p.paymentType||''),String(p.deliverySlot||''),String(p.deliveryAddress||'')]);
  }
  function retryable(err){return /timed out|timeout|network|failed to fetch|load failed|connection/i.test(String(err&&err.message||err||''))}

  async function prepare(payload){
    var fp=fingerprint(payload),old=null;
    if(window.NEL_B2B_DB){try{old=(await window.NEL_B2B_DB.getPending()).filter(function(x){return x.fingerprint===fp}).sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0)})[0]||null}catch(e){}}
    var fresh=old&&Date.now()-Number(old.createdAt||0)<15*60*1000;
    var requestId=fresh?old.requestId:(payload.clientRequestId||rid());
    payload.clientRequestId=requestId;
    if(window.NEL_B2B_DB){try{await window.NEL_B2B_DB.queueOrder({requestId:requestId,fingerprint:fp,payload:payload,createdAt:fresh?old.createdAt:Date.now()})}catch(e){}}
    return {payload:payload,requestId:requestId};
  }

  function install(){
    var base=window.rpc;
    if(typeof base!=='function'||base.__nelB2BOrderSync)return false;
    var wrapped=async function(method,args){
      if(method!=='placeB2BOrderV9'&&method!=='placeB2BOrder')return base.apply(this,arguments);
      args=Array.isArray(args)?args:[];
      var token=args[0],payload=Object.assign({},args[1]||{}),prep=await prepare(payload);
      try{
        var result=await base.call(this,method,[token,prep.payload]);
        try{
          if(window.NEL_B2B_DB){
            await window.NEL_B2B_DB.resolveOrder(prep.requestId,result,prep.payload);
            if(typeof window.NEL_B2B_DB.clearCart==='function')await window.NEL_B2B_DB.clearCart();
          }
          localStorage.removeItem('nel_b2b_cart_v113');
        }catch(e){}
        return result;
      }catch(err){
        if(!retryable(err)&&window.NEL_B2B_DB){
          try{
            var db=await window.NEL_B2B_DB.ready;
            var tx=db.transaction('pending','readwrite');tx.objectStore('pending').delete(prep.requestId);
          }catch(e){}
        }
        throw err;
      }
    };
    wrapped.__nelB2BOrderSync=true;wrapped.__base=base;window.rpc=wrapped;try{rpc=wrapped}catch(e){};
    return true;
  }

  var tries=0;(function wait(){if(!install()&&++tries<240)setTimeout(wait,75)})();
})();
