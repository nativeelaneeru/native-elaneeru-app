(function(){
  if(window.NEL_UI_V126)return;window.NEL_UI_V126=true;

  function el(id){return document.getElementById(id)}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function profile(){try{return JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){return {}}}
  function validMobile(v){return /^[6-9]\d{9}$/.test(digits(v))}

  function ensureStyle(){
    if(el('nel126Style'))return;
    var s=document.createElement('style');s.id='nel126Style';
    s.textContent='#nel126Status{margin-top:9px;padding:10px 11px;border-radius:11px;background:#eef7f1;color:#23583b;font-size:10px;line-height:1.45;display:none}#nel126Status.show{display:block}#nel126Status.err{background:#fff0ed;color:#9c2d20}#nel126Status.ok{background:#eaf8ef;color:#08653a}';
    document.head.appendChild(s);
  }
  function status(text,type){
    ensureStyle();
    var box=el('nel126Status');
    if(!box){var host=el('checkout');if(!host)return;box=document.createElement('div');box.id='nel126Status';host.appendChild(box)}
    box.className='show'+(type?' '+type:'');box.textContent=String(text||'');
  }
  function clearStatus(){var box=el('nel126Status');if(box){box.className='';box.textContent=''}}

  function currentProfile(){
    var saved=profile();
    var session=digits(localStorage.getItem('nel_b2c_session_mobile')||'');
    return {
      mobile:digits((el('mobile')&&el('mobile').value)||saved.mobile||session),
      name:String((el('name')&&el('name').value)||saved.name||'').trim(),
      area:String((el('area')&&el('area').value)||saved.area||'').trim(),
      pincode:String((el('pincode')&&el('pincode').value)||saved.pincode||'').trim(),
      address:String((el('address')&&el('address').value)||saved.address||'').trim(),
      latitude:Number((window.S&&S.lat)||saved.latitude||0),
      longitude:Number((window.S&&S.lng)||saved.longitude||0)
    };
  }

  function getGps(){
    return new Promise(function(resolve,reject){
      if(!navigator.geolocation)return reject(new Error('GPS is not available on this device.'));
      navigator.geolocation.getCurrentPosition(function(pos){resolve({lat:pos.coords.latitude,lng:pos.coords.longitude})},function(err){reject(new Error(err&&err.message?err.message:'Location permission is required for home delivery.'))},{enableHighAccuracy:true,timeout:18000,maximumAge:60000});
    });
  }

  async function refreshCatalogueWithoutWrappers(){
    if(navigator.onLine===false)throw new Error('You are offline. Connect to the internet before ordering.');
    if(typeof window.catalogJsonpV114!=='function')return;
    var before=typeof window.cartTotal==='function'?Number(window.cartTotal()||0):0;
    var fresh=await window.catalogJsonpV114();
    if(!fresh||!Array.isArray(fresh.products))throw new Error('Live product catalogue is unavailable.');

    if(window.S)S.cfg=fresh;
    var live={};fresh.products.forEach(function(p){live[String(p.productId)]=p});
    if(window.S&&S.cart){
      Object.keys(S.cart).forEach(function(id){
        var p=live[id];if(!p){delete S.cart[id];return}
        var q=Math.max(1,Math.floor(Number(S.cart[id]||1)));
        var min=Math.max(1,Number(p.moq||1)),step=Math.max(1,Number(p.qtyStep||1));
        q=Math.max(q,min);if(step>1&&q%step)q=Math.ceil(q/step)*step;S.cart[id]=q;
      });
      localStorage.setItem('nel_cart_v9',JSON.stringify(S.cart));
    }
    if(typeof window.updateCartBar==='function')window.updateCartBar();
    if(typeof window.renderCart==='function'&&el('cartSheet')&&el('cartSheet').classList.contains('show'))window.renderCart();
    var after=typeof window.cartTotal==='function'?Number(window.cartTotal()||0):before;
    if(before!==after)status('Cart refreshed to the current live price: '+money(after),'ok');
  }

  async function directPlaceOrderV126(){
    var btn=el('placeBtn');
    if(btn&&btn.dataset.nel126Busy==='1')return;
    var stage='starting';
    if(btn){btn.dataset.nel126Busy='1';btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='Checking order…'}
    clearStatus();
    try{
      stage='live catalogue';status('Checking live stock and price…');
      await refreshCatalogueWithoutWrappers();

      var lines=typeof window.cartLines==='function'?window.cartLines():[];
      if(!lines.length)throw new Error('Your cart is empty. Please add a product first.');

      stage='customer details';
      var p=currentProfile();
      if(!validMobile(p.mobile))throw new Error('Please enter a valid 10-digit mobile number in Account.');
      if(!p.name)throw new Error('Please add your name in Account before ordering.');

      var fulfil=el('fulfil')?el('fulfil').value:'Home Delivery';
      var home=fulfil==='Home Delivery';
      if(home&&(!p.address||!p.area))throw new Error('Please add your delivery address and area in Account.');

      if(home&&(!p.latitude||!p.longitude)){
        stage='GPS';status('Getting your delivery location…');
        var gps=await getGps();p.latitude=gps.lat;p.longitude=gps.lng;
        try{S.lat=gps.lat;S.lng=gps.lng}catch(e){}
        var gpsText=el('gpsText');if(gpsText)gpsText.textContent='GPS saved';
      }

      if(home){
        stage='delivery check';status('Checking delivery availability…');
        var loc=await window.rpc('checkDeliveryLocation',[p.latitude,p.longitude]);
        if(!loc||loc.eligible!==true)throw new Error('This address is outside our current delivery radius.');
      }

      var localProfile={mobile:p.mobile,name:p.name,address:p.address,area:p.area,pincode:p.pincode,latitude:p.latitude||'',longitude:p.longitude||''};
      localStorage.setItem('nel_profile_v9',JSON.stringify(localProfile));
      localStorage.setItem('nel_b2c_profile',JSON.stringify(localProfile));

      var payload={
        mobile:p.mobile,name:p.name,
        items:lines.map(function(x){return {productId:x.p.productId,quantity:x.q}}),
        cashbackUsed:0,fulfilmentType:fulfil,
        address:home?p.address:'Native Elaneeru Hub Pickup',area:home?p.area:'HUB',pincode:home?p.pincode:'',
        latitude:home?p.latitude:'',longitude:home?p.longitude:'',payment:'COD',
        timeSlot:home&&el('slot')?el('slot').value:'Pickup'
      };

      stage='server order';status('Placing your order…');if(btn)btn.textContent='Placing order…';
      var result=await window.rpc('saveOrder',[payload]);
      if(!result||!result.orderId)throw new Error('The server did not return an order number. Please retry before paying anyone.');

      try{S.cart={}}catch(e){}
      localStorage.removeItem('nel_cart_v9');
      if(typeof window.updateCartBar==='function')window.updateCartBar();
      if(el('cartSheet'))el('cartSheet').classList.remove('show');
      if(typeof window.toast==='function')window.toast('Order '+result.orderId+' placed ✓');
      try{await window.loadCustomer(false)}catch(e){}
      if(typeof window.go==='function')window.go('orders');
    }catch(err){
      var msg=String(err&&err.message||err||'Order could not be placed.');
      status('Order not placed ('+stage+'): '+msg,'err');
      if(typeof window.toast==='function')window.toast(msg);
    }finally{
      var current=el('placeBtn');
      if(current){current.dataset.nel126Busy='0';current.disabled=false;current.removeAttribute('aria-busy');var total=typeof window.cartTotal==='function'?window.cartTotal():0;current.textContent='Place order · '+money(total)}
    }
  }

  function install(){
    var tries=0;
    (function wait(){
      if(typeof window.rpc==='function'&&typeof window.cartLines==='function'&&typeof window.cartTotal==='function'){
        window.placeOrder=directPlaceOrderV126;
        try{placeOrder=directPlaceOrderV126}catch(e){}
        return;
      }
      if(++tries<200)setTimeout(wait,75);
    })();
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
