(function(){
  if(window.NEL_RPC_V109)return;window.NEL_RPC_V109=true;
  // Prevent the retired iframe bootstrap in config.js from starting.
  window.NEL_V107_BOOTSTRAP=true;
  var FALLBACK_API='https://script.google.com/macros/s/AKfycby4tO2Y1xWbVv1XqzbIYjuTKOt4XRWPzB9MseMC1x-qc8gbNYPvqvG1z6PuCPGZi5O2/exec';
  var seq=0;
  function api(){return String((window.NEL_CONFIG&&window.NEL_CONFIG.apiUrl)||FALLBACK_API)}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function jsonpRpc(method,args){
    args=Array.isArray(args)?args:[];
    return new Promise(function(resolve,reject){
      var id='v109-'+Date.now()+'-'+(++seq),cb='__nelJsonp'+Date.now()+seq+Math.floor(Math.random()*10000),script=document.createElement('script');
      var done=false,timer;
      function cleanup(){if(done)return;done=true;clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}try{script.remove()}catch(e){}}
      window[cb]=function(payload){cleanup();payload=payload||{};if(payload.ok){try{afterRpc(method,payload.result)}catch(e){}resolve(payload.result)}else reject(new Error(payload.error||'Request failed.'))};
      script.async=true;
      script.onerror=function(){cleanup();reject(new Error('Unable to connect. Please check internet and retry.'))};
      var req={method:String(method||''),args:args,requestId:id};
      script.src=api()+'?jsonp=1&callback='+encodeURIComponent(cb)+'&payload='+encodeURIComponent(JSON.stringify(req))+'&v=1090&_='+Date.now();
      timer=setTimeout(function(){cleanup();reject(new Error('Connection timed out. Please retry.'))},15000);
      document.head.appendChild(script);
    });
  }
  function sessionMobile(){try{return digits(localStorage.getItem('nel_b2c_session_mobile')||'')}catch(e){return ''}}
  function saveProfile(p){if(!p)return;var m=sessionMobile()||digits(p.mobile);p.mobile=m;try{localStorage.setItem('nel_profile_v9',JSON.stringify(p));localStorage.setItem('nel_b2c_profile',JSON.stringify(p))}catch(e){};['mobile','name','area','pincode','address'].forEach(function(k){var x=document.getElementById(k);if(x)x.value=p[k]||''});try{if(typeof S!=='undefined'){S.lat=p.latitude||'';S.lng=p.longitude||''}}catch(e){}}
  function renderBanners(data){
    var banners=data&&Array.isArray(data.banners)?data.banners:[],home=document.getElementById('homePage');if(!home)return;
    var old=document.getElementById('nel109Banners');if(old)old.remove();if(!banners.length)return;
    if(!document.getElementById('nel109css')){var st=document.createElement('style');st.id='nel109css';st.textContent='.nel109-banners{display:grid;grid-auto-flow:column;grid-auto-columns:min(88%,620px);gap:10px;overflow:auto;padding:10px 14px 4px;scroll-snap-type:x mandatory;scrollbar-width:none}.nel109-banners::-webkit-scrollbar{display:none}.nel109-banner{scroll-snap-align:start;min-height:132px;border-radius:20px;padding:18px;background:linear-gradient(135deg,#075b34,#0b8f50);color:#fff;position:relative;overflow:hidden;cursor:pointer}.nel109-banner:nth-child(2n){background:linear-gradient(135deg,#ffd84d,#ffe99a);color:#17331f}.nel109-banner b{display:block;font-size:22px;line-height:1.05;max-width:72%}.nel109-banner small{display:block;margin-top:6px;font-weight:700;max-width:72%}.nel109-banner em{display:inline-block;margin-top:10px;font-style:normal;font-size:10px;font-weight:900;padding:6px 8px;border-radius:8px;background:#ffffff30}.nel109-banner img{position:absolute;right:4px;bottom:0;width:32%;height:100%;object-fit:contain}';document.head.appendChild(st)}
    var rail=document.createElement('div');rail.id='nel109Banners';rail.className='nel109-banners';
    banners.forEach(function(b){var c=document.createElement('div');c.className='nel109-banner';c.innerHTML='<b>'+esc(b.title||'Native Elaneeru')+'</b><small>'+esc(b.subtitle||'')+'</small>'+(b.offerText?'<em>'+esc(b.offerText)+'</em>':'')+(b.imageUrl?'<img src="'+esc(b.imageUrl)+'" alt="">':'');c.onclick=function(){if(typeof window.go==='function')window.go(String(b.redirectType||'').toUpperCase()==='PRODUCT'?'shop':'offers')};rail.appendChild(c)});
    var promo=home.querySelector('.promo');if(promo)promo.insertAdjacentElement('afterend',rail);else home.insertBefore(rail,home.firstChild);
  }
  function renderReorder(d){
    var host=document.getElementById('favProducts');if(!host)return;var products=[];try{products=(typeof S!=='undefined'&&S.cfg&&Array.isArray(S.cfg.products))?S.cfg.products:[]}catch(e){};if(!products.length)return;
    var stats={};((d&&d.orders)||[]).forEach(function(o,ix){if(['Cancelled','Failed','Rejected'].indexOf(String(o.status||''))>=0)return;(o.items||[]).forEach(function(it){var k=String(it.name||'').trim().toLowerCase();if(!k)return;if(!stats[k])stats[k]={qty:0,recent:ix};stats[k].qty+=Number(it.qty||0);stats[k].recent=Math.min(stats[k].recent,ix)})});
    var ranked=products.map(function(p){var x=stats[String(p.productName||'').trim().toLowerCase()];return x?{p:p,qty:x.qty,recent:x.recent}:null}).filter(Boolean).sort(function(a,b){return b.qty-a.qty||a.recent-b.recent}).slice(0,6);
    if(!ranked.length){host.innerHTML='<div class="empty">No previous orders yet.</div>';return}
    host.innerHTML=ranked.map(function(x){var p=x.p,id=String(p.productId||'').replace(/'/g,"\\'"),img=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="">':'🥥';return '<div class="fav"><div class="favVisual">'+img+'</div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="meta">Most ordered · '+x.qty+' pcs</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div></div>'}).join('');
  }
  function afterRpc(method,result){
    if(method==='getB2CAppDataV9')renderBanners(result);
    if(method==='getCustomerDashboard')renderReorder(result);
    if((method==='customerLoginV95'||method==='customerLoginWithPinV107')&&result&&result.profile)saveProfile(result.profile);
  }
  function activate(){window.rpc=jsonpRpc;window.NEL_RPC=jsonpRpc;try{rpc=jsonpRpc}catch(e){} }
  activate();
  window.addEventListener('load',function(){activate();var m=sessionMobile();if(/^[6-9]\d{9}$/.test(m)){jsonpRpc('customerLoginV95',[m]).then(function(r){if(r&&r.profile)saveProfile(r.profile)}).catch(function(){})}},true);
})();
