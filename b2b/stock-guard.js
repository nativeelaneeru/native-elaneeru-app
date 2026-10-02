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

/* V10 fast boot: authenticate first, paint Home from a lightweight endpoint,
 * and defer the heavy order/target payload until Orders or Schemes is opened. */
(function(){
  var btn=document.getElementById('loginBtn');
  if(!btn||typeof rpc!=='function'||typeof render!=='function')return;

  var originalRefresh=(typeof refresh==='function')?refresh:null;
  var originalShowView=(typeof showView==='function')?showView:null;
  var fullLoading=null;
  window.NEL_B2B_FULL_LOADED=false;

  function homeKey(mobile){return 'nel_b2b_home_v1000_'+String(mobile||'').replace(/\D/g,'').slice(-10)}
  function paintLoading(){
    var b=document.getElementById('bannerWrap'),m=document.getElementById('marketWrap'),h=document.getElementById('hero'),p=document.getElementById('products');
    if(b)b.innerHTML='<div class="card"><div class="skeleton" style="height:118px"></div></div>';
    if(m)m.innerHTML='<div class="card"><div class="skeleton"></div><div class="skeleton" style="margin-top:9px;width:72%"></div></div>';
    if(h)h.innerHTML='<div class="skeleton" style="height:24px;width:66%"></div><div class="skeleton" style="margin-top:9px;width:44%"></div>';
    if(p)p.innerHTML='<div class="card"><div class="skeleton" style="height:110px"></div><div class="skeleton" style="margin-top:10px"></div></div>';
  }
  function safeReadHome(mobile){
    try{var raw=sessionStorage.getItem(homeKey(mobile));return raw?JSON.parse(raw):null}catch(e){return null}
  }
  function safeWriteHome(mobile,data){
    try{sessionStorage.setItem(homeKey(mobile),JSON.stringify(data))}catch(e){}
  }
  function markFullIfPresent(){
    if(typeof DATA!=='undefined'&&DATA&&DATA.fast!==true&&Array.isArray(DATA.orders))window.NEL_B2B_FULL_LOADED=true;
  }

  async function loadFull(){
    markFullIfPresent();
    if(window.NEL_B2B_FULL_LOADED||!originalRefresh)return;
    if(fullLoading)return fullLoading;
    fullLoading=(async function(){
      try{await originalRefresh(false);window.NEL_B2B_FULL_LOADED=true;}
      finally{fullLoading=null}
    })();
    return fullLoading;
  }

  btn.onclick=async function(){
    var m=document.getElementById('mobile').value.trim(),p=document.getElementById('pin').value.trim();
    btn.disabled=true;btn.textContent='Signing in…';document.getElementById('msg').textContent='Connecting securely…';
    try{
      var r=await rpc('vendorLogin',[m,p]);
      TOKEN=r.token;
      sessionStorage.setItem('nel_b2b_token',TOKEN);
      sessionStorage.setItem('nel_b2b_mobile',m);
      showAppShell();

      var cached=safeReadHome(m);
      if(cached){DATA=cached;render();}
      else paintLoading();

      try{
        var fast=await rpc('getB2BHomeFastV1000',[TOKEN]);
        DATA=fast;
        window.NEL_B2B_FULL_LOADED=false;
        render();
        safeWriteHome(m,fast);
        document.getElementById('msg').textContent='';
      }catch(fastErr){
        /* Safe fallback while the new Apps Script deployment is propagating. */
        if(originalRefresh){await originalRefresh(false);window.NEL_B2B_FULL_LOADED=true;}
        else throw fastErr;
      }
      if(typeof loadLegal==='function')loadLegal();
    }catch(e){
      document.getElementById('msg').textContent=e.message;
      if(typeof toast==='function')toast(e.message);
    }finally{
      btn.disabled=false;btn.textContent='Login';
    }
  };

  if(originalRefresh){
    refresh=async function(showToast){
      var r=await originalRefresh(showToast);
      window.NEL_B2B_FULL_LOADED=true;
      return r;
    };
  }

  if(originalShowView){
    showView=function(v){
      originalShowView(v);
      if(v==='orders'||v==='schemes'){
        markFullIfPresent();
        if(!window.NEL_B2B_FULL_LOADED){
          if(v==='orders'){
            var o=document.getElementById('orders');if(o)o.innerHTML='<div class="muted">Loading your latest orders…</div>';
          }else{
            var s=document.getElementById('schemes');if(s)s.innerHTML='<div class="card"><div class="muted">Loading your latest scheme progress…</div></div>';
          }
          loadFull().catch(function(e){if(typeof toast==='function')toast(e.message)});
        }
      }
    };
  }
})();
