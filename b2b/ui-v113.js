(function(){
  if(window.NEL_B2B_UI_V113)return;window.NEL_B2B_UI_V113=true;
  var CART_KEY='nel_b2b_cart_v113',OWNER_KEY='nel_b2b_cart_owner_mobile';

  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function style(){
    if(document.getElementById('nelB2B113Style'))return;
    var s=document.createElement('style');s.id='nelB2B113Style';
    s.textContent='.nel113-retail{border:1px solid #ffffff3c;background:#ffffff16;color:#fff;border-radius:11px;padding:8px 10px;text-decoration:none;font-size:10px;font-weight:900;white-space:nowrap}.nel113-net{position:fixed;right:12px;top:calc(70px + env(safe-area-inset-top));z-index:120;padding:6px 9px;border-radius:999px;background:#123a5a;color:#fff;font-size:9px;font-weight:900;box-shadow:0 5px 18px #0002}.nel113-net.off{background:#a52a2a}@media(max-width:430px){.nel113-retail{font-size:0}.nel113-retail:after{content:"🥥";font-size:15px}}';
    document.head.appendChild(s);
  }

  function addRetailSwitch(){
    if(document.getElementById('nel113Retail'))return;
    var host=document.querySelector('.topActions');if(!host)return;
    var a=document.createElement('a');a.id='nel113Retail';a.className='nel113-retail';a.href='../b2c/';a.textContent='🥥 Retail';a.setAttribute('aria-label','Open Native Elaneeru retail store');
    host.insertBefore(a,host.firstChild);
  }

  function net(){
    var e=document.getElementById('nel113Net');if(!e){e=document.createElement('div');e.id='nel113Net';e.className='nel113-net';document.body.appendChild(e)}
    var on=navigator.onLine!==false;e.classList.toggle('off',!on);e.textContent=on?'● Online':'● Offline — cart saved';e.style.display='block';
    if(on)setTimeout(function(){if(e&&navigator.onLine!==false)e.style.display='none'},1600);
  }

  function cartSnapshot(){
    var out={};
    try{Object.keys(CART||{}).forEach(function(id){var q=Number(CART[id]&&CART[id].qty||CART[id]||0);if(q>0)out[id]=q})}catch(e){}
    return out;
  }

  function saveCart(){
    try{
      var out=cartSnapshot();
      if(Object.keys(out).length)localStorage.setItem(CART_KEY,JSON.stringify(out));else localStorage.removeItem(CART_KEY);
      if(window.NEL_B2B_DB&&typeof window.NEL_B2B_DB.setCart==='function')window.NEL_B2B_DB.setCart(out).catch(function(){});
    }catch(e){}
  }

  function currentVendorMobile(){try{return digits(DATA&&DATA.vendor&&DATA.vendor.mobile)}catch(e){return ''}}
  function cartOwner(){try{return digits(localStorage.getItem(OWNER_KEY)||'')}catch(e){return ''}}
  function setCartOwner(m){try{m=digits(m);if(m)localStorage.setItem(OWNER_KEY,m)}catch(e){}}

  function clearSavedCart(){
    try{localStorage.removeItem(CART_KEY)}catch(e){}
    try{if(window.NEL_B2B_DB&&typeof window.NEL_B2B_DB.clearCart==='function')window.NEL_B2B_DB.clearCart().catch(function(){})}catch(e){}
  }

  function restoreCart(){
    if(!DATA||!Array.isArray(DATA.products))return;
    try{
      var vendorMobile=currentVendorMobile(),owner=cartOwner();
      if(vendorMobile&&owner&&vendorMobile!==owner){clearSavedCart();return}
      if(vendorMobile&&!owner)setCartOwner(vendorMobile);
      if(Object.keys(CART||{}).length)return;

      var saved=JSON.parse(localStorage.getItem(CART_KEY)||'{}');
      Object.keys(saved).forEach(function(id){
        var p=DATA.products.find(function(x){return String(x.productId)===String(id)}),q=Math.floor(Number(saved[id]||0));
        if(!p||q<=0)return;
        var moq=Number(p.moq||1),step=Number(p.qtyStep||1);
        if(q<moq)q=moq;if(step>1&&q%step)q=Math.ceil(q/step)*step;
        CART[id]={product:p,qty:q};
      });
      if(vendorMobile)setCartOwner(vendorMobile);
    }catch(e){}
  }

  function patchRender(){
    var base=window.render;if(typeof base!=='function'||base.__nel113)return typeof base==='function';
    var wrapped=function(){restoreCart();var r=base.apply(this,arguments);try{if(typeof renderCart==='function')renderCart()}catch(e){}return r};
    wrapped.__nel113=true;wrapped.__base=base;window.render=wrapped;try{render=wrapped}catch(e){};return true;
  }

  function patchAdd(){
    var base=window.add;if(typeof base!=='function'||base.__nel113)return typeof base==='function';
    var wrapped=function(){var r=base.apply(this,arguments);saveCart();return r};wrapped.__nel113=true;wrapped.__base=base;window.add=wrapped;try{add=wrapped}catch(e){};return true;
  }

  function patchRemove(){
    var base=window.removeItem;if(typeof base!=='function'||base.__nel113)return typeof base==='function';
    var wrapped=function(){var r=base.apply(this,arguments);saveCart();return r};wrapped.__nel113=true;wrapped.__base=base;window.removeItem=wrapped;try{removeItem=wrapped}catch(e){};return true;
  }

  function patchOrder(){
    var base=window.placeOrder;if(typeof base!=='function'||base.__nel113)return typeof base==='function';
    var wrapped=async function(){
      var btn=document.querySelector('#cartSheet .primary[onclick*="placeOrder"]');if(btn&&btn.disabled)return;
      var old=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='Placing order…'}
      try{return await base.apply(this,arguments)}finally{
        saveCart();
        var b=document.querySelector('#cartSheet .primary[onclick*="placeOrder"]');
        if(b){b.disabled=false;b.removeAttribute('aria-busy');if(old)b.textContent=old}
      }
    };
    wrapped.__nel113=true;wrapped.__base=base;window.placeOrder=wrapped;try{placeOrder=wrapped}catch(e){};return true;
  }

  function start(){
    style();addRetailSwitch();net();
    var tries=0;(function p(){var ok=patchRender()&&patchAdd()&&patchRemove()&&patchOrder();if(!ok&&++tries<120)setTimeout(p,100)})();
    setTimeout(function(){try{if(DATA){restoreCart();if(typeof renderCart==='function')renderCart()}}catch(e){}},700);
  }

  window.addEventListener('online',function(){net();try{toast('Back online')}catch(e){}});
  window.addEventListener('offline',function(){net();saveCart();try{toast('Offline. Your cart is saved on this device.')}catch(e){}});
  window.addEventListener('beforeunload',saveCart);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();