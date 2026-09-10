(function(){
  if(window.NEL_UI_V110)return;window.NEL_UI_V110=true;

  var activeBannerProductId='';
  var dashboardCache=null;
  var baseRenderProducts=null;
  var baseLoadCustomer=null;

  var COPY={
    en:{targets:'Your reward targets',weekly:'Weekly target',monthly:'Monthly target',reward:'reward',delivered:'delivered',left:'left',done:'Completed',note:'Only delivered orders count towards rewards.',reorder:'Based on your order history',most:'Most ordered',orders:'orders',loading:'Loading your reorder…',none:'No previous orders yet.',offer:'Banner offer',showAll:'Show all products'},
    kn:{targets:'ನಿಮ್ಮ ಬಹುಮಾನ ಗುರಿಗಳು',weekly:'ವಾರದ ಗುರಿ',monthly:'ತಿಂಗಳ ಗುರಿ',reward:'ಬಹುಮಾನ',delivered:'ವಿತರಿಸಲಾಗಿದೆ',left:'ಬಾಕಿ',done:'ಪೂರ್ಣಗೊಂಡಿದೆ',note:'ವಿತರಿಸಲಾದ ಆರ್ಡರ್‌ಗಳು ಮಾತ್ರ ಬಹುಮಾನ ಗುರಿಗೆ ಸೇರುತ್ತವೆ.',reorder:'ನಿಮ್ಮ ಆರ್ಡರ್ ಇತಿಹಾಸದ ಆಧಾರದಲ್ಲಿ',most:'ಹೆಚ್ಚಾಗಿ ಆರ್ಡರ್ ಮಾಡಿದ',orders:'ಆರ್ಡರ್‌ಗಳು',loading:'ಮರುಆರ್ಡರ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',none:'ಹಿಂದಿನ ಆರ್ಡರ್‌ಗಳಿಲ್ಲ.',offer:'ಬ್ಯಾನರ್ ಆಫರ್',showAll:'ಎಲ್ಲ ಉತ್ಪನ್ನಗಳನ್ನು ತೋರಿಸಿ'},
    te:{targets:'మీ రివార్డ్ లక్ష్యాలు',weekly:'వారపు లక్ష్యం',monthly:'నెలవారీ లక్ష్యం',reward:'రివార్డ్',delivered:'డెలివర్ అయ్యాయి',left:'మిగిలినవి',done:'పూర్తైంది',note:'డెలివర్ అయిన ఆర్డర్లు మాత్రమే రివార్డ్ లక్ష్యానికి లెక్కించబడతాయి.',reorder:'మీ ఆర్డర్ చరిత్ర ఆధారంగా',most:'ఎక్కువగా ఆర్డర్ చేసినవి',orders:'ఆర్డర్లు',loading:'రీఆర్డర్ లోడ్ అవుతోంది…',none:'మునుపటి ఆర్డర్లు లేవు.',offer:'బ్యానర్ ఆఫర్',showAll:'అన్ని ఉత్పత్తులు చూపండి'},
    hi:{targets:'आपके रिवॉर्ड लक्ष्य',weekly:'साप्ताहिक लक्ष्य',monthly:'मासिक लक्ष्य',reward:'रिवॉर्ड',delivered:'डिलीवर',left:'बाकी',done:'पूरा हुआ',note:'रिवॉर्ड लक्ष्य में केवल डिलीवर किए गए ऑर्डर गिने जाते हैं।',reorder:'आपके ऑर्डर इतिहास के आधार पर',most:'सबसे अधिक ऑर्डर किया',orders:'ऑर्डर',loading:'रीऑर्डर लोड हो रहा है…',none:'कोई पिछला ऑर्डर नहीं है।',offer:'बैनर ऑफर',showAll:'सभी प्रोडक्ट दिखाएं'}
  };

  function lang(){var x='en';try{x=localStorage.getItem('nel_b2c_language')||'en'}catch(e){}return COPY[x]?x:'en'}
  function t(){return COPY[lang()]}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function sessionMobile(){try{return digits(localStorage.getItem('nel_b2c_session_mobile')||'')}catch(e){return ''}}
  function cachedDashboard(){var m=sessionMobile();if(!m)return null;try{var x=JSON.parse(localStorage.getItem('nel_b2c_dashboard_v115_'+m)||'null');return x&&x.dashboard?x.dashboard:null}catch(e){return null}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]})}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function rpcSafe(method,args){var fn=window.NEL_RPC||window.rpc;return typeof fn==='function'?fn(method,args||[]):Promise.reject(new Error('Connection unavailable.'))}
  function products(){try{return S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function banners(){try{return S&&S.cfg&&Array.isArray(S.cfg.banners)?S.cfg.banners:[]}catch(e){return []}}
  function productById(id){id=String(id||'').toUpperCase();return products().find(function(p){return String(p.productId||'').toUpperCase()===id})||null}

  function ensureStyle(){
    if(document.getElementById('nel110style'))return;
    var s=document.createElement('style');s.id='nel110style';
    s.textContent='\
      .visual img,.favVisual img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;padding:9px!important;background:#fff!important;box-sizing:border-box!important}\
      .visual,.favVisual{background:#f5faf6!important}\
      .nel110-target{margin:14px;border-radius:20px;padding:15px;background:linear-gradient(135deg,#063d26,#0b8050);color:#fff;box-shadow:0 10px 30px #063d2622}\
      .nel110-target-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.nel110-target-head b{font-size:18px}.nel110-target-head span{font-size:22px}\
      .nel110-target-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nel110-target-item{background:#ffffff16;border:1px solid #ffffff24;border-radius:14px;padding:11px}\
      .nel110-target-item strong{display:block;font-size:22px;margin:3px 0}.nel110-target-item small{color:#d5ebde}.nel110-progress{height:7px;background:#ffffff25;border-radius:99px;overflow:hidden;margin:8px 0 5px}.nel110-progress i{display:block;height:100%;background:#ffd54a;border-radius:99px}\
      .nel110-target-note{font-size:9px;color:#d3e9db;margin-top:9px}.nel110-reorder-note{font-size:9px;color:#66736b;padding:0 14px 7px;margin-top:-4px}\
      .nel110-focus{margin:0 14px 10px;padding:10px 12px;border-radius:13px;background:#fff5cf;border:1px solid #f4d866;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px}.nel110-focus b{color:#075b34}.nel110-focus button{border:0;background:#075b34;color:#fff;border-radius:9px;padding:7px 9px;font-weight:900}\
      @media(max-width:430px){.nel110-target-grid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function pct(a,b){a=Number(a||0);b=Number(b||0);return b>0?Math.max(0,Math.min(100,Math.round(a*100/b))):0}
  function defaultDashboard(){
    var cfg;try{cfg=S&&S.cfg}catch(e){cfg=null}
    if(!cfg)return null;
    return {
      weekly:{achieved:0,target:Number(cfg.weeklyTargetQty||0),reward:Number(cfg.weeklyReward||0),status:'In Progress'},
      monthly:{achieved:0,target:Number(cfg.monthlyTargetQty||0),reward:Number(cfg.monthlyReward||0),status:'In Progress'},
      orders:[]
    };
  }
  function targetItem(label,x){
    x=x||{};var c=t(),a=Number(x.achieved||0),goal=Number(x.target||0),left=Math.max(0,goal-a),complete=goal>0&&a>=goal;
    return '<div class="nel110-target-item"><small>'+esc(label)+'</small><strong>'+a+' / '+goal+'</strong><div class="nel110-progress"><i style="width:'+pct(a,goal)+'%"></i></div><small>'+(complete?esc(c.done):(a+' '+esc(c.delivered)+' · '+left+' '+esc(c.left)))+' · '+money(x.reward||0)+' '+esc(c.reward)+'</small></div>';
  }
  function renderTargets(d){
    d=d||defaultDashboard();if(!d)return;dashboardCache=d;ensureStyle();var home=document.getElementById('homePage');if(!home)return;
    var card=document.getElementById('nel110Target');if(!card){card=document.createElement('div');card.id='nel110Target';card.className='nel110-target';var rail=home.querySelector('.dealRail');if(rail)rail.insertAdjacentElement('afterend',card);else home.insertBefore(card,home.firstChild)}
    var c=t();card.innerHTML='<div class="nel110-target-head"><div><small>'+esc(c.targets)+'</small><br><b>🎯 '+esc((d.weekly&&d.weekly.title)||c.weekly)+'</b></div><span>🎁</span></div><div class="nel110-target-grid">'+targetItem(c.weekly,d.weekly)+targetItem(c.monthly,d.monthly)+'</div><div class="nel110-target-note">'+esc(c.note)+'</div>';
    var cashback=document.querySelector('.dealRail .d2');if(cashback&&!cashback.dataset.nel110){cashback.dataset.nel110='1';cashback.style.cursor='pointer';cashback.addEventListener('click',function(){var x=document.getElementById('nel110Target');if(x)x.scrollIntoView({behavior:'smooth',block:'center'})})}
  }

  function validOrder(o){var st=String(o&&o.status||'').toUpperCase();return !/(CANCEL|FAIL|REJECT|UNABLE|RETURN)/.test(st)}
  function orderTs(o,index){var raw=(o&&(o.orderedAt||o.createdAt||o.date))||'';var n=Date.parse(raw);return isNaN(n)?(1000000-index):n}
  function renderReorder(d){
    var host=document.getElementById('favProducts');if(!host)return;ensureStyle();var c=t();
    var note=document.getElementById('nel110ReorderNote');if(!note){note=document.createElement('div');note.id='nel110ReorderNote';note.className='nel110-reorder-note';host.parentNode.insertBefore(note,host)}note.textContent=c.reorder;
    if(!d){host.innerHTML='<div class="empty">'+esc(c.loading)+'</div>';return}
    dashboardCache=d;var ps=products();if(!ps.length){host.innerHTML='<div class="empty">'+esc(c.loading)+'</div>';return}
    var stats={};(d.orders||[]).forEach(function(o,ix){if(!validOrder(o))return;var ts=orderTs(o,ix);(o.items||[]).forEach(function(it){var pid=String(it.productId||'').toUpperCase(),name=String(it.name||it.productName||'').trim().toLowerCase();var key=pid||name;if(!key)return;if(!stats[key])stats[key]={qty:0,count:0,last:0,name:name,pid:pid};stats[key].qty+=Number(it.qty||it.quantity||0);stats[key].count+=1;stats[key].last=Math.max(stats[key].last,ts)})});
    var ranked=ps.map(function(p){var pid=String(p.productId||'').toUpperCase(),name=String(p.productName||'').trim().toLowerCase(),x=stats[pid]||stats[name];return x?{p:p,qty:x.qty,count:x.count,last:x.last}:null}).filter(Boolean).sort(function(a,b){return b.qty-a.qty||b.last-a.last||b.count-a.count}).slice(0,6);
    if(!ranked.length){host.innerHTML='<div class="empty">'+esc(c.none)+'</div>';return}
    host.innerHTML=ranked.map(function(x){var p=x.p,id=String(p.productId||'').replace(/'/g,"\\'"),im=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName)+'" onerror="this.remove();this.parentNode.textContent=\'🥥\'">':'🥥';return '<div class="fav"><div class="favVisual">'+im+'</div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="meta">'+esc(c.most)+' · '+x.qty+' pcs · '+x.count+' '+esc(c.orders)+'</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div></div>'}).join('');
  }

  function renderOneProduct(p){
    if(!p)return '<div class="empty">Product is not available.</div>';
    try{if(typeof pcard==='function')return pcard(p)}catch(e){}
    var id=String(p.productId||'').replace(/'/g,"\\'"),im=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName)+'">':'🥥';
    return '<div class="product"><div class="visual">'+im+'</div><div class="pname">'+esc(p.productName)+'</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div>';
  }
  function applyProductFocus(){
    if(!activeBannerProductId)return;var p=productById(activeBannerProductId),host=document.getElementById('products');if(!host)return;
    host.innerHTML=renderOneProduct(p);
    var shop=document.getElementById('shopPage'),chip=document.getElementById('nel110Focus');if(!chip&&shop){chip=document.createElement('div');chip.id='nel110Focus';chip.className='nel110-focus';var section=shop.querySelector('.section');if(section)section.insertAdjacentElement('afterend',chip);else shop.insertBefore(chip,host)}
    if(chip){var c=t();chip.innerHTML='<div><small>'+esc(c.offer)+'</small><br><b>'+esc(p?p.productName:activeBannerProductId)+'</b></div><button type="button" id="nel110ShowAll">'+esc(c.showAll)+'</button>';var b=document.getElementById('nel110ShowAll');if(b)b.onclick=function(){clearProductFocus(true)}}
  }
  function clearProductFocus(rerender){activeBannerProductId='';var chip=document.getElementById('nel110Focus');if(chip)chip.remove();if(rerender&&baseRenderProducts){baseRenderProducts();renderReorder(dashboardCache)}}
  function focusBannerProduct(id){id=String(id||'').toUpperCase();if(!id)return;activeBannerProductId=id;try{if(typeof go==='function')go('shop')}catch(e){}setTimeout(applyProductFocus,0)}
  window.NEL_FOCUS_BANNER_PRODUCT=focusBannerProduct;

  function patchRenderProducts(){
    var fn=window.renderProducts;try{if(typeof fn!=='function'&&typeof renderProducts==='function')fn=renderProducts}catch(e){}
    if(typeof fn!=='function'||fn.__nel110)return;baseRenderProducts=fn;
    var wrapped=function(){var r=baseRenderProducts.apply(this,arguments);renderReorder(dashboardCache);applyProductFocus();return r};wrapped.__nel110=true;window.renderProducts=wrapped;try{renderProducts=wrapped}catch(e){}
    renderReorder(dashboardCache);applyProductFocus();
  }
  function patchLoadCustomer(){
    var fn=window.loadCustomer;try{if(typeof fn!=='function'&&typeof loadCustomer==='function')fn=loadCustomer}catch(e){}
    if(typeof fn!=='function'||fn.__nel110)return;baseLoadCustomer=fn;
    var wrapped=function(){return baseLoadCustomer.apply(this,arguments)};wrapped.__nel110=true;window.loadCustomer=wrapped;try{loadCustomer=wrapped}catch(e){}
  }

  function refreshDashboard(){var m=sessionMobile();if(!/^[6-9]\d{9}$/.test(m))return Promise.resolve(null);return rpcSafe('getCustomerDashboard',[m]).then(function(d){renderTargets(d);renderReorder(d);return d}).catch(function(){return null})}

  function wireClicks(){
    window.addEventListener('nel:dashboard',function(e){var d=e&&e.detail&&e.detail.dashboard;if(d){renderTargets(d);renderReorder(d)}});
    window.addEventListener('nel:catalog',function(){renderTargets(dashboardCache||defaultDashboard())});
    document.addEventListener('click',function(e){
      var card=e.target&&e.target.closest?e.target.closest('.nel109-banner'):null;
      if(card){var list=Array.prototype.slice.call(document.querySelectorAll('#nel109Banners .nel109-banner')),ix=list.indexOf(card),bs=banners(),b=ix>=0?bs[ix]:null;if(b&&String(b.redirectType||'').toUpperCase()==='PRODUCT'){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();focusBannerProduct(b.productId||b.redirectValue);return}}
      var nav=e.target&&e.target.closest?e.target.closest('.nav button,.tabs .tab,.filters .filter'):null;if(nav&&activeBannerProductId){clearProductFocus(false);setTimeout(function(){if(baseRenderProducts)window.renderProducts()},0)}
    },true);
    var search=document.getElementById('searchInput');if(search)search.addEventListener('input',function(){if(activeBannerProductId)clearProductFocus(false)},true);
    document.addEventListener('change',function(e){if(e.target&&e.target.id==='nelPwaLang'){setTimeout(function(){renderTargets(dashboardCache);renderReorder(dashboardCache);applyProductFocus()},20)}},true);
  }

  function install(){
    if(location.pathname.indexOf('/login/')>=0)return;ensureStyle();patchRenderProducts();patchLoadCustomer();wireClicks();var cached=cachedDashboard();renderReorder(cached);renderTargets(cached||defaultDashboard());
    window.addEventListener('load',function(){patchRenderProducts();patchLoadCustomer()},true);
    [500,1200,2500].forEach(function(ms){setTimeout(function(){patchRenderProducts();patchLoadCustomer();if(dashboardCache){renderTargets(dashboardCache);renderReorder(dashboardCache);applyProductFocus()}},ms)});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
