(function(){
  if(window.NEL_B2B_LIVE_PRICING_V950)return;window.NEL_B2B_LIVE_PRICING_V950=true;
  var POLL_MS=5000,busy=false,noticeTimer=null;

  function num(v){var n=Number(v);return isFinite(n)?n:0}
  function money(v){return '₹'+num(v).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function ready(){
    try{return document.visibilityState!=='hidden'&&navigator.onLine!==false&&typeof rpc==='function'&&typeof TOKEN!=='undefined'&&!!TOKEN&&typeof DATA!=='undefined'&&DATA&&Array.isArray(DATA.products)}catch(e){return false}
  }
  function vendorKey(){
    try{var v=DATA&&DATA.vendor||{};return String(v.vendorId||v.mobile||'vendor').replace(/[^A-Za-z0-9_-]/g,'').slice(0,50)||'vendor'}catch(e){return 'vendor'}
  }
  function storageKey(){return 'nel_b2b_last_prices_v950_'+vendorKey()}
  function loadSeen(){try{return JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch(e){return {}}}
  function saveSeen(map){try{localStorage.setItem(storageKey(),JSON.stringify(map))}catch(e){}}
  function mapPrices(products){var out={};(products||[]).forEach(function(p){out[String(p.productId||'')]={price:num(p.price),name:String(p.productName||p.productId||'Product'),unit:String(p.unit||'pc')}});return out}

  function ensureStyle(){
    if(document.getElementById('nelLivePriceStyle'))return;
    var s=document.createElement('style');s.id='nelLivePriceStyle';
    s.textContent='.nelLivePriceNotice{display:none;margin:0 0 11px;border-radius:16px;padding:12px 13px;border:1px solid var(--line);background:#fff;box-shadow:var(--shadow);align-items:flex-start;gap:10px}.nelLivePriceNotice.show{display:flex}.nelLivePriceNotice.up{background:#fff8ea;border-color:#ead7a0}.nelLivePriceNotice.down{background:#eaf8f1;border-color:#b8e1cb}.nelLivePriceIcon{font-size:22px;line-height:1.2}.nelLivePriceCopy{min-width:0;flex:1}.nelLivePriceCopy b{display:block;font-size:13px;margin-bottom:3px}.nelLivePriceCopy span{display:block;font-size:11px;line-height:1.45;color:var(--muted)}.nelLivePriceClose{border:0;background:transparent;color:var(--muted);font-size:18px;padding:0 2px}';
    document.head.appendChild(s);
  }
  function ensureNotice(){
    var n=document.getElementById('nelLivePriceNotice');if(n)return n;
    var home=document.getElementById('homeView');if(!home)return null;ensureStyle();
    n=document.createElement('div');n.id='nelLivePriceNotice';n.className='nelLivePriceNotice';n.setAttribute('role','status');n.setAttribute('aria-live','polite');
    n.innerHTML='<div class="nelLivePriceIcon"></div><div class="nelLivePriceCopy"><b></b><span></span></div><button class="nelLivePriceClose" type="button" aria-label="Close price update">×</button>';
    n.querySelector('button').addEventListener('click',function(){n.className='nelLivePriceNotice'});home.insertBefore(n,home.firstChild);return n;
  }
  function showNotice(changes){
    if(!changes.length)return;var n=ensureNotice();if(!n)return;
    var ups=changes.filter(function(x){return x.to>x.from}),downs=changes.filter(function(x){return x.to<x.from}),icon=n.querySelector('.nelLivePriceIcon'),title=n.querySelector('b'),body=n.querySelector('span');
    if(ups.length&&!downs.length){
      n.className='nelLivePriceNotice show up';icon.textContent='📈';title.textContent='Market uptrend';
      body.textContent='Prices increased due to market uptrend. '+ups.map(function(x){return x.name+' is now '+money(x.to)+'/'+x.unit+' (was '+money(x.from)+').'}).join(' ');
      try{if(typeof toast==='function')toast('Price updated · Market uptrend')}catch(e){}
    }else if(downs.length&&!ups.length){
      n.className='nelLivePriceNotice show down';icon.textContent='💚';title.textContent='Better price for you';
      body.textContent='We have a better price for you. '+downs.map(function(x){return x.name+' is now '+money(x.to)+'/'+x.unit+' (was '+money(x.from)+').'}).join(' ');
      try{if(typeof toast==='function')toast('Better price updated for you')}catch(e){}
    }else{
      n.className='nelLivePriceNotice show';icon.textContent='🔄';title.textContent='Live price update';
      body.textContent=changes.map(function(x){return x.name+': '+money(x.from)+' → '+money(x.to)+'/'+x.unit+(x.to>x.from?' · market uptrend':' · better price for you');}).join('  ');
      try{if(typeof toast==='function')toast('Live business prices updated')}catch(e){}
    }
    clearTimeout(noticeTimer);noticeTimer=setTimeout(function(){if(n)n.className='nelLivePriceNotice'},45000);
  }

  function applyPricing(payload){
    if(!payload||!Array.isArray(payload.products)||typeof DATA==='undefined'||!DATA||!Array.isArray(DATA.products))return false;
    var freshById={},freshMap=mapPrices(payload.products),seen=loadSeen(),changes=[];
    payload.products.forEach(function(p){freshById[String(p.productId||'')]=p});

    Object.keys(freshMap).forEach(function(id){
      if(seen[id]&&num(seen[id].price)!==num(freshMap[id].price))changes.push({id:id,name:freshMap[id].name,unit:freshMap[id].unit,from:num(seen[id].price),to:num(freshMap[id].price)});
    });

    var changed=false;
    DATA.products=DATA.products.map(function(old){
      var fresh=freshById[String(old.productId||'')];if(!fresh)return old;
      if(num(old.price)!==num(fresh.price)||num(old.basePrice)!==num(fresh.basePrice)||num(old.moq)!==num(fresh.moq)||num(old.qtyStep)!==num(fresh.qtyStep))changed=true;
      return Object.assign({},old,{price:num(fresh.price),basePrice:num(fresh.basePrice)||num(fresh.price),moq:num(fresh.moq)||1,qtyStep:num(fresh.qtyStep)||1,pricingType:fresh.pricingType||old.pricingType});
    });

    if(typeof CART!=='undefined'&&CART){
      Object.keys(CART).forEach(function(id){var fresh=freshById[String(id)];if(!fresh||!CART[id])return;CART[id].product=Object.assign({},CART[id].product||{},fresh,{basePrice:num(fresh.basePrice)||num(fresh.price)});});
    }
    saveSeen(freshMap);

    if(changed){
      try{if(typeof render==='function')render();else if(typeof renderCart==='function')renderCart()}catch(e){}
      try{sessionStorage.setItem('nel_b2b_data_cache',JSON.stringify(DATA));localStorage.setItem('nel_b2b_data_cache',JSON.stringify(DATA))}catch(e){}
      try{window.dispatchEvent(new CustomEvent('nel:base-price-refresh'))}catch(ignore){}
    }
    if(changes.length)showNotice(changes);
    return changed||changes.length>0;
  }

  function seedSeenIfNeeded(){
    if(!ready())return;var seen=loadSeen();if(Object.keys(seen).length)return;saveSeen(mapPrices(DATA.products));
  }
  async function poll(){
    if(busy||!ready())return;busy=true;
    try{
      seedSeenIfNeeded();
      var data=await rpc('getB2BLivePricingV950',[TOKEN]);
      if(data&&data.ok!==false)applyPricing(data);
    }catch(e){}finally{busy=false}
  }
  function kick(){setTimeout(poll,80)}
  function start(){ensureNotice();setTimeout(poll,1400);setInterval(poll,POLL_MS);window.addEventListener('focus',kick);window.addEventListener('online',kick);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')kick()});}
  window.NEL_B2B_LIVE_PRICE_SYNC={poll:poll,applyPricing:applyPricing,pollMs:POLL_MS};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();