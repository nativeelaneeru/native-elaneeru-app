/* Demo-only app shell: no live authentication, private data or production app caches. */
const CACHE_NAME='ne-ops-v2-demo-cache-20261014-b1';
const SHELL=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const c=await caches.open(CACHE_NAME);
 await c.addAll(SHELL);
 await Promise.all(['../../b2b/icons/icon-192.png','../../b2b/icons/icon-512.png'].map(p=>c.add(p).catch(()=>{})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();
 await Promise.all(names.filter(k=>k.startsWith('ne-ops-v2-demo-cache-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{
   const c=await caches.open(CACHE_NAME);
   try{const response=await fetch(event.request);if(response.ok)await c.put('./index.html',response.clone());return response;}
   catch(err){return await c.match('./index.html')||Response.error();}
  })());
  return;
 }
 event.respondWith((async()=>{
  const c=await caches.open(CACHE_NAME),cached=await c.match(event.request);
  if(cached)return cached;
  try{const response=await fetch(event.request);if(response.ok)await c.put(event.request,response.clone());return response;}
  catch(err){return Response.error();}
 })());
});
