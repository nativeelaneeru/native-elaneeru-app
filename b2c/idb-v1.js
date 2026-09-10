(function(){
  if(window.NEL_DB)return;

  var DB_NAME='native-elaneeru-b2c',DB_VERSION=1,dbPromise=null;
  var lastProfileJson=null,lastCartJson=null;

  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(function(resolve,reject){
      if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));
      var r=indexedDB.open(DB_NAME,DB_VERSION);
      r.onupgradeneeded=function(){
        var db=r.result;
        if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv',{keyPath:'key'});
        if(!db.objectStoreNames.contains('catalog'))db.createObjectStore('catalog',{keyPath:'key'});
        if(!db.objectStoreNames.contains('orders'))db.createObjectStore('orders',{keyPath:'orderId'});
        if(!db.objectStoreNames.contains('pending')){
          var s=db.createObjectStore('pending',{keyPath:'requestId'});
          s.createIndex('fingerprint','fingerprint',{unique:false});
        }
      };
      r.onsuccess=function(){
        var db=r.result;
        db.onversionchange=function(){try{db.close()}catch(e){};dbPromise=null};
        resolve(db);
      };
      r.onerror=function(){dbPromise=null;reject(r.error||new Error('IndexedDB open failed'))};
      r.onblocked=function(){dbPromise=null;reject(new Error('IndexedDB upgrade blocked'))};
    });
    return dbPromise;
  }

  async function put(store,value){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction(store,'readwrite');
      tx.oncomplete=function(){resolve(value)};
      tx.onerror=function(){reject(tx.error||new Error('IndexedDB write failed'))};
      tx.onabort=function(){reject(tx.error||new Error('IndexedDB write aborted'))};
      tx.objectStore(store).put(value);
    });
  }
  async function get(store,key){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction(store,'readonly'),r=tx.objectStore(store).get(key);
      r.onsuccess=function(){resolve(r.result||null)};
      r.onerror=function(){reject(r.error||new Error('IndexedDB read failed'))};
    });
  }
  async function del(store,key){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction(store,'readwrite');
      tx.oncomplete=function(){resolve(true)};
      tx.onerror=function(){reject(tx.error||new Error('IndexedDB delete failed'))};
      tx.onabort=function(){reject(tx.error||new Error('IndexedDB delete aborted'))};
      tx.objectStore(store).delete(key);
    });
  }
  async function all(store){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction(store,'readonly'),r=tx.objectStore(store).getAll();
      r.onsuccess=function(){resolve(r.result||[])};
      r.onerror=function(){reject(r.error||new Error('IndexedDB read failed'))};
    });
  }
  async function byFingerprint(fp){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction('pending','readonly'),idx=tx.objectStore('pending').index('fingerprint'),r=idx.getAll(fp);
      r.onsuccess=function(){
        var list=(r.result||[]).sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0)});
        resolve(list[0]||null);
      };
      r.onerror=function(){reject(r.error||new Error('IndexedDB read failed'))};
    });
  }

  function parse(s){try{return JSON.parse(s||'null')}catch(e){return null}}
  function stringify(v){try{return JSON.stringify(v==null?null:v)}catch(e){return ''}}
  function now(){return Date.now()}
  function hasProducts(x){return !!(x&&Array.isArray(x.products)&&x.products.length)}

  var api={
    ready:open(),
    setKV:function(key,value){return put('kv',{key:key,value:value,updatedAt:now()})},
    getKV:async function(key){var r=await get('kv',key);return r?r.value:null},
    setCatalog:function(data){return hasProducts(data)?put('catalog',{key:'current',data:data,updatedAt:now()}):Promise.resolve(null)},
    getCatalog:async function(){var r=await get('catalog','current');return r?r.data:null},
    setProfile:function(p){return api.setKV('profile',p||{})},
    getProfile:function(){return api.getKV('profile')},
    setCart:function(c){return api.setKV('cart',c&&typeof c==='object'?c:{})},
    getCart:function(){return api.getKV('cart')},
    clearCart:function(){lastCartJson='{}';return api.setCart({})},
    queueOrder:function(x){
      x=x||{};
      return put('pending',{requestId:String(x.requestId||''),fingerprint:String(x.fingerprint||''),payload:x.payload||{},createdAt:x.createdAt||now(),status:'PENDING'});
    },
    getPendingByFingerprint:function(fp){return byFingerprint(String(fp||''))},
    resolveOrder:async function(requestId,result,payload){
      if(result&&result.orderId){
        await put('orders',{orderId:String(result.orderId),requestId:String(requestId||''),result:result,payload:payload||{},confirmedAt:now()});
        await api.clearCart();
        try{localStorage.removeItem('nel_cart_v9')}catch(e){}
      }
      await del('pending',String(requestId||''));
      return result;
    },
    clearPending:function(id){return del('pending',String(id||''))},
    getPending:function(){return all('pending')},
    getOrders:function(){return all('orders')}
  };
  window.NEL_DB=api;

  async function migrate(){
    try{
      var p=parse(localStorage.getItem('nel_profile_v9'))||parse(localStorage.getItem('nel_b2c_profile'));
      if(p){lastProfileJson=stringify(p);await api.setProfile(p)}
      var rawCart=localStorage.getItem('nel_cart_v9'),c=parse(rawCart);
      if(c&&typeof c==='object'){lastCartJson=stringify(c);await api.setCart(c)}
      else {lastCartJson='{}';await api.setCart({})}
      var cat=parse(localStorage.getItem('nel_b2c_catalog_v113'));
      if(cat&&hasProducts(cat.data))await api.setCatalog(cat.data);
      var m=localStorage.getItem('nel_b2c_session_mobile');
      if(m)await api.setKV('mobile',m);
    }catch(e){}
  }

  async function hydrate(){
    try{
      var p=await api.getProfile();
      if(p&&!localStorage.getItem('nel_profile_v9'))localStorage.setItem('nel_profile_v9',JSON.stringify(p));
      var c=await api.getCart();
      if(c&&Object.keys(c).length&&!localStorage.getItem('nel_cart_v9'))localStorage.setItem('nel_cart_v9',JSON.stringify(c));
      var cat=await api.getCatalog();
      if(cat&&hasProducts(cat)){
        if(!localStorage.getItem('nel_b2c_catalog_v113'))localStorage.setItem('nel_b2c_catalog_v113',JSON.stringify({data:cat,at:now()}));
        var tries=0;
        (function apply(){
          try{
            if(window.S){
              if(!(S.cfg&&Array.isArray(S.cfg.products)&&S.cfg.products.length)){
                S.cfg=cat;
                if(typeof window.renderProducts==='function')window.renderProducts();
                if(typeof window.updateCartBar==='function')window.updateCartBar();
                try{window.dispatchEvent(new CustomEvent('nel:catalog',{detail:cat}))}catch(e){}
              }
              if(c&&Object.keys(c).length&&(!S.cart||!Object.keys(S.cart).length)){
                S.cart=c;
                if(typeof window.updateCartBar==='function')window.updateCartBar();
              }
              return;
            }
          }catch(e){}
          if(++tries<120)setTimeout(apply,50);
        })();
      }
    }catch(e){}
  }

  function installMirrors(){
    var tries=0;
    (function patch(){
      try{
        if(typeof window.publishCatalogV113==='function'&&!window.publishCatalogV113.__nelIdb){
          var base=window.publishCatalogV113;
          var w=function(data){var r=base.apply(this,arguments);api.setCatalog(data).catch(function(){});return r};
          w.__nelIdb=true;w.__base=base;window.publishCatalogV113=w;
          try{publishCatalogV113=w}catch(e){}
        }
      }catch(e){}
      if(++tries<160)setTimeout(patch,100);
    })();

    setInterval(function(){
      try{
        var p=parse(localStorage.getItem('nel_profile_v9'));
        var pj=stringify(p||{});
        if(pj&&pj!==lastProfileJson){lastProfileJson=pj;api.setProfile(p||{}).catch(function(){})}

        var c=parse(localStorage.getItem('nel_cart_v9'));
        if(!c||typeof c!=='object')c={};
        var cj=stringify(c);
        if(cj!==lastCartJson){lastCartJson=cj;api.setCart(c).catch(function(){})}
      }catch(e){}
    },1500);
  }

  api.ready.then(function(){return migrate()}).then(hydrate).then(installMirrors).catch(function(){});
})();
