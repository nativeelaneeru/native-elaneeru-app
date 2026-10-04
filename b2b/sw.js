const CACHE='native-elaneeru-business-v5-1601';
const SHELL=['./index.html','./app-v5.js?v=1601','./config.js?v=1601','./storage-v5.js?v=1601','./manifest.webmanifest?v=1601','../icons/native-elaneeru.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('native-elaneeru-business')).map(k=>caches.delete(k)));await self.clients.claim();
  // Existing installed apps use this same scope. Network-first navigation gives
  // them v5 when reopened, without interrupting an in-flight legacy order.
})()));
async function networkFirst(req,navigation){const cache=await caches.open(CACHE);try{const r=await fetch(req,{cache:'no-store'});if(r.ok){await cache.put(req,r.clone());return r}const old=await cache.match(req);if(old)return old;if(navigation){const page=await cache.match('./index.html');if(page)return page}return r;}catch(e){const old=await cache.match(req);if(old)return old;if(navigation){const page=await cache.match('./index.html');if(page)return page}throw e}}
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;const b2b=u.pathname.includes('/b2b/');if(e.request.mode==='navigate'){e.respondWith(networkFirst(e.request,true));return}if(b2b){e.respondWith(networkFirst(e.request,false));return}if(/\.(png|webp|svg)$/.test(u.pathname))e.respondWith((async()=>{const cache=await caches.open(CACHE);const old=await cache.match(e.request);if(old)return old;const r=await fetch(e.request);if(r.ok)await cache.put(e.request,r.clone());return r})())});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.openWindow('./?build=1601'))});

