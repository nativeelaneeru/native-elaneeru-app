(function(){
  if(window.NEL_UI_V113)return;window.NEL_UI_V113=true;

  function addStyle(){
    if(document.getElementById('nel113Style'))return;
    var s=document.createElement('style');s.id='nel113Style';
    s.textContent='.nel113-business{border:1px solid #ffffff45;background:#ffffff12;color:#fff;border-radius:11px;padding:8px 9px;text-decoration:none;font-size:10px;font-weight:900;white-space:nowrap}.nel113-net{position:fixed;right:12px;top:calc(10px + env(safe-area-inset-top));z-index:150;padding:6px 9px;border-radius:999px;background:#173c28;color:#fff;font-size:9px;font-weight:900;box-shadow:0 5px 18px #0002;opacity:.96}.nel113-net.off{background:#a52a2a}.nel113-net.ok{background:#075b34}@media(max-width:430px){.nel113-business{padding:8px 7px;font-size:0}.nel113-business:after{content:"🏪";font-size:15px}}';
    document.head.appendChild(s);
  }

  function addBusinessSwitch(){
    if(document.getElementById('nel113Business'))return;
    var row=document.querySelector('.brandRow');if(!row)return;
    var a=document.createElement('a');a.id='nel113Business';a.className='nel113-business';a.href='../b2b/';a.setAttribute('aria-label','Open Native Elaneeru Business');a.textContent='🏪 Business';
    var support=row.querySelector('.support');if(support)row.insertBefore(a,support);else row.appendChild(a);
  }

  function networkBadge(){
    var el=document.getElementById('nel113Net');
    if(!el){el=document.createElement('div');el.id='nel113Net';el.className='nel113-net';document.body.appendChild(el)}
    var online=navigator.onLine!==false;
    el.classList.toggle('off',!online);el.classList.toggle('ok',online);
    el.textContent=online?'● Online':'● Offline — cart is kept on this device';
    if(online){el.style.display='block';setTimeout(function(){if(el&&navigator.onLine!==false)el.style.display='none'},1800)}else el.style.display='block';
  }

  function patchSaveProfile(){
    var base=window.saveProfile;if(typeof base!=='function'||base.__nel113)return typeof base==='function';
    var wrapped=async function(){
      var buttons=[].slice.call(document.querySelectorAll('button[onclick*="saveProfile"]'));
      buttons.forEach(function(b){b.disabled=true;b.setAttribute('aria-busy','true')});
      try{return await base.apply(this,arguments)}finally{buttons.forEach(function(b){b.disabled=false;b.removeAttribute('aria-busy')})}
    };
    wrapped.__nel113=true;wrapped.__base=base;window.saveProfile=wrapped;try{saveProfile=wrapped}catch(e){}
    return true;
  }

  function start(){
    addStyle();addBusinessSwitch();networkBadge();
    var tries=0;(function patch(){if(!patchSaveProfile()&&++tries<120)setTimeout(patch,100)})();
  }

  window.addEventListener('online',function(){networkBadge();if(typeof window.toast==='function')try{toast('Back online')}catch(x){}});
  window.addEventListener('offline',function(){networkBadge();if(typeof window.toast==='function')try{toast('You are offline. Your cart stays on this device.')}catch(x){}});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();