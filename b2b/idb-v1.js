(function(){
  if(window.NEL_B2B_DB)return;

  var DB_NAME='native-elaneeru-b2b',DB_VERSION=1,dbPromise=null;
  var lastCartJson=null,lastDataJson=null,lastProfileJson=null;

  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(function(resolve,reject){
      if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));
      var r=indexedDB.open(DB_NAME,DB_VERSION);
      r.onupgradeneeded=function(){
        var db=r.result;
        if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv',{keyPath:'key'});
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

  function parse(x){try{return JSON.parse(x||'null')}catch(e){return null}}
  function stringify(v){try{return JSON.stringify(v==null?null:v)}catch(e){return ''}}
  function now(){return Date.now()}

  var api={
    ready:open(),
    set:function(key,value){return put('kv',{key:key,value:value,updatedAt:now()})},
    get:async function(key){var r=await get('kv',key);return r?r.value:null},
    setCart:function(c){return api.set('cart',c&&typeof c==='object'?c:{})},
    getCart:function(){return api.get('cart')},
    clearCart:function(){lastCartJson='{}';return api.setCart({})},
    setData:function(d){return api.set('businessData',d||null)},
    getData:function(){return api.get('businessData')},
    setProfile:function(p){return api.set('profile',p||null)},
    getProfile:function(){return api.get('profile')},
    clearBusinessCache:async function(){
      lastCartJson='{}';lastDataJson='null';lastProfileJson='null';
      await api.setCart({});await api.setData(null);await api.setProfile(null);
      return true;
    },
    queueOrder:function(x){
      x=x||{};
      return put('pending',{requestId:String(x.requestId||''),fingerprint:String(x.fingerprint||''),payload:x.payload||{},createdAt:x.createdAt||now(),status:'PENDING'});
    },
    resolveOrder:async function(id,result,payload){
      if(result&&result.orderId)await put('orders',{orderId:String(result.orderId),requestId:String(id||''),result:result,payload:payload||{},confirmedAt:now()});
      await del('pending',String(id||''));
      return result;
    },
    getOrders:function(){return all('orders')},
    getPending:function(){return all('pending')}
  };
  window.NEL_B2B_DB=api;

  async function migrate(){
    try{
      var c=parse(localStorage.getItem('nel_b2b_cart_v113'));
      if(c&&typeof c==='object'){lastCartJson=stringify(c);await api.setCart(c)}
      else {lastCartJson='{}';await api.setCart({})}
    }catch(e){}
  }

  function installMirrors(){
    setInterval(function(){
      try{
        var c={};
        if(typeof CART!=='undefined'&&CART){
          Object.keys(CART).forEach(function(id){
            var q=Number(CART[id]&&CART[id].qty||CART[id]||0);
            if(q>0)c[id]=q;
          });
        }
        var cj=stringify(c);
        if(cj!==lastCartJson){lastCartJson=cj;api.setCart(c).catch(function(){})}

        if(typeof DATA!=='undefined'){
          var dj=stringify(DATA||null);
          if(dj!==lastDataJson){lastDataJson=dj;api.setData(DATA||null).catch(function(){})}
          var profile=DATA&&DATA.vendor?DATA.vendor:null,pj=stringify(profile);
          if(pj!==lastProfileJson){lastProfileJson=pj;api.setProfile(profile).catch(function(){})}
        }
      }catch(e){}
    },1500);

    var tries=0;
    (function hydrate(){
      try{
        if(typeof CART!=='undefined'){
          api.getCart().then(function(c){
            if(!c||!Object.keys(c).length)return;
            if(Object.keys(CART||{}).length)return;
            Object.keys(c).forEach(function(id){CART[id]={qty:Number(c[id]||0)}});
            try{if(typeof renderCart==='function')renderCart()}catch(e){}
            try{if(typeof updateCartBar==='function')updateCartBar()}catch(e){}
          }).catch(function(){});
          return;
        }
      }catch(e){}
      if(++tries<160)setTimeout(hydrate,100);
    })();
  }

  api.ready.then(migrate).then(installMirrors).catch(function(){});
})();
