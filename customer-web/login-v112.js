(function(){
  if(window.NEL_LOGIN_V112)return;window.NEL_LOGIN_V112=true;
  var API='https://script.google.com/macros/s/AKfycby4tO2Y1xWbVv1XqzbIYjuTKOt4XRWPzB9MseMC1x-qc8gbNYPvqvG1z6PuCPGZi5O2/exec';
  var seq=0;
  function $(id){return document.getElementById(id)}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function say(m){var x=$('msg');if(x)x.textContent=m||''}
  function validMobile(){var m=digits($('mobile')&&$('mobile').value);return /^[6-9]\d{9}$/.test(m)?m:''}
  function saveSession(m){
    var p={mobile:m};
    try{var old=JSON.parse(localStorage.getItem('nel_profile_v9')||'{}');if(digits(old.mobile)===m)p=Object.assign({},old,{mobile:m})}catch(e){}
    try{
      localStorage.setItem('nel_b2c_session_mobile',m);
      localStorage.setItem('nel_b2c_profile',JSON.stringify(p));
      localStorage.setItem('nel_profile_v9',JSON.stringify(p));
    }catch(e){}
  }
  function openApp(m){saveSession(m);location.replace('../?v=1012')}
  function rpc(method,args){
    return new Promise(function(resolve,reject){
      args=Array.isArray(args)?args:[];
      var cb='__nelPin112'+Date.now()+(++seq)+Math.floor(Math.random()*10000),s=document.createElement('script'),done=false,timer;
      function clean(){if(done)return;done=true;clearTimeout(timer);try{delete window[cb]}catch(e){}try{s.remove()}catch(e){}}
      window[cb]=function(p){clean();p=p||{};p.ok?resolve(p.result):reject(new Error(p.error||'Request failed.'))};
      s.onerror=function(){clean();reject(new Error('Unable to connect. Please retry.'))};
      s.src=API+'?jsonp=1&callback='+encodeURIComponent(cb)+'&payload='+encodeURIComponent(JSON.stringify({method:method,args:args,requestId:cb}))+'&v=1120&_='+Date.now();
      timer=setTimeout(function(){clean();reject(new Error('Connection timed out. Please retry.'))},15000);
      document.head.appendChild(s);
    });
  }
  function show(id){['mobileStep','pinLoginStep','noPinStep','createPinStep'].forEach(function(x){var n=$(x);if(n)n.classList.toggle('hide',x!==id)})}
  function install(){
    var skip=$('skipPinBtn'),create=$('createPinBtn'),showCreate=$('showCreateBtn'),back=$('createBackBtn');
    if(skip){skip.onclick=function(e){
      if(e)e.preventDefault();say('');var m=validMobile();
      if(!m){say('Enter a valid 10 digit mobile number.');show('mobileStep');return}
      skip.disabled=true;skip.textContent='Opening app…';
      openApp(m);
    }}
    if(showCreate){showCreate.onclick=function(e){if(e)e.preventDefault();say('');show('createPinStep');var n=$('newPin');if(n)n.focus()}}
    if(back){back.onclick=function(e){if(e)e.preventDefault();say('');show('noPinStep')}}
    if(create){create.onclick=async function(e){
      if(e)e.preventDefault();say('');var m=validMobile(),a=digits($('newPin')&&$('newPin').value),b=digits($('confirmPin')&&$('confirmPin').value);
      if(!m){say('Enter a valid 10 digit mobile number.');show('mobileStep');return}
      if(a.length!==4){say('Enter a 4 digit PIN.');return}
      if(a!==b){say('PINs do not match.');return}
      create.disabled=true;var old=create.textContent;create.textContent='Saving PIN…';
      try{await rpc('setCustomerPinV107',[m,a,'']);openApp(m)}
      catch(err){say(err&&err.message?err.message:String(err));create.disabled=false;create.textContent=old}
    }}
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
