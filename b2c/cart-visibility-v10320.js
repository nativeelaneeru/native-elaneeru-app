(function(){
  if(window.NEL_B2C_CART_VISIBILITY_V10320)return;
  window.NEL_B2C_CART_VISIBILITY_V10320=true;

  var activePage='home';
  var patched=false;

  function pageFromDom(){
    var names=['home','shop','orders','account','offers'];
    for(var i=0;i<names.length;i++){
      var page=document.getElementById(names[i]+'Page');
      if(page&&!page.classList.contains('hide'))return names[i];
    }
    return activePage||'home';
  }

  function shouldShow(){
    var page=activePage||pageFromDom();
    if(['home','shop','offers'].indexOf(page)<0)return false;
    var sheet=document.getElementById('cartSheet');
    if(sheet&&sheet.classList.contains('show'))return false;
    try{
      if(typeof window.cartLines==='function')return window.cartLines().length>0;
    }catch(e){}
    try{
      return !!(window.S&&S.cart&&Object.keys(S.cart).length);
    }catch(e){}
    return false;
  }

  function sync(){
    activePage=pageFromDom();
    var bar=document.getElementById('cartBar');
    if(!bar)return;
    bar.classList.toggle('show',shouldShow());
  }

  function inheritFlags(wrapped,base){
    try{Object.keys(base).forEach(function(k){wrapped[k]=base[k]})}catch(e){}
  }

  function patch(){
    if(patched)return true;
    if(typeof window.go!=='function'||typeof window.updateCartBar!=='function')return false;

    var baseGo=window.go;
    var goWrapped=function(page){
      activePage=String(page||pageFromDom());
      var result=baseGo.apply(this,arguments);
      setTimeout(sync,0);
      return result;
    };
    inheritFlags(goWrapped,baseGo);
    goWrapped.__nelCartVisibility=true;
    goWrapped.__base=baseGo;
    window.go=goWrapped;
    try{go=goWrapped}catch(e){}

    var baseUpdate=window.updateCartBar;
    var updateWrapped=function(){
      var result=baseUpdate.apply(this,arguments);
      sync();
      return result;
    };
    inheritFlags(updateWrapped,baseUpdate);
    updateWrapped.__nelCartVisibility=true;
    updateWrapped.__base=baseUpdate;
    window.updateCartBar=updateWrapped;
    try{updateCartBar=updateWrapped}catch(e){}

    if(typeof window.openCart==='function'){
      var baseOpen=window.openCart;
      var openWrapped=function(){
        var result=baseOpen.apply(this,arguments);
        setTimeout(sync,0);
        return result;
      };
      inheritFlags(openWrapped,baseOpen);
      window.openCart=openWrapped;
      try{openCart=openWrapped}catch(e){}
    }

    if(typeof window.closeSheet==='function'){
      var baseClose=window.closeSheet;
      var closeWrapped=function(){
        var result=baseClose.apply(this,arguments);
        setTimeout(sync,0);
        return result;
      };
      inheritFlags(closeWrapped,baseClose);
      window.closeSheet=closeWrapped;
      try{closeSheet=closeWrapped}catch(e){}
    }

    patched=true;
    sync();
    return true;
  }

  function start(){
    var tries=0;
    (function wait(){
      if(patch())return;
      if(++tries<240)setTimeout(wait,50);
    })();
  }

  document.addEventListener('visibilitychange',function(){if(!document.hidden)sync()});
  window.addEventListener('pageshow',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
