(function(){
  if(window.NEL_B2B_DB)return;
  var DB_NAME='native-elaneeru-b2b',DB_VERSION=1,dbPromise=null;
  function open(){if(dbPromise)return dbPromise;dbPromise=new Promise(function(resolve,reject){if(!('indexedDB'in window))return reject(new Error('IndexedDB unavailable'));var r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv',{keyPath:'key'});if(!db.objectStoreNames.contains('orders'))db.createObjectStore('orders',{keyPath:'orderId'});if(!db.objectStoreNames.contains('pending')){var s=db.createObjectStore('pending',{keyPath:'requestId'});s.createIndex('fingerprint','fingerprint',{unique:false});}};r.onsuccess=function(){resolve(r.result)};r.onerror=function(){reject(r.error||new Error('IndexedDB open failed'))}});return dbPromise}
  async function put(store,value){var db=await open();return new Promise(function(resolve,reject){var r=db.transaction(store,'readwrite').objectStore(store).put(value);r.onsuccess=function(){resolve(value)};r.onerror=function(){reject(r.error)}})}
  async function get(store,key){var db=await open();return new Promise(function(resolve,reject){var r=db.transaction(store,'readonly').objectStore(store).get(key);r.onsuccess=function(){resolve(r.result||null)};r.onerror=function(){reject(r.error)}})}
  async function del(store,key){var db=await open();return new Promise(function(resolve,reject){var r=db.transaction(store,'readwrite').objectStore(store).delete(key);r.onsuccess=function(){resolve(true)};r.onerror=function(){reject(r.error)}})}
  async function all(store){var db=await open();return new Promise(function(resolve,reject){var r=db.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=function(){resolve(r.result||[])};r.onerror=function(){reject(r.error)}})}
  function parse(x){try{return JSON.parse(x||'null')}catch(e){return null}}
  function now(){return Date.now()}
  var api={
    ready:open(),
    set:function(key,value){return put('kv',{key:key,value:value,updatedAt:now()})},
    get:async function(key){var r=await get('kv',key);return r?r.value:null},
    setCart:function(c){return api.set('cart',c||{})},getCart:function(){return api.get('cart')},
    setData:function(d){return api.set('businessData',d||null)},getData:function(){return api.get('businessData')},
    setProfile:function(p){return api.set('profile',p||null)},getProfile:function(){return api.get('profile')},
    queueOrder:function(x){x=x||{};return put('pending',{requestId:String(x.requestId||''),fingerprint:String(x.fingerprint||''),payload:x.payload||{},createdAt:x.createdAt||now(),status:'PENDING'})},
    resolveOrder:async function(id,result,payload){if(result&&result.orderId)await put('orders',{orderId:String(result.orderId),requestId:String(id||''),result:result,payload:payload||{},confirmedAt:now()});await del('pending',String(id||''));return result},
    getOrders:function(){return all('orders')},getPending:function(){return all('pending')}
  };
  window.NEL_B2B_DB=api;

  async function migrate(){try{var c=parse(localStorage.getItem('nel_b2b_cart_v113'));if(c)await api.setCart(c);}catch(e){}}
  function installMirrors(){
    setInterval(function(){try{var c={};if(typeof CART!=='undefined'&&CART){Object.keys(CART).forEach(function(id){var q=Number(CART[id]&&CART[id].qty||CART[id]||0);if(q>0)c[id]=q});api.setCart(c).catch(function(){})}if(typeof DATA!=='undefined'&&DATA){api.setData(DATA).catch(function(){});if(DATA.vendor)api.setProfile(DATA.vendor).catch(function(){})}}catch(e){}},3000);
    var tries=0;(function hydrate(){try{if(typeof CART!=='undefined'){api.getCart().then(function(c){if(!c||!Object.keys(c).length)return;var has=Object.keys(CART||{}).length;if(has)return;Object.keys(c).forEach(function(id){CART[id]={qty:Number(c[id]||0)}});try{if(typeof renderCart==='function')renderCart()}catch(e){};try{if(typeof updateCartBar==='function')updateCartBar()}catch(e){};});return}}catch(e){}if(++tries<160)setTimeout(hydrate,100)})();
  }
  api.ready.then(migrate).then(installMirrors).catch(function(){});
})();
