(function(){
  var base=window.add;if(typeof base!=='function')return;
  var card=window.productCard;if(typeof card==='function')window.productCard=function(p){var html=card.apply(this,arguments);if(p&&p.stockTracked&&p.stockStatus==='OOS')return html.replace('<div class="qty">','<div class="rules" style="color:#b42318;font-weight:900">OUT OF STOCK</div><div class="qty">').replace('<button class="add"','<button class="add" disabled');return html;};
  window.add=function(id){var p=((typeof DATA!=='undefined'&&DATA&&DATA.products)||[]).find(function(x){return x.productId===id;}),input=document.getElementById('qty_'+id),qty=Math.floor(Number(input&&input.value||0));if(p&&p.stockTracked&&p.stockStatus==='OOS')return window.toast('Out of stock');if(p&&p.stockTracked&&qty>Number(p.availableQty||0))return window.toast('Only '+Number(p.availableQty||0)+' available');return base.apply(this,arguments);};
})();

(function(){
  var logo=document.querySelector('.brand .logo');
  var slogan=document.querySelector('.brand small');
  if(logo){logo.src='../icons/native-elaneeru.svg';logo.alt='Native Elaneeru logo'}
  if(slogan)slogan.textContent='Grow Farmers • Empower Vendors • Serve Everyone';
})();

/* V10.0.2 fast boot.
 * - Home never intentionally waits for the heavy order/target payload.
 * - Restored sessions paint cached Home immediately and refresh through the
 *   lightweight endpoint.
 * - Orders/Schemes fetch the full payload only when the vendor opens them.
 */
