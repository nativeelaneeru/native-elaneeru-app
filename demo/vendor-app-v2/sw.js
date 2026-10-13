// Isolated Native Elaneeru Business V2 DEMO app shell — not used by production PWAs.
const CACHE_NAME = 'ne-business-v2-demo-shell-20261014-b';
const LOCAL_SHELL = ['./', './index.html', './manifest.webmanifest'];
const BRAND_ASSETS = ['../../b2b/icons/icon-192.png', '../../b2b/icons/icon-512.png'];
self.addEventListener('install',event => {
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await cache.addAll(LOCAL_SHELL);
  await Promise.all(BRAND_ASSETS.map(url => cache.add(url).catch(()=>{})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event => {
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('ne-business-v2-demo-shell-') && k!==CACHE_NAME).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event => {
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin || !url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
   event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try {
        const response=await fetch(event.request);
        if(response.ok) await cache.put('./index.html',response.clone());
        return response;
      } catch(e){
        const cached=await cache.match('./index.html');
        return cached||Response.error();
      }
   })());return;
 }
 event.respondWith((async()=>{
   const cache=await caches.open(CACHE_NAME);
   const cached=await cache.match(event.request);
   if(cached)return cached;
   try{
     const response=await fetch(event.request);
     if(response.ok)await cache.put(event.request,response.clone());
     return response;
   }catch(e){return Response.error();}
 })());
});
