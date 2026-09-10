(function(){
  if(window.NEL_UI_V125)return;window.NEL_UI_V125=true;

  var freshDashboard=null;
  var baseRenderProducts=null;
  var baseOpenCart=null;
  var patched=false;

  function el(id){return document.getElementById(id)}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function validMobile(v){return /^[6-9]\d{9}$/.test(String(v||'').replace(/\D/g,'').slice(-10))}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}

  function style(){
    if(el('nel125Style'))return;
    var s=document.createElement('style');s.id='nel125Style';
    s.textContent='\
      #nel125OrderStatus{margin-top:9px;border-radius:11px;padding:9px 10px;font-size:10px;line-height:1.45;background:#eef7f1;color:#23583b;display:none}\
      #nel125OrderStatus.show{display:block}\
      #nel125OrderStatus.err{background:#fff0ed;color:#9c2d20}\
      #nel125OrderStatus.ok{background:#eaf8ef;color:#08653a}\
      .nel125-history-note{font-size:9px;color:#68766d;padding:0 14px 7px;margin-top:-5px}\
      .nel125-card-meta{font-size:9px;color:#6d766f;margin-top:3px}\
    ';
    document.head.appendChild(s);
  }

  function status(message,type){
    var box=el('nel125OrderStatus');
    if(!box){
      var checkout=el('checkout');if(!checkout)return;
      box=document.createElement('div');box.id='nel125OrderStatus';checkout.appendChild(box);
    }
    box.className='show'+(type?' '+type:'');box.textContent=String(message||'');
  }
  function clearStatus(){var box=el('nel125OrderStatus');if(box){box.className='';box.textContent=''}}

  function setTruthfulPromo(){
    var span=document.querySelector('.offerTop span');
    if(span)span.textContent='🥥 Fresh stock · Live prices · Cash on Delivery';
  }

  function historyHeading(text,note){
    var host=el('favProducts');if(!host)return;
    var section=host.previousElementSibling;
    if(section&&section.classList&&section.classList.contains('section')){
      var h=section.querySelector('h2');if(h)h.textContent=text;
    }
    var n=el('nel125HistoryNote');
    if(!n){n=document.createElement('div');n.id='nel125HistoryNote';n.className='nel125-history-note';host.parentNode.insertBefore(n,host)}
    n.textContent=note||'';
  }

  function products(){try{return S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function productKey(p){return String(p&&p.productName||'').trim().toLowerCase()}
  function productByOrderItem(it){
    var pid=String(it&&it.productId||'').toUpperCase();
    var name=String(it&&(it.name||it.productName)||'').trim().toLowerCase();
    return products().find(function(p){return (pid&&String(p.productId||'').toUpperCase()===pid)||(name&&productKey(p)===name)})||null;
  }
  function productCard(p,meta){
    var id=String(p.productId||'').replace(/'/g,"\\'");
    var im=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName)+'" loading="lazy" decoding="async" onerror="this.remove();this.parentNode.textContent=\'🥥\'">':'🥥';
    return '<div class="fav"><div class="favVisual">'+im+'</div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="nel125-card-meta">'+esc(meta||'Live catalogue')+'</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div></div>';
  }
  function realOrders(d){
    return (d&&Array.isArray(d.orders)?d.orders:[]).filter(function(o){var st=String(o&&o.status||'').toUpperCase();return !/(CANCEL|FAIL|REJECT|UNABLE|RETURN)/.test(st)});
  }
  function renderHistory(){
    var host=el('favProducts');if(!host)return;
    var ps=products();
    if(!freshDashboard){
      historyHeading('Fresh picks','Order history is checked live before we show an “Order again” list.');
      host.innerHTML=ps.slice(0,4).map(function(p){return productCard(p,'Fresh today')}).join('')||'<div class="empty">Loading fresh products…</div>';
      return;
    }
    var orders=realOrders(freshDashboard),seen={},ranked=[];
    orders.forEach(function(o){(o.items||[]).forEach(function(it){var p=productByOrderItem(it);if(!p)return;var k=String(p.productId||productKey(p));if(seen[k])return;seen[k]=1;ranked.push(p)})});
    if(ranked.length){
      historyHeading('Order again','Only products found in your confirmed order history are shown here.');
      host.innerHTML=ranked.slice(0,6).map(function(p){return productCard(p,'Previously ordered')}).join('');
    }else{
      historyHeading('Fresh picks','No previous completed/active orders were found for this account.');
      host.innerHTML=ps.slice(0,4).map(function(p){return productCard(p,'Fresh today')}).join('')||'<div class="empty">No products available.</div>';
    }
  }

  function normalizeLiveCart(){
    try{
      var changed=false,live={};products().forEach(function(p){live[String(p.productId)]=p});
      Object.keys(S.cart||{}).forEach(function(id){
        var p=live[id];if(!p){delete S.cart[id];changed=true;return}
        var q=Number(S.cart[id]||0),min=Math.max(1,Number(p.moq||1)),step=Math.max(1,Number(p.qtyStep||1));
        var next=Math.max(min,Math.floor(q||min));if(step>1&&next%step)next=Math.ceil(next/step)*step;
        if(next!==q){S.cart[id]=next;changed=true}
      });
      if(changed){localStorage.setItem('nel_cart_v9',JSON.stringify(S.cart));if(typeof window.updateCartBar==='function')window.updateCartBar()}
      return changed;
    }catch(e){return false}
  }

  async function refreshLiveCatalogue(showMessage){
    if(navigator.onLine===false)throw new Error('You are offline. Connect to the internet before placing the order.');
    if(typeof window.catalogJsonpV114!=='function')return false;
    var before=typeof window.cartTotal==='function'?Number(window.cartTotal()||0):0;
    if(showMessage)status('Checking live stock and price…');
    var fresh=await window.catalogJsonpV114();
    if(!fresh||!Array.isArray(fresh.products))throw new Error('Live product catalogue is unavailable. Please retry.');
    if(typeof window.publishCatalogV113==='function')window.publishCatalogV113(fresh);
    normalizeLiveCart();
    var after=typeof window.cartTotal==='function'?Number(window.cartTotal()||0):before;
    if(el('cartSheet')&&el('cartSheet').classList.contains('show')&&typeof window.renderCart==='function')window.renderCart();
    if(showMessage&&before!==after)status('Cart updated to the current live price: '+money(after),'ok');
    return before!==after;
  }

  function currentProfile(){
    var saved={};try{saved=typeof window.profile==='function'?window.profile():JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){}
    var session=digits(localStorage.getItem('nel_b2c_session_mobile')||'');
    return {
      mobile:digits((el('mobile')&&el('mobile').value)||saved.mobile||session),
      name:String((el('name')&&el('name').value)||saved.name||'').trim(),
      area:String((el('area')&&el('area').value)||saved.area||'').trim(),
      pincode:String((el('pincode')&&el('pincode').value)||saved.pincode||'').trim(),
      address:String((el('address')&&el('address').value)||saved.address||'').trim(),
      latitude:Number((typeof S!=='undefined'&&S.lat)||saved.latitude||0),
      longitude:Number((typeof S!=='undefined'&&S.lng)||saved.longitude||0)
    };
  }

  function getGps(){
    return new Promise(function(resolve,reject){
      if(!navigator.geolocation)return reject(new Error('GPS is not available on this device.'));
      status('Getting your delivery location…');
      navigator.geolocation.getCurrentPosition(function(pos){resolve({lat:pos.coords.latitude,lng:pos.coords.longitude})},function(err){reject(new Error(err&&err.message?err.message:'Location permission is required for home delivery.'))},{enableHighAccuracy:true,timeout:18000,maximumAge:60000});
    });
  }

  async function robustPlaceOrder(){
    var btn=el('placeBtn');if(btn&&btn.dataset.nel125Busy==='1')return;
    if(btn){btn.dataset.nel125Busy='1';btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='Checking order…'}
    clearStatus();
    try{
      await refreshLiveCatalogue(true);
      var lines=typeof window.cartLines==='function'?window.cartLines():[];
      if(!lines.length)throw new Error('Your cart is empty. Please add a product first.');

      var p=currentProfile();
      if(!validMobile(p.mobile))throw new Error('Please enter a valid 10-digit mobile number in Account.');
      if(!p.name)throw new Error('Please add your name in Account before ordering.');

      var fulfil=el('fulfil')?el('fulfil').value:'Home Delivery';
      var home=fulfil==='Home Delivery';
      if(home&&(!p.address||!p.area))throw new Error('Please add your delivery address and area in Account.');

      if(home&&(!p.latitude||!p.longitude)){
        var gps=await getGps();p.latitude=gps.lat;p.longitude=gps.lng;
        try{S.lat=gps.lat;S.lng=gps.lng}catch(e){}
        var gpsText=el('gpsText');if(gpsText)gpsText.textContent='GPS saved';
      }

      if(home){
        status('Checking delivery availability…');
        var loc=await window.rpc('checkDeliveryLocation',[p.latitude,p.longitude]);
        if(!loc||loc.eligible!==true)throw new Error('This address is outside our current delivery radius.');
      }

      var saveProfilePayload={
        mobile:p.mobile,name:p.name,address:home?p.address:(p.address||'Pickup Customer'),area:home?p.area:(p.area||'HUB'),pincode:p.pincode,
        latitude:home?p.latitude:'',longitude:home?p.longitude:''
      };
      status('Saving delivery details…');
      await window.rpc('saveCustomerProfile',[saveProfilePayload]);
      localStorage.setItem('nel_profile_v9',JSON.stringify(saveProfilePayload));
      localStorage.setItem('nel_b2c_profile',JSON.stringify(saveProfilePayload));

      var slot=home&&el('slot')?el('slot').value:'Pickup';
      var payload={
        mobile:p.mobile,name:p.name,
        items:lines.map(function(x){return {productId:x.p.productId,quantity:x.q}}),
        cashbackUsed:0,fulfilmentType:fulfil,
        address:home?p.address:'Native Elaneeru Hub Pickup',area:home?p.area:'HUB',pincode:home?p.pincode:'',
        latitude:home?p.latitude:'',longitude:home?p.longitude:'',payment:'COD',timeSlot:slot
      };
      status('Placing your order…');
      if(btn)btn.textContent='Placing order…';
      var r=await window.rpc('saveOrder',[payload]);
      if(!r||!r.orderId)throw new Error('The server did not return an order number. Please retry before paying anyone.');

      try{S.cart={}}catch(e){}
      localStorage.removeItem('nel_cart_v9');
      if(typeof window.updateCartBar==='function')window.updateCartBar();
      if(el('cartSheet'))el('cartSheet').classList.remove('show');
      if(typeof window.toast==='function')window.toast('Order '+r.orderId+' placed ✓');
      try{await window.loadCustomer(false)}catch(e){}
      freshDashboard=null;
      if(typeof window.go==='function')window.go('orders');
    }catch(err){
      var msg=String(err&&err.message||err||'Order could not be placed.');
      status('Order not placed: '+msg,'err');
      if(typeof window.toast==='function')window.toast(msg);
    }finally{
      var current=el('placeBtn');if(current){current.dataset.nel125Busy='0';current.disabled=false;current.removeAttribute('aria-busy');var total=typeof window.cartTotal==='function'?window.cartTotal():0;current.textContent='Place order · '+money(total)}
    }
  }

  function patchFunctions(){
    if(patched)return true;
    var rp=window.renderProducts,oc=window.openCart;
    if(typeof rp!=='function'||typeof oc!=='function'||typeof window.rpc!=='function'||typeof window.cartLines!=='function')return false;
    if(rp.__nel110!==true)return false;

    baseRenderProducts=rp;
    window.renderProducts=function(){var r=baseRenderProducts.apply(this,arguments);setTimeout(renderHistory,0);return r};
    try{renderProducts=window.renderProducts}catch(e){}

    baseOpenCart=oc;
    window.openCart=function(){var r=baseOpenCart.apply(this,arguments);setTimeout(function(){style();clearStatus();refreshLiveCatalogue(true).catch(function(e){status(e.message,'err')})},0);return r};
    try{openCart=window.openCart}catch(e){}

    window.placeOrder=robustPlaceOrder;try{placeOrder=robustPlaceOrder}catch(e){}
    patched=true;renderHistory();return true;
  }

  function start(){
    style();setTruthfulPromo();historyHeading('Fresh picks','Order history is checked live before we show an “Order again” list.');
    var tries=0;(function wait(){if(!patchFunctions()&&++tries<160)setTimeout(wait,100)})();
    setTimeout(function(){if(!freshDashboard)renderHistory()},2500);
  }

  window.addEventListener('nel:dashboard',function(e){
    var detail=e&&e.detail||{},d=detail.dashboard;
    if(!d)return;
    if(detail.cached===false){freshDashboard=d;renderHistory()}
    else if(!freshDashboard){historyHeading('Fresh picks','Refreshing your real order history…');renderHistory()}
  });
  window.addEventListener('nel:catalog',function(){normalizeLiveCart();renderHistory()});
  window.addEventListener('online',function(){if(el('cartSheet')&&el('cartSheet').classList.contains('show'))refreshLiveCatalogue(false).catch(function(){})});

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
