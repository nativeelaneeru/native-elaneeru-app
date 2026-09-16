(function(){
  if(window.NEL_CLICKABLE_FIX_V10573)return;
  window.NEL_CLICKABLE_FIX_V10573=true;

  function goSafe(page){
    if(typeof window.go==='function'){
      window.go(page);
      return true;
    }
    var btn=document.querySelector('.navIn button[data-page="'+page+'"]');
    if(btn&&typeof btn.click==='function'){
      btn.click();
      return true;
    }
    return false;
  }

  function wireHero(){
    var cta=document.querySelector('.promo .cta');
    if(!cta)return;
    cta.textContent='ORDER FRESH COCONUTS →';
    cta.setAttribute('role','button');
    cta.setAttribute('tabindex','0');
    cta.setAttribute('aria-label','Shop fresh coconuts');
  }

  function clickHandler(e){
    var target=e.target&&e.target.closest?e.target.closest('.promo .cta'):null;
    if(!target)return;
    e.preventDefault();
    e.stopPropagation();
    goSafe('shop');
  }

  function keyHandler(e){
    var target=e.target&&e.target.closest?e.target.closest('.promo .cta'):null;
    if(!target||(e.key!=='Enter'&&e.key!==' '))return;
    e.preventDefault();
    goSafe('shop');
  }

  document.addEventListener('click',clickHandler,true);
  document.addEventListener('keydown',keyHandler,true);

  function boot(){
    wireHero();
    setTimeout(wireHero,100);
    setTimeout(wireHero,600);
    setTimeout(wireHero,1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