(function(){
  var btn=document.getElementById('loginBtn');
  if(!btn||typeof rpc!=='function'||typeof render!=='function')return;

  var originalRefresh=(typeof refresh==='function')?refresh:null;
  var originalShowView=(typeof showView==='function')?showView:null;
  var originalLogout=(typeof logout==='function')?logout:null;
  var fullLoading=null,fastLoading=null;

  function hasFullData(){return typeof DATA!=='undefined'&&DATA&&DATA.fast!==true&&Array.isArray(DATA.orders)}
  window.NEL_B2B_FULL_LOADED=hasFullData();

  function homeKey(mobile){return 'nel_b2b_home_v1002_'+String(mobile||'').replace(/\D/g,'').slice(-10)}
  function savedMobile(){try{return sessionStorage.getItem('nel_b2b_mobile')||''}catch(e){return ''}}
  function safeReadHome(mobile){try{var raw=sessionStorage.getItem(homeKey(mobile));return raw?JSON.parse(raw):null}catch(e){return null}}
  function safeWriteHome(mobile,data){
    try{
      sessionStorage.setItem(homeKey(mobile),JSON.stringify(data));
      /* The inline boot path already knows how to paint this cache before any
       * network request, so keep the same fast payload there too. */
      sessionStorage.setItem('nel_b2b_data_cache',JSON.stringify(data));
    }catch(e){}
  }
  function clearHomeSession(){try{sessionStorage.removeItem('nel_b2b_data_cache')}catch(e){}}

  function paintLoading(){
    var b=document.getElementById('bannerWrap'),m=document.getElementById('marketWrap'),h=document.getElementById('hero'),p=document.getElementById('products');
    if(b)b.innerHTML='<div class="card"><div class="skeleton" style="height:118px"></div></div>';
    if(m)m.innerHTML='<div class="card"><div class="skeleton"></div><div class="skeleton" style="margin-top:9px;width:72%"></div></div>';
    if(h)h.innerHTML='<div class="skeleton" style="height:24px;width:66%"></div><div class="skeleton" style="margin-top:9px;width:44%"></div>';
    if(p)p.innerHTML='<div class="card"><div class="skeleton" style="height:110px"></div><div class="skeleton" style="margin-top:10px"></div></div>';
  }

  function paintFast(data,mobile){
    if(!data)return;
    var old=(typeof DATA!=='undefined'&&DATA)||null;
    if(window.NEL_B2B_FULL_LOADED&&old){
      data.orders=old.orders||[];
      data.target=old.target||null;
    }
    DATA=data;
    render();
    safeWriteHome(mobile||savedMobile(),data);
  }

  function loadFast(showToast){
    if(typeof TOKEN==='undefined'||!TOKEN)return Promise.resolve(null);
    if(fastLoading)return fastLoading;
    var mobile=savedMobile();
    fastLoading=rpc('getB2BHomeFastV1000',[TOKEN]).then(function(fast){
      paintFast(fast,mobile);
      if(showToast&&typeof toast==='function')toast('Updated');
      return fast;
    }).catch(function(err){
      var msg=String(err&&err.message||err||'');
      if(/expired|invalid token|login/i.test(msg)&&originalLogout){originalLogout();return null}
      if(!DATA&&typeof toast==='function')toast(msg||'Unable to refresh');
      throw err;
    }).finally(function(){fastLoading=null});
    return fastLoading;
  }

  function loadFull(showToast,force){
    if(hasFullData()&&!force){window.NEL_B2B_FULL_LOADED=true;return Promise.resolve(DATA)}
    if(window.NEL_B2B_FULL_LOADED&&!force)return Promise.resolve(DATA);
    if(!originalRefresh)return Promise.resolve(DATA);
    if(fullLoading)return fullLoading;
    fullLoading=(async function(){
      try{
        await originalRefresh(!!showToast);
        window.NEL_B2B_FULL_LOADED=true;
        return DATA;
      }finally{fullLoading=null}
    })();
    return fullLoading;
  }

  btn.onclick=async function(){
    var m=document.getElementById('mobile').value.trim(),p=document.getElementById('pin').value.trim();
    btn.disabled=true;btn.textContent='Signing in…';document.getElementById('msg').textContent='Connecting securely…';
    clearHomeSession();
    try{
      var r=await rpc('vendorLogin',[m,p]);
      TOKEN=r.token;
      sessionStorage.setItem('nel_b2b_token',TOKEN);
      sessionStorage.setItem('nel_b2b_mobile',m);
      showAppShell();
      window.NEL_B2B_FULL_LOADED=false;

      var cached=safeReadHome(m);
      if(cached){DATA=cached;render();}
      else paintLoading();

      try{
        var fast=await rpc('getB2BHomeFastV1000',[TOKEN]);
        paintFast(fast,m);
        document.getElementById('msg').textContent='';
      }catch(fastErr){
        /* Safe launch fallback if the lightweight endpoint is temporarily not
         * available. */
        await loadFull(false,true);
      }
      if(typeof loadLegal==='function')loadLegal();
    }catch(e){
      document.getElementById('msg').textContent=e.message;
      if(typeof toast==='function')toast(e.message);
    }finally{
      btn.disabled=false;btn.textContent='Login';
    }
  };

  /* Replace normal Home refresh with the lightweight request. Manual refresh
   * inside Orders/Schemes intentionally refreshes the detailed payload. */
  refresh=async function(showToast){
    var o=document.getElementById('ordersView'),s=document.getElementById('schemesView');
    var heavy=(o&&!o.classList.contains('hidden'))||(s&&!s.classList.contains('hidden'));
    return heavy?loadFull(!!showToast,true):loadFast(!!showToast);
  };

  if(originalShowView){
    showView=function(v){
      originalShowView(v);
      if(v==='orders'||v==='schemes'){
        if(!hasFullData()&&!window.NEL_B2B_FULL_LOADED){
          if(v==='orders'){
            var o=document.getElementById('orders');if(o)o.innerHTML='<div class="muted">Loading your latest orders…</div>';
          }else{
            var s=document.getElementById('schemes');if(s)s.innerHTML='<div class="card"><div class="muted">Loading your latest scheme progress…</div></div>';
          }
          loadFull(false,false).catch(function(e){if(typeof toast==='function')toast(e.message)});
        }else window.NEL_B2B_FULL_LOADED=true;
      }
    };
  }

  if(originalLogout){
    logout=function(){
      window.NEL_B2B_FULL_LOADED=false;fullLoading=null;fastLoading=null;
      try{sessionStorage.removeItem('nel_b2b_mobile')}catch(e){}
      return originalLogout.apply(this,arguments);
    };
  }

  /* Critical fix for installed/restored sessions: the inline page may already
   * have started the legacy background refresh. Do not wait for it. Paint our
   * keyed cache now and race it with the lightweight Home endpoint. */
  if(typeof TOKEN!=='undefined'&&TOKEN){
    var m=savedMobile(),cached=safeReadHome(m);
    if(cached){DATA=cached;render();}
    loadFast(false).catch(function(){});

    /* If the legacy restore request finishes later, recognise that full data so
     * Orders/Schemes do not trigger another duplicate heavy request. */
    var checks=0,watch=setInterval(function(){
      checks++;
      if(hasFullData()){window.NEL_B2B_FULL_LOADED=true;clearInterval(watch)}
      else if(checks>=20)clearInterval(watch);
    },250);
  }

  window.NEL_B2B_FAST={home:loadFast,details:loadFull,version:'10.0.2'};
})();
