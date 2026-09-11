(function(){
  if(window.NEL_BOOT_RECOVERY_V10360)return;
  window.NEL_BOOT_RECOVERY_V10360=true;

  function memoryStorage(){
    var data={};
    return {
      getItem:function(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null;},
      setItem:function(k,v){data[k]=String(v);},
      removeItem:function(k){delete data[k];},
      clear:function(){data={};},
      key:function(i){var keys=Object.keys(data);return keys[i]||null;},
      get length(){return Object.keys(data).length;}
    };
  }

  function usable(storage){
    if(!storage)return false;
    var key='__nel_storage_probe__';
    try{storage.setItem(key,'1');storage.removeItem(key);return true;}catch(e){return false;}
  }

  // Some in-app/private browsers deny localStorage. Prefer sessionStorage as a
  // temporary fallback so the customer sees the app instead of a blank screen.
  var primary=null;
  try{primary=window.localStorage;}catch(e){}
  if(!usable(primary)){
    var fallback=null;
    try{fallback=window.sessionStorage;}catch(e){}
    if(!usable(fallback))fallback=memoryStorage();
    try{Object.defineProperty(window,'localStorage',{configurable:true,value:fallback});primary=fallback;}catch(e){
      try{window.localStorage=fallback;primary=fallback;}catch(ignore){}
    }
    window.NEL_STORAGE_FALLBACK=true;
  }

  function get(k){try{return window.localStorage.getItem(k);}catch(e){return null;}}
  function set(k,v){try{window.localStorage.setItem(k,v);return true;}catch(e){return false;}}
  function remove(k){try{window.localStorage.removeItem(k);}catch(e){}}
  function validObjectJson(k,fallback){
    var raw=get(k);if(raw==null||raw==='')return;
    try{
      var value=JSON.parse(raw);
      if(!value||typeof value!=='object'||Array.isArray(value))set(k,fallback);
    }catch(e){set(k,fallback);}
  }

  // Old/corrupt persisted state must never stop the main B2C script at boot.
  validObjectJson('nel_cart_v9','{}');
  validObjectJson('nel_profile_v9','{}');
  validObjectJson('nel_b2c_profile','{}');
  var cached=get('nel_b2c_catalog_v113');
  if(cached){try{JSON.parse(cached);}catch(e){remove('nel_b2c_catalog_v113');}}

  function refreshWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      navigator.serviceWorker.getRegistration('./').then(function(reg){
        if(!reg)return;
        reg.update().catch(function(){});
        if(reg.waiting)try{reg.waiting.postMessage('SKIP_WAITING');}catch(e){}
      }).catch(function(){});
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshWorker,{once:true});else refreshWorker();
  window.addEventListener('pageshow',function(e){if(e&&e.persisted)refreshWorker();});
})();
