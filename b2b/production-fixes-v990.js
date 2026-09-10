(function(){
  if(window.NEL_B2B_PRODUCTION_FIXES_V990)return;
  window.NEL_B2B_PRODUCTION_FIXES_V990=true;
  var activeView='home',patched=false;

  function el(id){return document.getElementById(id)}
  function currentView(){
    var names=['home','orders','profile'];
    for(var i=0;i<names.length;i++){
      var v=el(names[i]+'View');if(v&&!v.classList.contains('hidden'))return names[i];
    }
    return activeView||'home';
  }
  function hasCart(){try{return typeof CART!=='undefined'&&CART&&Object.keys(CART).length>0}catch(e){return false}}
  function syncCartBar(){
    activeView=currentView();var bar=el('cartBar');if(!bar)return;
    var sheet=el('cartSheet'),open=sheet&&sheet.classList.contains('show');
    bar.classList.toggle('show',activeView==='home'&&hasCart()&&!open);
  }
  function removeRetailSwitch(){
    var a=el('nel113Retail')||document.querySelector('.topActions a[href="../b2c/"],.topActions a[href="../"]');
    if(a&&a.parentNode)a.parentNode.removeChild(a);
  }
  function loginHelp(){
    var login=el('login');if(!login||el('nelB2BLoginHelp'))return;
    var box=document.createElement('div');box.id='nelB2BLoginHelp';box.className='muted';box.style.cssText='margin-top:12px;padding:10px 11px;background:#edf4f7;border-radius:12px;line-height:1.5';
    box.innerHTML='<b style="color:#123a5a">Need B2B access?</b><br>Your registered mobile and initial PIN are activated after Native Elaneeru vendor onboarding is approved.<br><a href="tel:+917411807675" style="color:#123a5a;font-weight:900">Call Support</a> · <a href="https://wa.me/917411807675" target="_blank" style="color:#123a5a;font-weight:900">WhatsApp</a>';
    login.appendChild(box);
    var pin=el('pin');if(pin)pin.setAttribute('autocomplete','current-password');
    var mobile=el('mobile');if(mobile){mobile.setAttribute('autocomplete','tel');mobile.addEventListener('input',function(){this.value=String(this.value||'').replace(/\D/g,'').slice(-10)})}
  }
  function inherit(wrapped,base){try{Object.keys(base).forEach(function(k){wrapped[k]=base[k]})}catch(e){}}
  function patch(){
    if(patched)return true;
    if(typeof window.showView!=='function'||typeof window.renderCart!=='function')return false;
    var baseView=window.showView;
    var viewWrapped=function(view){activeView=String(view||'home');var r=baseView.apply(this,arguments);setTimeout(syncCartBar,0);return r};
    inherit(viewWrapped,baseView);viewWrapped.__nel990=true;window.showView=viewWrapped;try{showView=viewWrapped}catch(e){}
    var baseCart=window.renderCart;
    var cartWrapped=function(){var r=baseCart.apply(this,arguments);syncCartBar();return r};
    inherit(cartWrapped,baseCart);cartWrapped.__nel990=true;window.renderCart=cartWrapped;try{renderCart=cartWrapped}catch(e){}
    if(typeof window.openCart==='function'){
      var baseOpen=window.openCart;var openWrapped=function(){var r=baseOpen.apply(this,arguments);setTimeout(syncCartBar,0);return r};inherit(openWrapped,baseOpen);window.openCart=openWrapped;try{openCart=openWrapped}catch(e){}
    }
    if(typeof window.closeCart==='function'){
      var baseClose=window.closeCart;var closeWrapped=function(){var r=baseClose.apply(this,arguments);setTimeout(syncCartBar,0);return r};inherit(closeWrapped,baseClose);window.closeCart=closeWrapped;try{closeCart=closeWrapped}catch(e){}
    }
    patched=true;syncCartBar();return true;
  }
  function start(){
    loginHelp();removeRetailSwitch();
    var tries=0;(function wait(){removeRetailSwitch();if(!patch()&&++tries<240)return setTimeout(wait,50);var clean=0,t=setInterval(function(){removeRetailSwitch();syncCartBar();if(++clean>40)clearInterval(t)},100)})();
    var m=el('mobile'),p=el('pin');
    if(m)m.addEventListener('keydown',function(e){if(e.key==='Enter'&&p)p.focus()});
    if(p)p.addEventListener('keydown',function(e){if(e.key==='Enter'&&el('loginBtn'))el('loginBtn').click()});
  }
  window.addEventListener('pageshow',syncCartBar);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
