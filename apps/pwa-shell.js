(function(){
  var root=document.documentElement,title=root.dataset.title||'Native Elaneeru',route=root.dataset.route||'admin';
  var main='https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec?page='+encodeURIComponent(route);
  var frame=document.getElementById('portalFrame'),button=document.getElementById('installButton'),promptEvent=null;
  frame.src=main;
  function installed(){return matchMedia('(display-mode:standalone)').matches||navigator.standalone===true}
  function guide(){var x=document.createElement('div');x.className='guide';x.innerHTML='<div><div style="font-size:38px">⬇</div><h2>Install '+title+'</h2><p>Open the browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.</p><button>Got it</button></div>';x.querySelector('button').onclick=function(){x.remove()};document.body.appendChild(x)}
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();promptEvent=e;button.hidden=false});
  addEventListener('appinstalled',function(){button.hidden=true});
  button.onclick=async function(){if(promptEvent){promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;button.hidden=true}else guide()};
  if(installed())button.hidden=true;else setTimeout(function(){button.hidden=false},1800);
  if('serviceWorker'in navigator)addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){})});
})();
