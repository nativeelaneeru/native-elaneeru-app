// Reuse the existing B2B IndexedDB session record without legacy UI mirrors.
(function(){
  let promise;function open(){if(promise)return promise;promise=new Promise((resolve,reject)=>{const r=indexedDB.open('native-elaneeru-b2b',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv',{keyPath:'key'});if(!d.objectStoreNames.contains('orders'))d.createObjectStore('orders',{keyPath:'orderId'});if(!d.objectStoreNames.contains('pending')){const p=d.createObjectStore('pending',{keyPath:'requestId'});p.createIndex('fingerprint','fingerprint',{unique:false})}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return promise}
  async function get(key){const d=await open();return new Promise((resolve,reject)=>{const r=d.transaction('kv').objectStore('kv').get(key);r.onsuccess=()=>resolve(r.result?.value||null);r.onerror=()=>reject(r.error)})}
  async function set(key,value){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put({key,value,updatedAt:Date.now()});t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error)})}
  window.NEL_B2B_DB={get,set};
})();
