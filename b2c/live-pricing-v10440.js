(function(){
  if(window.NEL_B2C_LIVE_PRICING_V10440)return;window.NEL_B2C_LIVE_PRICING_V10440=true;
  var POLL_MS=5000,busy=false,lastSuccess=0;

  function ready(){
    try{return document.visibilityState!=='hidden'&&navigator.onLine!==false&&typeof rpc==='function'&&typeof S!=='undefined'&&S&&S.cfg&&Array.isArray(S.cfg.products)}catch(e){return false}
  }
  function num(v){var n=Number(v);return isFinite(n)?n:0}
  function differs(a,b){return num(a.price)!==num(b.price)||num(a.offerQty1)!==num(b.offerQty1)||num(a.offerPrice1)!==num(b.offerPrice1)||num(a.offerQty2)!==num(b.offerQty2)||num(a.offerPrice2)!==num(b.offerPrice2)}

  function applyPricing(payload){
    if(!payload||!Array.isArray(payload.products)||typeof S==='undefined'||!S.cfg||!Array.isArray(S.cfg.products))return false;
    var byId={};payload.products.forEach(function(p){byId[String(p.productId||'')]=p});
    var changed=false,priceChanged=false;
    S.cfg.products=S.cfg.products.map(function(old){
      var fresh=byId[String(old.productId||'')];if(!fresh)return old;
      if(differs(old,fresh)){changed=true;if(num(old.price)!==num(fresh.price))priceChanged=true;}
      return Object.assign({},old,{
        price:num(fresh.price),offerQty1:num(fresh.offerQty1),offerPrice1:num(fresh.offerPrice1),
        offerQty2:num(fresh.offerQty2),offerPrice2:num(fresh.offerPrice2)
      });
    });
    if(!changed)return false;
    try{
      if(typeof publishCatalogV113==='function')publishCatalogV113(S.cfg);
      else{if(typeof renderProducts==='function')renderProducts();if(typeof updateCartBar==='function')updateCartBar();}
      var sheet=document.getElementById('cartSheet');if(sheet&&sheet.classList.contains('show')&&typeof renderCart==='function')renderCart();
      if(priceChanged&&typeof toast==='function')toast('Live price updated ✓');
    }catch(e){}
    return true;
  }

  async function poll(){
    if(busy||!ready())return;busy=true;
    try{
      var data=await rpc('getB2CLivePricingV950',[]);
      if(data&&data.ok!==false){applyPricing(data);lastSuccess=Date.now();}
    }catch(e){}finally{busy=false}
  }
  function kick(){setTimeout(poll,80)}
  function start(){setTimeout(poll,1200);setInterval(poll,POLL_MS);window.addEventListener('focus',kick);window.addEventListener('online',kick);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')kick()});}
  window.NEL_B2C_LIVE_PRICE_SYNC={poll:poll,applyPricing:applyPricing,lastSuccess:function(){return lastSuccess},pollMs:POLL_MS};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
