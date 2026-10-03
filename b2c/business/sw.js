const CACHE='native-elaneeru-business-v9.7.0';
const SHELL=['./','./index.html','./v96.html','./config.js','./manifest.webmanifest'];

const BRIDGE_HTML=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#087f40">
<title>Native Elaneeru Business</title>
<link rel="manifest" href="./manifest.webmanifest">
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f8fbf9}
iframe{display:block;width:100%;height:100%;border:0;background:#f8fbf9}
</style>
</head>
<body>
<iframe src="../../b2b/?source=legacy-business&build=1102" title="Native Elaneeru Business" allow="clipboard-read *; clipboard-write *"></iframe>
</body>
</html>`;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('native-elaneeru-business-v')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        const u=new URL(client.url);
        if(!u.pathname.includes('/b2c/business/'))continue;
        u.searchParams.set('build','970');
        u.searchParams.set('_r',Date.now().toString());
        await client.navigate(u.href);
      }catch(_){ }
    }
  })());
});

function bridgeResponse(){
  return new Response(BRIDGE_HTML,{
    status:200,
    headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0'}
  });
}

async function fetchFresh(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
      return response;
    }
  }catch(_){ }
  return caches.match(request);
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const u=new URL(request.url);
  if(u.origin!==self.location.origin)return;
  // Only control the legacy Business route. Let the production /b2b/ iframe
  // load through its own production service worker.
  if(!u.pathname.includes('/b2c/business/'))return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      await fetchFresh(request).catch(()=>null);
      return bridgeResponse();
    })());
    return;
  }

  event.respondWith((async()=>{
    const fresh=await fetchFresh(request);
    if(fresh)return fresh;
    throw new Error('offline');
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});
