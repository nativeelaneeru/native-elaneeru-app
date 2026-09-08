(function(){
  if(window.NEL_RPC_106) return;
  window.NEL_RPC_106=true;

  var frame=null,ready=false,queue=[],pending={},seq=0;
  function api(){return String((window.NEL_CONFIG&&window.NEL_CONFIG.apiUrl)||'').trim()}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function ensureCss(){
    if(document.getElementById('nel106Css')) return;
    var s=document.createElement('style');s.id='nel106Css';s.textContent='.nel-live-banners{display:grid;grid-auto-flow:column;grid-auto-columns:min(88%,620px);gap:10px;overflow:auto;scroll-snap-type:x mandatory;padding:10px 14px 2px;scrollbar-width:none}.nel-live-banners::-webkit-scrollbar{display:none}.nel-live-banner{scroll-snap-align:start;min-height:120px;border-radius:20px;padding:18px;color:#fff;background:linear-gradient(135deg,#075b34,#0b8f50);position:relative;overflow:hidden;cursor:pointer;box-shadow:0 8px 24px #073d2422}.nel-live-banner:nth-child(2n){background:linear-gradient(135deg,#f8c943,#ffdf73);color:#20311f}.nel-live-banner b{display:block;font-size:22px;line-height:1.05;max-width:68%}.nel-live-banner small{display:block;margin-top:7px;font-weight:800;max-width:68%}.nel-live-banner em{display:inline-block;margin-top:10px;font-style:normal;font-weight:950;font-size:11px;padding:6px 9px;border-radius:9px;background:#ffffff26}.nel-live-banner img{position:absolute;right:8px;bottom:0;width:34%;height:100%;object-fit:contain}.nel-bridge-error{margin:10px 14px;padding:10px;border-radius:12px;background:#fff3f1;color:#9e3429;border:1px solid #efc9c4;font-size:11px}';document.head.appendChild(s)
  }
  function ensureFrame(){
    if(frame) return;
    var u=api();
    if(!u) return;
    frame=document.createElement('iframe');
    frame.id='nelPwaRpcFrame';frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-10px;top:-10px';
    frame.src=u+(u.indexOf('?')>=0?'&':'?')+'pwaBridge=1&v=106';
    (document.body||document.documentElement).appendChild(frame);
  }
  function send(task){
    if(!frame||!frame.contentWindow) return;
    pending[task.id]=task;
    task.timer=setTimeout(function(){
      if(!pending[task.id]) return;
      delete pending[task.id];
      task.reject(new Error('Connection timed out. Please retry.'));
    },18000);
    frame.contentWindow.postMessage({nelPwaRpc:true,requestId:task.id,method:task.method,args:task.args},'*');
  }
  function flush(){if(!ready)return;var q=queue.slice();queue=[];q.forEach(send)}

  function renderLiveBanners(data){
    ensureCss();
    var banners=data&&Array.isArray(data.banners)?data.banners:[];
    var home=document.getElementById('homePage');if(!home)return;
    var old=document.getElementById('nelLiveBanners');if(old)old.remove();
    if(!banners.length)return;
    var rail=document.createElement('div');rail.id='nelLiveBanners';rail.className='nel-live-banners';
    banners.forEach(function(b){var card=document.createElement('div');card.className='nel-live-banner';card.innerHTML='<b>'+esc(b.title||b.offerText||'Native Elaneeru')+'</b><small>'+esc(b.subtitle||'')+'</small>'+(b.offerText?'<em>'+esc(b.offerText)+'</em>':'')+(b.imageUrl?'<img src="'+esc(b.imageUrl)+'" alt="">':'');card.onclick=function(){try{if(typeof go==='function')go(b.redirectType&&String(b.redirectType).toUpperCase()==='OFFER'?'offers':'shop')}catch(e){}};rail.appendChild(card)});
    var promo=home.querySelector('.promo');home.insertBefore(rail,promo||home.firstChild);
  }
  function renderReorder(data){
    var host=document.getElementById('favProducts');if(!host)return;
    var products=[];try{products=(typeof S!=='undefined'&&S.cfg&&Array.isArray(S.cfg.products))?S.cfg.products:[]}catch(e){}
    if(!products.length)return;
    var orders=data&&Array.isArray(data.orders)?data.orders:[],stats={};
    orders.forEach(function(o,orderIndex){if(['Cancelled','Failed','Rejected'].indexOf(String(o.status||''))>=0)return;(o.items||[]).forEach(function(i){var k=String(i.name||'').trim().toLowerCase();if(!k)return;if(!stats[k])stats[k]={qty:0,recent:orderIndex};stats[k].qty+=Number(i.qty||0);stats[k].recent=Math.min(stats[k].recent,orderIndex)})});
    var ranked=products.map(function(p){var st=stats[String(p.productName||'').trim().toLowerCase()];return st?{p:p,qty:st.qty,recent:st.recent}:null}).filter(Boolean).sort(function(a,b){return b.qty-a.qty||a.recent-b.recent}).slice(0,6);
    if(!ranked.length){host.innerHTML='<div class="empty">No previous orders yet.</div>';return}
    host.innerHTML=ranked.map(function(x){var p=x.p,img=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName)+'">':'🥥';return '<div class="fav"><div class="favVisual">'+img+'</div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="meta">Most ordered · '+x.qty+' pcs</div><div class="price">₹'+Number(p.price||0).toLocaleString('en-IN')+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+String(p.productId||'').replace(/'/g,"\\'")+'\')">ADD</button></div></div>'}).join('');
  }
  function hydrateProfile(r){if(!r||!r.exists||!r.profile)return;try{localStorage.setItem('nel_profile_v9',JSON.stringify(r.profile));localStorage.setItem('nel_b2c_profile',JSON.stringify(r.profile))}catch(e){}['mobile','name','area','pincode','address'].forEach(function(k){var el=document.getElementById(k);if(el)el.value=r.profile[k]||''});try{if(typeof S!=='undefined'){S.lat=r.profile.latitude||'';S.lng=r.profile.longitude||''}}catch(e){}}
  function postProcess(method,result,args){if(method==='getB2CAppDataV9')renderLiveBanners(result);if(method==='getCustomerDashboard')renderReorder(result);if(method==='customerLoginV95')hydrateProfile(result)}

  window.addEventListener('message',function(ev){
    if(!frame||ev.source!==frame.contentWindow)return;
    var d=ev.data||{};if(d.nelPwaRpcResult!==true||!d.payload)return;
    var p=d.payload,id=String(p.requestId||'');
    if(id==='__ready__'){ready=true;flush();return}
    var h=pending[id];if(!h)return;delete pending[id];clearTimeout(h.timer);
    if(p.ok){h.resolve(p.result);setTimeout(function(){postProcess(h.method,p.result,h.args)},0)}else h.reject(new Error(p.error||'Request failed.'));
  });

  function bridgeRpc(method,args){
    args=Array.isArray(args)?args:[];
    return new Promise(function(resolve,reject){
      if(!api())return reject(new Error('App API is not configured.'));
      var id='pwa-'+Date.now()+'-'+(++seq)+'-'+Math.random().toString(36).slice(2,6),task={id:id,method:String(method||''),args:args,resolve:resolve,reject:reject,timer:null};
      ensureFrame();if(ready)send(task);else queue.push(task);
    });
  }
  window.rpc=bridgeRpc;window.NEL_RPC=bridgeRpc;try{rpc=bridgeRpc}catch(e){}
  function hydrateSaved(){var m='';try{m=String(localStorage.getItem('nel_b2c_session_mobile')||'').replace(/\D/g,'').slice(-10)}catch(e){}if(!/^[6-9]\d{9}$/.test(m))return;bridgeRpc('customerLoginV95',[m]).then(function(r){hydrateProfile(r);if(r&&r.exists&&typeof window.loadCustomer==='function')return window.loadCustomer(false)}).catch(function(){})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){ensureFrame()},{once:true});else ensureFrame();
  window.addEventListener('load',function(){setTimeout(hydrateSaved,100)},{once:true});
})();
