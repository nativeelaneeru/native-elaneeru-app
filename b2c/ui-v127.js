(function(){
  if(window.NEL_UI_V127)return;window.NEL_UI_V127=true;

  function el(id){return document.getElementById(id)}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function validMobile(v){return /^[6-9]\d{9}$/.test(digits(v))}
  function profile(){try{return JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){return {}}}
  function currentCatalogue(){try{return window.S&&S.cfg&&Array.isArray(S.cfg.products)&&S.cfg.products.length?S.cfg:null}catch(e){return null}}

  function style(){
    if(el('nel127Style'))return;
    var s=document.createElement('style');s.id='nel127Style';
    s.textContent='#nel125OrderStatus,#nel126Status{display:none!important}#nel127Status{margin-top:10px;padding:11px 12px;border-radius:12px;background:#eef7f1;color:#23583b;font-size:11px;line-height:1.45;display:none}#nel127Status.show{display:block}#nel127Status.err{background:#fff0ed;color:#9c2d20}#nel127Status.ok{background:#eaf8ef;color:#08653a}';
    document.head.appendChild(s);
  }
  function status(text,type){
    style();var box=el('nel127Status');
    if(!box){var host=el('checkout');if(!host)return;box=document.createElement('div');box.id='nel127Status';host.appendChild(box)}
    box.className='show'+(type?' '+type:'');box.textContent=String(text||'');
  }
  function clearStatus(){var box=el('nel127Status');if(box){box.className='';box.textContent=''}}

  function currentProfile(){
    var saved=profile(),session=digits(localStorage.getItem('nel_b2c_session_mobile')||'');
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
      navigator.geolocation.getCurrentPosition(
        function(pos){resolve({lat:pos.coords.latitude,lng:pos.coords.longitude})},
        function(err){reject(new Error(err&&err.message?err.message:'Location permission is required for home delivery.'))},
        {enableHighAccuracy:true,timeout:12000,maximumAge:300000}
      );
    });
  }

  function installCatalogueFallback(){
    var base=window.catalogJsonpV114;
    if(typeof base!=='function'||base.__nel127)return;
    var wrapped=function(){
      var ctx=this,args=arguments,current=currentCatalogue();
      if(!current)return base.apply(ctx,args);
      var request;
      try{request=Promise.resolve(base.apply(ctx,args)).catch(function(){return current})}catch(e){return Promise.resolve(current)}
      var fallback=new Promise(function(resolve){setTimeout(function(){resolve(current)},3500)});
      return Promise.race([request,fallback]);
    };
    wrapped.__nel127=true;wrapped.__base=base;window.catalogJsonpV114=wrapped;
    try{catalogJsonpV114=wrapped}catch(e){}
  }

  async function placeOrderV127(){
    var btn=el('placeBtn');if(btn&&btn.dataset.nel127Busy==='1')return;
    var stage='cart';
    if(btn){btn.dataset.nel127Busy='1';btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='Placing order…'}
    clearStatus();
    try{
      if(navigator.onLine===false)throw new Error('You are offline. Connect to the internet before ordering.');
      var lines=typeof window.cartLines==='function'?window.cartLines():[];
      if(!lines.length)throw new Error('Your cart is empty. Please add a product first.');

      stage='customer details';status('Checking customer details…');
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
      }

      var localProfile={mobile:p.mobile,name:p.name,address:p.address,area:p.area,pincode:p.pincode,latitude:p.latitude||'',longitude:p.longitude||''};
      try{
        localStorage.setItem('nel_profile_v9',JSON.stringify(localProfile));
        localStorage.setItem('nel_b2c_profile',JSON.stringify(localProfile));
        if(window.NEL_DB&&typeof window.NEL_DB.setProfile==='function')window.NEL_DB.setProfile(localProfile).catch(function(){});
      }catch(e){}

      var payload={
        mobile:p.mobile,name:p.name,
        items:lines.map(function(x){return {productId:x.p.productId,quantity:x.q}}),
        cashbackUsed:0,fulfilmentType:fulfil,
        address:home?p.address:'Native Elaneeru Hub Pickup',area:home?p.area:'HUB',pincode:home?p.pincode:'',
        latitude:home?p.latitude:'',longitude:home?p.longitude:'',payment:'COD',
        timeSlot:home&&el('slot')?el('slot').value:'Pickup'
      };

      stage='server order';status('Confirming stock, delivery, price and order…');
      var result=await window.rpc('saveOrder',[payload]);
      if(!result||!result.orderId)throw new Error('The server did not return an order number. Please retry before paying anyone.');

      try{S.cart={}}catch(e){}
      try{localStorage.removeItem('nel_cart_v9')}catch(e){}
      try{if(window.NEL_DB&&typeof window.NEL_DB.clearCart==='function')await window.NEL_DB.clearCart()}catch(e){}
      if(typeof window.updateCartBar==='function')window.updateCartBar();
      if(el('cartSheet'))el('cartSheet').classList.remove('show');
      if(typeof window.toast==='function')window.toast('Order '+result.orderId+' placed ✓');
      status('Order '+result.orderId+' placed successfully.','ok');
      try{if(typeof window.loadCustomer==='function')await window.loadCustomer(false)}catch(e){}
      if(typeof window.go==='function')window.go('orders');
    }catch(err){
      var msg=String(err&&err.message||err||'Order could not be placed.');
      status('Order not placed ('+stage+'): '+msg,'err');
      if(typeof window.toast==='function')window.toast(msg);
    }finally{
      var current=el('placeBtn');
      if(current){
        current.dataset.nel127Busy='0';current.disabled=false;current.removeAttribute('aria-busy');
        var total=typeof window.cartTotal==='function'?window.cartTotal():0;
        current.textContent='Place order · '+money(total);
      }
    }
  }

  function install(){
    style();installCatalogueFallback();
    var tries=0;(function wait(){
      installCatalogueFallback();
      if(typeof window.rpc==='function'&&typeof window.cartLines==='function'&&typeof window.cartTotal==='function'){
        window.placeOrder=placeOrderV127;try{placeOrder=placeOrderV127}catch(e){};return;
      }
      if(++tries<200)setTimeout(wait,75);
    })();
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
