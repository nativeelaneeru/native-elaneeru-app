(function(){
  if(window.NEL_B2B_SESSION_V960)return;
  window.NEL_B2B_SESSION_V960=true;

  function restore(){
    var saved='';
    try{
      saved=String(sessionStorage.getItem('nel_b2b_token')||localStorage.getItem('nel_b2b_token')||'');
      var at=Number(localStorage.getItem('nel_b2b_token_saved_at')||0);
      if(saved&&at&&Date.now()-at>30*24*60*60*1000){saved='';localStorage.removeItem('nel_b2b_token');localStorage.removeItem('nel_b2b_token_saved_at')}
      if(saved)sessionStorage.setItem('nel_b2b_token',saved);
    }catch(e){}
    if(!saved)return;
    try{
      if(typeof TOKEN==='undefined'||typeof refresh!=='function')return setTimeout(restore,80);
      TOKEN=saved;
      var login=document.getElementById('login'),app=document.getElementById('app'),bottom=document.getElementById('bottom'),logout=document.getElementById('logoutBtn');
      if(login)login.classList.add('hidden');
      if(app)app.classList.remove('hidden');
      if(bottom)bottom.classList.remove('hidden');
      if(logout)logout.classList.remove('hidden');
      Promise.resolve(refresh()).then(function(){
        if(typeof loadLegal==='function')return loadLegal();
      }).catch(function(err){
        var msg=String(err&&err.message||err||'');
        if(/expired|invalid|login/i.test(msg)&&typeof logout==='function')logout();
      });
    }catch(e){}
  }

  function installPersistence(){
    var base=window.logout;
    if(typeof base==='function'&&!base.__nelPersistentSession){
      var wrapped=function(){try{localStorage.removeItem('nel_b2b_token');localStorage.removeItem('nel_b2b_token_saved_at')}catch(e){}return base.apply(this,arguments)};
      wrapped.__nelPersistentSession=true;window.logout=wrapped;try{logout=wrapped}catch(e){}
      var btn=document.getElementById('logoutBtn');if(btn)btn.onclick=wrapped;
    }
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',function(){installPersistence();restore()},{once:true}):(installPersistence(),restore());
})();
