(function(){
  if(window.NEL_B2B_SESSION_V985)return;window.NEL_B2B_SESSION_V985=true;
  var MAX_AGE=30*24*60*60*1000,lastToken='',lastData='';
  function valid(saved,at){return !!(saved&&at&&Date.now()-at<=MAX_AGE)}
  function persist(saved,at){
    if(!saved)return;at=Number(at||Date.now());
    try{sessionStorage.setItem('nel_b2b_token',saved);localStorage.setItem('nel_b2b_token',saved);localStorage.setItem('nel_b2b_token_saved_at',String(at))}catch(e){}
    try{if(window.NEL_B2B_DB)window.NEL_B2B_DB.set('sessionToken',{token:saved,savedAt:at}).catch(function(){})}catch(e){}
  }
  function clearSaved(){
    try{sessionStorage.removeItem('nel_b2b_token');sessionStorage.removeItem('nel_b2b_data_cache');localStorage.removeItem('nel_b2b_token');localStorage.removeItem('nel_b2b_token_saved_at');localStorage.removeItem('nel_b2b_data_cache')}catch(e){}
    try{if(window.NEL_B2B_DB){window.NEL_B2B_DB.set('sessionToken',null).catch(function(){});window.NEL_B2B_DB.setData(null).catch(function(){})}}catch(e){}
    lastToken='';lastData='';
  }
  function showApp(){
    var login=document.getElementById('login'),app=document.getElementById('app'),bottom=document.getElementById('bottom'),out=document.getElementById('logoutBtn');
    if(login)login.classList.add('hidden');if(app)app.classList.remove('hidden');if(bottom)bottom.classList.remove('hidden');if(out)out.classList.remove('hidden');
  }
  function renderCached(){
    try{var raw=localStorage.getItem('nel_b2b_data_cache')||sessionStorage.getItem('nel_b2b_data_cache')||'',cached=JSON.parse(raw||'null');if(!cached||!cached.vendor||!Array.isArray(cached.products))return;DATA=cached;if(typeof render==='function')render()}catch(e){}
  }
  function activate(saved,at){
    if(!valid(saved,at))return;if(typeof TOKEN==='undefined'||typeof refresh!=='function')return setTimeout(function(){activate(saved,at)},60);
    persist(saved,at);TOKEN=saved;showApp();renderCached();
    Promise.resolve(refresh()).then(function(){if(typeof loadLegal==='function')return loadLegal()}).catch(function(err){var msg=String(err&&err.message||err||'');if(/expired|invalid|login/i.test(msg)&&typeof logout==='function')logout()});
  }
  function restore(){
    var saved='',at=0;try{saved=String(sessionStorage.getItem('nel_b2b_token')||localStorage.getItem('nel_b2b_token')||'');at=Number(localStorage.getItem('nel_b2b_token_saved_at')||0)}catch(e){}
    if(valid(saved,at)){activate(saved,at);return}if(saved)clearSaved();var tries=0;
    (function fromDb(){if(!window.NEL_B2B_DB){if(++tries<80)setTimeout(fromDb,50);return}window.NEL_B2B_DB.get('sessionToken').then(function(record){if(record&&valid(String(record.token||''),Number(record.savedAt||0)))activate(String(record.token),Number(record.savedAt))}).catch(function(){})})();
  }
  function installLogout(){
    var base=window.logout;if(typeof base!=='function'||base.__nel985)return;
    var wrapped=function(){clearSaved();return base.apply(this,arguments)};wrapped.__nel985=true;wrapped.__base=base;window.logout=wrapped;try{logout=wrapped}catch(e){}var btn=document.getElementById('logoutBtn');if(btn)btn.onclick=wrapped;
  }
  function mirror(){
    try{var token=String((typeof TOKEN!=='undefined'&&TOKEN)||sessionStorage.getItem('nel_b2b_token')||'');if(token&&token!==lastToken){lastToken=token;var at=Number(localStorage.getItem('nel_b2b_token_saved_at')||0)||Date.now();persist(token,at)}if(typeof DATA!=='undefined'&&DATA&&DATA.vendor&&Array.isArray(DATA.products)){var raw=JSON.stringify(DATA);if(raw!==lastData){lastData=raw;sessionStorage.setItem('nel_b2b_data_cache',raw);localStorage.setItem('nel_b2b_data_cache',raw);if(window.NEL_B2B_DB)window.NEL_B2B_DB.setData(DATA).catch(function(){})}}}catch(e){}
  }
  function start(){installLogout();restore();mirror();setInterval(function(){installLogout();mirror()},500)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
