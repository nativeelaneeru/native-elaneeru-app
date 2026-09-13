(function(){
  if(window.NEL_B2B_ANALYTICS_V981)return;window.NEL_B2B_ANALYTICS_V981=true;
  var q=[],timer=0,plv=false;
  function id(){try{var k='nel_b2b_analytics_id',v=localStorage.getItem(k);if(!v){v=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random());localStorage.setItem(k,v)}return v}catch(e){return ''}}
  function track(event,meta){q.push({event:event,app:'B2B',visitorId:id(),path:location.pathname,at:new Date().toISOString(),meta:meta||{}});if(!timer)timer=setTimeout(flush,1200)}
  function flush(){timer=0;if(!q.length||typeof window.rpc!=='function')return;var b=q.splice(0,20);Promise.resolve(window.rpc('trackAppEventsV942',[b])).catch(function(){q=b.concat(q).slice(-60)})}
  function maintain(){
    var install=document.getElementById('installBtn');if(install&&!((matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true))install.style.setProperty('display','inline-block','important');
    if(!plv&&window.DATA&&Array.isArray(DATA.products)&&DATA.products.length){plv=true;track('PLV',{count:DATA.products.length})}
    try{var token=sessionStorage.getItem('nel_b2b_token');if(token){localStorage.setItem('nel_b2b_token',token);localStorage.setItem('nel_b2b_token_saved_at',String(Date.now()))}}catch(e){}
    var login=document.getElementById('loginBtn');if(login&&!login.__nelPersist){login.__nelPersist=true;login.addEventListener('click',function(){var n=0,t=setInterval(function(){maintain();if(++n>350)clearInterval(t)},100)})}
  }
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('button.add'):null;if(!b)return;var m=String(b.getAttribute('onclick')||'').match(/add\(['"]([^'"]+)/);track('ATC',{productId:m?m[1]:''})},true);
  track('OPEN');maintain();var tries=0,t=setInterval(function(){maintain();if(++tries>100)clearInterval(t)},100);
  addEventListener('pagehide',flush);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush()});
  window.NEL_B2B_TRACK_EVENT=track;
})();
