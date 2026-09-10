(function(){
  if(window.NEL_B2B_SESSION_V960)return;
  window.NEL_B2B_SESSION_V960=true;

  function restore(){
    var saved='';
    try{saved=String(sessionStorage.getItem('nel_b2b_token')||'')}catch(e){}
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

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',restore,{once:true}):restore();
})();
