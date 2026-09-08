/*******************************************************************************
 * NATIVE ELANEERU V9.9 — B2C RECOVERY RUNTIME
 *
 * The rich B2C HTML remains the visual shell. This compatibility-safe runtime
 * restores the interactive layer even if the older inline script fails to parse.
 ******************************************************************************/

function b2cCoreRuntimeV99_(){
  return `<style>
    .nel99-error{margin:8px 14px;padding:12px;border:1px solid #f0c7c3;background:#fff4f2;color:#9f2f25;border-radius:14px;font-size:11px;line-height:1.45}
    .nel99-error button{margin-top:8px;border:0;background:#9f2f25;color:#fff;border-radius:9px;padding:8px 10px;font-weight:900}
    .nel99-loading{margin:8px 14px;padding:14px;border:1px solid #e4ebe6;background:#f7faf8;color:#5f6e64;border-radius:14px;font-size:11px;text-align:center}
  </style>
  <script>(function(){
    if(window.NEL99_BOOTED)return;
    window.NEL99_BOOTED=true;

    function byId(id){return document.getElementById(id)}
    function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]})}
    function jsq(v){return String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
    function money(v){var n=Number(v||0);return '₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2})}
    function toast99(m){var t=byId('toast');if(!t){alert(m);return}t.textContent=m;t.classList.add('show');clearTimeout(t._nel99);t._nel99=setTimeout(function(){t.classList.remove('show')},2600)}

    if(typeof window.rpc!=='function'){
      window.rpc=function(name,args){
        args=Array.isArray(args)?args:[];
        return new Promise(function(resolve,reject){
          google.script.run.withSuccessHandler(resolve).withFailureHandler(function(e){reject(new Error(e&&e.message?e.message:String(e)))}).rpcV9(name,args);
        });
      };
    }

    var cart={};
    try{cart=JSON.parse(localStorage.getItem('nel_cart_v9')||'{}')||{}}catch(e){cart={}}
    var N=window.NEL99={cfg:null,cart:cart,lat:'',lng:'',query:''};

    function product(id){var a=N.cfg&&Array.isArray(N.cfg.products)?N.cfg.products:[];for(var i=0;i<a.length;i++)if(String(a[i].productId)===String(id))return a[i];return null}
    function normalize(p,q){var min=Math.max(1,Number(p&&p.moq||1)),step=Math.max(1,Number(p&&p.qtyStep||1));q=Math.max(min,Math.floor(Number(q)||min));if(step>1&&q%step)q=Math.ceil(q/step)*step;return q}
    function lineTotal(p,q){if(Number(p.offerQty2)&&q===Number(p.offerQty2))return Number(p.offerPrice2||0);if(Number(p.offerQty1)&&q===Number(p.offerQty1))return Number(p.offerPrice1||0);return q*Number(p.price||0)}
    function unitPrice(p,q){return q?lineTotal(p,q)/q:Number(p.price||0)}
    function cartLines(){var out=[];Object.keys(N.cart||{}).forEach(function(id){var p=product(id);if(p){var q=Number(N.cart[id]||0);out.push({p:p,q:q,line:lineTotal(p,q)})}});return out}
    function cartTotal(){return cartLines().reduce(function(a,x){return a+x.line},0)}

    function imgHtml(p){if(p&&p.imageUrl)return '<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName||'Tender Coconut')+'" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'🥥\'">';return '🥥'}
    function pcard(p){var id=jsq(p.productId),q=Number(N.cart[p.productId]||0),offer='Fresh today';if(Number(p.offerQty2))offer=p.offerQty2+' for '+money(p.offerPrice2);else if(Number(p.offerQty1))offer=p.offerQty1+' for '+money(p.offerPrice1);var control=q?'<div class="qty"><button onclick="change(\''+id+'\',-1)">−</button><span>'+q+'</span><button onclick="change(\''+id+'\',1)">+</button></div>':'<button class="add" onclick="add(\''+id+'\')">ADD</button>';return '<div class="product"><div class="visual">'+imgHtml(p)+'</div><div class="pname">'+esc(p.productName)+'</div><div class="meta">MOQ '+Number(p.moq||1)+' · '+esc(offer)+'</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div>'+control+'</div>'}
    function favCard(p){var id=jsq(p.productId);return '<div class="fav"><div class="favVisual">'+imgHtml(p)+'<button class="heart" type="button">♡</button></div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="meta">Fresh checked · local delivery</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div></div>'}

    function currentProducts(){var a=N.cfg&&Array.isArray(N.cfg.products)?N.cfg.products:[],q=String(N.query||'').toLowerCase();return a.filter(function(p){return !q||String(p.productName||'').toLowerCase().indexOf(q)>=0||String(p.category||'').toLowerCase().indexOf(q)>=0})}
    function renderProducts99(){var a=currentProducts(),h=a.map(pcard).join(''),f=a.map(favCard).join('');if(!h)h='<div class="empty">No matching products.</div>';if(!f)f='<div class="empty">No favourites yet.</div>';['homeProducts','products','offerProducts'].forEach(function(id){var el=byId(id);if(el)el.innerHTML=h});var fav=byId('favProducts');if(fav)fav.innerHTML=f;updateCart99()}
    function loading99(){['homeProducts','products','offerProducts','favProducts'].forEach(function(id){var el=byId(id);if(el)el.innerHTML='<div class="nel99-loading">Loading fresh products…</div>'})}
    function error99(err){var msg=err&&err.message?err.message:String(err||'Unable to load products.');var h='<div class="nel99-error"><b>Catalogue connection failed</b><div style="margin-top:4px">'+esc(msg)+'</div><button onclick="nel99Retry()">Retry</button></div>';['homeProducts','products','offerProducts','favProducts'].forEach(function(id){var el=byId(id);if(el)el.innerHTML=h})}
    function loadCatalogue99(){loading99();return window.rpc('getB2CAppDataV9',[]).then(function(d){N.cfg=d||{};if(!Array.isArray(N.cfg.products))N.cfg.products=[];renderProducts99();return d}).catch(function(e){error99(e);toast99(e&&e.message?e.message:String(e));throw e})}
    window.nel99Retry=loadCatalogue99;

    window.go=function(page){['home','shop','orders','account','offers'].forEach(function(x){var el=byId(x+'Page');if(el)el.classList.toggle('hide',x!==page)});document.querySelectorAll('.nav button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-page')===page)});if(page==='orders')window.loadCustomer(false);try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}};
    window.searchProducts=function(q){N.query=q||'';renderProducts99()};
    window.filterProducts=function(mode,btn){document.querySelectorAll('.filter').forEach(function(x){x.classList.remove('on')});if(btn)btn.classList.add('on');N.query='';var s=byId('searchInput');if(s)s.value='';if(mode==='offers')window.go('offers');else if(mode==='bulk')window.go('shop');else{window.go('home');renderProducts99()}};
    window.add=function(id){var p=product(id);if(!p)return toast99('Product not ready yet.');N.cart[id]=normalize(p,p.moq);saveCart99()};
    window.change=function(id,d){var p=product(id);if(!p)return;var step=Math.max(1,Number(p.qtyStep||1)),min=Math.max(1,Number(p.moq||1)),n=Number(N.cart[id]||min)+Number(d||0)*step;if(n<min)delete N.cart[id];else N.cart[id]=normalize(p,n);saveCart99()};
    function saveCart99(){try{localStorage.setItem('nel_cart_v9',JSON.stringify(N.cart))}catch(e){}renderProducts99();var sheet=byId('cartSheet');if(sheet&&sheet.classList.contains('show'))renderCart99()}
    function updateCart99(){var l=cartLines(),qty=l.reduce(function(a,x){return a+x.q},0),bar=byId('cartBar');if(bar)bar.classList.toggle('show',l.length>0);var c=byId('cartCount'),a=byId('cartAmount');if(c)c.textContent=qty+' items';if(a)a.textContent=money(cartTotal())}
    window.openCart=function(){renderCart99();var s=byId('cartSheet');if(s)s.classList.add('show')};
    window.closeSheet=function(id){var e=byId(id);if(e)e.classList.remove('show')};
    window.toggleFulfil=function(){var f=byId('fulfil'),b=byId('slotBox');if(f&&b)b.style.display=f.value==='Pickup'?'none':'block'};
    function renderCart99(){var lines=cartLines(),items=byId('cartItems'),checkout=byId('checkout');if(items)items.innerHTML=lines.length?lines.map(function(x){return '<div class="cartItem"><div><b>'+esc(x.p.productName)+'</b><div class="meta">'+x.q+' × '+money(unitPrice(x.p,x.q))+'</div></div><b>'+money(x.line)+'</b></div>'}).join(''):'<div class="empty">Your cart is empty.</div>';if(!checkout)return;if(!lines.length){checkout.innerHTML='';return}var radius=N.cfg&&N.cfg.deliveryRadiusKm?N.cfg.deliveryRadiusKm:3;checkout.innerHTML='<div class="sum"><span>Subtotal</span><b>'+money(cartTotal())+'</b></div><select id="fulfil" class="field" onchange="toggleFulfil()"><option value="Home Delivery">Home Delivery</option><option value="Pickup">Pickup from Hub</option></select><div id="slotBox"><select id="slot" class="field" style="margin-top:8px"><option>07:00-09:00</option><option>09:00-12:00</option><option>12:00-15:00</option><option>15:00-18:00</option></select></div><div class="meta" style="margin-top:7px">Cash on Delivery · '+Number(radius)+' KM home-delivery radius</div><button id="placeBtn" class="btn" style="width:100%;margin-top:9px" onclick="placeOrder()">Place order · '+money(cartTotal())+'</button>'}

    function profile(){var p={};try{p=JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')||{}}catch(e){}return p}
    function hydrate99(p){if(!p)return;['mobile','name','area','pincode','address'].forEach(function(k){var el=byId(k);if(el)el.value=p[k]||''});N.lat=p.latitude||'';N.lng=p.longitude||'';var g=byId('gpsText');if(g&&N.lat&&N.lng)g.textContent='GPS saved'}
    window.saveProfile=function(){var p={mobile:(byId('mobile')&&byId('mobile').value||'').replace(/\D/g,'').slice(-10),name:byId('name')?byId('name').value.trim():'',area:byId('area')?byId('area').value.trim():'',pincode:byId('pincode')?byId('pincode').value.trim():'',address:byId('address')?byId('address').value.trim():'',latitude:N.lat,longitude:N.lng};return window.rpc('saveCustomerProfile',[p]).then(function(){localStorage.setItem('nel_profile_v9',JSON.stringify(p));toast99('Profile saved ✓');return window.loadCustomer(false)}).catch(function(e){toast99(e.message||String(e))})};
    window.captureLoc=function(){if(!navigator.geolocation)return toast99('GPS unavailable');toast99('Getting your location…');navigator.geolocation.getCurrentPosition(function(pos){N.lat=pos.coords.latitude;N.lng=pos.coords.longitude;var g=byId('gpsText');if(g)g.textContent='GPS captured · '+N.lat.toFixed(5)+', '+N.lng.toFixed(5);window.rpc('checkDeliveryLocation',[N.lat,N.lng]).then(function(r){toast99(r.eligible?'Delivery available · '+r.distanceKm+' KM':'Outside delivery area · '+r.distanceKm+' KM')}).catch(function(e){toast99(e.message||String(e))})},function(e){toast99(e.message||'Unable to get GPS')},{enableHighAccuracy:true,timeout:15000,maximumAge:5000})};
    window.placeOrder=function(){var p=profile(),mobile=((byId('mobile')&&byId('mobile').value)||p.mobile||'').replace(/\D/g,'').slice(-10);if(!mobile){window.closeSheet('cartSheet');window.go('account');return toast99('Save your profile before ordering.')}var fulfil=byId('fulfil')?byId('fulfil').value:'Home Delivery',home=fulfil==='Home Delivery';if(home&&(!N.lat||!N.lng)){window.closeSheet('cartSheet');window.go('account');return toast99('Capture GPS before home delivery.')}var proceed=function(){var payload={mobile:mobile,items:cartLines().map(function(x){return {productId:x.p.productId,quantity:x.q}}),cashbackUsed:0,fulfilmentType:fulfil,address:home?((byId('address')&&byId('address').value)||p.address||''):'Native Elaneeru Hub Pickup',area:home?((byId('area')&&byId('area').value)||p.area||''):'HUB',pincode:home?((byId('pincode')&&byId('pincode').value)||p.pincode||''):'',latitude:home?N.lat:'',longitude:home?N.lng:'',payment:'COD',timeSlot:home?(byId('slot')?byId('slot').value:'09:00-12:00'):'Pickup'};var b=byId('placeBtn');if(b)b.disabled=true;return window.rpc('saveOrder',[payload]).then(function(r){N.cart={};localStorage.removeItem('nel_cart_v9');updateCart99();window.closeSheet('cartSheet');toast99('Order '+r.orderId+' placed ✓');return window.loadCustomer(false).then(function(){window.go('orders')})}).catch(function(e){toast99(e.message||String(e));if(b)b.disabled=false})};if(home)return window.rpc('checkDeliveryLocation',[N.lat,N.lng]).then(function(r){if(!r.eligible)throw new Error('Home delivery is outside our '+((N.cfg&&N.cfg.deliveryRadiusKm)||3)+' KM service radius.');return proceed()}).catch(function(e){toast99(e.message||String(e))});return proceed()};

    window.loadCustomer=function(show){var p=profile(),mobile=((byId('mobile')&&byId('mobile').value)||p.mobile||'').replace(/\D/g,'').slice(-10);if(!mobile){if(show!==false)toast99('Save your mobile number first.');return Promise.resolve(null)}return window.rpc('getCustomerDashboard',[mobile]).then(function(d){var rw=byId('rewards'),od=byId('orders');if(rw)rw.innerHTML='<div class="reward"><div class="rewardGrid"><div class="rewardItem"><span>Weekly</span><b>'+Number(d.weekly&&d.weekly.achieved||0)+'/'+Number(d.weekly&&d.weekly.target||0)+'</b><small>Reward '+money(d.weekly&&d.weekly.reward||0)+'</small></div><div class="rewardItem"><span>Monthly</span><b>'+Number(d.monthly&&d.monthly.achieved||0)+'/'+Number(d.monthly&&d.monthly.target||0)+'</b><small>Reward '+money(d.monthly&&d.monthly.reward||0)+'</small></div></div></div>';if(od){var orders=Array.isArray(d.orders)?d.orders:[];od.innerHTML=orders.length?orders.map(function(o){var items=Array.isArray(o.items)?o.items.map(function(i){return esc(i.name)+' × '+Number(i.qty||0)}).join(' · '):'';var acts=String(o.status||'').toLowerCase()==='delivered'?'<button class="mini" onclick="invoice(\''+jsq(o.orderId)+'\')">Invoice</button>':'<button class="mini" onclick="track(\''+jsq(o.orderId)+'\')">Track</button> <button class="mini" onclick="invoice(\''+jsq(o.orderId)+'\')">Invoice</button>';return '<div class="order"><div class="topline"><div><b>'+esc(o.orderId)+'</b><div class="meta">'+esc(o.date||'')+' · '+esc(o.fulfilment||'')+'</div></div><span class="status">'+esc(o.status||'')+'</span></div><div class="meta">'+items+'</div><div class="topline" style="margin-top:8px"><b>'+money(o.amount)+'</b><div>'+acts+'</div></div></div>'}).join(''):'<div class="empty">No orders yet.</div>'}return d}).catch(function(e){if(show!==false)toast99(e.message||String(e));throw e})};
    window.track=function(id){var s=byId('trackSheet'),box=byId('trackBox'),p=profile(),mobile=((byId('mobile')&&byId('mobile').value)||p.mobile||'').replace(/\D/g,'').slice(-10);if(s)s.classList.add('show');if(box)box.innerHTML='<div class="empty">Loading tracking…</div>';return window.rpc('getCustomerLiveTracking',[mobile,id]).then(function(t){if(!box)return;if(t.active){var url='https://www.google.com/maps?q='+Number(t.lat||0)+','+Number(t.lng||0);box.innerHTML='<div class="card" style="margin:0"><b>Driver is on the route</b><div class="meta">Stops before you: '+Number(t.stopsBefore||0)+' · ETA '+esc(t.eta||'Updating')+'</div><a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="'+esc(url)+'" target="_blank">Open driver location</a></div>'}else box.innerHTML='<div class="empty">'+esc(t.message||'Tracking will appear once the route starts.')+'</div>'}).catch(function(e){if(box)box.innerHTML='<div class="empty">'+esc(e.message||String(e))+'</div>'})};
    window.invoice=function(id){var p=profile(),mobile=((byId('mobile')&&byId('mobile').value)||p.mobile||'').replace(/\D/g,'').slice(-10);return window.rpc('getB2CInvoiceV91',[mobile,id]).then(function(d){var w=window.open('','_blank');if(!w)return toast99('Allow pop-ups to open the invoice.');var items=Array.isArray(d.items)?d.items.map(function(x){return '<tr><td>'+esc(x.productName)+'</td><td>'+esc(x.hsn)+'</td><td>'+Number(x.qty||0)+'</td><td>'+money(x.lineAmount)+'</td></tr>'}).join(''):'';w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(d.invoiceNo||'Invoice')+'</title><style>body{font:14px Arial;padding:25px;color:#172019}h1{color:#075b34}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h1>Native Elaneeru</h1><b>'+esc(d.documentType||'Commercial Invoice / Receipt')+'</b><p>'+esc(d.invoiceNo||'')+' · '+esc(d.invoiceDate||'')+'<br>Order '+esc(d.orderId||id)+'</p><p>'+esc(d.partyName||'')+' · '+esc(d.mobile||mobile)+'<br>'+esc(d.address||'')+'</p><table><tr><th>Product</th><th>HSN</th><th>Qty</th><th>Amount</th></tr>'+items+'</table><h3>Total '+money(d.total)+'</h3><p>FSSAI: '+esc(d.legal&&d.legal.fssaiNo||'Application Pending')+'<br>GST: '+esc(d.legal&&d.legal.gstin||'Not Registered')+'<br>Customer care: '+esc(d.legal&&d.legal.supportPhone||'7411807675')+'</p><button onclick="print()">Print / Save PDF</button></body></html>');w.document.close()}).catch(function(e){toast99(e.message||String(e))})};

    function boot99(){
      var p=profile();hydrate99(p);
      loading99();
      loadCatalogue99().catch(function(){});
      if(p.mobile)window.loadCustomer(false).catch(function(){});
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot99,{once:true});else boot99();
  })();</script>`;
}

function doGetV99_(e){
  var out=doGetV97_(e);
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && ['','home','b2c'].includes(p)) out.append(b2cCoreRuntimeV99_());
  return out;
}

doGet=doGetV99_;
