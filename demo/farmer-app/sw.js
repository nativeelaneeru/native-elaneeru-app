// Isolated Native Elaneeru FARMER DEMO offline shell, not used by production Business/Direct apps.
const CACHE='native-elaneeru-farmer-demo-v1-20261014';
const SHELL=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(SHELL);
 await Promise.all(['../../b2b/icons/icon-192.png','../../b2b/icons/icon-512.png'].map(u=>cache.add(u).catch(()=>{})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('native-elaneeru-farmer-demo-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);
   try{const result=await fetch(event.request);if(result.ok)await cache.put('./index.html',result.clone());return result}
   catch(e){return await cache.match('./index.html')||Response.error()}
  })());return;
 }
 event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(event.request);
  if(cached)return cached;
  try{const result=await fetch(event.request);if(result.ok)await cache.put(event.request,result.clone());return result}
  catch(e){return Response.error()}
 })());
});
