(function(){
  if(window.NEL_INSTALL_ANALYTICS_V10420)return;window.NEL_INSTALL_ANALYTICS_V10420=true;
  var promptEvent=null,queue=[],timer=0,seenPlv=false;
  var isIos=/iphone|ipad|ipod/i.test(navigator.userAgent||'');
  var installed=function(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true};
  function installUi(){
    if(installed()||document.getElementById('nelInstall10420'))return;
    var b=document.createElement('button');b.id='nelInstall10420';b.type='button';b.textContent='⬇ Install App';
    b.style.cssText='position:fixed;right:12px;bottom:86px;z-index:75;border:0;border-radius:999px;padding:11px 14px;background:#075b34;color:#fff;font:800 12px system-ui;box-shadow:0 8px 26px #06351f55';
    b.onclick=async function(){
      if(promptEvent){promptEvent.prompt();var c=await promptEvent.userChoice;promptEvent=null;if(c&&c.outcome==='accepted')b.remove();return}
      alert(isIos?'To install: tap Share, then “Add to Home Screen”.':'To install: open the browser menu and tap “Install app” or “Add to Home screen”.');
    };
    document.body.appendChild(b);
  }
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();promptEvent=e;installUi()});
  window.addEventListener('appinstalled',function(){var b=document.getElementById('nelInstall10420');if(b)b.remove();track('INSTALL')});
  function id(){try{var k='nel_analytics_id',v=localStorage.getItem(k);if(!v){v=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random());localStorage.setItem(k,v)}return v}catch(e){return ''}}
  function track(event,meta){queue.push({event:event,app:'B2C',visitorId:id(),path:location.pathname,at:new Date().toISOString(),meta:meta||{}});schedule()}
  function schedule(){if(timer)return;timer=setTimeout(flush,1200)}
  function flush(){timer=0;if(!queue.length||typeof window.rpc!=='function')return;var batch=queue.splice(0,20);Promise.resolve(window.rpc('trackAppEventsV942',[batch])).catch(function(){queue=batch.concat(queue).slice(-60)})}
  function detectPlv(){if(!seenPlv&&window.S&&S.cfg&&Array.isArray(S.cfg.products)&&S.cfg.products.length){seenPlv=true;track('PLV',{count:S.cfg.products.length})}}
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('button.add'):null;if(!b)return;var m=String(b.getAttribute('onclick')||'').match(/add\(['"]([^'"]+)/);track('ATC',{productId:m?m[1]:''})},true);
  if('serviceWorker'in navigator)navigator.serviceWorker.register(location.pathname.indexOf('/login/')>=0?'../sw.js':'./sw.js').catch(function(){});
  track('OPEN');installUi();detectPlv();var tries=0,t=setInterval(function(){detectPlv();if(seenPlv||++tries>160)clearInterval(t)},100);
  addEventListener('pagehide',flush);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush()});
  window.NEL_TRACK_EVENT=track;
})();
